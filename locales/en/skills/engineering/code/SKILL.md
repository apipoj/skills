---
name: code
description: Implement an explicit software request or reviewed plan with an adaptive loop that matches rigor to a quick patch, feature, bug fix, or refactor; use tdd for an explicitly strict test-first path.
---
# Adaptive Development

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

Implement the explicit request or supplied reviewed plan without broadening its scope.
This is the default local development loop. Choose the task shape once, then use the
smallest workflow that can prove the result. Use `tdd` when the user explicitly asks for
strict test-first work or when a high-risk seam makes that rigor worth its cost.

When a plan is relevant, read `docs/agents/artifacts.md` first. Resolve an explicit path,
then `ai_context/work/plans/`, then `docs/plans/`. Read
`ai_context/wiki/plans/` only as a legacy compatibility fallback and never treat that
fallback as canonical.

## Working Principles

- Prefer the smallest justified change. Delete, reuse, or simplify before adding an
  abstraction, dependency, file, or workflow.
- Name the data shape or domain shape before code only when state, branching, or repeated
  assumptions make that model useful. Otherwise prefer boring local code.
- Verify the real artifact or surface the user will experience. Compilation alone is not
  evidence that UI, CLI, API, migration, or generated output works.
- Subagents are optional and deliberate. Use them only for independent scopes, competing
  designs, or bulky context that would obscure the main thread; keep a coherent small
  change in the main thread.

## Workflow

1. Read repository instructions, the current diff, relevant code, acceptance criteria,
   and authority. Treat a clear explicit implementation, fix, update, refactor, test, or
   plan-and-implement request as bounded workspace authority. If no plan artifact exists,
   build an internal micro-plan instead of stopping.
   Apply Verification Choice below before implementation.
2. Classify the request once and follow the matching playbook:
   - **Quick patch** — inspect the evidence, make the smallest change directly, and run
     the smallest check that can catch a regression. No plan artifact, subagent, or
     independent verifier is required by default.
   - **Feature** — name the user-visible outcome and useful data shape, write a short
     dependency-ordered micro-plan, implement the smallest working slice, and exercise the
     real surface when one exists.
   - **Bug fix** — reproduce the bug or failure on the same surface, isolate and prove the
     root cause, then make the smallest fix. Capture a failing regression test first when
     the seam is cheap and reliable; otherwise preserve the runtime reproduction as RED
     evidence and verify that exact reproduction after the fix.
   - **Refactor** — pin current behavior with a focused test, snapshot, type check, or other
     equivalence evidence. Subtract before adding, preserve behavior, and show that the
     result reduces reader load or structural risk.
3. Run focused tests during the change. Run broader regression, type, lint, build, browser,
   or release gates in proportion to blast radius and repository instructions. A full
   suite is required when the repository or release gate requires it, not as ceremony for
   every local edit.
4. Update documentation when public behavior, commands, APIs, data, or operations changed.
5. Escalate when evidence warrants it: cross-boundary design, security, concurrency,
   migrations, contested architecture, or a large diff may need `plan`, `codebase-design`,
   strict `tdd`, parallel specialists, or an independent verifier. Escalation is a risk
   decision, not the default path.
6. Diagnose and repair in-scope failures within the autonomy repair budget. Pause only for
   a material user-owned decision, missing access, security or privacy risk, scope
   expansion, or an undeclared Git, remote, or destructive effect.
7. Finish with concise user-facing evidence: what changed, what was verified, what remains
   uncertain, and the next action only when one exists. Do not expose YAML, JSON, schemas,
   empty fields, or internal receipts unless the user asks for machine-readable output.

## Verification Choice

At workflow entry, before implementation, ask one compact question when the current
request or reviewed plan has not already settled test-case coverage and, for UI/frontend
changes, browser QA proof. Ask only about the undecided parts; reuse explicit choices
from this session. This is the entry question about success criteria, outside the
mid-flow prompt budget, not another implementation approval.

For UI/frontend work, recommend both: “Should I add or update test cases and run browser
QA with screenshots and pass/fail evidence for the affected UI flows?” For other work,
ask whether to add or update test cases; include browser QA only when a browser surface
is affected. Offer both, test cases only, browser QA only, or required checks only as
applicable. Explain which repository checks are mandatory and remain required for every
choice. Continue independent inspection while waiting; settle the choice before
implementation rather than treating silence as consent or a decline.

Record the answer in the micro-plan or existing plan. For selected test cases, derive
normal, error, and relevant edge cases from acceptance criteria and record expected
results; automate where a reliable test seam exists. For selected browser QA, exercise
the affected flows on the real local app, including relevant desktop/mobile layouts,
capture screenshots and expected-versus-actual pass/fail results, and report relevant
console or network failures. Report unavailable browser access as blocked verification,
with the missing prerequisite. Distinguish passed, failed, declined, blocked, and
not-applicable checks in the final evidence; never claim browser QA from a build alone.

## Workspace Authority

Accept any of these as bounded workspace authority:

- The current request explicitly asks to implement, fix, update, refactor, or test an
  identified outcome.
- The current request explicitly asks to plan and then implement an identified outcome.
- The current request asks to implement a referenced reviewed plan.

An `ask-me` summary alone remains read-only. A plan-only request remains plan-only. When
the implementation outcome is explicit but a plan file is absent, derive a bounded
micro-plan from repository evidence and acceptance criteria. Record assumptions and keep
working; ask only when one material decision changes scope, risk, cost, or success.

## Product loop implementation

When a ticket belongs to a selected product loop, read its linked spec, design, plan,
ACs/test cases, and verification choices. Reuse those choices rather than asking again.
Implement unblocked tickets in dependency order and attach actual verification evidence
before marking each done. Continue through all in-scope tickets, then return the result to
`start` for review and human UAT. A UAT defect returns to its affected ticket; a new product
requirement returns to spec/planning. Mark dependent evidence stale when its source changes.

## Autonomy Profile

`afk_local` — prompt budget 0; repair budget 3. A clear request grants bounded work only up to this skill's declared effect level; the profile never upgrades read-only work into a write. Keep working through inspect, act, verify, and bounded repair without asking the user. Before pausing, record phase, assumptions, evidence, attempts, and the smallest resumable next action.

## Evidence Receipt

Report the outcome in plain user-facing language. Include only changed artifacts, relevant
verification, material risks or approval boundaries, and a next action when one is useful.
Do not make the user read an internal receipt format.

## Guardrails

- Stay inside the approved scope and preserve unrelated user changes.
- Never modify the workspace without a clear explicit implementation outcome and bounded
  workspace authority for that scope.
- Never skip a required failing gate, invent test results, or describe unverified work as
  done.
- Do not commit, push, create a PR, deploy, or perform another remote write without
  separate explicit authorization for that effect.

## Upstream Discipline

The pinned Matt Pocock implementation guidance remains a source, with SPK's adaptive loop
and stricter approval boundaries taking precedence.

Implement the work described by the user in the spec or tickets. Use `/tdd` at pre-agreed
seams when strict RED/GREEN evidence is useful. Run type checks and tests at the cadence
that matches the change, and run the full suite when the repository or release requires it.
Use `/code-review` for material or high-risk changes. Prepare a clear commit message, but
commit only when the user separately authorizes that exact Git write.
