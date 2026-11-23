# Engineering principles

Choose a principle whose condition changes the next decision. Read its linked guidance before applying it. For a requested comment cleanup, preserve external rationale and tool directives while tracing the claimed constraint.

## Core decisions

| When | Read |
| --- | --- |
| A proposed abstraction would expand a small patch. | [Laziness Protocol](../principles/principle-laziness-protocol.md) |
| Several later changes depend on a data shape or ownership decision. | [Foundational Thinking](../principles/principle-foundational-thinking.md) |
| A new requirement no longer fits the current design. | [Redesign From First Principles](../principles/principle-redesign-from-first-principles.md) |
| Two attempted fixes fail the same check. | [Attack the Premise](../principles/principle-attack-the-premise.md) |
| A new feature would build on obsolete branches, guards or stubs. | [Subtract Before You Add](../principles/principle-subtract-before-you-add.md) |
| Understanding one decision requires tracing wrappers or synchronized fields. | [Minimize Reader Load](../principles/principle-minimize-reader-load.md) |
| A planned migration has several internal transition states. | [Outcome-Oriented Execution](../principles/principle-outcome-oriented-execution.md) |
| An implementation shortcut makes a common user action harder. | [Experience First](../principles/principle-experience-first.md) |
| A novel interaction or architecture has several plausible designs. | [Exhaust the Design Space](../principles/principle-exhaust-the-design-space.md) |
| A nontrivial change or comparison needs repeatable evidence. | [Build the Lever](../principles/principle-build-the-lever.md) |

## Architecture

| When | Read |
| --- | --- |
| Booleans drift apart or the same branch grows across several callers. | [Model the Domain](../principles/principle-model-the-domain.md) |
| Validation and transport details are leaking through several layers. | [Boundary Discipline](../principles/principle-boundary-discipline.md) |
| A signature accepts impossible variants or interchangeable IDs. | [Type System Discipline](../principles/principle-type-system-discipline.md) |
| An operation can be replayed after partial completion. | [Make Operations Idempotent](../principles/principle-make-operations-idempotent.md) |
| A replacement internal API has known, coordinated callers. | [Migrate Callers Then Delete Legacy APIs](../principles/principle-migrate-callers-then-delete-legacy-apis.md) |
| Two actors write a shared file, key or object. | [Separate Before Serializing Shared State](../principles/principle-separate-before-serializing-shared-state.md) |

## Verification

| When | Read |
| --- | --- |
| Implementation appears complete. | [Prove It Works](../principles/principle-prove-it-works.md) |
| A guard, retry or fallback appears to hide the observed failure. | [Fix Root Causes](../principles/principle-fix-root-causes.md) |
| A sweep, migration or delivery has dependent steps. | [Sequence work into verifiable units](../principles/principle-sequence-verifiable-units.md) |
| A test asserts internal calls or passes despite broken behavior. | [Test Behavior, Not Implementation](../principles/principle-test-behavior-not-implementation.md) |
| A decision depends on a measured speedup, latency, throughput or eval score. | [Explain the Number](../principles/principle-explain-the-number.md) |

## Working with others

| When | Read |
| --- | --- |
| Large logs, captures or repeated file reads obscure the decision. | [Guard the Context Window](../principles/principle-guard-the-context-window.md) |
| A reversible choice can be settled inside the requested scope. | [Never Block on the Human](../principles/principle-never-block-on-the-human.md) |

## Learning

| When | Read |
| --- | --- |
| A correction recurs or a comment alone enforces a constraint. | [Encode Lessons in Structure](../principles/principle-encode-lessons-in-structure.md) |

Adapted for SPK from the [reviewed pstack source](https://github.com/cursor/plugins/tree/7a583913eb1b8d1a0ee76753d1a2cf072e7b54f9/pstack/skills).
