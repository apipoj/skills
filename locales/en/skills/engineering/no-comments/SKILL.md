---
name: no-comments
description: Review and clean up comments and suppressions in a scoped diff. Apply verified fixes, preserve external constraints, and check behavior in the same run.
---

# Clean up comments

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

## Workflow

1. Use the caller's files or diff. If none is named, inspect the current working-tree diff including staged changes. If it is empty, report that result. Read scoped coding standards and establish the relevant test, type or lint baseline before editing.
2. Give a focused reviewer the exact scope and a read-only brief when the host supports authorized delegation. Otherwise perform a separate review pass before applying edits. For each comment or suppression, cite its location, the claim it makes, its caller or diagnostic, and a proposed disposition. Trace “do not remove” and ordering constraints to an actual contract.
3. Check each finding against source yourself. Remove redundant narration, and fix misleading comments when the intended behavior is known. For an enforceable local constraint, encode it in the smallest suitable type, assertion or test, exercise it, then remove the redundant wording. For a suppression, reproduce the diagnostic and fix its cause before dropping the directive. Keep legal notices, generated markers, necessary tool directives, public documentation and supported external rationale. Preserve unresolved claims and explain what evidence is missing.
4. Run the affected checks again. Compare the diff with the original scope and inspect changed directives and observable behavior. A cleanup may finish with zero edits. Report each accepted fix, significant keeps, checks and remaining findings.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report accepted edits and preserved constraints, diagnostic or source evidence, post-edit check results and gaps.

## Guardrails

- Keep review-only requests read-only and stay inside the cleanup scope.
- Preserve license notices, required directives and unresolved constraints.
- Git, destructive and external effects require their own approval.

## Source

Adapted from [Cursor pstack](https://github.com/cursor/plugins/blob/7a583913eb1b8d1a0ee76753d1a2cf072e7b54f9/pstack/skills/no-comments/SKILL.md).
