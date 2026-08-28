---
name: wait-what
description: Stop and re-pitch the last message that did not land — add the missing context, drop the jargon, and use the project's own vocabulary from CONTEXT.md.
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

Wait — that last message didn't land. Re-pitch it.

Find the exact message that didn't land, and name the knowledge it assumed the user already had. Then say it again with **the missing context first**, before the substance.

Use plain language and drop the jargon that isn't carrying weight. If the project has a `CONTEXT.md`, use its vocabulary rather than borrowed terms — a word the team already agreed on always communicates better than a generic one.

If the confusion came from a wrong assumption rather than from wording, **say so plainly** and fix the assumption first. Re-explaining the same thing in prettier words helps nothing when the premise is wrong.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Guardrails

- Explain again; never change the work or any file.
- Use the project's own vocabulary instead of borrowed jargon.
- Say plainly when the confusion came from a wrong assumption rather than from wording.
