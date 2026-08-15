---
name: asking
description: Interview the user in rounds, asking every question whose prerequisites are already settled in one go with a recommendation each, until the design tree is fully resolved.
---
# Asking in rounds

Reply in the user's language. Keep Thai cultural fit either way: colleague tone, familiar technical English when clearer, no literal translation, no location stereotypes. Lead with the outcome. Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

## Work in rounds

The **frontier** is every decision whose prerequisites are already settled — the questions you can ask *now* without guessing at answers you haven't heard yet.

Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a *later* round, not this one.

## Question format

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

## Facts are the agent's job

Finding *facts* is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself.

Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now.

The *decisions* are the user's — put each to them and wait.

## When it's done

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Evidence Receipt

Report the artifact, the verification command, the real result, the risks, and the smallest next action.

## Guardrails

- Do not expand scope on your own.
- Do not commit, push, publish, or change an external system without approval for that exact target.
- When evidence is insufficient, report the gap instead of guessing.
