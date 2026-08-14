# Apipoj Skills v6.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 6.0.0 — delete the 21 compatibility aliases, re-pin upstream to `84fdeffd`, and convert the retained upstream reference docs into generated artifacts protected by an offline content-fidelity gate.

**Architecture:** Three independent pieces landed in order. First a new generator, `scripts/sync-upstream-docs.cjs`, that renders `docs/engineering/**` and `docs/productivity/**` verbatim from a pinned upstream checkout and writes a sha256 index. Then the real regeneration at the new pin. Then a new offline check inside `check-upstream-drift.cjs` that recomputes those hashes so a future re-pin cannot ship stale mirrors. Alias removal is a separate, atomic task because roster counts appear in the contract, manifest, payloads, eval corpus, generated READMEs, and three test files at once.

**Tech Stack:** Node.js CommonJS (`.cjs`), no runtime deps beyond Node built-ins, Jest, `git show` for reading pinned upstream content.

## Global Constraints

- All scripts are CommonJS `.cjs`, no external runtime dependencies beyond Node built-ins and `ajv`/`ajv-formats`.
- `REPO_ROOT` is derived from `__dirname` — never hardcode absolute paths.
- Every script exports its validation logic as named functions so Jest can import them; every new script gets a matching suite in `tests/`.
- Scripts must exit non-zero on failure. No script may require network access.
- Tests use `fs.mkdtempSync` fixtures and never write outside `os.tmpdir()`, never mutate repo files.
- Never hand-edit anything under `plugins/spk-codex/` or `.claude-plugin/marketplace.json` — run `npm run generate:platforms`.
- Every version-bearing file must equal `manifest.json`.version.
- Target version `6.0.0`. `manifest.json`.`released` must equal the newest CHANGELOG date heading exactly; this plan uses `2026-08-13` — if it ships later, change both together.
- New upstream pin: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`. Old pin: `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`.
- Thai is canonical for user-facing text; keep familiar English technical identifiers.

## File Structure

**Created:**
- `scripts/sync-upstream-docs.cjs` — renders reference pages from a pinned upstream checkout and writes the hash index. Manual, reviewed, never in CI.
- `tests/upstream-docs-sync.test.js` — covers rendering, body extraction, hash index construction, and the unmapped-page failure.
- `docs/upstream/reference-hashes.json` — generated. Maps each mirrored page to the sha256 of its post-banner body.

**Modified:**
- `scripts/check-upstream-drift.cjs` — new `collectReferenceDocErrors()`; pin constant; `EXPECTED_PROMOTED_SKILLS` 25 → 24.
- `tests/upstream-provenance.test.js` — new pin; new suite for the fidelity gate.
- `contracts/workflows.json` — drop 21 `tier: "compat"` entries (61 → 40).
- `manifest.json` — drop 21 commands (61 → 40); version; released.
- `evals/skilllab-scenarios.json` — drop 21 alias entries (61 → 40).
- `docs/engineering/*.md`, `docs/productivity/*.md` — regenerated, 21 → 25 pages.
- `package.json` — `sync:upstream-docs` script; version.
- Deleted: `skills/compat/`, `locales/en/skills/compat/`, 21 dirs under `plugins/spk/skills/`, `docs/productivity/writing-great-skills.md`.

**Responsibility boundary:** `sync-upstream-docs.cjs` owns *producing* mirrored pages and hashes and is the only thing that reads upstream. `check-upstream-drift.cjs` owns *verifying* them offline and never reads upstream. Keeping these apart is what lets the gate run in CI where no upstream remote exists.

---

### Task 1: Reference-doc generator

Pure module work against temp fixtures. Repo docs are untouched by this task.

**Files:**
- Create: `scripts/sync-upstream-docs.cjs`
- Create: `tests/upstream-docs-sync.test.js`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all exported from `scripts/sync-upstream-docs.cjs`:
  - `BANNER_NOTICE: string` — the Thai upstream-reference line, verbatim from today's pages.
  - `CANONICAL_BY_DOC: Record<string, string|null>` — repo-relative doc path → SPK skill id, or `null` when SPK ships no counterpart.
  - `renderCanonicalLine(skill: string|null): string` — the second banner line for a skill id, or the no-counterpart notice for `null`.
  - `renderPage(docPath: string, upstreamBody: string): string` — banner + blank line + body. Throws `Error` when `docPath` is absent from `CANONICAL_BY_DOC`.
  - `bodyOf(pageText: string): string` — strips the leading `>` banner block and following blank lines.
  - `sha256(text: string): string` — lowercase hex digest.
  - `buildHashIndex(pages: Record<string,string>, pin: string): object` — `{ pin, algorithm: 'sha256', pages: { [path]: sha } }`.

- [ ] **Step 1: Write the failing test**

Create `tests/upstream-docs-sync.test.js`:

```js
const {
  BANNER_NOTICE,
  CANONICAL_BY_DOC,
  NO_COUNTERPART,
  bodyOf,
  buildHashIndex,
  renderCanonicalLine,
  renderPage,
  sha256,
} = require('../scripts/sync-upstream-docs.cjs');

describe('upstream reference doc generator', () => {
  test('renders the banner, the canonical pointer, then the verbatim body', () => {
    const page = renderPage('docs/engineering/implement.md', '## What it does\n\nBody text.\n');
    const lines = page.split('\n');
    expect(lines[0]).toBe(BANNER_NOTICE);
    expect(lines[1]).toBe('> **Canonical SPK skill:** `/code`');
    expect(lines[2]).toBe('');
    expect(page.endsWith('## What it does\n\nBody text.\n')).toBe(true);
  });

  test('says so when SPK ships no counterpart', () => {
    expect(renderCanonicalLine(null)).toBe(NO_COUNTERPART);
    expect(renderCanonicalLine('code')).toBe('> **Canonical SPK skill:** `/code`');
  });

  test('refuses to render a page nobody has reviewed', () => {
    expect(() => renderPage('docs/engineering/brand-new.md', 'Body.\n')).toThrow(
      /docs\/engineering\/brand-new\.md.*CANONICAL_BY_DOC/,
    );
  });

  test('bodyOf is the inverse of renderPage', () => {
    const body = '## What it does\n\nBody text.\n';
    expect(bodyOf(renderPage('docs/engineering/tdd.md', body))).toBe(body);
  });

  test('bodyOf ignores banner edits, so hashes track upstream content only', () => {
    const body = 'Body.\n';
    const page = renderPage('docs/engineering/tdd.md', body);
    const edited = page.replace('> **Canonical SPK skill:** `/tdd`', '> **Canonical SPK skill:** `/other`');
    expect(bodyOf(edited)).toBe(bodyOf(page));
  });

  test('builds a pinned hash index over post-banner bodies', () => {
    const index = buildHashIndex({ 'docs/engineering/tdd.md': 'Body.\n' }, 'abc123');
    expect(index).toEqual({
      pin: 'abc123',
      algorithm: 'sha256',
      pages: { 'docs/engineering/tdd.md': sha256('Body.\n') },
    });
  });

  test('maps every shipped reference page to a reviewed decision', () => {
    expect(Object.keys(CANONICAL_BY_DOC)).toHaveLength(25);
    expect(CANONICAL_BY_DOC['docs/productivity/grill-me.md']).toBe('ask-me');
    expect(CANONICAL_BY_DOC['docs/productivity/writing-for-agents.md']).toBe('write-skills');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/upstream-docs-sync.test.js`
Expected: FAIL — `Cannot find module '../scripts/sync-upstream-docs.cjs'`

- [ ] **Step 3: Write the generator**

Create `scripts/sync-upstream-docs.cjs`:

```js
#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const BANNER_NOTICE =
  '> **Upstream reference:** หน้านี้เก็บเนื้อหาจาก `mattpocock/skills` ที่ pin ไว้เพื่อการเทียบ provenance ' +
  'คำสั่งติดตั้งด้านล่างไม่ใช่คำสั่งติดตั้ง Apipoj Skills; ใช้ `README.md` หรือ `INSTALL_FOR_AGENTS.md` ที่ root';

const NO_COUNTERPART = '> **Canonical SPK skill:** ไม่มี — SPK ไม่ได้ ship สกิลนี้';

// Upstream page -> the SPK skill it documents. `null` means SPK ships no
// counterpart. A page missing from this map is a review gate, not a default:
// the next re-pin must decide where it belongs before it can ship.
const CANONICAL_BY_DOC = {
  'docs/engineering/ask-matt.md': 'start',
  'docs/engineering/code-review.md': 'code-review',
  'docs/engineering/codebase-design.md': 'codebase-design',
  'docs/engineering/diagnosing-bugs.md': 'debug',
  'docs/engineering/domain-modeling.md': 'domain-modeling',
  'docs/engineering/grill-with-docs.md': 'ask-with-docs',
  'docs/engineering/implement.md': 'code',
  'docs/engineering/improve-codebase-architecture.md': 'improve-codebase',
  'docs/engineering/prototype.md': 'prototype',
  'docs/engineering/research.md': 'research',
  'docs/engineering/resolving-merge-conflicts.md': 'fix-conflicts',
  'docs/engineering/setup-matt-pocock-skills.md': 'setup',
  'docs/engineering/tdd.md': 'tdd',
  'docs/engineering/to-spec.md': 'to-spec',
  'docs/engineering/to-tickets.md': 'to-tickets',
  'docs/engineering/triage.md': 'triage',
  'docs/engineering/wayfinder.md': 'wayfinder',
  'docs/engineering/wizard.md': 'wizard',
  'docs/productivity/grill-me.md': 'ask-me',
  'docs/productivity/grilling.md': 'asking',
  'docs/productivity/handoff.md': 'handoff',
  'docs/productivity/teach.md': 'teach',
  'docs/productivity/to-questionnaire.md': 'to-questionnaire',
  'docs/productivity/wait-what.md': 'wait-what',
  'docs/productivity/writing-for-agents.md': 'write-skills',
};

function renderCanonicalLine(skill) {
  return skill === null ? NO_COUNTERPART : `> **Canonical SPK skill:** \`/${skill}\``;
}

function canonicalLine(docPath) {
  if (!(docPath in CANONICAL_BY_DOC)) {
    throw new Error(
      `${docPath}: no entry in CANONICAL_BY_DOC — review where this upstream page belongs before shipping it`,
    );
  }
  return renderCanonicalLine(CANONICAL_BY_DOC[docPath]);
}

function renderPage(docPath, upstreamBody) {
  return `${BANNER_NOTICE}\n${canonicalLine(docPath)}\n\n${upstreamBody}`;
}

function bodyOf(pageText) {
  const lines = pageText.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].startsWith('>')) index += 1;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  return lines.slice(index).join('\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildHashIndex(pages, pin) {
  const entries = Object.keys(pages)
    .sort()
    .map(docPath => [docPath, sha256(pages[docPath])]);
  return { pin, algorithm: 'sha256', pages: Object.fromEntries(entries) };
}

function readUpstreamPage(upstreamDir, pin, docPath) {
  return childProcess.execFileSync('git', ['show', `${pin}:${docPath}`], {
    cwd: upstreamDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listUpstreamPages(upstreamDir, pin) {
  const output = childProcess.execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', pin, '--', 'docs/engineering', 'docs/productivity'],
    { cwd: upstreamDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return output.trim().split('\n').filter(file => file.endsWith('.md'));
}

function main() {
  const args = process.argv.slice(2);
  const fromIndex = args.indexOf('--from');
  const pinIndex = args.indexOf('--pin');
  if (fromIndex < 0 || !args[fromIndex + 1]) {
    console.error('usage: sync-upstream-docs.cjs --from <upstream-checkout> [--pin <commit>]');
    process.exit(1);
  }
  const upstreamDir = path.resolve(args[fromIndex + 1]);
  const lock = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'docs', 'upstream', 'upstream-lock.json'), 'utf8'),
  );
  const pin = pinIndex >= 0 ? args[pinIndex + 1] : lock.commit;

  const docPaths = listUpstreamPages(upstreamDir, pin);
  const bodies = {};
  for (const docPath of docPaths) {
    const body = readUpstreamPage(upstreamDir, pin, docPath);
    fs.mkdirSync(path.join(REPO_ROOT, path.dirname(docPath)), { recursive: true });
    fs.writeFileSync(path.join(REPO_ROOT, docPath), renderPage(docPath, body));
    bodies[docPath] = body;
  }

  for (const bucket of ['docs/engineering', 'docs/productivity']) {
    const dir = path.join(REPO_ROOT, bucket);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.md'))) {
      const relative = `${bucket}/${file}`;
      if (!docPaths.includes(relative)) {
        fs.unlinkSync(path.join(REPO_ROOT, relative));
        console.log(`removed (absent upstream): ${relative}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(REPO_ROOT, 'docs', 'upstream', 'reference-hashes.json'),
    `${JSON.stringify(buildHashIndex(bodies, pin), null, 2)}\n`,
  );
  console.log(`Synced ${docPaths.length} upstream reference pages at ${pin.slice(0, 7)}`);
}

if (require.main === module) main();

module.exports = {
  BANNER_NOTICE,
  CANONICAL_BY_DOC,
  NO_COUNTERPART,
  bodyOf,
  buildHashIndex,
  canonicalLine,
  listUpstreamPages,
  readUpstreamPage,
  renderCanonicalLine,
  renderPage,
  sha256,
};
```

`null` is a live value in `CANONICAL_BY_DOC` even though no page needs it today: it is how a future re-pin records "upstream documents a skill SPK does not ship" without weakening the hard failure for pages nobody has reviewed at all.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/upstream-docs-sync.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Register the npm script**

In `package.json`, add to `scripts` after `"regen:check"`:

```json
    "sync:upstream-docs": "node scripts/sync-upstream-docs.cjs",
```

Do **not** add it to `verify:release` — it needs an upstream checkout and writes files.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-upstream-docs.cjs tests/upstream-docs-sync.test.js package.json
git commit -m "feat: add upstream reference doc generator"
```

---

### Task 2: Re-pin and regenerate the reference docs

The first task that touches repo content. After it, the banner's provenance claim is true again.

**Files:**
- Modify: `docs/upstream/upstream-lock.json`, `docs/upstream/mattpocock-skills.md:3`
- Modify: `scripts/check-upstream-drift.cjs:9`, `tests/upstream-provenance.test.js:14`
- Modify: `README.md:188`, `README-EN.md:188`
- Regenerate: `docs/engineering/*.md`, `docs/productivity/*.md`
- Create: `docs/upstream/reference-hashes.json`

**Interfaces:**
- Consumes: `sync-upstream-docs.cjs` `main()` from Task 1.
- Produces: `docs/upstream/reference-hashes.json` with 25 entries at pin `84fdeffd...`, consumed by Task 3's gate.

- [ ] **Step 1: Update the pin test first**

In `tests/upstream-provenance.test.js:14`, change the expected commit:

```js
    expect(PINNED_UPSTREAM_COMMIT).toBe('84fdeffd12f2ee307994d1eb6feb48173b6e0502');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/upstream-provenance.test.js`
Expected: FAIL — `Expected: "84fdeffd..." Received: "6acc160e..."`

- [ ] **Step 3: Move the pin in the script and the lock**

`scripts/check-upstream-drift.cjs:9`:

```js
const PINNED_UPSTREAM_COMMIT = '84fdeffd12f2ee307994d1eb6feb48173b6e0502';
```

`docs/upstream/upstream-lock.json`:

```json
{
  "repository": "https://github.com/mattpocock/skills",
  "commit": "84fdeffd12f2ee307994d1eb6feb48173b6e0502",
  "importedAt": "2026-08-13",
  "promotedBuckets": [
    "engineering",
    "productivity"
  ],
  "excludedBuckets": [
    "misc",
    "personal",
    "in-progress",
    "deprecated"
  ]
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/upstream-provenance.test.js`
Expected: PASS

- [ ] **Step 5: Update the prose pin references**

`docs/upstream/mattpocock-skills.md:3` — change the commit and the version word:

```markdown
Apipoj Skills v6 is based on commit `84fdeffd12f2ee307994d1eb6feb48173b6e0502`.
```

`README.md:188` — replace the old hash with `84fdeffd12f2ee307994d1eb6feb48173b6e0502`, leaving the surrounding Thai sentence unchanged.

`README-EN.md:188` — same substitution in the English sentence.

- [ ] **Step 6: Regenerate the pages from a real checkout**

```bash
git clone https://github.com/mattpocock/skills /tmp/mp-skills
npm run sync:upstream-docs -- --from /tmp/mp-skills
```

Expected output: `Synced 25 upstream reference pages at 84fdeff`, plus one line `removed (absent upstream): docs/productivity/writing-great-skills.md`.

- [ ] **Step 7: Confirm the regeneration did what the spec said**

```bash
git status --porcelain docs/ | sort
```

Expected: 21 modified pages, 4 added (`wizard.md`, `to-questionnaire.md`, `wait-what.md`, `writing-for-agents.md`), 1 deleted (`writing-great-skills.md`), 1 added hash index.

```bash
node -e "const i=require('./docs/upstream/reference-hashes.json');console.log(Object.keys(i.pages).length, i.pin)"
```

Expected: `25 84fdeffd12f2ee307994d1eb6feb48173b6e0502`

```bash
grep -c 'Canonical SPK skill' docs/engineering/*.md docs/productivity/*.md | grep -v ':1$'
```

Expected: no output — every page carries exactly one canonical line.

- [ ] **Step 8: Commit**

```bash
git add docs/ scripts/check-upstream-drift.cjs tests/upstream-provenance.test.js README.md README-EN.md
git commit -m "chore: re-pin upstream at 84fdeffd and regenerate reference docs"
```

---

### Task 3: Offline content-fidelity gate

**Files:**
- Modify: `scripts/check-upstream-drift.cjs`
- Modify: `tests/upstream-provenance.test.js`
- Modify: `package.json` (`verify:release` unchanged — `verify:upstream` already runs there; the new check joins that script)

**Interfaces:**
- Consumes: `bodyOf` and `sha256` from `scripts/sync-upstream-docs.cjs`; `docs/upstream/reference-hashes.json` from Task 2.
- Produces: `collectReferenceDocErrors(rootDir: string): string[]`, exported from `scripts/check-upstream-drift.cjs`. Empty array means clean.

- [ ] **Step 1: Write the failing test**

In `tests/upstream-provenance.test.js`, add `collectReferenceDocErrors,` to the existing destructured `require('../scripts/check-upstream-drift.cjs')` at lines 7–10 — do not add a second `require` of the same module. Then add one new import line beneath it and append the suite at the end of the file:

```js
const { buildHashIndex, renderPage } = require('../scripts/sync-upstream-docs.cjs');

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
    const page = fs.readFileSync(file, 'utf8').replace('`/tdd`', '`/tdd-renamed`');
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/upstream-provenance.test.js`
Expected: FAIL — `collectReferenceDocErrors is not a function`

- [ ] **Step 3: Implement the check**

In `scripts/check-upstream-drift.cjs`, add near the top after the existing requires:

```js
const { bodyOf, sha256 } = require('./sync-upstream-docs.cjs');

const REFERENCE_BUCKETS = ['docs/engineering', 'docs/productivity'];
```

Then add this function above `main()`:

```js
function collectReferenceDocErrors(rootDir = REPO_ROOT) {
  const errors = [];
  const indexPath = path.join(rootDir, 'docs', 'upstream', 'reference-hashes.json');
  if (!fs.existsSync(indexPath)) return ['missing docs/upstream/reference-hashes.json'];

  let index;
  try {
    index = readJson(indexPath);
  } catch (error) {
    return [`invalid docs/upstream/reference-hashes.json: ${error.message}`];
  }

  const lockPath = path.join(rootDir, 'docs', 'upstream', 'upstream-lock.json');
  if (fs.existsSync(lockPath)) {
    try {
      const lock = readJson(lockPath);
      if (index.pin !== lock.commit) {
        errors.push(
          `reference-hashes.json: pinned at ${index.pin} but the lock says ${lock.commit} — regenerate with sync:upstream-docs`,
        );
      }
    } catch (error) {
      errors.push(`invalid docs/upstream/upstream-lock.json: ${error.message}`);
    }
  }

  const indexed = index.pages || {};
  for (const [docPath, expected] of Object.entries(indexed)) {
    const file = path.join(rootDir, docPath);
    if (!fs.existsSync(file)) {
      errors.push(`${docPath}: indexed but missing from the working tree`);
      continue;
    }
    const actual = sha256(bodyOf(fs.readFileSync(file, 'utf8')));
    if (actual !== expected) {
      errors.push(`${docPath}: content does not match the pinned upstream page`);
    }
  }

  for (const bucket of REFERENCE_BUCKETS) {
    const dir = path.join(rootDir, bucket);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.md'))) {
      const relative = `${bucket}/${file}`;
      if (!(relative in indexed)) {
        errors.push(`${relative}: shipped without a hash entry — run sync:upstream-docs`);
      }
    }
  }

  return errors;
}
```

Wire it into `main()` — replace the existing opening of `main()`:

```js
function main() {
  const errors = [...collectUpstreamProvenanceErrors(), ...collectReferenceDocErrors()];
```

And add to the `module.exports` block:

```js
  collectReferenceDocErrors,
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/upstream-provenance.test.js`
Expected: PASS, including `the shipped repository passes`.

- [ ] **Step 5: Prove the gate catches the failure that shipped in 5.1**

```bash
printf '\nSmuggled sentence.\n' >> docs/engineering/tdd.md
npm run verify:upstream; echo "exit=$?"
git checkout docs/engineering/tdd.md
```

Expected: exit=1 with `docs/engineering/tdd.md: content does not match the pinned upstream page`. Then a clean re-run:

```bash
npm run verify:upstream; echo "exit=$?"
```

Expected: exit=0.

- [ ] **Step 6: Document the new script**

In `scripts/AGENTS.md`, add a row to the Entry Points table after `check-upstream-drift.cjs`:

```markdown
| `sync-upstream-docs.cjs` | Regenerates the retained upstream reference pages from a pinned checkout and writes their sha256 index |
```

And amend the `check-upstream-drift.cjs` row to end with `, and verifies retained reference pages against docs/upstream/reference-hashes.json`.

In `.agents/writing-docs.md`, replace the final paragraph:

```markdown
Files under `docs/engineering/` and `docs/productivity/` are generated mirrors of the
pinned Matt Pocock fork. Do not edit them by hand — run `npm run sync:upstream-docs --
--from <upstream-checkout>`. They are not Apipoj installation instructions. Each page
carries the upstream-reference banner plus the canonical SPK skill it documents, and
`npm run verify:upstream` checks every body against `docs/upstream/reference-hashes.json`.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/check-upstream-drift.cjs tests/upstream-provenance.test.js scripts/AGENTS.md .agents/writing-docs.md
git commit -m "feat: gate retained upstream reference docs on content hashes"
```

---

### Task 4: Remove the 21 compatibility aliases

Atomic. Roster counts live in the contract, manifest, eval corpus, generated READMEs, and three test files simultaneously; a partial removal leaves the gates red.

**Files:**
- Delete: `skills/compat/`, `locales/en/skills/compat/`, 21 dirs under `plugins/spk/skills/`
- Modify: `contracts/workflows.json`, `manifest.json`, `evals/skilllab-scenarios.json`
- Modify: `scripts/check-upstream-drift.cjs`, `CLAUDE.md`, `RESOLVER.md`, `USER_GUIDE.md`, `USER_GUIDE-EN.md`, `INSTALL_FOR_AGENTS.md`
- Modify: `tests/apipoj-skills-v5.test.js`, `tests/pipeline.test.js`
- Regenerate: `README.md`, `README-EN.md`, `plugins/spk-codex/`

**Interfaces:**
- Consumes: nothing from Tasks 1–3.
- Produces: a contract with 40 `tier: "core"` skills and zero `tier: "compat"` skills. `EXPECTED_PROMOTED_SKILLS` becomes `24`.

The 21 removed ids and their canonical targets: `ask-matt`→`start`, `spk`→`start`, `jumpstart`→`start`, `setup-matt-pocock-skills`→`setup`, `review`→`code-review`, `grill-me`→`ask-me`, `grilling`→`asking`, `grill-with-docs`→`ask-with-docs`, `diagnosing-bugs`→`debug`, `implement`→`code`, `design-shotgun`→`design-options`, `resolving-merge-conflicts`→`fix-conflicts`, `writing-great-skills`→`write-skills`, `writing-for-agents`→`write-skills`, `prime`→`load-project`, `query`→`ask-project`, `ingest`→`add-knowledge`, `wiki-lint`→`check-wiki`, `improve-codebase-architecture`→`improve-codebase`, `scoped-tests`→`test-changes`, `release-check`→`check-release`.

- [ ] **Step 1: Write the failing tests**

In `tests/apipoj-skills-v5.test.js:92`, replace the test:

```js
  test('declares 40 canonical skills and no compatibility aliases', () => {
    const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts/workflows.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
    expect(contract.skills.filter(skill => skill.tier === 'core')).toHaveLength(40);
    expect(contract.skills.filter(skill => skill.tier === 'compat')).toHaveLength(0);
    expect(contract.skills.every(skill => !skill.aliasFor)).toBe(true);
    expect(contract.skills).toHaveLength(40);
    expect(manifest.commands).toHaveLength(40);
  });

  test('ships no compatibility bucket', () => {
    expect(fs.existsSync(path.join(ROOT, 'skills/compat'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'locales/en/skills/compat'))).toBe(false);
  });
```

Keep the surrounding `describe` and any `ROOT`/`fs`/`path` bindings already in the file; do not redeclare them.

In `tests/pipeline.test.js:45`, change the expected roster string:

```js
    expect(match[1]).toMatch(/\*\*40 skills\*\*/);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest tests/apipoj-skills-v5.test.js tests/pipeline.test.js`
Expected: FAIL — `Expected length: 0, Received length: 21` and a roster-string mismatch.

- [ ] **Step 3: Delete the alias sources and payloads**

```bash
git rm -r --quiet skills/compat locales/en/skills/compat
for id in ask-matt spk jumpstart setup-matt-pocock-skills review grill-me grilling \
  grill-with-docs diagnosing-bugs implement design-shotgun resolving-merge-conflicts \
  writing-great-skills writing-for-agents prime query ingest wiki-lint \
  improve-codebase-architecture scoped-tests release-check; do
  git rm -r --quiet "plugins/spk/skills/$id"
