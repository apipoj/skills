# tests/ Agent Context

## Purpose
- Jest test suites that exercise the scripts/ verify gates and plugin invariants.
- Each test file mirrors a script or a specific repo constraint (naming: `<concern>.test.js`).

## Entry Points
- `manifest-version-sync.test.js` — version parity across all manifest-bearing files
- `command-manifest-sync.test.js` — skill command names match manifest commands array
- `agent-manifest-sync.test.js` — agent files match manifest agents roster
- `agent-contracts.test.js` — agent markdown structural contracts
- `native-skills.test.js` — native Thai skills align with manifest
- `platform-artifacts.test.js` — canonical contract and deterministic Claude/Codex metadata generation
- `skilllab.test.js` — behavioral corpus, scoring, baselines, and gated live-adapter protocol
- `release-metadata.test.js` — versions, public counts, tags, roster semantics, and repository secret scanning
- `runtime-core.test.js` — host-neutral configuration, paths, events, bounded text, atomic writes, and locks
- `init-ai-context.test.js` — non-destructive scaffold and upgrade migrations
- `session-reflect.test.js` — opt-in consent, redaction, locking, and bounded background reflection
- `spk-doctor.test.js` — read-only installation/runtime diagnostics
- `pipeline.test.js` — end-to-end skill dispatch shape
- `smoke-test.test.js` — plugin install smoke (CLI integration)
- `secret-scanner.test.js` / `wiki-secret-scan.test.js` — secret detection logic
- `hook-output-contract.test.js` — hook output JSON contract

## Commands
- **Run all tests:** `npm test`
- **Run one file:** `npx jest tests/<name>.test.js`
- **Run in band (serial):** `npm test -- --runInBand`
- **Coverage gate:** `npm run verify:coverage`
- **Behavioral corpus gate:** `npm run eval:skilllab`

## Conventions
- CommonJS only; no ESM.
- Tests import logic from `scripts/` via `require('../scripts/<name>.cjs')`.
- Use `fs.mkdtempSync` + temp fixtures; never mutate repo files in tests.
- Test file names are lowercase kebab-case matching the concern, not the script name.
- Test both Claude Code and Codex event/metadata shapes when code crosses a host boundary.
- Evidence-gated workflow tests should assert outcomes, safety decisions, and receipts rather than only matching prose.

## Guardrails
- Do not write files outside `os.tmpdir()` from within tests.
- Do not add tests that require network access or a running Claude CLI (except `smoke-test.test.js` which is CI-only).
- Live SkillLab adapters stay opt-in and outside the default Jest/release path.
- Every new script in `scripts/` needs a corresponding test here.

## When Editing Here
1. Run `npm test` locally before pushing; CI runs the full suite.
2. When adding a test for a new script, import the exported logic function — do not shell-exec the script.
3. Keep fixtures minimal and self-contained in the test file.
