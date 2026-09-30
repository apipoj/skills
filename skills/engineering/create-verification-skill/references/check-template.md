# Check map shape

The index lists every acceptance criterion, its check page, applicability, and current coverage.
For apps, group pages by user-facing feature and enumerate its entry points/sub-features. For
other work, group by requirement or behavior. Avoid an unmaintained duplicate requirement source.

Each page records:

- Criterion ID and exact authoritative source path/line or task reference.
- User entry point or artifact and required fixtures/preconditions.
- Exact command/argv or review steps grounded in the project.
- Literal expected result and relevant side effects.
- Failure control and isolation requirements when applicable.
- Evidence path and PASS/FAIL/NOT_RUN/NOT_APPLICABLE status with reason.
- Cleanup, known limitations, source fingerprint, and maintenance trigger.

Keep run status in the evidence receipt rather than overwriting the acceptance source. A missing
criterion or inaccessible integration is a visible coverage gap; exclude it only with a stated
scope reason. Proof of one mapped check does not imply the other checks passed.
