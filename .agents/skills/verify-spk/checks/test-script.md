# Gates and failure control

Source: `package.json` scripts.verify:release and the public validator entry points
in `scripts/generate-platform-artifacts.cjs`. Use `--full` for release readiness.

The helper's control copies the live manifest/contract in memory and removes one
contract entry while leaving that command in the manifest. In a temp child process,
call the real contract validator and assert exit 1 plus the specific missing-command
diagnostic. Accepting that incomplete contract fails the control. Production files
and Git refs are never edited. Proof records must remain after temp cleanup.

When changing this helper, run `npm test -- --runInBand tests/project-verifier.test.js`.
Those tests exercise successful assertions, an actual child failure, missing executables,
and rejection of wrong control output; a failure must not be relabeled PASS.
