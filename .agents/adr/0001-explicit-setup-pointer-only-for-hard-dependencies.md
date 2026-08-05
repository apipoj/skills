# Use `/spk:setup` only for hard repository dependencies

Some workflows need repository-specific issue-tracker, label, or domain-document
configuration. Others can work safely with repository evidence alone.

## Decision

- `to-spec`, `to-tickets`, and `triage` must point to `/spk:setup` when required
  configuration is absent because guessing would produce an incorrect external target.
- `diagnosing-bugs`, `tdd`, and architecture workflows degrade gracefully. They may
  use existing glossary and ADR material but do not force setup when it is absent.
- `/spk:setup-matt-pocock-skills` remains only as a manual compatibility alias through
  the 5.x line. Canonical documentation and routing use `/spk:setup`.

This keeps the ready-to-use path short without weakening target or approval checks.
