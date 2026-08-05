---
name: grilling
description: Temporary compatibility alias for asking; disclose the canonical name and apply the same contract without expanding authority.
disable-model-invocation: true
---
# Deprecated alias: grilling

Supported until 6.0.0. Tell the user this workflow moved to `asking`, then apply the canonical approval and evidence contract.

## Workflow

1. Disclose the canonical skill name.
2. Apply the asking contract directly without adding authority.

## Evidence Receipt

Return the canonical workflow receipt and include `compat_alias: grilling`.

## Guardrails

- Never broaden scope or permissions through an alias.
- Do not hide the deprecation notice.