done
```

- [ ] **Step 4: Drop the alias entries from the three JSON rosters**

```bash
node -e "
const fs = require('fs');
const ids = new Set(require('./contracts/workflows.json').skills.filter(s => s.tier === 'compat').map(s => s.id));
if (ids.size !== 21) throw new Error('expected 21 compat skills, found ' + ids.size);

const contract = require('./contracts/workflows.json');
contract.skills = contract.skills.filter(s => s.tier !== 'compat');
fs.writeFileSync('contracts/workflows.json', JSON.stringify(contract, null, 2) + '\n');

const manifest = require('./manifest.json');
manifest.commands = manifest.commands.filter(c => !ids.has(c.name.replace(/^\//, '')));
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

const evals = require('./evals/skilllab-scenarios.json');
evals.skills = evals.skills.filter(s => !ids.has(s.id));
fs.writeFileSync('evals/skilllab-scenarios.json', JSON.stringify(evals, null, 2) + '\n');

console.log('contract', contract.skills.length, 'commands', manifest.commands.length, 'evals', evals.skills.length);
"
```

Expected: `contract 40 commands 40 evals 40`

Then confirm the JSON formatting matches what was committed before, so the diff stays reviewable:

```bash
git diff --stat contracts/workflows.json manifest.json evals/skilllab-scenarios.json
```

If the whole file reformats rather than showing only removed blocks, restore with `git checkout` and remove the entries with an editor instead.

- [ ] **Step 5: Lower the promoted-skill count**

`scripts/check-upstream-drift.cjs:13`:

```js
const EXPECTED_PROMOTED_SKILLS = 24;
```

The count drops by exactly one: of the 21 aliases, only `grill-me` was ever counted, because its target `ask-me` is not itself upstream-derived and the filter admits that case alone.

- [ ] **Step 6: Regenerate READMEs and the Codex payload**

```bash
npm run regen
npm run generate:platforms
```

`regenerate-docs.cjs` already handles a zero-alias roster: with no compat skills it renders `**21 subagents** (4 orchestrators + 17 specialists) · **40 skills**` in both READMEs, dropping the `+ N ชื่อเดิม` clause. No hand-editing.

- [ ] **Step 7: Remove alias references from the prose docs**

- `CLAUDE.md` — remove `compat` from the bucket list in **Sources of truth**, and delete the two Conventions bullets covering canonical renames and compatibility aliases. Both describe machinery that no longer exists.
- `RESOLVER.md` — delete rule 5 (`Compatibility aliases disclose their canonical replacement...`), renumbering what follows, and delete the `### Compatibility aliases` section.
- `USER_GUIDE.md`, `USER_GUIDE-EN.md`, `INSTALL_FOR_AGENTS.md` — remove alias mentions. Find them with:

```bash
grep -rn "ask-matt\|setup-matt-pocock-skills\|grill-me\|grilling\|grill-with-docs\|diagnosing-bugs\|design-shotgun\|resolving-merge-conflicts\|writing-great-skills\|writing-for-agents\|wiki-lint\|improve-codebase-architecture\|scoped-tests\|release-check\|jumpstart\|ชื่อเดิม\|compatibility alias" USER_GUIDE.md USER_GUIDE-EN.md INSTALL_FOR_AGENTS.md RESOLVER.md CLAUDE.md
```

Do not touch `CHANGELOG.md` history — past entries are a record and stay as written.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS. If `verify:refs` or `verify:native` style suites fail on a lingering alias reference, the grep in Step 7 missed a file — fix and re-run.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat!: remove the 21 compatibility aliases"
```

---

### Task 5: Release 6.0.0

**Files:**
- Modify: `manifest.json`, `package.json`, `package-lock.json`, `plugins/spk/.claude-plugin/plugin.json`, `CHANGELOG.md`
- Regenerate: `.claude-plugin/marketplace.json`, `plugins/spk-codex/.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: the 40-skill roster from Task 4 and the hash gate from Task 3.
- Produces: a release that passes `npm run verify:release`.

- [ ] **Step 1: Write the CHANGELOG entry**

Insert directly below the `# Apipoj Skills` title in `CHANGELOG.md`:

```markdown
## 6.0.0 - 2026-08-13

### Breaking Changes

- Removed all 21 compatibility aliases. `skills/compat/` promised support only up to 6.0.0, and this release keeps that promise. Typing a removed name now reports that no such skill exists instead of forwarding. The canonical replacements: `ask-matt`/`spk`/`jumpstart` → `/start`, `setup-matt-pocock-skills` → `/setup`, `review` → `/code-review`, `grill-me` → `/ask-me`, `grilling` → `/asking`, `grill-with-docs` → `/ask-with-docs`, `diagnosing-bugs` → `/debug`, `implement` → `/code`, `design-shotgun` → `/design-options`, `resolving-merge-conflicts` → `/fix-conflicts`, `writing-great-skills`/`writing-for-agents` → `/write-skills`, `prime` → `/load-project`, `query` → `/ask-project`, `ingest` → `/add-knowledge`, `wiki-lint` → `/check-wiki`, `improve-codebase-architecture` → `/improve-codebase`, `scoped-tests` → `/test-changes`, `release-check` → `/check-release`.
- The published roster is now 40 canonical skills with no alias tier.

### Upstream

- Re-pinned the reviewed `mattpocock/skills` source at `84fdeffd12f2ee307994d1eb6feb48173b6e0502`, up from `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`. The only substantive change in range is one sentence in an upstream reference page; no skill behavior changed.

### Fixed

- The retained upstream reference pages under `docs/` were stale. Every page claimed to hold the content of the pinned commit while holding pre-5.1 text, and four pages — `wizard`, `to-questionnaire`, `wait-what`, `writing-for-agents` — were never created when 5.1 added those skills. All 25 pages are now generated from the pin.

### Added

- `npm run sync:upstream-docs` regenerates the reference pages from an upstream checkout and writes `docs/upstream/reference-hashes.json`.
- `npm run verify:upstream` now verifies every reference page body against that index. Re-pinning without regenerating fails the release gate — the exact gap that let 5.1 ship stale mirrors.
```

- [ ] **Step 2: Bump every version-bearing file**

```bash
node -e "
const fs = require('fs');
const bump = (file, mutate) => { const j = JSON.parse(fs.readFileSync(file, 'utf8')); mutate(j); fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n'); };
bump('manifest.json', j => { j.version = '6.0.0'; j.released = '2026-08-13'; });
bump('package.json', j => { j.version = '6.0.0'; });
bump('package-lock.json', j => { j.version = '6.0.0'; j.packages[''].version = '6.0.0'; });
bump('plugins/spk/.claude-plugin/plugin.json', j => { j.version = '6.0.0'; });
"
npm run generate:platforms
npm run regen
```

`.claude-plugin/marketplace.json` and `plugins/spk-codex/.codex-plugin/plugin.json` are generated — do not edit them by hand.

- [ ] **Step 3: Verify version parity**

Run: `npm run validate:manifest && npm run verify:sync`
Expected: both exit 0. A failure names the exact file still on 5.2.0.

- [ ] **Step 4: Run the full release gate**

Run: `npm run verify:release`
Expected: every gate exits 0, ending with the coverage summary. Paste the tail of the output into the PR body as release evidence.

- [ ] **Step 5: Confirm the generated tree is stable**

```bash
npm run generate:platforms && npm run regen && git status --porcelain
```

Expected: empty output. Any diff here means a generator is non-deterministic or a source was hand-edited.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "release: 6.0.0"
```

- [ ] **Step 7: Manual behavioral check**

In a real Claude Code session with the branch installed, confirm:
- `/start` resolves and routes normally.
- `/implement` and `/grill-me` report that no such skill exists — they must not silently route to `/code` or `/ask-me`.
- `/code` and `/ask-me` both work.

Record the observed outcomes. If a removed name still resolves, a payload directory survived Step 3 of Task 4.

---

## Notes for the reviewer

- Tasks 1–3 are independently reviewable and leave the repo green at every commit. Task 3 is the one that changes future behavior: after it, a re-pin without a regeneration fails `verify:release`.
- Task 4 is deliberately one commit. Splitting it leaves roster counts disagreeing across the contract, manifest, eval corpus, and generated READMEs, so the gates would be red mid-sequence.
- The plan does not rename the reference pages. `docs/engineering/implement.md` outlives `/implement` on purpose: the 1:1 path mapping is what makes the hash index and any future upstream diff meaningful. The second banner line carries the canonical name instead.
