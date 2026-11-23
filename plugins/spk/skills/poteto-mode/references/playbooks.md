# Poteto-mode playbooks

Select by the requested outcome. For a quick patch, use the short path in the parent skill. A playbook describes how to work within existing authority. For delivery or cleanup, prepare the evidence here and use the applicable approval workflow for the exact write target and payload.

## Development

| When | Read |
| --- | --- |
| Answer how or why something works. | [Investigation](../playbooks/investigation.md) |
| Restore an observable behavior that is wrong. | [Bug fix](../playbooks/bug-fix.md) |
| Add a user-visible capability. | [Feature](../playbooks/feature.md) |
| Change the structure while preserving supported behavior. | [Refactoring](../playbooks/refactoring.md) |
| Settle a design or behavior question cheaply. | [Prototype](../playbooks/prototype.md) |
| Match an authorized visual baseline during a migration. | [Visual parity](../playbooks/visual-parity.md) |
| Diagnose a specific slowdown or regression. | [Performance issue](../playbooks/perf-issue.md) |
| Improve one metric through a series of experiments. | [Iterative optimization](../playbooks/hillclimb.md) |

## Diagnostics and evaluation

| When | Read |
| --- | --- |
| Investigate a symptom in a running application. | [Runtime forensics](../playbooks/runtime-forensics.md) |
| Explain an existing capture without rerunning the workload. | [Trace forensics](../playbooks/trace-forensics.md) |
| Compare skill, model or implementation variants. | [Evaluation](../playbooks/eval.md) |
| Create or change a reusable agent workflow. | [Authoring a skill](../playbooks/authoring-a-skill.md) |

## Planning and continuity

| When | Read |
| --- | --- |
| Design a change with dependencies or multiple PRs. | [Multi-phase plan](../playbooks/multi-phase-plan.md) |
| Resume a specific earlier task. | [Session pickup](../playbooks/session-pickup.md) |
| Stop on an explicit pause and leave a resume point. | [Pause safely](../playbooks/pause-safely.md) |
| Drive one bounded goal over repeated wake-ups. | [Autonomous run](../playbooks/autonomous-run.md) |

## Delivery and maintenance

| When | Read |
| --- | --- |
| Prepare a change for human review. | [Opening a PR](../playbooks/opening-a-pr.md) |
| Check status once, triage review threads, or monitor to merge readiness. | [Monitor a PR](../playbooks/babysit.md) |
| Verify and deliver an approved PR, stack or release. | [Shipping](../playbooks/shipping.md) |
| Coordinate independent PRs from implementation to their approved end states. | [Autopilot for a PR queue](../playbooks/autopilot-full.md) |
| Prepare dependent changes and hand over verified PR heads. | [Autopilot for a stack](../playbooks/autopilot-stack.md) |
| Inventory and reclaim explicitly selected worktrees or test artifacts. | [Worktree cleanup](../playbooks/worktree-cleanup.md) |

Adapted for SPK from the [reviewed pstack source](https://github.com/cursor/plugins/tree/7a583913eb1b8d1a0ee76753d1a2cf072e7b54f9/pstack/skills/poteto-mode/playbooks).
