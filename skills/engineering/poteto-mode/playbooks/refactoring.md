# Refactoring

Capture the contract through public inputs, outputs and side effects. Name the structural problem and target shape. Use a characterization check or an old-versus-new comparison for cases existing tests miss.

Move one decision or caller at a time, running the same check after each unit. Retire confirmed unused paths. Compare the final behavior and identify which call path or mutable state became easier to trace. Report a newly found behavior bug separately.
