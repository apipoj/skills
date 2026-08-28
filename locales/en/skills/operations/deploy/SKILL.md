---
name: deploy
description: Deploy an explicitly approved revision to a named environment, verify smoke and user-visible behavior, and preserve a tested rollback path.
disable-model-invocation: true
---

# Deployment

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

This skill is manual-only. Invocation starts a read-only preflight; it is not approval
to perform a network write.

## Workflow

1. **Preflight without mutation.** Resolve the exact environment, immutable revision,
   provider/project, deployment command, expected URL, quality gates, smoke probes, and
   rollback command. Inspect dirty state and authentication without exposing secrets.
2. **Verify readiness.** Run required local gates. A failing or unknown gate blocks
   deployment unless the user supplies a documented exception in a new request.
3. **Build immutable intent.** Canonicalize this object with stable key ordering:
   `operation`, `environment`, `revision`, `provider`, `project`, `commands`,
   `verification`, and `rollback`. Use its complete 64-character lowercase SHA-256 hex
   digest as `intent_digest`.
4. **Request approval.** Show the deployment and rollback intent, then ask through the
   host's structured choice prompt if one is available; otherwise present a numbered list.
   Label the approving option with the real target and a 12-character digest prefix, such
   as `Deploy → production (a1b2c3d4e5f6)`. Never label it only `Approve`. This gate is
   `bound_token`: a plain affirmative is never sufficient. Without a consenting message
   carrying the digest, return the `NEEDS_USER_INPUT` envelope below and stop. Do not
   delegate or deploy.
5. **Resume safely.** Repeat preflight, recompute the full 64-character digest, and compare
   it immediately before any write. Any change to revision, environment, commands, scope,
   provider, or dirty state invalidates approval and requires a new envelope.
6. **Execute bounded deployment.** Delegate to an available deployment worker or run
   sequentially in the main conversation. Pass the full approved intent and token.
   The worker must not ask the user questions or expand scope.
7. **Verify explicitly.** On deploy success, run health/API smoke probes, then optional
   UI checks. A failed smoke test halts the workflow. Run a final verifier node over
   revision, URL, probes, and rollback readiness.
8. **Handle rollback separately.** Never auto-rollback. Return a new approval envelope
   bound to the rollback command and deployed revision.

Budget: one deploy attempt, one smoke pass, one UI pass, and no automatic retries.

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "deploy",
  "approval_mode": "bound_token",
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "choices": [{"label": "Deploy → <env> (<12-char digest prefix>)", "approves": true}, {"label": "Cancel", "approves": false}],
  "target": {"environment": "<env>", "revision": "<sha>", "project": "<project>"},
  "commands": ["<exact command and argv>"],
  "verification": ["<gate or probe>"],
  "rollback": "<exact rollback command>",
  "resume_instruction": "Choose the option labeled with the target and digest prefix, or reply with spk-approve:<intent_digest>"
}
```

Match the token anywhere in the consenting message, ignore hex case, strip surrounding
backticks and quotes, and accept a prefix of at least 12 hex characters that uniquely
matches the current digest. Approval is valid only when the recomputed 64-character
digest matches freshly inspected state; one approval authorizes one intent and never
carries to a retry after any change.

## Autonomy Profile

`boundary_gated` — prompt budget 1; repair budget 2. Prepare and verify the exact boundary intent without mutation, then request one approval for the declared operation. After approval, complete every stage and allowed retry inside the stable envelope without another prompt. Before pausing, persist the approved envelope digest, current phase, evidence, attempts, and rollback or recovery path.

## Evidence Receipt

Return `spk.evidence/v1` with deployment revision/URL, approval digest, commands,
verification results, timings, artifacts, risks, and next action.

## Guardrails

- Never deploy from an unidentified revision or hide dirty working-tree state.
- Never pass credentials in prompts, commands, logs, or receipts.
- Approval covers only the listed intent; no inferred extra environment or command.
- Never continue to UI tests after a failed smoke probe.
- Never roll back, promote, or redeploy without a separate bound approval.
