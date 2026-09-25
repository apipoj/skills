# plugins/spk Agent Context

## Purpose
- The canonical Claude Code runtime payload for the `spk` namespace.
- Contains Claude agent prompts, Claude skill frontmatter, explicit utility scripts, an unregistered optional code-search server, and the wiki scaffold. The Codex payload is generated at `../spk-codex/`.

## Entry Points
- `hooks/hooks.json` — empty by design. Both platforms must register no runtime hooks.
- `agents/*.md` — one file per subagent; each file is the system prompt for that agent role.
- `skills/<name>/SKILL.md` — portable Claude runtime workflow; invoked as `/spk:<name>` in Claude Code.
- `scripts/` — Node.js utilities; run only as part of explicitly requested workflows.
- `.claude-plugin/plugin.json` — Claude metadata; the generated Codex manifest lives under `../spk-codex/`.

## Commands
- No standalone commands; this folder is a distribution payload, not a standalone package.
- Generate/check host metadata: `npm run generate:platforms` / `npm run verify:platforms`.
- Validate payload: `npm run validate:manifest` and `claude plugin validate --strict .` from repo root.
- Version sync check: `npm run verify:sync` from repo root.

## Conventions
- Native Thai sources live at each contract entry's `sources.th` path; English
  mirrors live at `sources.en`. Runtime skill prompts stay English. Reply in the
  user's language and keep Thai cultural fit even when the user writes in English.
- Each skill folder name matches the workflow ID. Bodies remain provider-neutral;
  Codex receives a generated copy of the same body.
- Frontmatter may use Codex-common keys plus `disable-model-invocation: true`
  exactly for canonical manual-only skills. Do not add `argument-hint` or
  `user-invocable`; invocation guidance belongs in the body or generated metadata.
- Never add `agents/openai.yaml` here. The generator writes Codex metadata only
  under `plugins/spk-codex/skills/` to avoid duplicate default discovery.
- Agent filenames match the `name` field in `manifest.json` agents array.
- `templates/ai_context/` must not contain real secrets or project-specific data — it is generic scaffold.

## Guardrails
- Do not add executable scripts to `scripts/` without a corresponding Jest test in `tests/`.
- Keep `hooks/hooks.json` empty; `tests/hook-output-contract.test.js` prevents automatic runtime registration.
- Preserve secret-scanning utilities for explicit workflow checks and release gates. They are not automatically enforced on tool calls.
- `templates/ai_context/sources/` is excluded from scanning — never write private data there.

## When Editing Here
1. After adding or renaming a skill folder, update `manifest.json`, both locale
   source paths in `contracts/workflows.json`, and run `npm run verify:sync`.
2. Update `contracts/workflows.json`, run `npm run generate:platforms`, and
   verify the shared skill contains no host-only dispatch syntax.
3. After editing an agent `.md`, run `npm run verify:agents` to check contracts.
4. After any hook or script change, run `npm test` to catch regressions.
