---
name: verify-spk
description: Verify SPK skill changes against the requested acceptance criteria, bilingual workflow contracts, generated Claude/Codex payloads, SkillLab corpus, and release gates. Use after changing SPK skills or verification tooling in this repository.
---

# Verify SPK changes

## Scope and authority

This verifier is local to the SPK source repository. Read the current task and
[check map](checks/README.md) before selecting checks. It may run local validators,
Jest, and dependency audit, and write proof under ignored `ai_context/`. Repository
scripts are part of the trusted checkout: inspect changed executable scripts before
running them. No commit, push, publish, deployment, or product repair is granted.

## Prerequisites and doctor

Run from the repository root. Inspect `git status --short`, `node --version`, and
`npm --version`. Node 20+ and installed project dependencies are required. Read
`package.json` for current commands rather than maintaining another gate list.
Missing dependencies are NOT_RUN until setup is authorized. This repo is a skill
package; an app server and browser are NOT_APPLICABLE for packaging checks.

## Drive

For fast feedback run:

```bash
node .agents/skills/verify-spk/scripts/verify.cjs --quick
```

For the complete repository release gate run:

```bash
node .agents/skills/verify-spk/scripts/verify.cjs --full
```

Both runs capture actual stdout/stderr and exit statuses. Full uses the current
`npm run verify:release` command, including Jest coverage and dependency audit.
The failure control runs a deliberately incomplete workflow contract in a temporary
fixture. It passes only when the existing validator rejects the removed manifest
command with exit 1 and names that missing command. Cleanup removes only that fixture.

Read [spec review](checks/spec-review.md) and [skill behavior](checks/skill-behavior.md)
for judgments and behavioral checks that an aggregate static gate cannot establish.
Run applicable behavioral cases against the actual skill instructions in a disposable
workspace with available host tools. Record actual outcomes and boundaries; do not
turn phrase matching or SkillLab corpus validation into behavioral results.

## Evidence

The helper prints a run directory under `ai_context/work/verification/`. Its
`receipt.json` records target HEAD, artifact fingerprints, commands/argv, literal
expected exit or diagnostic, actual results, and proof paths. Each log contains the
action and stdout/stderr. Keep the receipt and logs after fixture cleanup.

Report PASS, FAIL, NOT_RUN, or NOT_APPLICABLE per criterion with its reason. The helper
covers executable repository gates only. Spec judgments and behavioral skill checks
remain explicitly NOT_RUN until separately performed. Overall task completion requires
all required criteria; a helper PASS never replaces that coverage review.

## Cleanup and maintenance

The helper starts no app instances. Its only fixture lives in a newly allocated temp
directory and is removed in a finally block. Never kill by process name or delete proof.
Refresh the check map when task acceptance, workflow contracts, generator output,
verification scripts, or host behavior changes. `package.json` remains the release-gate
source of truth; this verifier retains no independent copy of that entire gate roster.
