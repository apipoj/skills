# SPK verification map

| Criterion | Check | Verification kind |
|---|---|---|
| Requested skills exist and are reachable in both locales and both platform payloads | [Packaging](packaging.md) | Task acceptance |
| Repository checks detect a known invalid contract and preserve evidence | [Gates and failure control](test-script.md) | Test script |
| Workflow policy matches the requested outcome and does not silently expand authority | [Spec review](spec-review.md) | Spec review |
| Skills activate correctly, produce their promised result, and retain effect boundaries | [Skill behavior](skill-behavior.md) | Skill validation |

The map contains checks, not current results. Receipts report scoped results and gaps.
The full gate validates the entire roster. Select real behavioral cases for changed
skills; do not assume that a full static gate proves every prompt's behavior.
