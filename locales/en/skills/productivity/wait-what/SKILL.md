---
name: wait-what
description: Stop and re-pitch the last message that did not land — add the missing context, drop the jargon, and use the project's own vocabulary from CONTEXT.md, following CONTEXT-MAP.md when the repo has more than one context.
disable-model-invocation: true
---
# Wait What

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

The last message did not land. Say it again, better.

## Workflow

1. Identify the exact message that did not land and name the assumed knowledge that made it opaque.
2. Say it again with the missing context first, in plain language. When `CONTEXT-MAP.md` exists,
   follow its pointer to the `CONTEXT.md` that matches this scope before using the project's own
   vocabulary. If the confusion came from a wrong assumption rather than from wording, say so plainly
   and fix the assumption instead of rephrasing.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Return `spk.evidence/v1` with the message being re-pitched, the context that was missing, and the
vocabulary source used, including the `CONTEXT-MAP.md` → `CONTEXT.md` route when applicable.

## Guardrails

- Explain again; never change the work or any file.
- Match the user's language with Thai cultural fit and the project's own vocabulary instead of borrowed jargon.
- Say plainly when the confusion came from a wrong assumption rather than from wording.
