# Skill packaging and task acceptance

Authority: the selected user request, `manifest.json`, and each workflow entry in
`contracts/workflows.json`. For this change, required IDs are show-me, eli5, and
create-verification-skill; guide-me must remain in the released roster.

Drive the quick helper from the repo root. It runs manifest validation, generated
platform comparison, locale/payload parity, and router coverage. Full verification
also checks native sources, reference links, SkillLab scenarios, roster/version
consistency and required tests through the canonical release command.

Expected: each required ID has its locale sources and generated Claude/Codex payload,
reachable routing, and its effect/activation policy. Generation is checked against the
actual artifacts. All version-bearing files agree with the manifest; an unreleased
change is not a claim that a new public version was shipped.

Evidence: command logs, exit status, target fingerprints, and current diff. No server,
publication, or installed-client mutation is required. Missing live-client testing is
a separate integration gap, never an implicit PASS.
