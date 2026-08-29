#!/usr/bin/env node
'use strict';

// Holds the invariant that every skill's embedded "## Autonomy Profile"
// paragraph — in both the canonical payload and its English mirror — carries
// the exact canonical wording for its declared contracts/workflows.json
// autonomyProfile. A prior review found wording variants drifting in with
// no gate to catch them; this is that gate.
//
// The embedded paragraph is a skill-facing paraphrase of the contract's
// third-person profile definition (it addresses "this skill" rather than
// "the selected skill", folds the checkpoint sentence into a trailing
// "Before pausing, ..." clause, etc.) rather than a verbatim quote of any
// single contract field, so it cannot be reconstructed purely mechanically.
// To keep it from drifting silently from the contract anyway, this file:
//   1. Pins the reviewed canonical paragraph per profile (CANONICAL_PARAGRAPHS).
//   2. Cross-checks that paragraph's "prompt budget N; repair budget M" and
//      its continuation/checkpoint clauses still agree with the live contract
//      fields, so an edit to contracts/workflows.json without a matching edit
//      here fails loudly instead of the gate quietly checking a stale string.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = require(path.join(REPO_ROOT, 'contracts', 'workflows.json'));

const CANONICAL_PARAGRAPHS = {
  afk_local:
    "`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.",
  decision_aware:
    "`decision_aware` — prompt budget 1; repair budget 3. Inspect facts and prepare the smallest useful draft within this skill's declared effect level; read-only skills stay read-only. Use recommended reversible assumptions and bundle only the one material decision that changes outcome, scope, risk, cost, or success. Before pausing, return the decision ledger, recommended default, evidence, and a resumable next action.",
  boundary_gated:
    "`boundary_gated` — prompt budget 1; repair budget 2. Prepare and verify the exact boundary intent without mutation, then request one approval for the declared operation. After approval, complete every stage and allowed retry inside the stable envelope without another prompt. Before pausing, persist the approved envelope digest, current phase, evidence, attempts, and rollback or recovery path.",
  afk_to_pr:
    "`afk_to_pr` — prompt budget 0; repair budget 2. A clear current request to take one identified task, ticket, or existing pull request to READY_FOR_HUMAN_MERGE grants task-bound authority for the full development-to-PR lifecycle. Resolve, isolate, implement, test, run local browser QA when user-visible behavior changes, review, commit, push, create or update the pull request, observe CI, and repair in scope without another prompt. Before pausing, keep the branch and worktree, then return task identity, current head, evidence, attempts, pull-request state, and the smallest resumable next action.",
};

// Mirrors the one deterministic transform the paraphrase applies to the
// contract's `checkpoint` sentence: drop a trailing "before any pause."
// clause (now redundant once "Before pausing," moves to the front) and
// lowercase the new first letter.
function closingClauseFrom(checkpoint) {
  const stripped = checkpoint.replace(/\s+before any pause\.$/, '');
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

// Every named field the contract defines for `profileId`, cross-checked
// against the pinned canonical paragraph so an unreviewed contract edit
// (a changed budget, continuation, or checkpoint) fails this gate instead
// of silently leaving CANONICAL_PARAGRAPHS stale.
function collectContractDriftErrors(contract = CONTRACT) {
  const errors = [];
  const profiles = contract.autonomyProfiles || {};

  for (const [profileId, paragraph] of Object.entries(CANONICAL_PARAGRAPHS)) {
    const profile = profiles[profileId];
    if (!profile) {
      errors.push(`contracts/workflows.json: autonomyProfiles is missing "${profileId}"`);
      continue;
    }

    const budgets = paragraph.match(/prompt budget (\d+); repair budget (\d+)/);
    if (!budgets) {
      errors.push(`${profileId}: canonical paragraph is missing a "prompt budget N; repair budget M" clause`);
    } else {
      const [, promptBudget, repairBudget] = budgets;
      if (Number(promptBudget) !== profile.promptBudget) {
        errors.push(
          `${profileId}: canonical paragraph says prompt budget ${promptBudget} but the contract says ${profile.promptBudget}`,
        );
      }
      if (Number(repairBudget) !== profile.repairBudget) {
        errors.push(
          `${profileId}: canonical paragraph says repair budget ${repairBudget} but the contract says ${profile.repairBudget}`,
        );
      }
    }

    if (profile.continuation && !paragraph.includes(profile.continuation)) {
      errors.push(`${profileId}: canonical paragraph no longer contains the contract's continuation sentence verbatim`);
    }

    if (profile.checkpoint) {
      const closing = closingClauseFrom(profile.checkpoint);
      if (!paragraph.includes(`Before pausing, ${closing}`)) {
        errors.push(`${profileId}: canonical paragraph no longer matches the contract's checkpoint sentence`);
      }
    }
  }

  for (const profileId of Object.keys(profiles)) {
    if (!CANONICAL_PARAGRAPHS[profileId]) {
      errors.push(`contracts/workflows.json defines autonomyProfile "${profileId}" with no canonical paragraph in scripts/verify-autonomy-profiles.cjs`);
    }
  }

  return errors;
}

// Reported paths stay POSIX-style on every platform, matching the sibling gates.
function targetsFor(skill) {
  return [
    path.posix.join('plugins', 'spk', 'skills', skill.id, 'SKILL.md'),
    path.posix.join(skill.sources.en, 'SKILL.md'),
  ];
}

function collectAutonomyProfileErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const errors = collectContractDriftErrors(contract);

  for (const skill of contract.skills) {
    const profileId = skill.autonomyProfile;
    const canonical = CANONICAL_PARAGRAPHS[profileId];
    if (!canonical) {
      errors.push(`${skill.id}: declares unknown autonomyProfile "${profileId}"`);
      continue;
    }

    for (const relative of targetsFor(skill)) {
      const file = path.join(rootDir, ...relative.split('/'));
      if (!fs.existsSync(file)) {
        errors.push(`MISSING skill file: ${relative}`);
        continue;
      }
      const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      if (!text.includes(canonical)) {
        errors.push(`${relative}: missing the canonical "${profileId}" Autonomy Profile paragraph verbatim`);
      }
    }
  }

  return errors;
}

function main() {
  const errors = collectAutonomyProfileErrors();
  if (errors.length > 0) {
    console.error('Autonomy profile FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const count = CONTRACT.skills.length;
  console.log(`Autonomy profile OK (${count} skills × 2 locales carry the canonical paragraph for their declared profile)`);
}

if (require.main === module) main();

module.exports = {
  CANONICAL_PARAGRAPHS,
  closingClauseFrom,
  collectAutonomyProfileErrors,
  collectContractDriftErrors,
  targetsFor,
};
