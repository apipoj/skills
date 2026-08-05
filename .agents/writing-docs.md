# Writing Apipoj Skills documentation

Public documentation is Thai-first and optimized for time-to-first-success. Lead with
the command a user can copy, the outcome it produces, and the exact approval boundary.
Keep familiar English technical identifiers when translating them would slow readers.

Root release docs and command tables are generated from `manifest.json`. Skill roster
and locale metadata come from `contracts/workflows.json`; do not maintain a separate
handwritten roster. Each native bucket README links directly to its Thai `SKILL.md`.

Files under `docs/engineering/` and `docs/productivity/` are retained upstream reference
pages from the pinned Matt Pocock fork. They are not Apipoj installation instructions
and must carry the upstream-reference banner.
