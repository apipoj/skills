---
name: wait-what
description: Stop and re-pitch the last message that did not land: add the missing context, drop the jargon, and use the project's own vocabulary from CONTEXT.md.
disable-model-invocation: true
---
# Wait What

## Thai-first Experience

Respond in natural, concise Thai by default. Lead with the outcome, use familiar English technical terms when clearer, apply safe smart defaults, and ask one material question only when its answer changes scope, risk, or success.

The last message did not land. Say it again, better.

## Workflow

1. Identify the exact message that did not land and name the assumed knowledge that made it opaque.
2. Say it again with the missing context first, in plain language, using the project's own vocabulary
   from `CONTEXT.md` when it exists. If the confusion came from a wrong assumption rather than from
   wording, say so plainly and fix the assumption instead of rephrasing.

## Evidence Receipt

Return `spk.evidence/v1` with the message being re-pitched, the context that was missing, and the
vocabulary source used.

## Guardrails

- Explain again; never change the work or any file.
- Use natural concise Thai and the project's own vocabulary instead of borrowed jargon.
- Say plainly when the confusion came from a wrong assumption rather than from wording.
