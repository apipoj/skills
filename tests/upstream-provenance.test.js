const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const contract = require('../contracts/workflows.json');
const {
  PINNED_UPSTREAM_COMMIT,
  collectReferenceDocErrors,
  collectUpstreamProvenanceErrors,
} = require('../scripts/check-upstream-drift.cjs');
const { buildHashIndex, renderPage } = require('../scripts/sync-upstream-docs.cjs');

describe('reviewed upstream provenance', () => {
  test('pins the approved Matt Pocock commit', () => {
    expect(PINNED_UPSTREAM_COMMIT).toBe('84fdeffd12f2ee307994d1eb6feb48173b6e0502');
    expect(collectUpstreamProvenanceErrors(ROOT)).toEqual([]);
  });

  test('every upstream-derived canonical skill has a readable English mirror', () => {
    for (const skill of contract.skills.filter(skill => skill.tier === 'core' && skill.origin.repository === 'mattpocock/skills')) {
      expect(fs.existsSync(path.join(ROOT, skill.sources.en, 'SKILL.md'))).toBe(true);
    }
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

  test('rejects an edited body', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    fs.writeFileSync(file, `${fs.readFileSync(file, 'utf8')}\nSmuggled sentence.\n`);
    expect(collectReferenceDocErrors(root).join('\n')).toMatch(/tdd\.md: content does not match/);
  });

  test('ignores banner edits, which are ours to own', () => {
    const root = referenceFixture();
    const file = path.join(root, 'docs', 'engineering', 'tdd.md');
    const original = fs.readFileSync(file, 'utf8');
    const page = original.replace('`/spk:tdd`', '`/spk:tdd-renamed`');
    expect(page).not.toBe(original);
    fs.writeFileSync(file, page);
    expect(collectReferenceDocErrors(root)).toEqual([]);
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
