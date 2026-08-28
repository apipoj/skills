---
name: task-to-pr
description: Take one identified task from source to a tested, independently reviewed pull request ready for human merge, including local browser QA for user-visible changes, without repeated approval prompts.
disable-model-invocation: true
---

# Task to PR

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

Take exactly one task, ticket, or existing pull request to
`READY_FOR_HUMAN_MERGE` without requiring the user to babysit normal development,
local QA, publication, or CI repair.

## Task-Bound Authority

An explicit current request to take one identified task to a pull request authorizes:

- read-only source and repository inspection;
- fetch plus creation or reuse of a dedicated task branch and worktree;
- bounded workspace edits, tests, documentation, and generated-source updates;
- starting the documented local application and running non-destructive local browser QA;
- exact-path staging, commit, and push to a non-default pull-request head ref;
- creating or updating the task pull request; and
- repairing valid in-scope local, browser-QA, review, or CI failures within the budgets below.

It never authorizes merge, deployment, protected/default-branch writes, force-push,
destructive production actions, unrelated tracker writes, credential exposure, or scope
expansion. Those boundaries require a separate workflow and authority.

## Workflow

1. **Resolve one source.** Read repository instructions and resolve the exact task and
   observable acceptance criteria. Resolve the exact GitHub repository from the selected
   remote and bind `GH_REPO=<owner/repo>` or `--repo <owner/repo>` to every GitHub read
   and write; never let a fork-aware client infer the fork parent. Verify every returned
   repository matches the selector. Represent the source identity/version, task fields,
   and criteria as canonical JSON: normalize text to Unicode NFC, convert CRLF/CR to LF,
   preserve other whitespace, recursively sort object keys, preserve array order, and
   encode UTF-8 without a BOM. Hash those exact bytes as the immutable task snapshot.
   Resume an unambiguous matching pull request, branch, and worktree before creating
   anything. Ambiguous identity or a missing material product decision returns `BLOCKED`.

2. **Isolate autonomously.** Preserve unrelated local work. Reuse a clean checkout only
   when it is already dedicated to the exact task; otherwise fetch and create a dedicated
   branch/worktree under task-bound authority. Never repurpose a shared dirty checkout.
   Record repository, base SHA, initial head, worktree, remote, and ref in the run receipt.

3. **Define the smallest complete change.** Create a short internal execution outline
   that maps every acceptance criterion to code, tests, browser behavior when applicable,
   and verification. Do not create a planning ceremony or broaden the task with cleanup.

4. **Implement and verify locally.** For changed behavior, prove focused RED before the
   minimum GREEN implementation. Run focused checks and the repository's full required
   gate. Update documentation and generated sources when public behavior, configuration,
   APIs, or commands change. If one file mixes task changes with unrelated user hunks,
   return `BLOCKED`; never absorb the file or expose its raw unrelated diff.

5. **Review independently.** Give a fresh reviewer the immutable task, acceptance
   criteria, complete diff, and verification evidence. Mark each criterion satisfied,
   partial, missing, or not verifiable. Repair valid Critical or Important findings,
   rerun tests, and request fresh independent review. Allow at most two local repair rounds.

6. **Run local browser QA.** When acceptance criteria or changed paths affect user-visible
   behavior:
   - start the documented local application on a non-production localhost URL;
   - derive non-destructive flows from acceptance criteria instead of inventing demos;
   - navigate, fill, click, and assert the expected URL, DOM, text, and visible state;
   - capture evidence for critical pass paths and screenshots plus DOM snippets on failure;
   - collect uncaught page errors, console errors, and failed relevant network requests;
   - repair valid in-scope failures, then rerun focused tests and every affected browser flow;
   - stop the local server in finally-style cleanup.

   Use disposable local fixtures or documented test accounts only. Never run destructive
   flows against production. For a non-UI task, record browser QA as `NOT_APPLICABLE` with
   the evidence used to classify it. Allow at most two browser repair rounds.

7. **Build the task-only publication state.** Secret-scan the complete proposed diff.
   Build a private temporary index seeded from the proposed parent and populate it with
   `git add -A -- <task paths>`; never use `git add .` or alter the real index for preview.
   Hash the unmodified raw bytes from `LC_ALL=C <git> -c core.quotePath=false -c
   color.ui=false diff --cached --no-ext-diff --no-textconv --no-color --binary
   --full-index --no-renames --src-prefix=a/ --dst-prefix=b/ <parent_sha> -- <paths>`.
   Record task snapshot, path hashes, task patch, expected staged diff, parent/tree,
   exact message, identities, signing/hook policy, expected remote old SHA, ref, explicit
   repository selector and environment,
   pull-request title/body digests, structured command argv, and any identified-task
   write with its transport, `payload_digest`, and non-null conditional/idempotency
   precondition. The digest covers the complete semantic tool/API argument or wire request:
   method, endpoint, path/query, behavior-affecting headers, and body/arguments, excluding
   only authentication secrets and transport metadata that cannot affect semantics. This
   digest detects drift for safety; it is not a user approval token.

