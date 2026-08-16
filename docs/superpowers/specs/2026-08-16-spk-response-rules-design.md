# SPK response rules and an enforceable shared block

Date: 2026-08-16
Status: approved for implementation

## Problem

SPK has no stated contract for what an agent's reply should look like. The
closest thing is a paragraph hand-copied into every skill under the heading
`## Thai-first Experience`, and copying it by hand has not held: the block
exists in three variants across the 40 runtime skills — 46 words in 33 of them,
46 plus the interaction policy in 6, and a 39-word rewording in `start`. The
v6.2.0 interaction-policy change made `start` worse still, landing its sentence
above the section heading because `start` lacks the phrase the insertion script
anchored on.

The English mirror under `locales/en/` carries the block in 17 of 40 files. That
has no functional effect today — nothing reads the mirror's content. The
generator checks only that the path matches a regex, one test checks only that
`SKILL.md` exists, and `private: true` with no `files` field means nothing there
ships. `CLAUDE.md` nonetheless names `locales/en/skills/` a source of truth and
requires both locale sources to be updated together, so the stated rule is
currently unenforceable.

Adding four more rules by hand-copy would guarantee more drift.

## Decision

### The four rules

Named labels, each followed by a rule that can be checked against an actual
reply. Bare abstract nouns were rejected: an agent negotiates with "Brevity" and
cannot negotiate with "no preamble, no restating the request."

> **Simplicity** — one idea per sentence; the plain word over the impressive one.
>
> **Brevity** — answer first, then stop; no preamble, no restating the request,
> no summarizing what you just wrote.
>
> **Clarity** — lead with the outcome, then what changed and what it costs;
> label an unverified claim as unverified.
>
> **Humanity** — write as a colleague, not a system; familiar technical English
> over literal translation; no performative enthusiasm, no apology theater, no
> location stereotypes.

### Consolidation

The four rules absorb what the old block said about colleague tone, familiar
technical English, literal translation, location stereotypes, and leading with
the outcome. Two things survive separately because they are not response rules:
`Reply in the user's language.` and the sentence about reversible smart defaults
and one material question, which governs decisions rather than prose.

The heading becomes `## Response Rules`. The section no longer covers only Thai,
and `Reply in the user's language` plus the technical-English rule keep the
Thai-first intent intact.

`ask-me` carries its own voice guidance. Whatever the new block now states is
removed from it; what is specific to the skill — Thai pronouns, the
`ROI (ผลตอบแทนจากการลงทุน)` gloss, bold on 1–3 keywords, the
`💡 ในความเห็นของผม` rule, the eight-line interview turn — stays.
`design-options` was checked and has nothing to trim: its only density rule is
about UI variants, not prose.

### One canonical text, enforced by a gate

`contracts/workflows.json` gains `responsePolicy` holding two literal strings:
the base block, and the interaction-policy addendum that six skills append.

A new `scripts/verify-response-policy.cjs` asserts that every runtime skill and
every English mirror carries the base block verbatim under the `## Response
Rules` heading, and that where the addendum appears it is verbatim and directly
follows the base. Skill-specific sentences may follow; `start` keeps its
progressive-disclosure line that way.

The generator is not made to write into `plugins/spk/`. That directory is the
hand-authored source of truth for the Claude payload, and having a build step
write into it would invert ownership. A verify gate matches how every other
invariant in this repo is held — `verify:sync`, `verify:native`,
`verify:agents`.

Extending the gate over `locales/en/` is what makes the mirror real. All 40
English mirrors get the block, and the `CLAUDE.md` rule that both locale sources
move together becomes enforceable rather than aspirational.

### Thai native sources

`skills/**` carries no shared block today in any of its 40 files; those sources
are written natively in Thai with their own voice guidance. They stay as they
are, and the gate does not cover them.

## Scope

Changed:

- `contracts/workflows.json` — `responsePolicy` with the base block and addendum
- `plugins/spk/skills/*/SKILL.md` — 40 files
- `locales/en/skills/**/SKILL.md` — 40 files, 23 of them gaining the section
- `plugins/spk/skills/ask-me/SKILL.md` — voice section trimmed to what the block
  does not already say
- `scripts/verify-response-policy.cjs` and its test, wired into `verify:release`
- `tests/workflow-authority.test.js` — assertions for text that moved into the
  block
- `plugins/spk-codex/**` regenerated; version bumped to 6.3.0

Unchanged:

- `skills/**` Thai native sources
- approval modes, `interactionPolicy` semantics, secret scanners, and every
  guardrail from 6.2.0

## Risks

- **The rules describe prose, so no gate can check compliance.** The gate checks
  that the text is present and identical, not that replies obey it. That is the
  honest limit of a documentation rule.
- **`ask-me` sits against a word budget.** The new block is larger, so the voice
  trim has to pay for it. If it does not, the budget moves and the change is
  disclosed rather than the ceiling quietly raised.
- **23 new mirror files in the diff** buy an enforceable rule; the alternative
  was admitting the mirror is decorative.
