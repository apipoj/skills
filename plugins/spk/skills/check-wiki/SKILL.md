---
name: check-wiki
description: Audit the local project wiki for broken links, orphan pages, contradictions, stale claims, missing citations, schema drift, and secret exposure.
---

# Wiki Lint

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Audit project wiki content without reading raw private sources.

## Workflow

1. Resolve the requested wiki scope, defaulting to `ai_context/wiki/`.
2. Refuse to inspect `ai_context/sources/`, ignored paths, credentials, or environment
   files.
3. Create `ai_context/.spk-wiki-build` before the audit when the repository provides
   that guard. While active, use only non-shell read/search tools; shell execution is
   fail-closed except for an exact marker-cleanup command. Remove the marker in a
   finally-style cleanup on success or failure. This bounded temporary marker is the
   workflow's only permitted project write.
4. Check orphan pages, contradictions, stale claims, missing citations, dead links,
   index drift, and secret-shaped strings.
5. Rank evidence-backed findings and propose fixes; do not apply them unless requested.
6. Run an explicit verifier pass over the report and cleanup state.

## Evidence Receipt

Return `spk.evidence/v1` with audited pages, ranked findings, verification results,
guard cleanup, proposed fixes, risks, and next action.

## Guardrails

- Read wiki pages only; never inspect raw private sources.
- Invoke implicitly only for a current explicit wiki-audit intent, never as an
  adjacent cleanup step.
- Do not apply proposed fixes without explicit authorization.
- Do not write project state other than the temporary guard marker.
- Fail closed on secret-scan failure and always remove the temporary guard.
