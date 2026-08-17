---
name: design-options
description: Explore multiple genuinely distinct interface directions, compare them with realistic content, and record an approved design before production implementation.
---

# Design Shotgun

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

When a decision or confirmation is needed, use the host's structured choice prompt if one is available; otherwise present a numbered list. Options must be genuinely distinct with exactly one recommended, every label names the real outcome, and a free-form answer stays possible.

Use this when the user wants to explore visual directions before committing to implementation: "show me design options", "I don't like this UI", "visual brainstorm", "ทำ design shotgun", "ขอหลายแบบให้เลือก", or "make this screen look better".

This workflow keeps exploration local and codebase-aware: generate disposable
variants, compare them, collect structured feedback, then hand the approved direction
to the implementation workflow.

## Workflow

Inspect design guidance, relevant routes/components, current screenshots/URLs, and
prior approved directions. Delegate variant creation only when workers have disjoint
artifact directories; the main conversation owns comparison, user feedback, and the
approval record. No production source changes occur in this workflow.

## Design Shotgun Loop

1. **Context.** Read `DESIGN.md`, current routes/components, existing screenshots/URLs, and previous approved designs.
2. **Concepts.** Produce 3 default directions, each with a different stance. Examples: compact operator console, editorial trust layer, playful onboarding, brutalist power tool, calm B2B dashboard.
3. **Variants.** Build self-contained mockups. Prefer HTML because it is inspectable and easy to promote later. Images are fine when image tooling exists.
4. **Board.** Create `board.html` so the user can compare all variants side-by-side.
5. **Feedback.** Ask for one of: choose A/B/C, remix parts, regenerate, or approve for implementation.
6. **Approval.** Write `approved.json` only after confirmation. The implementation
   workflow can then consume the approved direction.

## Anti-Convergence Rules

- Each variant must differ in **layout**, **typography**, **palette**, and **density**.
- If two variants look like siblings, regenerate the weaker one.
- Do not make three generic SaaS cards with different accent colors.
- Do not copy third-party UI wholesale. Translate references into principles.
- Do not ignore `DESIGN.md` unless the user asks to explore outside the design system.

## Artifact Convention

```text
.spk/design-options/<screen>-YYYYMMDD-HHMM/
├── board.html
├── README.md
├── variant-a.html
├── variant-b.html
├── variant-c.html
├── screenshots/           # optional visual QA proof
└── approved.json          # only after user confirmation
```

`approved.json` shape:

```json
{
  "screen": "<screen>",
  "approved_variant": "A",
  "feedback": "<what the user liked and wants changed>",
  "implementation_notes": ["<specific guidance for implementation>"],
  "date": "<UTC timestamp>",
  "branch": "<git branch>"
}
```

## Output Format

```markdown
## Design Shotgun Results
- Artifact dir: `.spk/design-options/<screen>-<date>/`
- Board: `.spk/design-options/<screen>-<date>/board.html`
- Variants: A <name>, B <name>, C <name>

### Head-to-head
- A: <strength> / <weakness>
- B: <strength> / <weakness>
- C: <strength> / <weakness>

Recommendation: <one opinionated pick and why>
Next: pick A/B/C, ask for a remix, or approve for implementation.
```

## Evidence Receipt

Return `spk.evidence/v1` with artifact directory, variants, visual-QA evidence,
comparison scores, recommendation, approval state, risks, and next action.

## Guardrails

- This is exploration, not implementation.
- Keep artifacts local and disposable unless the user asks to commit design references.
- Use browser/vision QA when available, but do not block on missing design binaries.
- Prefer one strong recommendation over neutral option lists.
- When invoked from planning, return the approved design direction as planning input
  rather than writing source code.

## Attribution

Inspired by Garry Tan's GStack `design-options` workflow: multiple visual variants, comparison board, structured feedback, and taste memory. This SPK version is intentionally lightweight and repo-local.
