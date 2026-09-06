# Review lenses

Read this for a complex review needing separate standards and requirements analysis.
These are lenses within one review, not additional mandatory workflows.

## Standards

Use repository conventions. For maintainability findings, explain the concrete change cost:
unclear naming, duplicated logic, data that belongs together, repeated branching, changes
scattered across modules, or abstraction without a current use. Treat these as heuristics;
repository conventions and demonstrated risk take precedence over preferences.

## Requirements

Use the spec supplied by the user, linked from the change, or discoverable in the relevant
project area. Compare missing behavior, unintended scope, and incorrectly implemented behavior.
If unavailable, report the gap and continue with supported correctness findings.

## Comparison and delegation

For a user-supplied branch/ref, resolve it and use `git diff <ref>...HEAD` when reviewing branch
changes since the merge base. Inspect working-tree changes separately if they are in scope.
For delegated lenses, provide the same pinned scope, relevant standards/spec, and require file
and line evidence. Merge verified findings into one ranked list, retaining their lens labels.
