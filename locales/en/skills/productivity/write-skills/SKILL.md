---
name: write-skills
description: Write and edit any document an agent consumes - a skill, AGENTS.md, CLAUDE.md, or a doc reached by a pointer - so it is reached at the right moment and runs the same way every time.
disable-model-invocation: true
---
# Writing for agents

Respond in natural, concise Thai by default. Use familiar English technical terms when clearer, and lead with the outcome or the decision the user needs first.

This is the reference for writing **any document an agent consumes** — not just a skill, but `AGENTS.md`, `CLAUDE.md`, and any doc reached by a pointer. The packaging differs; the writing does not. The same levers make each one predictable: the agent taking the same **process** every run, not producing the same output.

Companion references: [SKILL-MECHANICS.md](SKILL-MECHANICS.md) for the skill-specific mechanics (frontmatter, the invocation choice, router skills), and [GLOSSARY.md](GLOSSARY.md) for the full vocabulary.

## Context pointers

A **context pointer** is a reference held in the agent's context that names some out-of-context material and encodes the condition for reaching it. A skill's `description` is one; a line in `AGENTS.md` naming a doc is the same object.

The pointer's **wording**, not its target, decides when the agent reaches the material — and how reliably. A must-have target behind a weakly worded pointer is a variance bug: **sharpen the wording first**, and inline the material only if sharpening fails.

A pointer does two jobs — state what the material is, and list the **branches** that should trigger reaching it (a branch is a distinct case the document handles, so different runs take different paths through it). Every word of an always-loaded pointer costs on every turn, so it earns harder pruning than the body:

- **Front-load the leading word** — the pointer is where it does its triggering work.
- **One trigger per branch.** Synonyms that rename a single branch are one branch written twice; collapse them and keep only genuinely distinct branches.
- **Cut identity the body already carries.**

## The two loads

Every document and pointer you add spends one of two budgets:

- **Context load** — the cost of always-loaded material on the agent's window: an `AGENTS.md` line, a skill description, anything sitting in context every turn, spending tokens and attention whether or not it fires.
- **Cognitive load** — the cost on the human: which documents exist and when to reach for each. The human is the index. Not a cost to minimise — it is the price of human agency; spend it where human judgement matters, remove it where it does not.

Material reached only through a pointer escapes context load at the price of the pointer's own line; material with no pointer at all rides entirely on cognitive load.

## Workflow

1. Read the request, the repository instructions, and the vocabulary in [GLOSSARY.md](GLOSSARY.md). If the document is a skill, read [SKILL-MECHANICS.md](SKILL-MECHANICS.md) too.
2. Apply smart defaults when risk is low. When a decision changes scope, ask exactly one question with a recommendation.
3. Write or edit in short slices. Sharpen pointers before relocating material, and choose deliberately which of the two loads you are spending.
4. Report the result, the evidence, the risks, and what is still open, without padding.

## Evidence Receipt

Report the artifact, the verification command, the real result, the risks, and the smallest next action.

## Guardrails

- Do not expand scope on your own.
- Do not commit, push, publish, or change an external system without approval for that exact target.
- When evidence is insufficient, report the gap instead of guessing.
