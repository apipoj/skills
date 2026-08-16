---
name: to-questionnaire
description: Turn a decision the user cannot answer alone into a Markdown questionnaire aimed at the person who holds the missing knowledge, by interviewing the user about the send rather than the subject.
disable-model-invocation: true
---
# To Questionnaire

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.

Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

When a decision or confirmation is needed, use the host's structured choice prompt if one is available; otherwise present a numbered list. Options must be genuinely distinct with exactly one recommended, every label names the real outcome, and a free-form answer stays possible.

Turn something the user cannot answer alone into a **questionnaire** — a Markdown document they hand to one person to fill in async, or fill out together over a meeting. The recipient holds knowledge the user lacks; the questionnaire pulls it out of them.

## Grill the send, not the subject

This is the skill's one principle. Interview the user only about the **send**, which they can always answer: who it goes to, and what they need back. The questions in the document then target the **gap** between what the recipient knows and what the user needs.

Never interview the user about the subject they cannot answer — that gap is why they reached for this skill.

## Step 1: Who is it going to?

Ask, in one exchange, the recipient's role, expertise, and relationship to the user. This fixes the questionnaire's tone and how much context it must carry.

**Done when:** you know who the recipient is and what they know that the user doesn't.

## Step 2: What do you need back?

Ask, in one exchange, the specific decisions or facts the user cannot resolve alone and needs from this person.

**Done when:** you have a concrete list of what the user must walk away able to do or decide.

## Step 3: Write the questionnaire

Draft questions aimed at the gap from steps 1–2, following the document structure below. Write it to `to-questionnaire-<slug>.md` in the current directory (slug from the topic) and report the path.

**Done when:** the file exists and every item the user named in step 2 is covered by a question.

## Document structure

Frame the document as a **discovery questionnaire**: the user lacks context, the recipient holds it. Order questions most-important-first — async means you may only get one pass — and group them under `##` headings by theme once there are more than a handful.

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

## Guardrails

- Keep exact technical identifiers unchanged.
- Write only the questionnaire file; do not change other project files.
- Report evidence gaps instead of guessing at what the recipient knows.
