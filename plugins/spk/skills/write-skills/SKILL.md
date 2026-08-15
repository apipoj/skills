---
name: write-skills
description: Write and edit any document an agent consumes - a skill, AGENTS.md, CLAUDE.md, or a doc reached by a pointer - so it is reached at the right moment and runs the same way every time.
disable-model-invocation: true
---
# Writing for agents

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

This covers **any document an agent consumes** — a skill, an `AGENTS.md` / `CLAUDE.md`, a doc reached
by a pointer. The packaging differs; the writing does not. The same levers make each one predictable:
the agent taking the same *process* every run, not producing the same output.

## Workflow

1. Read the request and the repository instructions, then write or edit in short slices, applying the
   levers below. Use smart defaults when risk is low; when a decision changes scope, ask exactly one
   question with a recommendation.
2. **Context pointers.** A context pointer is a reference held in the agent's context that names
   out-of-context material and encodes the condition for reaching it. A skill's `description` is one;
   a line in `AGENTS.md` naming a doc is the same object. The pointer's *wording*, not its target,
   decides when the agent reaches the material and how reliably — a must-have target behind a weakly
   worded pointer is a variance bug. Sharpen the wording first; inline the material only if
   sharpening fails. Front-load the leading word, write one trigger per branch with synonyms
   collapsed, and cut identity the body already carries.
3. **The two loads.** Every document and pointer spends one of two budgets. *Context load* is
   always-loaded material on the agent's window, spending tokens and attention whether or not it
   fires. *Cognitive load* is the cost on the human of knowing which documents exist and when to
   reach for each — not a cost to minimise, but the price of human agency: spend it where human
   judgement matters. Material behind a pointer escapes context load at the price of the pointer's
   own line; material with no pointer rides entirely on cognitive load.
4. **When the document is a skill.** Choose model-invoked (keep a `description`, so the agent and
   other skills can reach it, at permanent context load) or user-invoked (`disable-model-invocation:
   true`, zero context load, but the human is the index). Pick model-invocation only when the agent
   or another skill must reach it on its own. When user-invoked skills multiply past what a human can
   remember, add a router skill that names the others and when to reach for each; it can only hint,
   never fire them.
5. Report the result, the evidence, the risks, and what is still open, without padding.

## Evidence Receipt

Return `spk.evidence/v1` with the artifact, the verification command, the real result, risks, and the
smallest next action.

## Guardrails

- Do not expand scope on your own.
- Do not commit, push, publish, or change an external system without approval for that exact target.
- When evidence is insufficient, report the gap instead of guessing.
