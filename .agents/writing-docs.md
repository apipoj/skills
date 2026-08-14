# Writing Apipoj Skills documentation

Public documentation is Thai-first and optimized for time-to-first-success. Lead with
the command a user can copy, the outcome it produces, and the exact approval boundary.
Keep familiar English technical identifiers when translating them would slow readers.

Root release docs and command tables are generated from `manifest.json`. Skill roster
and locale metadata come from `contracts/workflows.json`; do not maintain a separate
handwritten roster. Each native bucket README links directly to its Thai `SKILL.md`.

Files under `docs/engineering/` and `docs/productivity/` are generated mirrors of the
pinned Matt Pocock fork. Do not edit them by hand — run `npm run sync:upstream-docs --
--from <upstream-checkout>`. They are not Apipoj installation instructions. Each page
carries the upstream-reference banner plus the canonical SPK skill it documents, and
`npm run verify:upstream` enforces both: the leading blockquote region must be exactly
that banner, and every body must match `docs/upstream/reference-hashes.json`.
