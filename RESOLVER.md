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
| `/spk:wait-what` | direct main-thread workflow |
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
