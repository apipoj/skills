# Apipoj Skills Privacy Notice

Effective: 2026-09-14

Apipoj Skills (plugin namespace `spk`) runs inside the user's Claude Code or Codex
environment. SPK operates no hosted backend, analytics service, or telemetry collector.

## Data processing

SPK registers no runtime hooks. Starting or ending a session does not automatically
create project files, modify Git exclusions, cache WebFetch responses, inject
orientation or ingestion reminders, or launch background reflection.

Invoked skills can read authorized code and documentation and write requested
workflow artifacts. Knowledge workflows use existing project documentation,
`CONTEXT.md`, and ADRs. They do not require a separate wiki or raw-source store.

The bundled codebase-search MCP server runs locally over standard input/output.
Its in-memory index is not sent to an SPK-operated service. Host permissions and
the user's authorization govern network tools and external services.

Legacy utility scripts remain available for compatibility and explicit use.
Manually running a scaffold or cache utility can write local files. Manually
running the reflection utility requires user-local consent bound to the project;
it may send bounded, redacted changes and agent instructions through a trusted
Claude CLI. Project configuration alone cannot grant that consent. The selected
provider's privacy terms apply. No plugin hook invokes these utilities.

## Storage and retention

Existing wiki pages, raw sources, caches, consent records, and Git exclusions from
earlier installations are preserved. Removing hook registrations does not delete
user data or revoke existing manual reflection consent. The uninstall workflow can
remove recognized legacy runtime state while preserving user-owned wiki and sources.

New document updates follow project conventions and the user's requested scope.
Users should review files before committing or sending them to external services.
SPK does not receive or retain copies of local project files.

## Security

Secret scanners remain available for explicit workflow checks and release gates.
They are not automatically enforced on every tool call. Skill instructions guide
behavior and do not replace host permissions, repository access controls, dedicated
secret scanning, or review of outgoing changes.

## Questions

Report concerns without confidential information through the repository's private
security-reporting channel when available, or its issue tracker:

https://github.com/apipoj/skills/issues

Material changes are recorded in repository history and the changelog.
