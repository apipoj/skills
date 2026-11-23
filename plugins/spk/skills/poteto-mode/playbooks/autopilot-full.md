# Autopilot for a PR queue

List queue items, owners, dependencies, per-item permissions and stop conditions. Give independent changes isolated write targets. Preserve durable checkpoints so an interrupted owner can resume. Use serial work when independent ownership is unavailable.

Verify the candidate diff and CI at its current head. Require independent review for a proposed gate relaxation and record the reason. Only a separately authorized item can merge. Revalidate after a changed base or patch, confirm the landed revision and honor an operator hold across all owners.
