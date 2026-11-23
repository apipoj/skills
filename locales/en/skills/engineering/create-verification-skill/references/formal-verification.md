# Verify an invariant

Choose one property from the requested code path and describe the user-visible consequence of violating it. For example, retrying the same job must issue at most one receipt. Map each input, state transition and atomic step to its file and symbol. If a check and a write can interleave in the implementation, represent them as separate steps.

Choose the least costly method that answers the question. For event ordering, explore all reachable states of a finite model. For properties of the implementation, prefer exhaustive exploration or a verifier that checks the code directly. A claim covering every input needs an argument or proof for that domain. If only generated-input testing is available, run it on the implementation and label the result as sampled evidence. Keep formal verification marked NOT_RUN if it was requested and could not run.

In the generated check page, record the property, source mapping, exact tool version and command, starting states, input and scheduling bounds, assumptions, and exclusions. For a progress property, specify scheduler fairness. Record the reviewed revision and a fingerprint for dirty source files. Revalidate the mapping when a covered function, transaction boundary or dependency changes.

Run the baseline and read the checker's completion status. A timeout or exploration cutoff leaves coverage incomplete. Save any counterexample as the shortest available sequence of operations in project terms. Check whether the implementation permits each step before reporting a product defect. Preserve a baseline violation as a finding.

In a disposable copy, break the property in the covered implementation and rerun the generated workflow. For a separate model, follow its source-mapping check and reflect the changed transition before rerunning the checker. Record separately whether the code change was detected automatically or required a manual mapping review. A model-only mutation checks the model assertion alone. Discard the disposable change, repeat the baseline command and compare the result. Hand over the rerun command, observed bounds, counterexample or pass, and remaining gap.
