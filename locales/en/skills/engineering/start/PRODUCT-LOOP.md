# Product loop

Read this only for an explicit request to take a product or feature through discovery,
visual design, specification, planning, tickets, implementation, and verification. An
ordinary fix, an existing ticket, or a standalone artifact keeps its smaller workflow.

## Entry and ownership

`start` owns the loop and the current checkpoint. Use this sequence:

`ask-me` → `show-me` → `design-options` → `to-spec` → `plan` → `to-tickets` → `code`
→ verification and `code-review` → human UAT → delivery readiness.

All these local stages are available in the SPK bundle. `ask-me` remains read-only: its
confirmed brief is returned to the parent workflow before the parent saves any artifact.
A request for the complete loop grants only the named local outcomes. Product confirmation
is a decision about content, not new Git or external authority. Stop at a requested endpoint
such as spec-only, plan-only, or tickets-only. Do not interpret "show me the loop" as a
request to execute it. Separate the request to improve SPK itself from a request to build
an end-user product with SPK.

Inspect existing artifacts first. Enter at the earliest unresolved prerequisite, retaining
confirmed decisions and marking completed or not-applicable stages with evidence. For a
backend-only product, a flow diagram may be useful but UI wireframes and design variants
are not applicable. If the user explicitly requests the full sequence, account for every
stage rather than silently omitting one.

## Stages and completion criteria

| Stage | Consume | Produce and verify |
|---|---|---|
| `ask-me` | Idea, existing facts, user answers | A confirmed product vision: intended users, problem, value, main journey, MVP/non-goals, constraints, success evidence, and deliberate deferrals. Ask one material question at a time, reusing answers. |
| `show-me` | Confirmed vision | A journey/flow diagram and, for UI, a screen map or low-fidelity wireframe. Resolve material misunderstandings before visual design. |
| `design-options` | Vision and reviewed flow/wireframe | Reviewable mockups with realistic copy, relevant responsive layouts and loading/empty/error/success states. Record the user's selected direction and artifact revision. Viewing or silence is not selection. |
| `to-spec` | Confirmed vision and selected design | A reviewable spec linking those sources, stable acceptance criteria (AC-01), and test cases (TC-01) with preconditions, steps, and expected results. Include behavior, relevant data/API constraints, non-goals, and open decisions. PRD/SRD may be sections of this one spec rather than duplicate documents. |
| `plan` | Spec, AC/test cases, selected design, repo | Dependency-ordered implementation tasks, affected areas, verification choices, and relevant rollout/rollback risks. Every in-scope AC has a task and a check. Review consistency; ask only unresolved material product/scope decisions. |
| `to-tickets` | Spec and implementation plan | Local vertical slices in dependency order. Each ticket links ACs, test cases, design and plan, lists real blockers and an observable done condition. Check missing coverage and dependency cycles before coding. |
| `code` | An unblocked ticket and its source references | Implement and verify that slice. Keep ticket status and evidence current; continue remaining in-scope tickets. A draft or a single finished ticket does not complete the loop. |
| Verification and review | Implemented slices and selected checks | Run applicable tests, browser QA, and code review before proposing merge. Separate security review from scanner commands and findings. Repair valid in-scope failures and recheck affected behavior. |
| Human UAT | Runnable result, ACs, test results | Give the user concrete scenarios and expected results; record accepted, changes requested, pending, or not applicable. Automated success never impersonates human acceptance. |
| Delivery readiness | QA/review results, UAT state | Report ready or blocked for the selected delivery target. Only separately authorized Git/PR, merge, deploy, and post-deploy verification stages execute; their existing workflows and approval boundaries still apply. |

Confirm the vision and selected design before dependent implementation. For spec, plan,
and tickets, check consistency against those decisions without adding a ritual approval
for each file. A new product tradeoff goes back to the user; a clerical split does not.

## Verification agreement

Settle verification during discovery or planning, before implementation. Ask only the
undecided parts: test-case documentation/automation, browser QA proof for UI, and human
UAT where business acceptance matters. Recommend test cases plus browser QA for UI work.
Carry the answer through the spec, plan, tickets, and code; never re-ask at each stage.
Required repository checks remain mandatory. If the requested spec includes test cases,
that part is already selected. Record unavailable tooling as blocked verification rather
than treating it as declined or passed.

Browser proof includes the affected flow, viewport, expected/actual result, screenshots,
and relevant console/network failures. A screenshot supports visual appearance; an
executed interaction or E2E test supports behavior. Label mocked APIs or fixture data and
avoid claims about integrations that were not exercised.

## Checkpoint and traceability

Respect `docs/agents/artifacts.md` when present. Otherwise keep one local checkpoint at
`ai_context/work/product-loops/<slug>/index.md`. It links, rather than duplicates, the
vision, visuals, selected design, canonical spec, plan, and one file per ticket. Keep each
stage artifact in its workflow's normal destination. Do not require tracker configuration
or remote publication to finish local spec/ticket creation.

The checkpoint records the requested endpoint, current stage, settled decisions and their
source messages/artifact revisions, open questions, verification choices, authorized
effects, artifact links, and next action. Track evidence by AC → TC → ticket → observed
result. Use pending, passed, failed, declined, blocked, or not applicable truthfully.
Store only useful project facts and decisions; exclude secrets and private raw transcripts.

On resume, read the checkpoint and linked current artifacts, validate their references,
and continue the earliest incomplete prerequisite. Never reconstruct approval from a file
claim alone: use the user's actual authorization and the applicable boundary protocol.

## Rework and closure

When the user changes vision or design, identify dependent ACs, test cases, tickets, and
results. Mark affected outputs stale, update their sources, then repeat only the affected
stages and checks. A UAT defect returns to its ticket; a new requirement returns to spec
and planning before more implementation. Retain unaffected evidence.

At the local endpoint, report what was built and verified, outstanding risks, UAT status,
and the exact next delivery action if requested. If UAT is pending, say "local implementation
verified; awaiting UAT", not "product accepted". If deployment was requested, the loop stays
at its approval checkpoint until the concrete target and payload are authorized. After an
authorized deployment, attach the existing deploy workflow's smoke/browser results and
record relevant learning/ADR updates when behavior or an architectural decision changed.
