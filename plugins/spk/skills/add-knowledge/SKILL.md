---
name: add-knowledge
description: Ingest an explicitly selected source into the local project wiki with provenance, secret checks, entity links, and an append-only change record.
disable-model-invocation: true
---

# Wiki Ingest

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Run this workflow directly in the current conversation. It is a knowledge-maintenance
workflow, not feature planning.

## Workflow

1. **Resolve exactly one source.** Accept one user-supplied local file or URL. Reject
   directories, globs, credential/environment files, device paths, and paths outside
   the workspace. For a URL, fetch only that URL and record the final URL.
2. **Prepare safely.** Ensure `ai_context/sources/` and `ai_context/wiki/` exist. Before
   storing raw content, verify the destination is ignored using
   `git check-ignore --no-index`; if it is not ignored, stop without copying.
3. **Fingerprint and deduplicate.** Before arming the shell guard, compute SHA-256 over
   the explicitly authorized source bytes. If the wiki log
   already records the same hash, report the existing pages and do not rewrite them.
4. **Store raw input immutably.** Copy to a sanitized deterministic name under
   `ai_context/sources/`; never overwrite a different file. Keep raw content out of the
   response and out of version control.
5. **Arm the guard.** Create `ai_context/.spk-wiki-build` immediately before extracting
   from the stored source or writing wiki content. While it is active, use only
   non-shell read/search/write tools; shell execution is fail-closed except for an
   exact marker-cleanup command. Remove the marker in a finally-style cleanup on every
   success, failure, cancellation, or blocked return.
6. **Extract conservatively.** Read the wiki schema. Create or update only notable
   `concept`, `entity`, `decision`, `plan`, or `learning` pages. Every non-obvious claim
   needs a source citation. Redact secret-shaped values as
   `<REDACTED:type origin=sources/file:line>`; never copy the value.
7. **Link and verify.** Maintain frontmatter, internal links/backlinks, and
   `index.md`. Use non-shell reads/searches to run secret, link, schema, and orphan
   checks over the proposed wiki diff before writing. Fail closed on secret-scan
   errors.
8. **Record evidence.** Append one log entry with UTC timestamp, source path/URL,
   content hash, pages created/updated, redaction count, and verification result.
9. **Cleanup and report.** Remove the guard and return a typed evidence receipt with
   source hash, wiki paths, verification, risks, and any skipped claims.

Do not delegate to a feature-planning role. A read-only helper may summarize a very
large source, but the main conversation owns path validation, writes, verification,
and cleanup.

## Evidence Receipt

Return `spk.evidence/v1` with status, source hash, created/updated artifacts,
verification commands/results, redaction count, risks, and next action.

## Guardrails

- `ai_context/sources/` is private raw input; `ai_context/wiki/` must remain commit-safe.
- Never add-knowledge more than the explicitly supplied source.
- Never overwrite user-authored wiki content without merging and preserving intent.
- No guard file may remain after the workflow exits.
