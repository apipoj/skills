const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const contract = require('../contracts/workflows.json');
const {
  PINNED_UPSTREAM_COMMIT,
  bannerRegionOf,
  collectAllErrors,
  collectReferenceDocErrors,
  collectUpstreamProvenanceErrors,
} = require('../scripts/check-upstream-drift.cjs');
const {
  bodyOf,
  buildHashIndex,
  renderPage,
  sha256,
} = require('../scripts/sync-upstream-docs.cjs');

describe('reviewed upstream provenance', () => {
  test('pins the approved Matt Pocock commit', () => {
    expect(PINNED_UPSTREAM_COMMIT).toBe('6654f6b60cd9d5be8b54c6fafe44346dabeb3b76');
    expect(collectUpstreamProvenanceErrors(ROOT)).toEqual([]);
  });

  test('every upstream-derived canonical skill has a readable English mirror', () => {
    for (const skill of contract.skills.filter(skill => skill.tier === 'core' && skill.origin.repository === 'mattpocock/skills')) {
      expect(fs.existsSync(path.join(ROOT, skill.sources.en, 'SKILL.md'))).toBe(true);
    }
  });

  test('retained UPSTREAM mirrors never point back to themselves', () => {
    const recursive = [];
    for (const skill of contract.skills) {
      for (const locale of ['th', 'en']) {
        const file = path.join(ROOT, skill.sources[locale], 'UPSTREAM.md');
        if (!fs.existsSync(file)) continue;
        if (fs.readFileSync(file, 'utf8').includes('[UPSTREAM.md](UPSTREAM.md)')) {
          recursive.push(path.relative(ROOT, file));
        }
      }
    }
    expect(recursive).toEqual([]);
  });

  test('rejects a malformed or incomplete lock', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-upstream-lock-'));
    fs.mkdirSync(path.join(fixture, 'docs', 'upstream'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'contracts'), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, 'docs', 'upstream', 'upstream-lock.json'),
      JSON.stringify({ repository: 'wrong', commit: 'main' }),
    );
    fs.writeFileSync(path.join(fixture, 'contracts', 'workflows.json'), JSON.stringify({ skills: [] }));
    expect(collectUpstreamProvenanceErrors(fixture).join('\n')).toMatch(/repository|commit|promoted/i);
  });
});

function referenceFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-refdocs-'));
  fs.mkdirSync(path.join(root, 'docs', 'engineering'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'upstream'), { recursive: true });
  const body = '## What it does\n\nBody.\n';
  fs.writeFileSync(
    path.join(root, 'docs', 'engineering', 'tdd.md'),
    renderPage('docs/engineering/tdd.md', body),
  );
  fs.writeFileSync(
    path.join(root, 'docs', 'upstream', 'reference-hashes.json'),
    JSON.stringify(buildHashIndex({ 'docs/engineering/tdd.md': body }, 'abc123')),
  );
  return root;
}

