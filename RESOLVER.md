# Apipoj Skills Resolver

Use `/spk:start` when the user has an outcome but does not know which workflow fits. Route directly when intent is already clear.

Rules:

1. Prefer one primary workflow.
2. Use a second workflow only when it supplies a required verification or approval gate.
3. State the actual effect level before crossing a write boundary.
4. Ask one material question at a time and include a recommended default.
5. Compatibility aliases disclose their canonical replacement and add no authority.

<!-- SPK-COMMANDS:start -->
### Canonical skills

`typed only` = the agent cannot see it; you must type the command yourself.

| Skill | Dispatches to | Invocation |
|---|---|---|
| `/spk:start` | direct main-thread workflow | model or typed |
| `/spk:debug` | debugger | model or typed |
| `/spk:ask-with-docs` | direct main-thread workflow | typed only |
| `/spk:triage` | direct main-thread workflow | typed only |
| `/spk:improve-codebase` | direct main-thread workflow | typed only |
| `/spk:setup` | direct main-thread workflow | typed only |
| `/spk:tdd` | build-orchestrator | model or typed |
| `/spk:to-spec` | direct main-thread workflow | typed only |
| `/spk:to-tickets` | direct main-thread workflow | typed only |
| `/spk:to-questionnaire` | direct main-thread workflow | typed only |
| `/spk:wayfinder` | direct main-thread workflow | typed only |
| `/spk:code` | build-orchestrator | model or typed |
| `/spk:prototype` | designer | model or typed |
| `/spk:research` | researcher | model or typed |
| `/spk:domain-modeling` | direct main-thread workflow | model or typed |
| `/spk:codebase-design` | direct main-thread workflow | model or typed |
| `/spk:code-review` | audit-orchestrator | model or typed |
| `/spk:fix-conflicts` | direct main-thread workflow | model or typed |
| `/spk:asking` | direct main-thread workflow | model or typed |
| `/spk:handoff` | direct main-thread workflow | typed only |
| `/spk:teach` | direct main-thread workflow | typed only |
| `/spk:write-skills` | direct main-thread workflow | typed only |
| `/spk:ask-me` | direct main-thread workflow | typed only |
| `/spk:wait-what` | direct main-thread workflow | typed only |
| `/spk:plan` | plan-orchestrator | model or typed |
| `/spk:design-options` | designer | model or typed |
| `/spk:deploy` | deploy-orchestrator | typed only |
| `/spk:wizard` | direct main-thread workflow | model or typed |
| `/spk:pr` | pr-manager | typed only |
| `/spk:task-to-pr` | direct main-thread workflow | typed only |
| `/spk:add-knowledge` | direct main-thread workflow | typed only |
| `/spk:load-project` | primer | model or typed |
| `/spk:ask-project` | researcher | model or typed |
| `/spk:check-wiki` | audit-orchestrator | model or typed |
| `/spk:doctor` | direct main-thread workflow | model or typed |
| `/spk:check-release` | verifier | typed only |
| `/spk:test-changes` | direct main-thread workflow | model or typed |
| `/spk:uninstall` | direct main-thread workflow | typed only |

### Compatibility aliases

Every alias is typed only.

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
| `/spk:writing-for-agents` | `/spk:write-skills` |
| `/spk:prime` | `/spk:load-project` |
| `/spk:query` | `/spk:ask-project` |
| `/spk:ingest` | `/spk:add-knowledge` |
| `/spk:wiki-lint` | `/spk:check-wiki` |
| `/spk:improve-codebase-architecture` | `/spk:improve-codebase` |
| `/spk:scoped-tests` | `/spk:test-changes` |
| `/spk:release-check` | `/spk:check-release` |
<!-- SPK-COMMANDS:end -->
