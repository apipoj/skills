# Performance issue

Reproduce it with a representative workload and measure the baseline. Use counters or a separate profile to locate the limiting work. Consider omitting unused work, avoiding repeats, reducing frequency and moving work off the critical path before parallelizing.

Change one mechanism and alternate baseline and candidate runs under the same conditions. Compare completed work, errors, run count and spread. Record the trace and verdict using [Explain the number](../principles/principle-explain-the-number.md).
