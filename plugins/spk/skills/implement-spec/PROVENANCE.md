# Reviewed upstream source

Adapted from [mattpocock/skills implement-spec](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/implement-spec/SKILL.md)
at `49dd158d1076134a641b33efb035946536778336`, reviewed on 2026-10-14. This promoted engineering source has its own
immutable pin in the workflow contract and upstream lock; the reference base stays
`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`.

SPK adds manual acceptance preflight, validated dependency states, exact approvals,
non-destructive isolation, verified integration, bounded repair and honest completion.
Worker completion alone cannot unlock a dependent.
