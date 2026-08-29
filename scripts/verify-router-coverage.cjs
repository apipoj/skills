#!/usr/bin/env node
'use strict';

// `/spk:start` is the router: users are told they never need to remember a
// skill name because start finds the right one for them. That promise breaks
// silently whenever a new workflow ships without a routing line — the skill
// exists, ships in the bundle, and is simply unreachable through the router.
//
// This gate reads the canonical roster in contracts/workflows.json and checks
// that every workflow id is at least mentioned somewhere in start's shipped
// Claude payload (plugins/spk/skills/start/SKILL.md) — the file every host
// actually reads. It is a coverage floor, not a style check: it does not care
// where in the file an id appears or how it is phrased, only that the router
// body gives the agent a way to find it.
//
// A short, explicit exclusion list covers ids the router body itself says it
// will never route to automatically:
//   - `bala`, `sunzi`  — the Guardrails section states they ship in the
//     default bundle but stay manual-only and outside automatic routing.
//   - `start`          — the router does not route to itself.
// Any other missing id is a real gap and fails the gate.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = require(path.join(REPO_ROOT, 'contracts', 'workflows.json'));

const ROUTER_PAYLOAD = path.posix.join('plugins', 'spk', 'skills', 'start', 'SKILL.md');

// Justified above, in the header comment, against the router body's own
// Guardrails section rather than left implicit here.
const EXCLUDED_IDS = ['bala', 'sunzi', 'start'];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A hyphen is a word character neither side of the boundary, so a plain `\b`
// would let a short id match inside a longer one (`code` inside `code-review`,
// `to-spec` inside nothing here, but the principle holds generally). Require
// the character immediately before/after the id to be neither a letter, digit,
// nor hyphen.
function idPattern(id) {
  return new RegExp(`(?<![a-z0-9-])${escapeRegex(id)}(?![a-z0-9-])`, 'i');
}

function collectRouterCoverageErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const errors = [];
  const file = path.join(rootDir, ...ROUTER_PAYLOAD.split('/'));

  if (!fs.existsSync(file)) {
    return [`MISSING router payload: ${ROUTER_PAYLOAD}`];
  }

  const content = fs.readFileSync(file, 'utf8');
  const excluded = new Set(EXCLUDED_IDS);

  for (const skill of contract.skills) {
    if (excluded.has(skill.id)) continue;
    if (!idPattern(skill.id).test(content)) {
      errors.push(`${ROUTER_PAYLOAD}: missing routing mention for workflow id \`${skill.id}\``);
    }
  }

  for (const id of EXCLUDED_IDS) {
    if (!contract.skills.some(skill => skill.id === id)) {
      errors.push(`EXCLUDED_IDS contains unknown workflow id \`${id}\` (not in contracts/workflows.json)`);
    }
  }

  return errors;
}

function main() {
  const errors = collectRouterCoverageErrors();
  if (errors.length > 0) {
    console.error('Router coverage FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    console.error(
      '  Add a routing line for the missing id to plugins/spk/skills/start/SKILL.md ' +
        '(mirrored in the Thai and English sources), or justify excluding it in ' +
        'scripts/verify-router-coverage.cjs against the router body\'s own Guardrails section.',
    );
    process.exit(1);
  }
  const covered = CONTRACT.skills.length - EXCLUDED_IDS.length;
  console.log(
    `Router coverage OK (${covered} of ${CONTRACT.skills.length} workflow ids reachable through ` +
      `${ROUTER_PAYLOAD}, ${EXCLUDED_IDS.length} explicitly excluded)`,
  );
}

if (require.main === module) main();

module.exports = { collectRouterCoverageErrors, EXCLUDED_IDS, ROUTER_PAYLOAD };
