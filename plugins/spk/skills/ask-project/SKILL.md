---
name: ask-project
description: Answer a project question from this repository's local wiki first, cite exact evidence, and use external research only when local knowledge is insufficient.
---

# Wiki-First Query

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

Answer the user's question from project knowledge before using external sources.

## Workflow

1. Read `docs/agents/artifacts.md` when present, then `ai_context/wiki/index.md` and the
   smallest relevant linked pages. Follow canonical artifact pointers when the answer
   depends on a decision, plan, spec, or shared research document.
2. If the wiki and canonical target are sufficient and current, answer with page/path
   citations. If they conflict, the canonical artifact wins and the wiki is stale.
3. If it is silent or stale, research current primary sources and clearly distinguish
   repository facts from external findings.
4. Verify high-stakes or surprising claims with an independent primary source.
5. Return a concise answer with citations. Save new knowledge only when the user asks
   or the active workflow explicitly authorizes wiki updates.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Return `spk.evidence/v1` with the answer, local evidence paths, external sources if
used, freshness/uncertainty, risks, and next action.

## Guardrails

- Do not present stale wiki content as current fact.
- Never expose raw private sources or credentials.
- Never present a local draft as an approved decision or canonical plan/spec.
- Prefer primary sources and clearly label inference.
