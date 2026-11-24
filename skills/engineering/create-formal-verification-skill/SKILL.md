---
name: create-formal-verification-skill
description: สร้าง skill สำหรับพิสูจน์ invariant ของโค้ดในโปรเจกต์ ผูกแบบจำลองกับ source ระบุขอบเขต และลองกรณีที่ทำให้เงื่อนไขพัง
---

# สร้าง skill พิสูจน์ invariant

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

## Workflow

1. Start with the named property. If only the project is named, choose a consequential promise where ordinary examples miss input combinations or event order. Explain the user impact and map the property to concrete functions, invariants and atomic boundaries.
2. Follow [the invariant verification procedure](references/formal-verification.md) to select a method, state the bounds, and test the mapping. Prefer the project's existing tools. A finite model, an unbounded proof, and tests of sampled inputs support different claims.
3. Generate a project-local verifier in the existing skill layout, or use the active host's project skill directory. Give its SKILL.md valid name and description frontmatter, the affected source paths, exact tool version, prerequisites, one rerun command, result interpretation, and a source revision or fingerprint. Package the model, checker configuration or proof and the smallest helper needed to run it. Record when implementation drift requires a new mapping review.
4. Follow the generated skill from a cold start. Save baseline output, a counterexample from a controlled broken variant in a disposable copy, and the restored baseline result. Explain the trace in domain terms, including whether each step is possible in the implementation. Preserve genuine baseline failures. A timeout, unavailable solver or sampled fallback leaves the requested formal claim incomplete.
5. Hand over the verifier path, rerun command, property and scope, verdict, assumptions, control trace and remaining gaps. Creating a verifier does not grant permission to repair product behavior or weaken the property.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report property and implementation mapping, tool version, bounds and assumptions, baseline, counterexample and restored run, proof limits and source drift criteria.

## Guardrails

- Write verification artifacts only and keep product code intact.
- Use disposable controls and retain genuine counterexamples.
- Never claim a sampled or unfinished run proves the property.
- Git, destructive and external effects require their own approval.

## Source

Adapted from [Cursor pstack](https://github.com/cursor/plugins/blob/7a583913eb1b8d1a0ee76753d1a2cf072e7b54f9/pstack/skills/create-formal-verification-skill/SKILL.md).
