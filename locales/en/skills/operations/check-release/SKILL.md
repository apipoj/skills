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
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

Run a release-readiness checklist before tagging, committing, pushing, or publishing SPK-related work.

## Workflow

Run the read-only checks below in the current repository. A separate verifier may run
them independently when delegation exists, but the final report must include actual
commands and exit results rather than a prose assurance.

## Required Gates

Run the aggregate commands below and report results exactly as the run reports them (pass/fail per gate) — never report "release ready" without having actually run them:

```bash
npm run verify:release
npm test -- --runInBand
```

`npm run verify:release` is the canonical command that already chains every real gate. The authoritative gate roster lives in `package.json`'s `scripts.verify:release` field — do not hardcode a gate list here again, or this skill will drift from `package.json`.

Also check:
- `git status --short --branch`
- outgoing commits with `git log --oneline origin/main..HEAD` when on `main`
- staged added-line secret scan before any commit recommendation

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Return `spk.evidence/v1` with every gate command and exit result, version/generated
artifact consistency, git readiness, blockers, risks, and next safe action.

## Guardrails

- Prepare-only by default.
- Never commit, push, tag, publish, or deploy without explicit user confirmation.
- Report blockers before suggesting release.
