#!/usr/bin/env node
'use strict';

// Holds the invariant that the English mirror (locales/en/skills/<bucket>/<name>)
// carries the exact same SKILL.md body as the canonical Claude runtime payload
// (plugins/spk/skills/<name>). The two used to drift silently — a fix landed in
// one copy but not the other — which is the drift class this gate exists to catch.
// Byte-identity is the target for every one of the 40 contract skills.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = require(path.join(REPO_ROOT, 'contracts', 'workflows.json'));

// Intentional exceptions only. Every entry needs a comment justifying why the
// mirror is allowed to diverge from the payload for that skill. Keep this empty
// whenever possible — an allowlist entry is a permanent gap in the parity gate.
const ALLOWED_MISMATCHES = new Set([
  // (none) — every current skill's mirror is byte-identical to its payload.
]);

// Reported paths stay POSIX-style on every platform, matching the sibling gates.
function targetsFor(skill) {
  return {
    payload: path.posix.join('plugins', 'spk', 'skills', skill.id, 'SKILL.md'),
    mirror: path.posix.join(skill.sources.en, 'SKILL.md'),
  };
}

function collectMirrorParityErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const errors = [];

  for (const skill of contract.skills) {
    const { payload, mirror } = targetsFor(skill);
    const payloadFile = path.join(rootDir, ...payload.split('/'));
    const mirrorFile = path.join(rootDir, ...mirror.split('/'));

    const payloadExists = fs.existsSync(payloadFile);
    const mirrorExists = fs.existsSync(mirrorFile);
    if (!payloadExists) errors.push(`MISSING skill file: ${payload}`);
    if (!mirrorExists) errors.push(`MISSING skill file: ${mirror}`);
    if (!payloadExists || !mirrorExists) continue;

    if (ALLOWED_MISMATCHES.has(skill.id)) continue;

    const payloadText = fs.readFileSync(payloadFile, 'utf8').replace(/\r\n/g, '\n');
    const mirrorText = fs.readFileSync(mirrorFile, 'utf8').replace(/\r\n/g, '\n');

    if (payloadText !== mirrorText) {
      errors.push(
        `${skill.id}: ${mirror} is not byte-identical to ${payload} — sync the mirror to the payload body`,
      );
    }
  }

  return errors;
}

function main() {
  const errors = collectMirrorParityErrors();
  if (errors.length > 0) {
    console.error('Mirror parity FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const count = CONTRACT.skills.length;
  console.log(`Mirror parity OK (${count} skills carry a byte-identical EN mirror)`);
}

if (require.main === module) main();

module.exports = { ALLOWED_MISMATCHES, collectMirrorParityErrors, targetsFor };
