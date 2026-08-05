# Wiki Schema

This wiki follows the Karpathy LLM-wiki pattern. Three layers:

- **Raw sources** (`ai_context/sources/`) — immutable. Users drop files here; agents read them to ingest into the wiki.
- **Wiki** (`ai_context/wiki/`) — LLM-maintained markdown pages. Cross-linked.
- **Schema** (this file + project CLAUDE.md) — conventions.

## Page types

Every wiki page has one of these types, declared in frontmatter:

- `concept` — a domain concept (authentication, data-flow, etc.)
- `entity` — a service, library, person, API, or competitor
- `decision` — an ADR-style record of a decision
- `plan` — an active or archived plan
- `learning` — a retrospective lesson

## Required frontmatter

```yaml
---
title: <human-readable title>
type: concept | entity | decision | plan | learning
updated: YYYY-MM-DD
sources: [<file under ai_context/sources/>]
links: [<other wiki page slug>]
---
```

## Page-type contracts

- **concept** — must have `## Summary` and `## See Also` sections
- **entity** — must have `## Summary`, `## Relationships`, `## Citations`
- **decision** — must have `## Context`, `## Decision`, `## Consequences`
- **plan** — must match SPK plan format; acceptance criteria + tasks
- **learning** — must have `## What Happened`, `## Lesson`, `## How to Apply`

## Linking

- Use `[[page-slug]]` for internal links. The file is `<slug>.md` in its type directory.
- Backlinks are auto-maintained: when page A links to page B, B's "referenced by" list should include A.
- The index (`index.md`) lists every page with a one-line summary, grouped by type.

## Notability gate

Don't create an entity page for something mentioned once. Stash the mention in a catch-all (e.g. `concepts/mentions-log.md`). Promote to a real page on 3rd mention across different sources.

## Citation rule

Every non-obvious claim on a wiki page must cite a source — either a file under `ai_context/sources/` or an external URL.

## Secrets

Wiki pages must never contain secrets. The `wiki-secret-scan` PreToolUse hook enforces this at write-time. Secrets from sources should be redacted to `<REDACTED:type origin=sources/file.md:N>` placeholders with a pointer.

## Gitignore

- `ai_context/sources/` is `.gitignore`'d by default — raw sources may contain private content.
- `ai_context/wiki/` IS commit-safe — it has passed the secret-scan at write-time.
