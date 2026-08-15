---
name: uninstall
description: Remove only verified SPK-owned project artifacts after showing exact targets, while preserving project knowledge and unrelated user files.
disable-model-invocation: true
---

# Uninstall SPK

## Thai-first Experience

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

This skill is manual-only and runs directly in the current conversation.

## Workflow

1. **Inventory read-only.** Prefer `.spk/installed.json` as ownership evidence. Resolve
   every candidate to a normalized path inside the workspace. For legacy installs,
   identify only files with an SPK ownership marker or an exact registered agent/skill
   name. Never infer ownership from a broad directory name.
2. **Preview exact effects.** List every file to remove, every text range to edit,
   missing/stale records, and everything preserved. Always preserve
   `ai_context/wiki/`, `ai_context/sources/`, human-authored context, credentials, and
   non-SPK files.
3. **Bind intent.** Canonicalize `operation`, exact paths, text ranges, expected file
   hashes, and preservation list with stable key ordering. Use the complete
   64-character lowercase SHA-256 hex digest as `intent_digest`.
4. **Request approval.** Unless the latest user message contains exact
   `spk-approve:<intent_digest>`, return the envelope below and stop without editing.
5. **Resume safely.** Re-read ownership records and file hashes, recompute the intent
   digest, and compare it to the token. Any added, removed, or changed target
   invalidates approval and requires a new preview.
6. **Apply narrowly.** Remove only approved SPK-owned files and only the approved SPK
   marker block from shared files. Never recursively remove `.claude/` or any other
   broad directory. Remove an empty directory only after proving it is empty.
7. **Verify.** Confirm every approved artifact is gone, preserved paths are byte-for-
   byte unchanged, and no path escaped the workspace. Report recovery information for
   any host trash/quarantine mechanism used.

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "uninstall",
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "paths": ["<exact SPK-owned path>"],
  "text_edits": [{"path": "<shared file>", "range": "<SPK marker block>"}],
  "preserve": ["ai_context/wiki/", "ai_context/sources/", "<human-owned path>"],
  "resume_instruction": "Reply exactly: approve spk-approve:<intent_digest>"
}
```

## Evidence Receipt

Return `spk.evidence/v1` with approval digest, removed paths, edited ranges, preserved
paths with verification results, recovery details, risks, and next action.

## Guardrails

- Preview is mandatory; invocation alone is never deletion approval.
- Never use an unresolved glob, symlink target, recursive broad directory, or path
  outside the workspace as a deletion target.
- Never touch wiki/source user data or remove a file without ownership evidence.
- Any state drift invalidates approval.
