# Autopilot for a stack

Apply the queue ownership and evidence rules in [Autopilot for a PR queue](autopilot-full.md). Use a predecessor as the base only where the upper change needs it. Give each diff its own checks against its declared base.

When a lower head changes, re-evaluate affected upper diffs and refresh their proof. Stop at verified handoff. List base, head, verdict and unresolved dependency per PR. A later request to land the stack has a separate shipping boundary.