8. **Commit and publish without another prompt.** Re-read state, then distinguish material
   drift from incidental metadata. Stage only the task paths and verify the complete staged
   patch. Commit, verify the resulting commit's parent, tree, task patch, message,
   identities, signing, hooks, and repository selector, then push only the non-protected
   pull-request ref.
   Create or update the pull request, preferring draft while required verification is
   incomplete. Immediately before each identified-task write, rebuild the complete semantic
   request and enforce `If-Match`, a version token, create-if-absent, or a bound idempotency
   key. Do not write when the transport cannot enforce the precondition.
   Verify the returned pull-request URL belongs to the selected repository.

9. **Observe and repair the published head.** Check required CI, every task-relevant
   check, automated review, mergeability, and current human or bot feedback. Diagnose a
   failure first. Repair only valid in-scope findings; rerun tests, fresh review, and local
   browser QA when applicable; then commit and push without another prompt. Allow at most
   two post-publication repair rounds and three CI observations per head. Never remotely
   rerun/cancel CI, wait indefinitely, or absorb an unrelated failure.

10. **Finish truthfully.** Return `READY_FOR_HUMAN_MERGE` only when the latest head is
    mergeable, required CI passes or is absent, every task-relevant check passes or is
    proven not applicable, applicable browser QA is green, important feedback is resolved,
    and no acceptance criterion is partial or missing. Otherwise return `BLOCKED` with the
    retained branch/worktree and a durable resumable checkpoint.

## Run Receipt

Maintain this machine-readable state throughout the run:

```json
{
  "schema": "spk.task-authority/v1",
  "approval_mode": "task_bound",
  "task": "<canonical identity>",
  "task_snapshot_digest": "<sha256>",
  "target": {
    "repository": "<owner/repo>",
    "worktree": "<absolute path>",
    "base_sha": "<sha>",
    "head_sha": "<sha>",
    "remote": "<remote>",
    "ref": "<non-protected PR ref>",
    "repository_selector": "GH_REPO=<owner/repo>"
  },
  "paths": [{"path": "<task path>", "sha256": "<hash>"}],
  "task_patch_digest": "<sha256 of raw canonical Git patch>",
  "expected_staged_diff_digest": "<same digest after staging>",
  "proposed_commit": {"parent_sha": "<sha>", "tree_sha": "<sha>", "message": "<exact>"},
  "pull_request": {"operation": "create | update", "state": "draft | ready"},
  "task_writes": [{"target": "<identified task>", "payload_digest": "<sha256>", "precondition": "<non-null>"}],
  "browser_qa": {"status": "PASS | FAIL | NOT_APPLICABLE", "flows": [], "artifacts": []},
  "repairs": {"local": 0, "browser": 0, "post_publication": 0},
  "phase": "<current phase>",
  "next_action": "<smallest resumable action>"
}
```

## Autonomy Profile

`afk_to_pr` — prompt budget 0; repair budget 2. A clear current request to take one identified task, ticket, or existing pull request to READY_FOR_HUMAN_MERGE grants task-bound authority for the full development-to-PR lifecycle. Resolve, isolate, implement, test, run local browser QA when user-visible behavior changes, review, commit, push, create or update the pull request, observe CI, and repair in scope without another prompt. Before pausing, keep the branch and worktree, then return task identity, current head, evidence, attempts, pull-request state, and the smallest resumable next action.

## Evidence Receipt

Return `spk.evidence/v1` with task identity, acceptance status, repository/worktree,
base/head, changed paths, RED/GREEN and full gates, independent review, local browser QA
or not-applicable proof, exact commit/ref/task writes, pull-request URL, CI/feedback,
repair counts, final status, risks, and resumable next action.

## Guardrails

- Never use `git add .`; stage only the complete explicit task path set.
- Never stage mixed task/unrelated hunks or expose unrelated raw content.
- Never merge or deploy.
- Never force-push or push a default/protected branch.
- Bind an explicit repository selector for every GitHub read/write and verify returned URLs.
- Never publish credentials, raw private sources, or a known-bad task head.
- Every task-relevant check must pass; optional unrelated failures require evidence of irrelevance.
- Keep the branch/worktree for recovery; cleanup is a separate exact-path operation.

Workflow design inspired by Owain Lewis's MIT-licensed
[Blueprint task-to-pr](https://github.com/owainlewis/blueprint/blob/main/skills/task-to-pr/SKILL.md).
