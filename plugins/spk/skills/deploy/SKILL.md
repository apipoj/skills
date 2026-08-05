---
name: deploy
description: Deploy an explicitly approved revision to a named environment, verify smoke and user-visible behavior, and preserve a tested rollback path.
disable-model-invocation: true
---

# Deployment

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
4. **Request approval.** If the latest user message does not contain the exact token
   `spk-approve:<intent_digest>`, return the `NEEDS_USER_INPUT` envelope below and stop.
   Do not delegate or deploy.
5. **Resume safely.** On an exact token, repeat preflight and recompute the digest. Any
   change to revision, environment, commands, scope, provider, or dirty state
   invalidates approval and requires a new envelope.
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
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "target": {"environment": "<env>", "revision": "<sha>", "project": "<project>"},
  "commands": ["<exact command and argv>"],
  "verification": ["<gate or probe>"],
  "rollback": "<exact rollback command>",
  "resume_instruction": "Reply exactly: approve spk-approve:<intent_digest>"
}
```

Approval is valid only when the user's latest message contains that exact token and
the recomputed digest matches.

## Evidence Receipt

Return `spk.evidence/v1` with deployment revision/URL, approval digest, commands,
verification results, timings, artifacts, risks, and next action.

## Guardrails

- Never deploy from an unidentified revision or hide dirty working-tree state.
- Never pass credentials in prompts, commands, logs, or receipts.
- Approval covers only the listed intent; no inferred extra environment or command.
- Never continue to UI tests after a failed smoke probe.
- Never roll back, promote, or redeploy without a separate bound approval.
