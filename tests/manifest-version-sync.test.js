// tests/manifest-version-sync.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectVersionSyncErrors,
  collectReleaseDateErrors,
  guideVersionClaim,
  parseFrontmatter,
} = require('../scripts/verify-manifest-sync.cjs');

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function makeFixtureRoot(version = '3.1.4') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-version-sync-'));
  writeJson(path.join(root, 'manifest.json'), { version });
  writeJson(path.join(root, 'package.json'), { version });
  writeJson(path.join(root, 'package-lock.json'), {
    version,
    packages: { '': { version } },
  });
  writeJson(path.join(root, 'plugins/spk/.claude-plugin/plugin.json'), { version });
  writeJson(path.join(root, 'plugins/spk-codex/.codex-plugin/plugin.json'), { version });
  writeJson(path.join(root, '.claude-plugin/marketplace.json'), {
    plugins: [{ name: 'spk', version }],
  });
  fs.writeFileSync(
    path.join(root, 'USER_GUIDE.md'),
    `# คู่มือผู้ใช้\n\nคู่มือนี้ครอบคลุม Apipoj Skills **v${version}**\n\n/spk:check-release ตรวจความพร้อม v${version}\n`,
  );
  fs.writeFileSync(
    path.join(root, 'USER_GUIDE-EN.md'),
    `# User Guide\n\nThis guide covers Apipoj Skills **v${version}**.\n\n/spk:check-release Check v${version} readiness.\n`,
  );
  return root;
}

describe('manifest version sync', () => {
  test('parses agent frontmatter from Windows CRLF checkouts', () => {
    const content = [
      '---',
      'name: planner',
      'description: Planning agent',
      'model: claude-sonnet-4-6',
      'color: green',
      '---',
    ].join('\r\n');

    expect(parseFrontmatter(content)).toMatchObject({
      name: 'planner',
      description: 'Planning agent',
      model: 'claude-sonnet-4-6',
      color: 'green',
    });
  });

  test('passes when package, lockfile, plugin, and marketplace versions match manifest', () => {
    const root = makeFixtureRoot('3.1.4');
    try {
      expect(collectVersionSyncErrors(root)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports all known release metadata version drift', () => {
    const root = makeFixtureRoot('3.1.4');
    try {
      writeJson(path.join(root, 'package.json'), { version: '3.0.0-alpha.0' });
      writeJson(path.join(root, 'package-lock.json'), {
        version: '3.0.0-alpha.0',
        packages: { '': { version: '3.0.0-alpha.0' } },
      });
      writeJson(path.join(root, 'plugins/spk/.claude-plugin/plugin.json'), { version: '3.1.3' });
      writeJson(path.join(root, 'plugins/spk-codex/.codex-plugin/plugin.json'), { version: '3.1.3' });
      writeJson(path.join(root, '.claude-plugin/marketplace.json'), {
        plugins: [{ name: 'spk', version: '3.1.2' }],
      });

      const errors = collectVersionSyncErrors(root);
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('package.json: version mismatch'),
        expect.stringContaining('package-lock.json: version mismatch'),
        expect.stringContaining('package-lock.json packages[""]: version mismatch'),
        expect.stringContaining('plugins/spk/.claude-plugin/plugin.json: version mismatch'),
        expect.stringContaining('plugins/spk-codex/.codex-plugin/plugin.json: version mismatch'),
        expect.stringContaining('.claude-plugin/marketplace.json plugins[0]: version mismatch'),
      ]));
      expect(errors).toHaveLength(6);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('user guides must document the manifest version', () => {
    // Regression: 6.0.0 shipped with both guides still saying v5.2.0 — the
    // version-bearing source list covered only JSON, so nothing noticed.
    const root = makeFixtureRoot('3.1.4');
    const thai = path.join(root, 'USER_GUIDE.md');
    const english = path.join(root, 'USER_GUIDE-EN.md');
    try {
      expect(collectVersionSyncErrors(root)).toEqual([]);

      fs.writeFileSync(thai, 'คู่มือนี้ครอบคลุม Apipoj Skills **v3.1.3**\n');
      expect(collectVersionSyncErrors(root)).toEqual([
        'USER_GUIDE.md: version mismatch (file=3.1.3 manifest=3.1.4)',
      ]);

      fs.writeFileSync(english, 'This guide covers Apipoj Skills **v2.0.0**.\n');
      expect(collectVersionSyncErrors(root)).toEqual([
        'USER_GUIDE.md: version mismatch (file=3.1.3 manifest=3.1.4)',
        'USER_GUIDE-EN.md: version mismatch (file=2.0.0 manifest=3.1.4)',
      ]);

      // A guide that updates its headline but forgets the example prompt is
      // exactly how 5.2.0 survived: every claim in the file has to agree.
      fs.writeFileSync(thai, 'Apipoj Skills **v3.1.4**\n\n/spk:check-release ตรวจความพร้อม v3.1.3\n');
      expect(collectVersionSyncErrors(root)).toContainEqual(
        'USER_GUIDE.md: version mismatch (file=3.1.4, 3.1.3 manifest=3.1.4)',
      );

      fs.rmSync(thai);
      expect(collectVersionSyncErrors(root)).toContainEqual(
        'USER_GUIDE.md: version mismatch (file=<missing> manifest=3.1.4)',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('guideVersionClaim reads every version claim in a guide', () => {
    const root = makeFixtureRoot('3.1.4');
    const guide = path.join(root, 'USER_GUIDE.md');
    try {
      expect(guideVersionClaim(guide)).toBe('3.1.4');

      fs.writeFileSync(guide, 'Node.js 20 or newer. No release claim here.\n');
      expect(guideVersionClaim(guide)).toBeUndefined();

      expect(guideVersionClaim(path.join(root, 'does-not-exist.md'))).toBeUndefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('released date must match the newest CHANGELOG entry', () => {
    // Regression: manifest.json said released 2026-06-10 while the CHANGELOG
    // dated 3.4.0 as 2026-06-21 — nothing asserted the two agree.
    const root = makeFixtureRoot('3.1.4');
    const changelog = path.join(root, 'CHANGELOG.md');
    try {
      writeJson(path.join(root, 'manifest.json'), { version: '3.1.4', released: '2026-01-02' });
      fs.writeFileSync(changelog, '# Changelog\n\n## Unreleased\n\n## 3.1.4 - 2026-01-02\n');
      expect(collectReleaseDateErrors(root)).toEqual([]);

      fs.writeFileSync(changelog, '# Changelog\n\n## Unreleased\n\n## 3.1.4 - 2026-01-05\n');
      expect(collectReleaseDateErrors(root)).toEqual([
        expect.stringContaining('released=2026-01-02'),
      ]);

      fs.writeFileSync(changelog, '# Changelog\n\n## Unreleased\n\n## 3.1.3 - 2026-01-02\n');
      expect(collectReleaseDateErrors(root)).toEqual([
        expect.stringContaining('newest entry is 3.1.3'),
      ]);

      fs.rmSync(changelog);
      expect(collectReleaseDateErrors(root)).toEqual(['CHANGELOG.md: missing']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
