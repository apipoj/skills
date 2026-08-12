# Apipoj Skills

Thai-first, ready-to-use engineering skills for Claude Code, Codex, and Agent Skills-compatible tools.

Apipoj Skills builds on the small, composable workflows from `mattpocock/skills` and adds SPK's stronger approval gates, evidence receipts, project memory, security hooks, Claude/Codex generation, and natural Thai defaults.

For step-by-step onboarding, read the **[English user guide](USER_GUIDE-EN.md)** or the canonical [Thai guide](USER_GUIDE.md).

## Instant start

Install the plugin, then use one entry point:

```text
/spk:start
```

Describe the outcome normally. The router chooses the smallest fitting workflow, applies safe smart defaults, and asks one material question only when the answer changes scope or risk.

## Install

### Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

Works immediately after install with no configuration. It only needs Node.js 20+ on your `PATH` (check with `node --version`).

### Codex

```bash
codex plugin marketplace add apipoj/skills
codex plugin add spk@spk
```

### skills.sh

```bash
npx skills@latest add apipoj/skills
```

Use one installation method per project to avoid duplicate skills.

## Product principles

- **Thai-first:** natural Thai by default while preserving exact technical identifiers.
- **Ready to use:** users do not need to memorize the roster; `/spk:start` routes the work.
- **Safe:** creating files never silently authorizes commit, push, deployment, or publication.
- **Evidence-backed:** important work reports tests, diff scope, risks, and a verifiable next action.
- **Selective orchestration:** independent agents are used only when a separate pass improves confidence.

## Inventory

<!-- SPK-COUNTS:start -->
**21 subagents** (4 orchestrators + 17 specialists) · **40 canonical skills** + **21 compatibility aliases**
<!-- SPK-COUNTS:end -->

### Agents

<!-- SPK-AGENTS:start -->
| Name | Role | Model | Color | Phase |
|---|---|---|---|---|
| `plan-orchestrator` | orchestrator | claude-opus-4-8 | green | planning |
| `build-orchestrator` | orchestrator | claude-opus-4-8 | blue | building |
| `audit-orchestrator` | orchestrator | claude-opus-4-8 | purple | auditing |
| `deploy-orchestrator` | orchestrator | claude-opus-4-8 | orange | shipping |
| `prd-writer` | specialist | claude-opus-4-8 | green | planning |
| `business-analyst` | specialist | claude-opus-4-8 | green | planning |
| `architect` | specialist | claude-opus-4-8 | green | planning |
| `planner` | specialist | claude-opus-4-8 | green | planning |
| `designer` | specialist | claude-sonnet-5 | green | planning |
| `primer` | specialist | claude-sonnet-5 | green | planning |
| `debugger` | specialist | claude-opus-4-8 | purple | auditing |
| `code-auditor` | specialist | claude-opus-4-8 | purple | auditing |
| `implementer` | specialist | claude-sonnet-5 | blue | building |
| `tester` | specialist | claude-sonnet-5 | blue | building |
| `docs` | specialist | claude-sonnet-5 | blue | building |
| `researcher` | specialist | claude-sonnet-5 | blue | building |
| `verifier` | specialist | claude-sonnet-5 | purple | auditing |
| `pr-manager` | specialist | claude-sonnet-5 | orange | shipping |
| `devops` | specialist | claude-sonnet-5 | orange | shipping |
| `deployment-smoke` | specialist | claude-sonnet-5 | orange | shipping |
| `browser-tester` | specialist | claude-sonnet-5 | orange | shipping |
<!-- SPK-AGENTS:end -->

### Skills

Compatibility aliases are supported until v6 and always disclose the canonical replacement.

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
| `/spk:bala` | direct main-thread workflow | typed only |
| `/spk:sunzi` | direct main-thread workflow | typed only |

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

## Source layout

- `skills/` — bucketed Thai canonical experience
- `locales/en/skills/` — English mirror and upstream comparison source
- `plugins/spk/` — Claude payload
- `plugins/spk-codex/` — generated Codex payload; never hand-edit
- `contracts/workflows.json` — activation, effects, evidence, origin, and locale mapping
- `docs/upstream/` — pinned upstream commit and reviewed-sync policy

## Development

```bash
npm test
npm run verify:release
```

`manifest.json` is the version and roster source of truth. Run `npm run generate:platforms` after contract or source changes.

## Upstream and license

The pinned base is `mattpocock/skills@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`, licensed under MIT. Future updates are reviewed and localized before release. See `NOTICE` and `docs/upstream/`.
