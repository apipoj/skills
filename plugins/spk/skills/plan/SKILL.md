---
name: plan
description: Plan a software change from repository evidence into scoped requirements, architecture, dependency-ordered tasks, verification gates, and rollback notes.
---

# Feature Planning

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Produce a developer-ready plan from the user's feature request.

## Workflow

1. Inspect repository instructions, current state, related code, prior decisions, and
   any incoming handoff receipt. Record whether it requests a plan-only result or a
   post-plan development confirmation.
2. Use the smallest useful specialist set when delegation is available: product
   requirements and independent market research may run in parallel; architecture
   follows their findings; task decomposition follows architecture.
3. Give every delegated worker a self-contained prompt and disjoint ownership. Fall
   back to sequential work in the main conversation when subagents are unavailable.
4. Run an explicit verifier pass over acceptance criteria, feasibility, test commands,
   rollout, and rollback before calling the plan ready.
5. Save the reviewed result to `ai_context/wiki/plans/YYYY-MM-DD-<slug>.md` when that
   scaffold exists; otherwise return it inline. Update the index/log only when present.
6. When the incoming request asks for a plan-to-development handoff, show the reviewed
   plan and ask for a separate implementation confirmation. Do not begin implementation
   in the same turn as the plan.

Budget: at most five specialist calls, two concurrent workers, and one retry for a
blocked worker. Stop fan-out once the verifier has enough evidence.

## Plan Quality Bar

- Tasks are 2-5 minute actions where possible and independently verifiable.
- Every task has exact file paths or explicit discovery steps.
- Every behavior change includes TDD steps.
- The plan says what NOT to build.
- Acceptance criteria are observable and testable.
- If uncertainty changes architecture, ask one focused question instead of guessing.

## Optional Development Handoff

Use this only when the current request or an incoming `ask-me` receipt explicitly asks
to continue from planning toward development. After the verifier accepts the plan,
show its scope and ask in the user's language. Thai shape:

```markdown
## แผนพร้อมแล้ว

การเริ่ม dev จะเขียนหรือแก้ code, tests และ docs ใน workspace ตาม plan ที่แสดงนี้

เริ่ม dev ตาม plan นี้ไหม?

คำแนะนำ: ถ้า plan ถูกต้อง ให้ตอบ "เริ่มพัฒนาตาม plan"; ถ้าต้องแก้ ให้บอกจุดที่ต้องแก้ก่อน
```

An earlier request such as “plan then develop” authorizes planning only because the
plan did not yet exist. Start the `code` workflow only after an unambiguous post-plan
answer approving the exact plan shown. If the plan is blocked, unverified, or has
material unresolved choices, do not ask to start development.

## Evidence Receipt

Return `spk.evidence/v1` with the plan artifact, repository evidence, acceptance
criteria, verifier result, assumptions, risks, handoff intent, and
`implementation_authorized: false` until a separate post-plan answer is received.

## Guardrails

- Do not implement, commit, push, or deploy while planning.
- Do not treat summary confirmation or a pre-plan “plan then develop” choice as
  approval of an unseen plan.
- Prefer existing seams and explicitly justify every new dependency or subsystem.
- Preserve unresolved product choices as questions instead of silently guessing.
