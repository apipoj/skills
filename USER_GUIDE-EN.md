# Apipoj Skills User Guide

This guide covers Apipoj Skills **v5.2.0** for Claude Code, Codex, and Agent Skills-compatible tools.

For the canonical Thai guide, see [USER_GUIDE.md](USER_GUIDE.md).

## What Apipoj Skills is

Apipoj Skills is a Thai-first set of software workflows for working with AI from discovery and planning through implementation, review, and release preparation. It follows three core rules:

- Start from one entry point instead of memorizing the roster.
- Important work must return evidence such as test results, diff scope, risks, and a verifiable next action.
- Editing files never silently authorizes a commit, push, deployment, or publication.

Version 5.2.0 ships **40 skills**, each available as a command.

## Start in two minutes

### 1. Check the prerequisite

The Claude Code and Codex plugins require Node.js 20 or newer:

```bash
node --version
```

### 2. Choose one installation method

#### Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

#### Codex

```bash
codex plugin marketplace add apipoj/skills
codex plugin add spk@spk
```

#### Agent Skills-compatible tools

```bash
npx skills@latest add apipoj/skills
```

Do not combine a native plugin installation with skills.sh in the same project, or the agent may see duplicate skills.

### 3. Start the first task

| Platform | Entry point |
|---|---|
| Claude Code | `/spk:start` |
| Codex | `$spk:start` |
| Agent Skills-compatible tools | Select the installed `start` skill using that tool's syntax |

Then describe the outcome normally:

```text
/spk:start Add CSV export to this feature, include tests, and show every approval required before shipping.
```

`start` chooses the smallest fitting workflow, applies smart defaults only to reversible low-risk choices, and asks one question when the answer materially changes scope or risk.

## How invocation works

The skill table uses two invocation states:

- **model or typed:** invoke the skill directly, or let `start` select it when the context is clear.
- **typed only:** type the exact skill name because the model will not invoke this workflow automatically.

Typed-only example:

```text
/spk:check-release Check v5.2.0 readiness without committing, tagging, or publishing anything.
```

On Codex, use `$spk:check-release` instead.

## Choose a workflow by intent

When uncertain, always begin with `/spk:start`. Use this table when you want to choose directly:

| Goal | Relevant skills |
|---|---|
| Start work and clarify decisions | `/spk:start`, `/spk:ask-me`, `/spk:asking`, `/spk:ask-with-docs`, `/spk:wait-what`, `/spk:teach`, `/spk:handoff`, `/spk:to-questionnaire` |
| Set direction and design the work | `/spk:to-spec`, `/spk:plan`, `/spk:to-tickets`, `/spk:wayfinder`, `/spk:domain-modeling`, `/spk:codebase-design`, `/spk:prototype`, `/spk:design-options`, `/spk:bala`, `/spk:sunzi` |
| Build, diagnose, and review | `/spk:code`, `/spk:tdd`, `/spk:debug`, `/spk:triage`, `/spk:improve-codebase`, `/spk:code-review`, `/spk:test-changes`, `/spk:fix-conflicts` |
| Understand and maintain project knowledge | `/spk:setup`, `/spk:load-project`, `/spk:ask-project`, `/spk:research`, `/spk:add-knowledge`, `/spk:check-wiki`, `/spk:write-skills` |
| Check the system and prepare delivery | `/spk:doctor`, `/spk:check-release`, `/spk:pr`, `/spk:task-to-pr`, `/spk:deploy`, `/spk:wizard`, `/spk:uninstall` |

## Common recipes

Each step is an option based on the current state, not permission for the agent to chain every workflow automatically.

### From an idea to a verified change

1. Use `/spk:ask-me` when the idea is not yet in a repository, or `/spk:ask-with-docs` when project knowledge should be captured.
2. Use `/spk:to-spec` to clarify scope and acceptance criteria.
3. Use `/spk:plan` or `/spk:to-tickets` to sequence implementation.
4. Approve the plan you have actually reviewed, then invoke `/spk:code` or `/spk:tdd`.
5. Use `/spk:test-changes` for fast feedback and `/spk:code-review` for the diff.
6. Run `/spk:check-release` before deciding whether to commit, open a PR, or deploy.

### Diagnose a bug without guessing

1. Use `/spk:debug` to reproduce the failure and prove the root cause.
2. Review the diagnosis and proposed fix scope.
3. Request implementation separately, then invoke `/spk:code` or `/spk:tdd`.
4. Run `/spk:test-changes` and the relevant regression tests.

### Learn an existing project

