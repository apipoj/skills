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
| Skill | Dispatches to subagent |
|---|---|
| `/spk:start` | direct main-thread workflow |
| `/spk:diagnosing-bugs` | debugger |
| `/spk:grill-with-docs` | direct main-thread workflow |
| `/spk:triage` | direct main-thread workflow |
| `/spk:improve-codebase-architecture` | direct main-thread workflow |
| `/spk:setup` | direct main-thread workflow |
| `/spk:tdd` | build-orchestrator |
| `/spk:to-spec` | direct main-thread workflow |
| `/spk:to-tickets` | direct main-thread workflow |
| `/spk:wayfinder` | direct main-thread workflow |
| `/spk:implement` | build-orchestrator |
| `/spk:prototype` | designer |
| `/spk:research` | researcher |
| `/spk:domain-modeling` | direct main-thread workflow |
| `/spk:codebase-design` | direct main-thread workflow |
| `/spk:code-review` | audit-orchestrator |
| `/spk:resolving-merge-conflicts` | direct main-thread workflow |
| `/spk:grill-me` | direct main-thread workflow |
| `/spk:grilling` | direct main-thread workflow |
| `/spk:handoff` | direct main-thread workflow |
| `/spk:teach` | direct main-thread workflow |
| `/spk:writing-great-skills` | direct main-thread workflow |
| `/spk:ask-me` | direct main-thread workflow |
| `/spk:plan` | plan-orchestrator |
| `/spk:design-shotgun` | designer |
| `/spk:deploy` | deploy-orchestrator |
| `/spk:pr` | pr-manager |
| `/spk:task-to-pr` | direct main-thread workflow |
| `/spk:ingest` | direct main-thread workflow |
| `/spk:prime` | primer |
| `/spk:query` | researcher |
| `/spk:wiki-lint` | audit-orchestrator |
| `/spk:doctor` | direct main-thread workflow |
| `/spk:release-check` | verifier |
| `/spk:scoped-tests` | direct main-thread workflow |
| `/spk:uninstall` | direct main-thread workflow |
| `/spk:ask-matt` | direct main-thread workflow |
| `/spk:setup-matt-pocock-skills` | direct main-thread workflow |
| `/spk:spk` | direct main-thread workflow |
| `/spk:jumpstart` | direct main-thread workflow |
| `/spk:code` | build-orchestrator |
| `/spk:debug` | debugger |
| `/spk:review` | audit-orchestrator |
<!-- SPK-COMMANDS:end -->

`bala` and `sunzi` are optional extras and are intentionally absent from this list.
