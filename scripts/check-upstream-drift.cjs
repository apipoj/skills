#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const PINNED_UPSTREAM_COMMIT = '6acc160e4e0cd062dbbbd7a1b26ae92855edf07e';
const EXPECTED_BUCKETS = ['engineering', 'productivity'];
// Canonical upstream skills we ship, plus aliases whose target is not itself
// upstream-derived. Raise this deliberately when a review promotes a new skill.
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

function main() {
  const errors = collectUpstreamProvenanceErrors();
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
  changedPromotedPaths,
  collectUpstreamProvenanceErrors,
};
