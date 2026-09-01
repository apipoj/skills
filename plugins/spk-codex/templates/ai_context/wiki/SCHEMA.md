# Wiki Schema

This wiki follows the Karpathy LLM-wiki pattern inside SPK's split-zone artifact model:

- **Raw sources** (`ai_context/sources/`) — immutable. Users drop files here; agents read them to ingest into the wiki.
- **Wiki** (`ai_context/wiki/`) — LLM-maintained derived memory and index. Cross-linked.
- **Work** (`ai_context/work/`) — local drafts and transit artifacts; never authoritative by default.
- **Runtime** (`ai_context/runtime/`) — reserved local zone for locks, state, and generated
  runtime reviews. Existing root-level runtime files remain supported during the
  compatibility migration.
- **Schema and routing policy** (this file, project instructions, and `docs/agents/artifacts.md`) — conventions.

Team-canonical artifacts live outside `ai_context/`, normally under `docs/`,
`CONTEXT.md`, or a configured external backend. The wiki may summarize and point to a
canonical artifact, but it must not duplicate its body.

## Page types

Every wiki page has one of these types, declared in frontmatter:

- `concept` — a domain concept (authentication, data-flow, etc.)
- `entity` — a service, library, person, API, or competitor
- `decision` — a derived summary and pointer to a canonical ADR or decision source
- `plan` — a derived summary and pointer to a local or canonical plan
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
- **decision** — must have `## Summary`, `## Canonical Artifact`, `## Consequences`
- **plan** — must have `## Summary`, `## Canonical Artifact`, and current status
- **learning** — must have `## What Happened`, `## Lesson`, `## How to Apply`

## Linking

- Use `[[page-slug]]` for internal links. The file is `<slug>.md` in its type directory.
- Backlinks are auto-maintained: when page A links to page B, B's "referenced by" list should include A.
- The index (`index.md`) lists every page with a one-line summary, grouped by type.

## Notability gate

Don't create an entity page for something mentioned once. Stash the mention in a catch-all (e.g. `concepts/mentions-log.md`). Promote to a real page on 3rd mention across different sources.

## Citation rule

Every non-obvious claim on a wiki page must cite a source — either a file under
`ai_context/sources/`, a canonical project artifact, or an external URL. A canonical
team document must use citations its intended audience can access; a private raw-source
path alone is insufficient.

## Secrets

Wiki pages must never contain secrets. The `wiki-secret-scan` PreToolUse hook enforces this at write-time. Secrets from sources should be redacted to `<REDACTED:type origin=sources/file.md:N>` placeholders with a pointer.

## Gitignore

- `ai_context/sources/` is `.gitignore`'d by default — raw sources may contain private content.
- The whole `ai_context/` tree is machine-local by default through Git's local exclude.
- `ai_context/wiki/` is secret-scanned and safe to promote as content, but it is not
  team-visible unless a user deliberately changes the Git policy.
- Passing a secret scan does not authorize promotion, publication, or customer delivery.
