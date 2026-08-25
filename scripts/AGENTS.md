# scripts/ Agent Context

## Purpose
- Node.js CJS scripts that enforce release integrity and repo invariants.
- Run as npm scripts during development, pre-commit, and CI — not as runtime hooks inside the plugin.

## Entry Points
| Script | What it checks |
|---|---|
| `validate-manifest.cjs` | Closed-schema validity plus unique roster names and command-target references |
| `generate-platform-artifacts.cjs` | Generates/checks the isolated Codex payload, manifest, runtime copies, and per-skill policy from Claude sources plus `contracts/workflows.json` |
| `skilllab.cjs` | Validates and scores offline behavioral activation/outcome/safety scenarios |
| `verify-release-metadata.cjs` | Version, release date, tag, public roster claims, and repository secret-shaped text |
| `verify-manifest-sync.cjs` | Version parity across Claude Code and Codex version-bearing files |
| `regenerate-docs.cjs` | Keeps generated docs in sync with manifest |
| `verify-reference-integrity.cjs` | Internal cross-references (agents ↔ skills ↔ commands) |
| `verify-skill-descriptions.cjs` | All skill SKILL.md files have non-empty `description:` |
| `verify-invocation-authority.cjs` | No skill body instructs the agent to invoke a user-invoked skill |
| `verify-agent-contracts.cjs` | Agent markdown files meet structural contracts |
| `verify-grep-gates.cjs` | Grep-based checks for forbidden patterns |
| `verify-native-skills.cjs` | Thai sources and English mirrors align with the contract and manifest command list |
| `check-upstream-drift.cjs` | Verifies the reviewed Matt Pocock source pin, reports promoted-skill drift against an optional checkout, and verifies retained reference pages against docs/upstream/reference-hashes.json |
| `sync-upstream-docs.cjs` | Regenerates the retained upstream reference pages from a pinned checkout and writes their sha256 index |
| `scoped-tests.cjs` | Maps changed paths to a conservative Jest inner-loop plan |

## Commands
- Run any script directly: `node scripts/<name>.cjs`
- Generate/check platform metadata: `npm run generate:platforms` / `npm run verify:platforms`
- Validate SkillLab: `npm run eval:skilllab`
- Verify upstream provenance: `npm run verify:upstream`
- Check release metadata/security: `npm run verify:metadata` / `npm run verify:security`
- Run configured coverage thresholds: `npm run verify:coverage`
- Run all gates: `npm run verify:release`

## Conventions
- All scripts are CommonJS (`.cjs`) with no external runtime dependencies beyond Node built-ins and `ajv`/`ajv-formats`.
- Scripts export their core logic functions for Jest to import and test in isolation.
- `REPO_ROOT` is derived from `__dirname` — do not hardcode absolute paths.
- `contracts/workflows.json` is canonical for generated platform metadata. Do not hand-edit `.agents/plugins/marketplace.json` or anything under `plugins/spk-codex/`; regenerate them.
- Default SkillLab validation is deterministic and offline. Live adapters require explicit opt-in and must never be part of the standard release gate.

## Guardrails
- Do not add scripts that require network access. Only deterministic generators
  with a checked `--check` mode may write generated files under `plugins/spk-codex/`.
- Every new script must have a matching test file in `tests/`.
- Scripts must exit non-zero on failure; CI depends on this.

## When Editing Here
1. Export the validation logic as a named function so `tests/*.test.js` can import it.
2. Add the script as an npm script in `package.json` and wire it into `verify:release`.
   Exception: `sync-upstream-docs.cjs` requires a local upstream checkout (`--from`)
   and writes generated files — it is a maintainer tool, not a gate, and deliberately
   stays out of `verify:release`. `check-upstream-drift.cjs` is the gate that verifies
   its output offline; that one is wired in.
3. Add or update the matching Jest suite, including stale-artifact and unsafe-input cases.
4. Add to `.husky/pre-commit` only if it is fast (<2s) and checks commit-blocking invariants.
