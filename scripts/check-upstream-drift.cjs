#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  BANNER_NOTICE,
  bodyOf,
  canonicalLine,
  normalizeEol,
  sha256,
} = require('./sync-upstream-docs.cjs');

const REFERENCE_BUCKETS = ['docs/engineering', 'docs/productivity'];

const REPO_ROOT = path.join(__dirname, '..');
const PINNED_UPSTREAM_COMMIT = '6654f6b60cd9d5be8b54c6fafe44346dabeb3b76';
const EXPECTED_BUCKETS = ['engineering', 'productivity'];
// Canonical upstream skills we ship. Raise this deliberately when a review
// promotes a new skill.
const EXPECTED_PROMOTED_SKILLS = 24;
const EXCLUDED_BUCKETS = ['misc', 'personal', 'in-progress', 'deprecated'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectUpstreamProvenanceErrors(rootDir = REPO_ROOT) {
  const errors = [];
  const lockPath = path.join(rootDir, 'docs', 'upstream', 'upstream-lock.json');
  const contractPath = path.join(rootDir, 'contracts', 'workflows.json');
  if (!fs.existsSync(lockPath)) return ['missing docs/upstream/upstream-lock.json'];
  if (!fs.existsSync(contractPath)) return ['missing contracts/workflows.json'];

  let lock;
  let contract;
  try {
    lock = readJson(lockPath);
    contract = readJson(contractPath);
  } catch (error) {
    return [`invalid upstream provenance JSON: ${error.message}`];
  }

  if (lock.repository !== 'https://github.com/mattpocock/skills') {
    errors.push('upstream repository must be https://github.com/mattpocock/skills');
  }
  if (lock.commit !== PINNED_UPSTREAM_COMMIT) {
    errors.push(`upstream commit must be ${PINNED_UPSTREAM_COMMIT}`);
  }
  if (JSON.stringify(lock.promotedBuckets) !== JSON.stringify(EXPECTED_BUCKETS)) {
    errors.push(`promoted buckets must be ${EXPECTED_BUCKETS.join(', ')}`);
  }
  if (JSON.stringify(lock.excludedBuckets) !== JSON.stringify(EXCLUDED_BUCKETS)) {
    errors.push(`excluded buckets must be ${EXCLUDED_BUCKETS.join(', ')}`);
  }

  const contractById = new Map(contract.skills.map(skill => [skill.id, skill]));
  const promoted = contract.skills.filter(skill => {
    if (skill.origin?.repository !== 'mattpocock/skills') return false;
    if (skill.tier === 'core') return true;
    const target = contractById.get(skill.aliasFor);
    return target?.origin?.repository !== 'mattpocock/skills';
  });
  if (promoted.length !== EXPECTED_PROMOTED_SKILLS) {
    errors.push(`expected ${EXPECTED_PROMOTED_SKILLS} promoted upstream skills, found ${promoted.length}`);
  }
  for (const skill of promoted) {
    const english = path.join(rootDir, skill.sources?.en || '', 'SKILL.md');
    const thai = path.join(rootDir, skill.sources?.th || '', 'SKILL.md');
    if (!fs.existsSync(english)) errors.push(`${skill.id}: missing English upstream mirror`);
    if (!fs.existsSync(thai)) errors.push(`${skill.id}: missing Thai canonical source`);
  }
  for (const bucket of EXCLUDED_BUCKETS) {
    if (fs.existsSync(path.join(rootDir, 'skills', bucket))) {
      errors.push(`excluded upstream bucket is still shipped: skills/${bucket}`);
    }
  }
  return errors;
}

function changedPromotedPaths(upstreamDir) {
  const output = childProcess.execFileSync(
    'git',
    ['diff', '--name-only', `${PINNED_UPSTREAM_COMMIT}..HEAD`, '--', 'skills/engineering', 'skills/productivity'],
    { cwd: upstreamDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return output.trim().split('\n').filter(Boolean);
}

// The leading blockquote region a reader sees above the mirrored body. `bodyOf`
// skips it before hashing — deliberately, because the banner is ours to reword —
// so the hash alone cannot tell whether the banner is present, correct, or
// preceded by injected visible text. This is what the structural check below
// compares.
function bannerRegionOf(pageText) {
  const lines = pageText.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].startsWith('>')) index += 1;
  return lines.slice(0, index).join('\n');
}

function listRetainedSkillMirrors(rootDir) {
  const mirrors = [];
  for (const sourceRoot of ['skills', 'locales/en/skills']) {
    const absoluteRoot = path.join(rootDir, sourceRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(target);
        else if (entry.isFile() && entry.name === 'UPSTREAM.md') {
          mirrors.push(path.relative(rootDir, target).split(path.sep).join('/'));
        }
      }
    }
  }
  return mirrors.sort();
}

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
    const page = normalizeEol(fs.readFileSync(file, 'utf8'));
    const actual = sha256(bodyOf(page));
    if (actual !== expected) {
      errors.push(`${docPath}: content does not match the pinned upstream page`);
    }

    // The banner sits outside the hashed body, so assert it structurally: the
    // leading blockquote region must be the notice and the canonical pointer,
    // and nothing else. Anything extra there renders as visible page text that
    // no gate would otherwise see.
    let expectedBanner;
    try {
      expectedBanner = `${BANNER_NOTICE}\n${canonicalLine(docPath)}`;
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (bannerRegionOf(page) !== expectedBanner) {
      errors.push(
        `${docPath}: banner region must be exactly the upstream-reference notice plus the canonical SPK skill line — regenerate with sync:upstream-docs`,
      );
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

  const indexedMirrors = index.skillMirrors || {};
  for (const [mirrorPath, expected] of Object.entries(indexedMirrors)) {
    const normalized = path.posix.normalize(mirrorPath);
    const validPath = normalized === mirrorPath &&
      /^(?:skills|locales\/en\/skills)\/(?:engineering|productivity|operations|knowledge)\/[^/]+\/UPSTREAM\.md$/.test(mirrorPath);
    if (!validPath) {
      errors.push(`${mirrorPath}: invalid retained upstream skill mirror path`);
      continue;
    }
    const file = path.join(rootDir, mirrorPath);
    if (!fs.existsSync(file)) {
      errors.push(`${mirrorPath}: indexed but missing from the working tree`);
      continue;
    }
    const actual = sha256(normalizeEol(fs.readFileSync(file, 'utf8')));
    if (actual !== expected) {
      errors.push(`${mirrorPath}: content does not match the pinned upstream skill`);
    }
  }

  for (const mirrorPath of listRetainedSkillMirrors(rootDir)) {
    if (!(mirrorPath in indexedMirrors)) {
      errors.push(`${mirrorPath}: shipped without a hash entry — run sync:upstream-docs`);
    }
  }

  return errors;
}

// Every collector this gate runs, in one exported place. `main()` must call
// nothing else: a collector dropped from an inline list in main() would leave
// the suite green while `verify:upstream` silently stopped checking it, and
// tests may not shell-exec the script to notice.
function collectAllErrors(rootDir = REPO_ROOT) {
  return [...collectUpstreamProvenanceErrors(rootDir), ...collectReferenceDocErrors(rootDir)];
}

function main() {
  const errors = collectAllErrors();
  if (errors.length) {
    console.error('Upstream provenance FAILED:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  const compareIndex = process.argv.indexOf('--compare');
  if (compareIndex >= 0) {
    const upstreamDir = process.argv[compareIndex + 1];
    if (!upstreamDir) {
      console.error('--compare requires a local upstream checkout path');
      process.exit(1);
    }
    const changed = changedPromotedPaths(path.resolve(upstreamDir));
    if (changed.length) {
      console.log(`Upstream review required (${changed.length} promoted path(s) changed):`);
      changed.forEach(file => console.log(`  - ${file}`));
      process.exitCode = 2;
      return;
    }
  }
  console.log(
    `Upstream provenance OK (${EXPECTED_PROMOTED_SKILLS} skills pinned at ${PINNED_UPSTREAM_COMMIT.slice(0, 7)})`,
  );
}

if (require.main === module) main();

module.exports = {
  EXCLUDED_BUCKETS,
  EXPECTED_BUCKETS,
  EXPECTED_PROMOTED_SKILLS,
  PINNED_UPSTREAM_COMMIT,
  bannerRegionOf,
  changedPromotedPaths,
  collectAllErrors,
  collectReferenceDocErrors,
  collectUpstreamProvenanceErrors,
  listRetainedSkillMirrors,
};
