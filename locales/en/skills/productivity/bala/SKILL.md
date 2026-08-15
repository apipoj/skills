---
name: bala
description: Assess an engineering plan, change, incident, or decision through the five Bala strengths, identify the dominant imbalance, and recommend the smallest evidence-producing next action.
disable-model-invocation: true
---

# Bala 5 Check

Use the Buddhist framework of the five strengths as a practical balance check for
AI-assisted engineering. Translate every strength into observable work behavior;
this is a decision aid, not religious instruction or motivational coaching.

## Workflow

Run this lens directly in the current conversation.

1. Inspect the supplied plan, change, incident, decision, or bounded scope and only
   the repository context that can change the assessment.
2. Rate each strength green, yellow, or red and cite concrete evidence.
3. Identify the single imbalance most likely to distort the next decision.
4. Recommend the smallest safe action that reduces uncertainty.
5. Define the test, log, review signal, or other evidence that proves the action worked.

## Five Strengths for Engineering

### 1. Confidence (Saddha)

Ground confidence in evidence: a clear goal, user value, acceptance criteria, and
known constraints. Flag blind certainty, vague outcomes, or trust based only on an
agent's tone.

Ask: "What evidence makes this worth doing now?"

### 2. Energy (Viriya)

Direct effort toward the smallest useful, reversible, and verifiable next action.
Flag rewrites, too many simultaneous fronts, or motion that does not reduce risk.

Ask: "What is the smallest action that reduces uncertainty?"

### 3. Awareness (Sati)

Stay aware of repository state, user constraints, assumptions, risks, and earlier
decisions. Flag overwritten work, forgotten constraints, or hidden dirty state.

Ask: "What must be known before anything is touched?"

### 4. Concentration (Samadhi)

Keep the objective narrow enough to finish and verify. Flag competing tasks,
scattered context, overlapping ownership, or premature polish.

Ask: "What should stop until this is verified?"

### 5. Judgment (Panna)

Reason from root cause, alternatives, tradeoffs, rollback, and known unknowns.
Flag copied patterns without analysis, symptom patches, or concealed uncertainty.

Ask: "What is known, unknown, and capable of changing the decision?"

## Output Format

```markdown
## Bala 5 Check
- Confidence: <green|yellow|red> - <evidence>
- Energy: <green|yellow|red> - <evidence>
- Awareness: <green|yellow|red> - <evidence>
- Concentration: <green|yellow|red> - <evidence>
- Judgment: <green|yellow|red> - <evidence>

Dominant imbalance: <one sentence>
Smallest next action: <one concrete action>
Proof: <test, log, review signal, or other evidence>
```

## Evidence Receipt

Return `spk.evidence/v1` with all five ratings and their evidence, the dominant
imbalance, smallest next action, proof signal, risks, and next action.

## Guardrails

- Keep the assessment secular, practical, engineering-focused, and testable.
- Report imbalance as a workflow signal; never blame or diagnose the user.
- Prefer one concrete action over a long process checklist.
- Add no process when the next action is already clear and safe.
- Do not change source code unless the user separately requests implementation.
