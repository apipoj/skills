# Spec and workflow review

Sources: the current user request, relevant entries in `contracts/workflows.json`,
and corresponding native/English SKILL.md sources. Cite exact paths/lines in findings.

Review the requested capability, inputs, outputs, trigger exclusions, effect level,
autonomy/approval boundary, and evidence standard together. Check every workflow step
against the skill, including limitations in referenced templates. Identify contradictions
or missing acceptance criteria instead of changing the request to fit implementation.

For visual skills, distinguish a compact visual explanation from a beginner lesson;
project moodboard/output conventions must not make Business OS mandatory for general SPK
users. For verification authoring, distinguish creation/executed proof from complete task
coverage. Repo-local verification and shipped reusable authoring must both exist.

Failure control: review a disposable spec that requires a read-only skill to publish
without approval. Report the contradictory requirement and cite both source clauses;
never execute that proposed effect. This is a reviewer judgment with evidence, not a
static keyword test. A static gate alone leaves this criterion NOT_RUN.
