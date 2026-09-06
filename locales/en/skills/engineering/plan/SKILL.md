---
name: plan
description: Plan a software change into scoped tasks and risk-appropriate verification.
---

# plan

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

Produce a plan that another developer can execute. Distinguish plan-only from
plan-and-implement intent before handing off work.

## Workflow

Inspect repository instructions and the source, tests, and constraints relevant to the request.
Define the goal, non-goals, observable acceptance criteria, affected files or discovery steps,
dependency-ordered tasks, and material risks. Include architecture decisions and rollout/rollback
only where they affect the work. Let task size follow coherent outcomes, not a fixed time quota.

Choose verification proportional to risk, consistent with `code`: focused checks for small
changes; regression tests for reproducible bugs when reliable; strict TDD when explicitly
requested or justified by a high-risk stable seam. Run a full suite when repository policy,
release requirements, or insufficient confidence in narrower coverage requires it.

Check that each acceptance criterion has an implementation task and appropriate verification.
Use the current conversation by default; specialists are optional for independent substantial
questions. Ask only for a material user-owned decision that cannot be resolved from evidence.

Before saving, read `docs/agents/artifacts.md` when present. Default to
`ai_context/work/plans/YYYY-MM-DD-<slug>.md`; promote to `docs/plans/` only for a policy-required
or requested team-shared/audit record. Read `ai_context/wiki/plans/` only as a legacy compatibility
fallback. The wiki may hold a summary and pointer, never a duplicate editable plan body.
If no writable scaffold or configured destination exists, return the plan inline.

For `plan_only`, stop after the reviewed plan. For `plan_and_implement`, continue into implementation without another user prompt,
carrying the original bounded workspace authority to `code`. Completion includes implementation,
relevant checks, and repair of failures caused by the change within scope; a first draft is not
completion. A blocked plan keeps its unresolved decisions and next action explicit.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report the plan or its path, acceptance criteria, relevant repository evidence, verification
approach, material risks, and whether implementation is authorized, in user-facing language.
Separate proposed checks from executed checks. Internal receipts are optional on request.

## Guardrails

- Do not modify production source while planning is unresolved or unverified.
- Plan-only authority never expands into implementation, Git, remote, or destructive work.
- An end-to-end local request does not authorize commit, push, PR creation, or deployment;
  preserve exact approval for the current target and payload.
- Preserve material product choices for the user and label assumptions.
