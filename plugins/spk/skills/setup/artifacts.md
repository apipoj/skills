# Project Artifact Policy

This file is the routing source of truth for project artifacts. It tells agents where
an artifact starts, when it becomes canonical, and who may see it. It does not replace
the artifacts themselves.

## Default boundary

- `ai_context/` is local working state. It is excluded from Git by default.
- `docs/`, `CONTEXT.md`, and context-local domain files are team-visible canonical
  candidates. Writing them does not authorize `git add`, commit, or push.
- An issue tracker or document system is canonical only when this policy or
  `docs/agents/issue-tracker.md` names it.
- One artifact has one canonical destination. Mirrors must be generated, read-only, and
  link back to the canonical artifact.
- Creating or approving an artifact never authorizes sending, publishing, uploading,
  merging, or deployment.

## Routing table

| Artifact | Draft/default destination | Canonical destination | Visibility | Promotion authority | Retention and consumer rule |
|---|---|---|---|---|---|
| AI/project memory | `ai_context/wiki/` | None; it is derived memory | Local-private | Agent may maintain cited summaries | Keep an index and pointers; never duplicate a canonical body |
| Raw source | `ai_context/sources/` | Original source or a separately reviewed sanitized document | Local-private | Explicit source selection | Immutable input; never publish automatically |
| Glossary | Edit `CONTEXT.md` or the mapped context file directly | The same file | Team | A resolved term in the active workflow | Vocabulary only; never use as a spec or scratch pad |
| ADR | `docs/adr/NNNN-<slug>.md` with `proposed` status | The same file with reviewed status | Team | Project review convention | Keep history; supersede with a new ADR instead of rewriting accepted rationale |
| Plan | `ai_context/work/plans/YYYY-MM-DD-<slug>.md` | `docs/plans/YYYY-MM-DD-<slug>.md` only when the plan is team-shared or audit-relevant | Local to team | Explicit request or project policy | Readers prefer policy path, then local work, then canonical docs; legacy wiki plans are fallback only |
| Spec | `ai_context/work/specs/YYYY-MM-DD-spec-<slug>.md` | The configured issue tracker, or `docs/specs/` when this project selects file-based specs | Local to team/external | Existing tracker approval boundary | Never keep two editable canonical copies |
| Research | `ai_context/work/research/YYYY-MM-DD-research-<slug>.md` | `docs/research/` when reusable, cited, and reviewed for its audience | Local to team | Explicit request or project policy | Canonical citations must be accessible to the intended audience |
| Questionnaire | `ai_context/work/questionnaires/YYYY-MM-DD-questionnaire-<slug>.md` | `docs/deliverables/<audience>/` or the configured document system | Local to controlled external | Explicit promotion request | Review and redact before promotion; sending remains a separate action |
| Customer deliverable | `ai_context/work/<kind>/` | `docs/deliverables/<audience>/` only for repo-backed delivery, otherwise an explicitly configured document system | Local to controlled external | Exact artifact and target approval | Approval does not authorize delivery |
| Handoff | `ai_context/work/handoffs/YYYY-MM-DDTHHMMSSZ-<slug>.md` | None by default | Local/transit | Explicit alternate destination | Reference canonical artifacts; mark consumed or expired after use |
| Design exploration | `.spk/design-options/<screen>-<timestamp>/` | An approved design reference selected by project policy | Local | Explicit user selection | Disposable until approved |
| Teaching workspace | `MISSION.md`, `lessons/`, and `learning-records/` in the selected teaching workspace | The same dedicated workspace | Project-specific | Learner confirmation | Do not mix teaching records into product memory |

## Promotion

Before promotion:

1. Resolve the single canonical destination from this file.
2. Review content, citations, secrets, privacy, and intended audience.
3. Record the local draft and canonical path or URL.
4. Add only a short summary and pointer to `ai_context/wiki/`; never copy the body.
5. Keep external send or publish behind its own exact approval boundary.

If a row is unsuitable for this project, edit this file once. Skills should read the
policy instead of hardcoding a competing destination.

