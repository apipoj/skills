# Apipoj Skills Resolver

Use `/spk:start` when the user has an outcome but does not know which workflow fits. Route directly when intent is already clear.

Rules:

1. Prefer one primary workflow.
2. Use a second workflow only when it supplies a required verification or approval gate.
3. State the actual effect level before crossing a write boundary.
4. Ask one material question at a time and include a recommended default.
5. Compatibility aliases disclose their canonical replacement and add no authority.

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
