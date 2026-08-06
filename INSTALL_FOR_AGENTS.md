# Install Apipoj Skills

Apipoj Skills is Thai-first and uses the short `spk` plugin namespace.

## Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

Start with `/spk:start`.

## Codex

```bash
codex plugin marketplace add apipoj/skills
codex plugin add spk@spk
```

Start with `$spk:start`.

## Agent Skills-compatible tools

```bash
npx skills@latest add apipoj/skills
```

Select skills from the Thai-first `skills/` tree. Do not combine this with a native plugin install in the same project.

## Safety contract

- Local creation does not authorize Git changes.
- Git changes do not authorize pushes or pull requests.
- A push does not authorize deployment or publication.
- Destructive actions require exact targets and separate approval.

## Full shipped command list

<!-- SPK-COMMANDS:start -->
### Canonical skills

| Skill | Dispatches to |
|---|---|
| `/spk:start` | direct main-thread workflow |
| `/spk:debug` | debugger |
| `/spk:ask-with-docs` | direct main-thread workflow |
| `/spk:triage` | direct main-thread workflow |
| `/spk:improve-codebase` | direct main-thread workflow |
| `/spk:setup` | direct main-thread workflow |
| `/spk:tdd` | build-orchestrator |
| `/spk:to-spec` | direct main-thread workflow |
| `/spk:to-tickets` | direct main-thread workflow |
| `/spk:to-questionnaire` | direct main-thread workflow |
| `/spk:wayfinder` | direct main-thread workflow |
| `/spk:code` | build-orchestrator |
| `/spk:prototype` | designer |
| `/spk:research` | researcher |
| `/spk:domain-modeling` | direct main-thread workflow |
| `/spk:codebase-design` | direct main-thread workflow |
| `/spk:code-review` | audit-orchestrator |
| `/spk:fix-conflicts` | direct main-thread workflow |
| `/spk:asking` | direct main-thread workflow |
| `/spk:handoff` | direct main-thread workflow |
| `/spk:teach` | direct main-thread workflow |
| `/spk:write-skills` | direct main-thread workflow |
| `/spk:ask-me` | direct main-thread workflow |
| `/spk:plan` | plan-orchestrator |
| `/spk:design-options` | designer |
| `/spk:deploy` | deploy-orchestrator |
| `/spk:wizard` | direct main-thread workflow |
| `/spk:pr` | pr-manager |
| `/spk:task-to-pr` | direct main-thread workflow |
| `/spk:add-knowledge` | direct main-thread workflow |
| `/spk:load-project` | primer |
| `/spk:ask-project` | researcher |
| `/spk:check-wiki` | audit-orchestrator |
| `/spk:doctor` | direct main-thread workflow |
| `/spk:check-release` | verifier |
| `/spk:test-changes` | direct main-thread workflow |
| `/spk:uninstall` | direct main-thread workflow |

### Compatibility aliases

| Legacy name | Canonical name |
|---|---|
| `/spk:ask-matt` | `/spk:start` |
| `/spk:setup-matt-pocock-skills` | `/spk:setup` |
| `/spk:spk` | `/spk:start` |
| `/spk:jumpstart` | `/spk:start` |
| `/spk:review` | `/spk:code-review` |
| `/spk:grill-me` | `/spk:ask-me` |
| `/spk:grilling` | `/spk:asking` |
| `/spk:grill-with-docs` | `/spk:ask-with-docs` |
| `/spk:diagnosing-bugs` | `/spk:debug` |
| `/spk:implement` | `/spk:code` |
| `/spk:design-shotgun` | `/spk:design-options` |
| `/spk:resolving-merge-conflicts` | `/spk:fix-conflicts` |
| `/spk:writing-great-skills` | `/spk:write-skills` |
| `/spk:prime` | `/spk:load-project` |
| `/spk:query` | `/spk:ask-project` |
| `/spk:ingest` | `/spk:add-knowledge` |
| `/spk:wiki-lint` | `/spk:check-wiki` |
| `/spk:improve-codebase-architecture` | `/spk:improve-codebase` |
| `/spk:scoped-tests` | `/spk:test-changes` |
| `/spk:release-check` | `/spk:check-release` |
<!-- SPK-COMMANDS:end -->

`bala` and `sunzi` are optional extras and are intentionally absent from this list.
