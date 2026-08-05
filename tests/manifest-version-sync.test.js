// tests/manifest-version-sync.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const { collectVersionSyncErrors, collectReleaseDateErrors } = require('../scripts/verify-manifest-sync.cjs');

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
  return root;
}

describe('manifest version sync', () => {
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
