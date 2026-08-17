---
name: to-spec
description: Collapse conversation and codebase evidence into a reviewable specification ready for planning.
disable-model-invocation: true
---

# Collapse Work into a Spec

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

## Workflow

1. Read the request, repository instructions, and full practice in [UPSTREAM.md](UPSTREAM.md).
2. Use smart defaults when risk is low. If a decision changes scope, ask exactly one material question with a recommendation.
3. Apply this skill's discipline in short slices and show only the progress needed for verification.
4. Close with the outcome, evidence, risks, and remaining decisions without padding.

## Focus

Collapse conversation and codebase evidence into a reviewable specification ready for planning.

## Evidence Receipt

Report artifacts, verification commands, observed results, risks, and the smallest next action.

## Guardrails

- Do not expand scope on your own.
- Do not commit, push, publish, or change external systems without exact approval for the target.
- If evidence is incomplete, report the gap instead of guessing.
