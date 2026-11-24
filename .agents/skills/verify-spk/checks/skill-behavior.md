# Skill behavior

Sources: changed skill entry points and `evals/skilllab-scenarios.json` cases. Start
from actual instructions, not an evaluator's intended answer. Use temp output and
local/test fixtures. Record input, observed activation, produced artifact, tool checks,
limitations, and the actual boundary response.

- show-me: compare two supplied approval flows without a moodboard; produce a focused
  visual using neutral accessible styling. Distinguish proposed UI from observed UI.
- eli5: teach caching with one learning target, concrete example, and stale-data model
  limits; use inline fallback if HTML tools are unavailable.
- poteto-mode: use a failing public command to distinguish two attempted fixes that shared an incorrect assumption. Inspect its input, apply the matching principle, then rerun the original command.
- code-review: trace a comment to a caller or an external contract and report the smallest enforceable check. Observe that review leaves the fixture untouched.
- no-comments: exercise a cleanup request with a redundant comment, an SPDX notice and a supported external constraint. Verify the scoped diff and the original observable behavior.
- create-formal-verification-skill: run the generated verifier at a stated bound, reproduce a counterexample in a broken copy, then rerun the original and check its fingerprint.
- create-verification-skill: produce a real project-local verifier, coverage map and
  any required helpers; exercise generated instructions and a safe failure control,
  then confirm evidence survived cleanup. Missing tools remain NOT_RUN.

For each changed skill, also check a glossary near-miss and an out-of-scope unsafe
request. Check that behavior follows the declared boundary and does not invent proof.
Use the current app browser for HTML inspection. Missing runtime/browser access is an
explicit coverage gap. Corpus validation checks case structure only; it is not these
behavioral runs. No external posting or production changes are allowed by these checks.
