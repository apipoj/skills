const fs = require('fs');
const os = require('os');
const path = require('path');
const { runCheck } = require('../.agents/skills/verify-spk/scripts/verify.cjs');

describe('project verification evidence', () => {
  let root;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-verifier-test-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });
  function drive(args, extra = {}) {
    return runCheck({ cwd: root, command: process.execPath, args,
      proofFile: path.join(root, 'proof.log'), ...extra });
  }
  test('retains the actual assertion result and command', () => {
    const result = drive(['-e', "require('assert').strictEqual(2 + 3, 5); console.log('sum=5')"]);
    expect(result).toMatchObject({ status: 'PASS', actualExit: 0 });
    expect(fs.readFileSync(result.proof, 'utf8')).toContain('sum=5');
  });
  test('an assertion violation fails instead of becoming a success claim', () => {
    const result = drive(['-e', "require('assert').strictEqual(2 + 3, 6)"]);
    expect(result).toMatchObject({ status: 'FAIL', actualExit: 1 });
    expect(fs.readFileSync(result.proof, 'utf8')).toContain('AssertionError');
  });
  test('a failure control requires both the failure exit and expected diagnosis', () => {
    expect(drive(['-e', "console.error('missing criterion');process.exit(1)"],
      { expectedExit: 1, requiredOutput: 'missing criterion' }).status).toBe('PASS');
    expect(drive(['-e', "console.error('different failure');process.exit(1)"],
      { expectedExit: 1, requiredOutput: 'missing criterion' }).status).toBe('FAIL');
    expect(drive(['-e', "console.log('missing criterion')"],
      { expectedExit: 1, requiredOutput: 'missing criterion' }).status).toBe('FAIL');
  });
  test('a missing executable is unrun with evidence, never PASS', () => {
    const result = drive([], { command: path.join(root, 'does-not-exist') });
    expect(result).toMatchObject({ status: 'NOT_RUN', actualExit: null });
    expect(fs.readFileSync(result.proof, 'utf8')).toContain('ENOENT');
  });
});
