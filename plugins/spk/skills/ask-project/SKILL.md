---
name: ask-project
description: Answer a project question from the local wiki first, cite exact evidence, and use external research only when local knowledge is insufficient.
---

# Wiki-First Query

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Answer the user's question from project knowledge before using external sources.

## Workflow

1. Read `ai_context/wiki/index.md` and the smallest relevant linked pages.
2. If the wiki is sufficient and current, answer with page/path citations.
3. If it is silent or stale, research current primary sources and clearly distinguish
   repository facts from external findings.
4. Verify high-stakes or surprising claims with an independent primary source.
5. Return a concise answer with citations. Save new knowledge only when the user asks
   or the active workflow explicitly authorizes wiki updates.

## Evidence Receipt

Return `spk.evidence/v1` with the answer, local evidence paths, external sources if
used, freshness/uncertainty, risks, and next action.

## Guardrails

- Do not present stale wiki content as current fact.
- Never expose raw private sources or credentials.
- Prefer primary sources and clearly label inference.
