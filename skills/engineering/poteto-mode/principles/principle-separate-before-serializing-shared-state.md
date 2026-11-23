# Separate Before Serializing Shared State

Determine whether they publish independent facts. If so, give each fact a distinct write target and combine at read time. For a genuinely shared invariant, use an atomic transaction, compare-and-swap or single writer. Exercise overlapping updates and check for lost results.
