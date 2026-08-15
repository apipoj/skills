---
name: wizard
description: Author an interactive bash wizard for the steps only a human can perform - provisioning, credentials, CI secrets, dashboards, one-off migrations - then verify it statically and hand it over without running it.
---
# Wizard

When a decision or confirmation is needed, use the host's structured choice prompt if one is available; otherwise present a numbered list. Options must be genuinely distinct with exactly one recommended, every label names the real outcome, and a free-form answer stays possible.

A wizard is a bash script that walks a human, step by step, through a manual procedure that is tedious to do by hand and tedious to re-explain to an AI every time. It opens each URL, says exactly what to click and copy, captures the values, writes them where they belong (`.env`, GitHub secrets), confirms at every stage, and shows how many stages are left.

Use it when provisioning infrastructure, setting up credentials or CI secrets, clicking through an unfamiliar third-party dashboard, or running a one-off migration or cutover.

**If the agent can do it itself, it should.** This skill is only for steps where a human is genuinely in the loop.

The delightful UX is already solved by `templates/wizard/template.sh` — stage-by-stage progress, confirmation gates, cross-platform URL opening (including WSL), hidden secret entry, idempotent `.env` upserts, `gh secret`/`gh variable` writes, and a closing summary. **Your job is only to scope the procedure and author its stages.** The library above the STAGES marker is identical in every wizard; that consistency is the point. Never hand-edit it.

A wizard is ephemeral by default — built for one run, saved to a scratch or `scripts/` path, deleted when the job is done. Commit it only when the user wants a repeatable setup path that should live in the repo.

## Step 1: Scope the procedure

Work out every manual step the human must take and every value captured along the way. Read the repo first — don't ask cold:

- For setup: `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, framework config, and `.github/workflows/*`. Every `secrets.*` / `vars.*` reference is a value the wizard must produce.
- For a migration or transition: the current state, the target state, and the irreversible actions between them.

Then show the user the ordered list of stages and the values each produces, and confirm. They may add, drop, or reorder.

**Done when:** every stage is named in order, and for each captured value you know (a) where the human gets it, (b) where it is written (`.env`, a GitHub secret, both, or nowhere — some stages are pure actions), and (c) whether it is secret and therefore needs hidden entry.

## Step 2: Map each stage's journey

For each stage, write the precise path a human follows: which URL to open, what to do there, where the value is shown, which variable it fills — e.g. "Dashboard → Developers → API keys → Reveal test key → copy".

Where you don't actually know the current UI or the exact command, **say so** and ask the user or check the docs. Never invent steps that may not exist.

**Done when:** every stage traces to concrete instructions a stranger could follow.

## Step 3: Author the wizard

Copy `templates/wizard/template.sh` to the target path. Replace the example stage with one `stage` per step, in dependency order. Use the library helpers — `stage`, `say`/`step`, `open_url`, `ask`/`ask_secret`, `write_env`, `set_secret`/`set_var`, `pause`/`confirm` — and set `TOTAL_STAGES` to the number of stages you wrote.

Hold the bar the template sets: open the URL before asking for its value, use `ask_secret` for anything secret, `write_env` every persisted value, `set_secret` only the values CI actually needs, and `confirm` before any irreversible action. Each `stage` clears the screen so only the current step is visible — keep a stage to one focused task so nothing the human needs scrolls away. **Don't touch the library above the marker.**

## Step 4: Verify and hand off

- Run `bash -n <script>`, and `shellcheck` if it is available.
- `chmod +x <script>`.
- **Don't run it end to end yourself** — it opens browsers and blocks on human input. Trace it statically instead: every value from step 1 is captured and lands where step 1 said, and every `set_secret` name exactly matches a `secrets.*` reference in CI.
- Tell the user how to run it. If it is a repeatable setup path, commit it and link it from the README so the next person runs the script instead of asking an AI.

## Guardrails

- Never execute the generated wizard; the human runs it.
- Never echo a captured value into the transcript. If a secret surfaces while authoring, write `<REDACTED>` in its place.
- Never hand-edit the library above the STAGES marker.
- Confirm before every irreversible stage in the generated script.
- Report evidence gaps instead of guessing at a dashboard's current UI.
