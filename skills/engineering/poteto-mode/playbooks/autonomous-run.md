# Autonomous run

Define an observable completion predicate and existing authority. Select a host-supported watcher or bounded polling of that predicate. Verify that the watcher can actually wake the current task before promising monitoring.

At each wake, inspect new evidence, take the smallest authorized corrective step and recheck. Record failed attempts and the resume point. Stop on confirmed completion, explicit stop, an exhausted budget or a genuine blocker. Leave unapproved effects pending.
