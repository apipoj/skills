# Bug fix

Capture the smallest failing input and its output on the affected entry point. List hypotheses that predict different observations, instrument the boundary if needed, and identify the first wrong transition.

Repair the cause in scope. Add a failing regression check first when a reliable seam exists. Repeat the same reproduction on the changed build and record both outcomes. If two fixes fail the same check, read [Attack the premise](../principles/principle-attack-the-premise.md) before another edit.
