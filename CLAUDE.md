# Apipoj Skills Repository Context

## Purpose

- Source repository for **Apipoj Skills 5**, a Thai-first skill distribution for Claude Code, Codex, and skills.sh.
- The public plugin namespace stays `spk`; the primary router is `/spk:start` (Codex: `$spk:start`).
- Built from the reviewed `mattpocock/skills` snapshot pinned in `docs/upstream/upstream-lock.json`, plus SPK's evidence, approval, memory, security, and multi-platform tooling.

## Sources of truth

- `manifest.json` — version, release date, command roster, and agent roster.
- `contracts/workflows.json` — workflow IDs, Thai/English sources, activation policy, effects, evidence, and guardrails.
- `skills/<bucket>/<name>/` — native Thai source. Buckets are `engineering`, `productivity`, `operations`, and `knowledge`.
- `locales/en/skills/<bucket>/<name>/` — English source mirror.
- `plugins/spk/` — canonical Claude runtime payload.
- `plugins/spk-codex/` — generated Codex payload; never hand-edit.
- `extras/skills/` — optional skills that are not part of the default roster.

## Commands

- Test: `npm test`
- Full release gate: `npm run verify:release`
- Regenerate platform artifacts: `npm run generate:platforms`
- Regenerate docs: `npm run regen`
- Validate manifest and roster sync: `npm run validate:manifest && npm run verify:sync`
- Verify reviewed upstream pin: `npm run verify:upstream`

## Conventions

- Skill instructions stay English to save tokens. Reply in the user's language and keep Thai cultural fit: colleague tone, familiar technical English when clearer, no literal translation, no phonetic respelling of a technical term, no location stereotypes. Gloss an unfamiliar term once in parentheses. Use smart defaults for reversible low-risk choices, and ask one material question when a decision changes scope or risk.
- All Git writes, remote writes, publishing, deployment, and destructive effects require exact approval for the current target and payload.
- GitHub writes for this source repository target `apipoj/skills`. Use an explicit repository selector such as `GH_REPO=apipoj/skills` or `--repo apipoj/skills`; never rely on a CLI to infer the target from fork parent metadata.
- Every workflow reports observable evidence and gaps; never convert an unverified result into a success claim.

## Editing guardrails

- Do not edit generated files under `plugins/spk-codex/`; run `npm run generate:platforms`.
- Keep every version-bearing file equal to `manifest.json`.version.
- Adding or renaming a skill requires updating the workflow contract, both locale sources, manifest roster, generated payloads, and SkillLab corpus.
- Do not restore upstream `misc`, `personal`, `in-progress`, or `deprecated` buckets to the default distribution.
- Do not auto-merge upstream changes. Compare against the pinned snapshot and review behavior, Thai localization, safety, and evidence before updating the lock.
- Never weaken the secret scanners or approval envelopes to make a gate pass.
