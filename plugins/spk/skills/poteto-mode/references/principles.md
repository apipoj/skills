# Engineering principles

Use the row whose condition occurs in the task. If several apply, start with the one that changes the implementation decision.

| When | Principle | What to do |
| --- | --- | --- |
| A patch needs another wrapper or flag | Subtract before adding | Look at the current callers. Remove a redundant path or reuse an existing operation if it handles their inputs. Compare the resulting diff and behavior. |
| Callers can construct impossible states | Model the domain | Represent the valid alternatives directly. Validate input where it enters the system. Exercise one invalid transition and one legitimate transition. |
| The same assumption is checked in several layers | Validate at the boundary | Find where data first becomes trustworthy. Parse there and pass the validated value inward. Keep checks at independent trust boundaries. |
| A reader must follow several wrappers to understand one decision | Minimize reader load | Give the decision one owner. Inline a pass-through or name the intermediate value when that makes the public path easier to follow. |
| Two fixes failed the same check | Test the shared assumption | State what both fixes assumed. Capture an observation that distinguishes it from a competing explanation before trying another patch. |
| A write can be retried after partial success | Make retries idempotent | Identify the operation and its durable result. Exercise an interruption after the effect and a replay with the same identity. Check for duplicated effects. |
| Workers might overwrite each other's result | Separate shared state | Assign each independent write an owner. If the resource must be shared, specify the atomic transition and check both possible orders. |
| A comment is the only enforcement of a constraint | Encode the constraint | Trace it to the caller or external contract. During requested cleanup, capture the behavior in a type, assertion or test before deleting the redundant explanation. Keep external rationale and tool directives. |
| A refactor changes an internal interface | Migrate callers together | Find the live callers, migrate them and exercise the public entry point before retiring the old path. Keep externally supported contracts compatible. |
| An implementation choice can be settled locally | Run the smallest experiment | Use a disposable example with the input that distinguishes the options. Keep the result. Add the experiment to the product only if it serves a continuing purpose. |
| A patch appears complete | Verify observable behavior | Repeat the original action through the API, CLI or UI and check its side effect. Explain what the check covers. For an invariant across schedules, record the bounds of exhaustive exploration. |
