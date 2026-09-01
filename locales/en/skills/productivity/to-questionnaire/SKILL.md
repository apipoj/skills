---
name: to-questionnaire
description: Turn a decision the user cannot answer alone into a Markdown questionnaire aimed at the person who holds the missing knowledge, by interviewing the user about the send rather than the subject.
disable-model-invocation: true
---
# To Questionnaire

`to-questionnaire` produces a questionnaire document for a third party to answer and asks the user nothing about the subject — use `ask-me` for one decision per message with a gated handoff, or `asking` for batched full-frontier rounds, when the user themselves should be interviewed.

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

When a decision or confirmation is needed, use the host's structured choice prompt if one is available; otherwise present a numbered list. Options must be genuinely distinct with exactly one recommended, every label names the real outcome, and a free-form answer stays possible.

Turn something the user cannot answer alone into a questionnaire for the one person who can.

Read `docs/agents/artifacts.md` when present before choosing the file destination.

Grill the **send**, not the subject. Interview the user only about what they can always answer — who
it goes to, and what they need back. The questions then target the gap between what the recipient
knows and what the user needs. Never interview the user about the subject they cannot answer; that
gap is why they reached for this skill.

## Workflow

1. Ask, in one exchange, who receives this — their role, expertise, and relationship to the user.
   This fixes the tone and how much context the document must carry. Done when you know who they
   are and what they know that the user doesn't.
2. Ask, in one exchange, which decisions or facts the user cannot resolve alone and needs back from
   this person. Done when you have a concrete list of what they must walk away able to decide.
3. Write questions aimed at that gap to
   `ai_context/work/questionnaires/YYYY-MM-DD-questionnaire-<slug>.md` by default and
   report the path. Promote it to a configured deliverable destination only when the
   artifact policy or user explicitly requests promotion. Done when the file exists and
   every item from step 2 is covered. Creating or promoting it never authorizes sending it.

## Document Structure

Frame the document as a discovery questionnaire: the user lacks context, the recipient holds it.
Open with a purpose line naming the decision that rides on it, then a short context brief so the
recipient can answer without coming back to ask. Order questions most-important-first, because async
may give only one pass, and group them under `##` headings by theme once there are more than a
handful. Close with an open slot for anything the recipient thinks you should know.

```markdown
# <Questionnaire title>

**Purpose:** why this questionnaire exists and the decision riding on it.

**Context you need first:** the short brief that lets the recipient answer without coming back to ask.

## <Question theme>

1. **<Question title>**
   <Question body, with options where they help.>

2. **<Question title>**
   <Question body.>

## Anything we forgot to ask

<An open slot for what the recipient thinks you should know.>
```

## Autonomy Profile

`decision_aware` — prompt budget 1; repair budget 3. Inspect facts and prepare the smallest useful draft within this skill's declared effect level; read-only skills stay read-only. Use recommended reversible assumptions and bundle only the one material decision that changes outcome, scope, risk, cost, or success. Before pausing, return the decision ledger, recommended default, evidence, and a resumable next action.

## Evidence Receipt

Return `spk.evidence/v1` with the recipient summary, the list of needed answers, the written file
path, coverage confirmation, risks, and next action.

## Guardrails

- Match the user's language and keep Thai cultural fit while preserving exact technical identifiers.
- Write only the questionnaire file and its required parent directory; do not change
  unrelated project files.
- Creating or promoting the questionnaire never authorizes sending it to the recipient.
- Report evidence gaps instead of guessing at what the recipient knows.
