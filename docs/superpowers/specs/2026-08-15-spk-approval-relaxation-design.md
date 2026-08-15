# SPK approval relaxation and button-first interaction

Date: 2026-08-15
Status: approved for implementation

## Problem

SPK's approval protocol makes a human transcribe a 64-character digest before any
gated operation. Typing `Approve` fails the gate, so creating a branch and a
worktree — a local, reversible operation — is blocked behind the same ceremony as
a production deployment.

Two separate defects produce that experience:

1. **Scope.** `task-to-pr` step 2 binds a `task_to_pr_isolate` envelope around
   fetch, branch creation, worktree creation, and checkout. None of those leave
   the machine and all are undone with one command.
2. **Matching.** The guardrail counts approval only when the latest message
   equals the resume instruction exactly, and explicitly discounts a token that
   appears inside quotes. Any paraphrase, any surrounding text, any copy that
   picks up a backtick, fails.

A third observation came out of the review: SPK never asks for a decision through
the host's structured choice prompt. Every question is prose asking the user to
type a literal (`ยืนยัน`, `ตามนี้`, a list index, a digest). Transcription is the
failure surface; removing it removes the class of defect.

## Decision

### Approval modes

Two modes, defined once in `contracts/workflows.json` beside `effectLevels`:

- `confirm` — proceed when the latest user message unambiguously accepts the
  intent that was just shown.
- `bound_token` — proceed only when the latest user message carries the digest of
  the current intent.

Assignment:

| Gate | Mode |
|---|---|
| `task-to-pr` isolate — fetch, branch, worktree, checkout | `confirm` |
| `task-to-pr` publish — stage, commit, push, PR, ticket write | `confirm` |
| `pr` write — stage, commit, push, PR | `confirm` |
| `uninstall` — file removal | `confirm` |
| `deploy` | `bound_token` |

A local commit is reversible with one command and invisible to anyone else, so it
sits in `confirm`. Secret exposure stays covered by the secret-scan gate and by
the unchanged rule that only explicitly listed paths are staged.

### What `confirm` requires

1. The intent — targets, paths, commands — was shown in the immediately preceding
   assistant message.
2. The latest user message accepts that intent unambiguously: a click on the
   approving option, or an affirmative such as `approve`, `ok`, `yes`, `go`,
   `เอาเลย`, `จัดไป`, `อนุมัติ`. Case-insensitive, surrounding whitespace and
   punctuation ignored.
3. It does not count as approval when the message asks a question, requests a
   change, appears only inside a quote or code block, or arrives before the
   intent was shown.
4. Drift invalidates approval. Recompute state immediately before the write; if
   anything differs from what was shown, show the new intent and ask again.
5. One approval authorizes one intent. It does not carry to the next gate or to a
   retry after any change.

### What `bound_token` requires

Everything `confirm` requires, plus a digest in the consenting message. Matching
is deliberately lenient about form and strict about identity:

- the token may appear anywhere in the message, not as the whole message
- hex comparison is case-insensitive
- surrounding backticks, quotes, and whitespace are stripped before matching
- a prefix of at least 12 hex characters is accepted when it uniquely matches the
  current digest
- the previous rule discounting quoted or forwarded tokens is removed; the real
  protection is that the digest must match a freshly revalidated state

The full 64-character digest is recomputed and compared immediately before the
write regardless of how approval arrived.

### Approval as a choice prompt

Both modes are presented through the host's structured choice prompt when one is
available. Option labels name the real target rather than reading `Approve`:

- `confirm` — `Push → origin/feat-x, open PR`
- `bound_token` — `Deploy → production (a1b2c3d4e5f6)`

For `bound_token` the label carries a 12-character digest prefix, so the recorded
consent is bound to the intent's identity whether the user clicks or types. A bare
affirmative never satisfies `bound_token`.

### Interaction policy

A new top-level `interactionPolicy` in `contracts/workflows.json`:

> When a decision or confirmation is needed, use the host's structured choice
> prompt if one is available; otherwise present a numbered list. Options must be
> genuinely distinct, exactly one is marked as recommended, and a free-form answer
> stays possible. Do not force an open-ended question into fixed options.

The rule is written in terms of capability, not tool name, so skill bodies stay
provider-neutral as `plugins/spk/AGENTS.md` requires. Claude Code renders buttons;
Codex renders the numbered-list fallback that exists today.

Skills that present a real choice menu carry a short line referencing the policy:
`ask-me`, `asking`, `start`, `wizard`, `design-options`, `to-questionnaire`,
`setup`, plus the four gated skills. Skills that merely mention confirmation in
passing are left alone, which also keeps the `workflow-authority` byte and line
budgets intact.

## Scope

Changed:

- `contracts/workflows.json` — `approvalModes`, `interactionPolicy`, per-skill
  `approvalMode` on the four gated skills
- `deploy`, `pr`, `task-to-pr`, `uninstall` SKILL.md in `skills/operations/`,
  `locales/en/skills/operations/`, and `plugins/spk/skills/`
- the seven choice-menu skills in the same three locations
- `plugins/spk/agents/{deploy-orchestrator,devops,pr-manager}.md`
- `tests/workflow-authority.test.js` — split the approval assertion by mode and
  cover the interaction policy
- `plugins/spk-codex/**` regenerated; version bumped across version-bearing files

Unchanged:

- `scripts/install/uninstall.cjs`. Its `buildUninstallPlan()` → `uninstall({approvalToken})`
  round-trip runs between the agent and the module, not through a human. The human
  types or clicks a plain approval and the agent forwards the digest.
- secret scanners
- the guardrails against `git add .`, force-push without `--force-with-lease`, and
  staging any path that was not approved

## Risks

- **Looser approval is easier to fabricate.** A model could read an unrelated "ok"
  as consent. Mitigated by requiring the intent in the immediately preceding
  message, by rejecting affirmatives that arrive with a change request, and by
  keeping drift revalidation mandatory.
- **Button labels can mislead.** A label reading `Approve` hides what is being
  approved, so labels are required to name the target.
- **Codex divergence.** The policy is capability-phrased and the numbered-list
  fallback is the current behavior, so Codex output does not change.
