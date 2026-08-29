---
name: handoff
description: Compress the necessary context into a handoff that a fresh session can continue without guessing.
disable-model-invocation: true
---

# Write a Portable Handoff

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

## Destination

Write the handoff as `handoff-<ISO-date>-<slug>.md` (e.g. `handoff-2026-08-29-refactor-auth.md`) **at the current workspace's project root** — not the OS temp directory — because this skill's effect level is `workspace_write`. Use another destination (such as the OS temp directory or a specific path) only when the user asks for one.

## Workflow

1. Read the current conversation and the full practice in [UPSTREAM.md](UPSTREAM.md). If the user passed an argument, treat it as what the next session will focus on and tailor the document to it.
2. Capture the goal, current state, key decisions with rationale, gotchas, actionable next steps, and the paths of files touched or relevant. Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs); reference them by path or URL instead.
3. Add a "Suggested Skills" section naming the skills the next session should invoke.
4. Redact sensitive information everywhere it appears — API keys, passwords, tokens, personally identifiable information — before writing the file.
5. Write the file to the destination above and report the path actually written.

**Done when:** the handoff file is written, includes every required section, and its path has been reported.

## Focus

Compress only the context a fresh session needs so the next agent can continue without guessing.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report the written handoff path, verification commands, observed results, risks, and the smallest next action.

## Guardrails

- Default to writing at the project root; use the OS temp directory or another destination only when the user asks.
- Reference existing artifacts (specs, plans, ADRs, issues, commits, diffs) by path or URL instead of duplicating their content.
- Redact secrets, credentials, and personal data before writing the file.
- Do not expand scope on your own.
- Do not commit, push, publish, or change external systems without exact approval for the target.
- If evidence is incomplete, report the gap instead of guessing.
