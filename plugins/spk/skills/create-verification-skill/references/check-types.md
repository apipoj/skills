# Choose checks from the actual work

| Work kind | Inspect | Exercise or review | Observable proof |
|---|---|---|---|
| Task acceptance | Selected task/spec, changed artifact, user entry points | Drive each acceptance path and relevant error/edge case; verify side effects | Literal expected UI/API/CLI/file/data result, action transcript, assertion and evidence |
| Test script | Runner, setup/teardown, fixtures, assertions, exit behavior | Run normal input and an isolated intentionally wrong result; verify both exit status and asserted output | Correct behavior passes, wrong behavior fails nonzero, cleanup leaves user's state intact |
| Spec review | Canonical requirement sources, scope, terminology, implementation constraints | Trace requirements, detect contradictions, missing acceptance criteria and edge cases; compare implementation only when requested | Requirement ID with exact file/line citations, reasoned finding and coverage/decision gaps |
| Skill validation | Frontmatter, invocation, referenced assets, effect/approval policy, sample tasks | Parse metadata and resolve references; run representative positive, near-miss and safety scenarios in disposable context | Actual activation, produced result, safe boundary behavior, tools available, and untested behavior |

For an app, launch the documented local command and wait for an observed readiness signal.
Use stable accessibility labels, data attributes, route paths or prompt strings rather than
coordinates. Capture the action and resulting state, including relevant side effects. For a
CLI/library, run the public entry point and assert literal outputs; no long-lived server is needed.
For a spec or prompt-only skill, a server/browser can be NOT_APPLICABLE with a reason; do not invent
a UI requirement. Prefer existing checks over recreating them. Tie every check to its criterion.

Behavioral skill scenarios must test outcomes rather than matching headings or intended wording.
A positive case shows the requested result, a near-miss shows non-activation or correct routing,
and a safety case shows the actual boundary. If the runtime cannot execute a scenario, mark it
NOT_RUN and report only the metadata/reference checks actually performed. Capture reviewer judgments
and evidence; a scripted phrase search is not a semantic spec review or a behavioral skill test.
