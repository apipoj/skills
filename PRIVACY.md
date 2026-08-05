# Apipoj Skills Privacy Notice

Effective: 2026-07-31

Apipoj Skills (plugin namespace `spk`) is an open-source plugin that runs inside the user's Claude Code or Codex environment. Apipoj Skills does not operate a hosted backend, analytics service, advertising system, or telemetry collector.

## Data SPK processes

SPK can read source code and repository metadata that the user makes available to the host agent. It can write project-local workflow artifacts under `ai_context/`, including plans, wiki pages, logs, and review notes.

The bundled `spk-codebase-search` MCP server runs locally over standard input/output. It indexes repository text in memory for the active process and does not send that index to an SPK-operated service.

Where the host supports WebFetch hooks, SPK may store the result already
returned by the host under `.claude/spk-webfetch-cache/`. Each entry contains
the normalized URL, exact WebFetch prompt, host-returned response text, and a
local timestamp. Entries are keyed by URL plus prompt and are eligible for
reuse for no more than five minutes. The cache hook does not make direct
network requests; network access remains controlled by the host's WebFetch
permissions. Set `SPK_WEBFETCH_CACHE=off` to bypass the cache.

LLM-backed session reflection is disabled by default. It requires an explicit
consent record created by SPK's bundled CLI. That record is stored outside the
repository under the operating-system user's home and is bound to the
project's canonical path and filesystem identity. Tracked project settings,
environment variables, and a redirected `HOME` cannot grant consent. A
project setting or an effective `SPK_SESSION_REFLECT=off` value may only veto
reflection.

Claude installations also require a user- or administrator-selected absolute
`node_path` for SPK's hook and MCP entrypoints. Claude ignores project-scoped
plugin configuration, so a repository-controlled `PATH` cannot replace that
runtime before SPK's consent and executable checks run.

When consented and not vetoed, SPK sends a bounded, redacted representation of
relevant working-tree changes and applicable `AGENTS.md` files through a
trusted locally installed Claude CLI. The child runs from a neutral temporary
directory with project customizations disabled, no tools, and a minimized
environment. If a trusted CLI cannot be resolved, SPK writes a deterministic
local review note instead of making an outbound model call. The selected model
provider's privacy terms then apply.

Skills can ask the host agent to use network tools or third-party services. Those calls are controlled by the host's permissions and the user's authorization, and the receiving service's privacy terms apply.

## Storage and retention

SPK stores project memory and runtime state in the user's project or normal
host-plugin storage. Session-reflection consent records are the exception:
they are stored in the user's local SPK consent directory outside the
repository so tracked project content cannot authorize an outbound call. Raw
source material placed in `ai_context/sources/` is ignored from Git by the
scaffolded policy, but users remain responsible for reviewing repository
status before committing.

WebFetch cache entries are stored in the project-local
`.claude/spk-webfetch-cache/` directory. An expired entry is removed when that
exact URL-and-prompt key is checked again; otherwise it remains local until it
is overwritten or the user deletes the directory. Disabling the cache stops
reads and writes but does not delete existing entries.

SPK does not receive or retain copies of these local files. Users can remove plugin-managed runtime state and uninstall the plugin at any time. User-owned `ai_context/wiki/` and `ai_context/sources/` content is preserved during uninstall unless the user deletes it separately.

## Security

SPK provides defense-in-depth checks for secret-shaped content and ignored files. These checks reduce accidental disclosure risk but do not replace repository access controls, a dedicated secret scanner, or review of outgoing changes.

## Questions and changes

Report privacy or security concerns through the repository's private security-reporting channel when available, or open an issue that contains no confidential information:

https://github.com/apipoj/skills/issues

Material changes to this notice are recorded in the repository history and changelog.
