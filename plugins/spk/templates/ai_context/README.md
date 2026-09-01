# SPK Local Context

This directory stores project-local working context for AI-assisted work. SPK excludes
the whole directory from Git by default, so it is not the place for team-canonical
documents.

- `runtime/` — reserved home for locks, state, and generated runtime reviews; existing
  root-level runtime files remain supported during the compatibility migration
- `sources/` — immutable private inputs selected for ingestion
- `wiki/` — derived memory, summaries, and pointers to canonical artifacts
- `work/` — local drafts such as plans, specs, research, questionnaires, and handoffs

Put shared glossary terms in `CONTEXT.md`, architecture decisions in `docs/adr/`,
and other reviewed team artifacts under `docs/` or the configured external backend.
When `docs/agents/artifacts.md` exists, it is the routing policy.
