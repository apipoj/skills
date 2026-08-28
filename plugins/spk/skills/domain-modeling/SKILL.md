---
name: domain-modeling
description: Build and refine the project's ubiquitous language, stress-test terms on edge cases, and record durable decisions. Fires when discussing codebase terminology, writing or editing CONTEXT.md, or recording an ADR.
---

# Sharpen Domain Language

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

## Workflow

1. Read the request, repository instructions, and full practice in [UPSTREAM.md](UPSTREAM.md).
2. Use smart defaults when risk is low. If a decision changes scope, ask exactly one material question with a recommendation.
3. Apply this skill's discipline in short slices and show only the progress needed for verification.
4. Close with the outcome, evidence, risks, and remaining decisions without padding.

## Focus

Build and refine the project's shared domain language, stress-test terms on edge cases, and record decisions worth keeping.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report artifacts, verification commands, observed results, risks, and the smallest next action.

## Guardrails

- Do not expand scope on your own.
- Do not commit, push, publish, or change external systems without exact approval for the target.
- If evidence is incomplete, report the gap instead of guessing.