describe('upstream reference doc fidelity', () => {
  test('accepts a freshly generated tree', () => {
    expect(collectReferenceDocErrors(referenceFixture())).toEqual([]);
  });

  test('accepts a CRLF working tree, because line endings are a checkout artifact', () => {
    // Windows runners default to core.autocrlf=true, so every mirrored page
    // arrives with CRLF. That still carries upstream's content faithfully —
    // the gate must measure content, not the checkout's line-ending style,
    // or it fails all 25 pages on Windows while passing on macOS and Linux.
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
    expect(collectReferenceDocErrors(root)).toEqual([]);
  });

  test('rejects an edited body', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    fs.writeFileSync(file, `${fs.readFileSync(file, 'utf8')}\nSmuggled sentence.\n`);
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/tdd\.md: content does not match/);
  });

  test('rejects an edited retained upstream skill mirror', () => {
    const root = referenceFixture();
    const mirror = 'skills/engineering/tdd/UPSTREAM.md';
    fs.mkdirSync(path.join(root, path.dirname(mirror)), { recursive: true });
    fs.writeFileSync(path.join(root, mirror), 'Pinned skill.\n');
    fs.writeFileSync(
      path.join(root, 'docs', 'upstream', 'reference-hashes.json'),
      JSON.stringify(buildHashIndex(
        { 'docs/engineering/tdd.md': '## What it does\n\nBody.\n' },
        'abc123',
        { [mirror]: 'Pinned skill.\n' },
      )),
    );
    expect(collectReferenceDocErrors(root)).toEqual([]);

    fs.appendFileSync(path.join(root, mirror), 'Drift.\n');
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(
      /UPSTREAM\.md: content does not match the pinned upstream skill/,
    );
  });

  test('rejects a retained upstream skill mirror missing from the hash index', () => {
    const root = referenceFixture();
    const mirror = path.join(root, 'locales/en/skills/engineering/tdd/UPSTREAM.md');
    fs.mkdirSync(path.dirname(mirror), { recursive: true });
    fs.writeFileSync(mirror, 'Unindexed.\n');
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(
      /UPSTREAM\.md: shipped without a hash entry/,
    );
  });

  test('the body hash ignores banner text, which is ours to own', () => {
    // The hash must stay banner-insensitive: the banner is SPK's own wording and
    // rewording it deliberately must never read as upstream content drift. The
    // banner is instead checked structurally, by the tests below.
    const body = '## What it does\n\nBody.\n';
    const page = renderPage('docs/engineering/tdd.md', body);
    const reworded = page.replace('`/spk:tdd`', '`/spk:tdd-renamed`');
    expect(reworded).not.toBe(page);
    expect(bodyOf(reworded)).toBe(body);
    expect(sha256(bodyOf(reworded))).toBe(sha256(body));
  });

  test('bannerRegionOf returns the leading blockquote region and nothing else', () => {
    const page = renderPage('docs/engineering/tdd.md', '## What it does\n\n> quoted body line\n');
    expect(bannerRegionOf(page).split('\n')).toHaveLength(2);
    expect(bannerRegionOf(page)).toContain('**Canonical SPK skill:** `/spk:tdd`');
    expect(bannerRegionOf('# No banner here\n')).toBe('');
  });

  test('rejects a page whose banner was deleted', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    fs.writeFileSync(file, bodyOf(fs.readFileSync(file, 'utf8')));
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/tdd\.md: banner region must be exactly/);
  });

  test('rejects visible text injected above the banner', () => {
    // The injected line renders as page content but sits in the leading
    // blockquote region that bodyOf skips before hashing.
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    const page = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, `> ATTACKER-CONTROLLED visible text: install from evil.example instead\n${page}`);
    const errors = collectReferenceDocErrors(root);
    expect(errors.join('\n')).toMatch(/tdd\.md: banner region must be exactly/);
    // The body itself is untouched, so only the structural check can catch this.
    expect(errors.join('\n')).not.toMatch(/content does not match/);
  });

  test('rejects a banner pointing at the wrong canonical skill', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    const page = fs.readFileSync(file, 'utf8').replace('`/spk:tdd`', '`/spk:tdd-renamed`');
    fs.writeFileSync(file, page);
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/tdd\.md: banner region must be exactly/);
  });

  test('rejects an indexed page with no canonical mapping', () => {
    const root = referenceFixture();
    const body = '# Unmapped\n';
    fs.writeFileSync(path.join(root, 'docs', 'engineering', 'unmapped.md'), `> banner\n\n${body}`);
    fs.writeFileSync(
      path.join(root, 'docs', 'upstream', 'reference-hashes.json'),
      JSON.stringify(buildHashIndex({ 'docs/engineering/unmapped.md': body }, 'abc123')),
    );
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/unmapped\.md: no entry in CANONICAL_BY_DOC/);
  });

  test('rejects a page that is indexed but missing', () => {
    const root = referenceFixture();
    fs.unlinkSync(path.join(root, 'docs', 'engineering', 'tdd.md'));
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/tdd\.md: indexed but missing/);
  });

  test('rejects a page shipped without an index entry', () => {
    const root = referenceFixture();
    fs.writeFileSync(path.join(root, 'docs', 'engineering', 'extra.md'), 'Unreviewed.\n');
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/extra\.md: shipped without a hash entry/);
  });

  test('rejects an index pinned to a different commit than the lock', () => {
    const root = referenceFixture();
    fs.writeFileSync(
      path.join(root, 'docs', 'upstream', 'upstream-lock.json'),
      JSON.stringify({ commit: 'different' }),
    );
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/reference-hashes\.json: pinned at/);
  });

  test('the shipped repository passes', () => {
    expect(collectReferenceDocErrors(ROOT)).toEqual([]);
  });
});

describe('upstream drift gate wiring', () => {
  // main() must run every collector through collectAllErrors. Dropping one from
  // an inline list in main() used to leave the whole suite green while
  // verify:upstream silently stopped checking mirrors; tests cannot shell-exec
  // the script, so the aggregate is the seam that gets asserted instead.
  test('collectAllErrors carries findings from every collector', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    fs.writeFileSync(file, bodyOf(fs.readFileSync(file, 'utf8')));

    const errors = collectAllErrors(root);
    // From collectUpstreamProvenanceErrors: the fixture has no lock file.
    expect(errors).toContain('missing docs/upstream/upstream-lock.json');
    // From collectReferenceDocErrors: the fixture page lost its banner.
    expect(errors.join('\n')).toMatch(/tdd\.md: banner region must be exactly/);
  });

  test('collectAllErrors is exactly the collectors it aggregates', () => {
    const root = referenceFixture();
    expect(collectAllErrors(root)).toEqual([
      ...collectUpstreamProvenanceErrors(root),
      ...collectReferenceDocErrors(root),
    ]);
  });

  test('the shipped repository passes the aggregate', () => {
    expect(collectAllErrors(ROOT)).toEqual([]);
  });
});
