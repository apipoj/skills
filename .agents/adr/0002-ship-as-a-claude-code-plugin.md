# Ship Claude Code, Codex, and skills.sh from one reviewed contract

Apipoj Skills needs the same workflow meaning across hosts while preserving each
host's invocation metadata and packaging format.

## Decision

- `contracts/workflows.json` and `manifest.json` define the roster and portable policy.
- `plugins/spk/` is the Claude runtime payload.
- `plugins/spk-codex/` is generated and contains a flat promoted-only skill path plus
  Codex invocation metadata. It is never hand-edited.
- Native Thai and English source paths are explicit per contract entry, so bucketed
  authoring does not leak excluded or optional material into either plugin.
- skills.sh installs from the public repository, with the same canonical skill names.

This replaces the upstream Claude-only decision. The generated payload removes the
old bucket-selection problem without creating a second behavioral source of truth.