1. Use `/spk:load-project` to inspect the structure and important context.
2. Use `/spk:ask-project` for questions answerable from the repository.
3. Use `/spk:research` when primary external sources are needed.
4. Use `/spk:add-knowledge` to store verified findings in project memory.

### Explore UI before touching production

- `/spk:prototype` answers one design question with disposable code.
- `/spk:design-options` creates genuinely different directions for the user to compare.
- Selecting a direction does not authorize production implementation; request that separately.

### Prepare a release

1. Run `/spk:doctor` to check the installation and runtime.
2. Run `/spk:check-release` to execute gates and report blockers without publishing.
3. Approve a Git action only after its exact target and payload are visible.
4. Use `/spk:pr` or `/spk:task-to-pr` when opening a pull request.
5. Use `/spk:deploy` only after the target, smoke tests, and rollback are explicit.

## Bala 5: check balance before spending effort

`/spk:bala` is a **typed-only**, **read-only** workflow. It translates the Buddhist framework of five strengths into a practical engineering decision lens; it is not religious instruction.

Use it before planning, implementation, review, or during debugging to check:

- Confidence — whether certainty is grounded in evidence
- Energy — whether effort targets the most useful action
- Awareness — whether context, constraints, and current state are visible
- Concentration — whether scope is narrow enough to finish and verify
- Judgment — whether root cause, tradeoffs, and unknowns are understood

Example:

```text
/spk:bala Check this migration plan before implementation, identify the dominant imbalance, and recommend the smallest next action with proof.
```

The result includes all five ratings, the dominant imbalance, one next action, and a proof signal.

## Sunzi: choose the battle and smallest winning move

`/spk:sunzi` is a **typed-only**, **read-only** workflow. It applies Sun Tzu as a practical and testable strategy lens. “The other” means a constraint, bug, uncertainty, competition, or wasted motion—not encouragement of human conflict.

Use it before an architecture choice, rollout, competitive move, or incident response:

```text
/spk:sunzi Assess this rollout, map the terrain and leverage, name the battle to avoid, and recommend the smallest winning move with proof and an exit path.
```

The result covers the objective, terrain, capabilities, constraints, leverage, avoided battle, next move, and verification.

When using both lenses, invoke them deliberately in order:

1. `/spk:sunzi` to choose strategy and terrain
2. `/spk:bala` to check the balance of that decision
3. `/spk:plan` to turn the strategy into a verifiable plan

## Authority and approvals

Apipoj Skills separates authority into layers so a narrow request is never interpreted as broader permission:

| Effect | Permitted | Still requires separate approval |
|---|---|---|
| `read_only` | Inspect, analyze, and report | Any file change |
| `workspace_write` | Create or edit files in the requested scope | Commit, branch, push, PR, deployment, and publication |
| `git_write` | Change Git state after target and payload approval | Remote writes and deployment |
| `external_write` | Change the approved remote target | Any target or payload outside that approval |
| `destructive` | Remove exact approved targets | Broader targets, broad globs, or data with unclear ownership |

Remember:

- Plan approval is not implementation approval.
- File-edit approval is not commit approval.
- Commit approval is not push or PR approval.
- Push approval is not deployment or publication approval.

## Read the evidence

Important work should return an evidence receipt similar to:

```yaml
schema: spk.evidence/v1
workflow: <canonical skill>
effect: <read_only|workspace_write|git_write|external_write|destructive>
status: <complete|needs_user_input|blocked>
approval_required: <true|false>
```

Before accepting “done,” check three things:

1. **Result:** the observable outcome
2. **Evidence:** tests, logs, diffs, or sources that support it
3. **Gap:** anything unverified, blocked, or left as the next safe action

## Troubleshooting

### The agent says a skill is unavailable

Check whether it is typed only and enter the full command yourself—for example, `/spk:bala` in Claude Code or `$spk:bala` in Codex.

### Skills appear twice

Remove the duplicate installation method. Keep either the native plugin or skills.sh for a given project.

### A hook or MCP server does not start

Confirm that `node --version` is 20 or newer and `node` is on `PATH`, then run `/spk:doctor`.

### The agent uses the wrong project context

Run `/spk:load-project` before continuing, or begin a new task in the correct directory.

### Uninstalling

Use `/spk:uninstall` to preview exact removal targets and preserved project knowledge. Invoking the skill does not itself authorize deletion.

## Related documentation

- [README-EN.md](README-EN.md) — overview and complete roster
- [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md) — installation for agents and automation
- [RESOLVER.md](RESOLVER.md) — command and dispatch resolution
- [CHANGELOG.md](CHANGELOG.md) — changes by version
- [README.md](README.md) — Thai README
