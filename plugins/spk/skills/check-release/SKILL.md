---
name: check-release
description: Run the repository's complete release-readiness gates, inspect version and generated-artifact consistency, and report blockers without publishing.
disable-model-invocation: true
---

# Release Readiness

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Run a release-readiness checklist before tagging, committing, pushing, or publishing SPK-related work.

## Workflow

Run the read-only checks below in the current repository. A separate verifier may run
them independently when delegation exists, but the final report must include actual
commands and exit results rather than a prose assurance.

## Required Gates

Run or explicitly justify skipping each gate:

```bash
npm run validate:manifest
npm run regen:check
npm run verify:sync
npm run verify:refs
npm run verify:descriptions
npm run verify:agents
npm run verify:gates
npm run verify:native
npm test -- --runInBand
```

Also check:
- `git status --short --branch`
- outgoing commits with `git log --oneline origin/main..HEAD` when on `main`
- staged added-line secret scan before any commit recommendation

## Evidence Receipt

Return `spk.evidence/v1` with every gate command and exit result, version/generated
artifact consistency, git readiness, blockers, risks, and next safe action.

## Guardrails

- Prepare-only by default.
- Never commit, push, tag, publish, or deploy without explicit user confirmation.
- Report blockers before suggesting release.
