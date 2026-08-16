---
name: check-release
description: Run the repository's complete release-readiness gates, inspect version and generated-artifact consistency, and report blockers without publishing.
disable-model-invocation: true
---

# Release Readiness

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.

Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

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
