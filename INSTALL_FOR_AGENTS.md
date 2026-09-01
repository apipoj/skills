# Install Apipoj Skills

Apipoj Skills is Thai-first and uses the short `spk` plugin namespace.

## Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

No plugin configuration is required. Hooks and the MCP server launch `node` from the host lookup, so
Node.js 20+ on `PATH` is the only prerequisite.

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
| `/spk:code` | direct main-thread workflow | model or typed |
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
| `/spk:bala` | direct main-thread workflow | typed only |
| `/spk:sunzi` | direct main-thread workflow | typed only |
<!-- SPK-COMMANDS:end -->
