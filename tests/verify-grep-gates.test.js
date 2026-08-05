// spk/tests/verify-grep-gates.test.js
const { runGate } = require('../scripts/verify-grep-gates.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'spk-gates-'));
}

describe('runGate', () => {
  test('passes when pattern absent', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'a.md'), 'hello world');
    const result = runGate(dir, { pattern: 'ralph', name: 'ralph' });
    expect(result.passed).toBe(true);
    expect(result.hits).toEqual([]);
  });

  test('fails when pattern present', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'a.md'), 'ralph loop');
    const result = runGate(dir, { pattern: 'ralph', name: 'ralph' });
    expect(result.passed).toBe(false);
    expect(result.hits.length).toBeGreaterThan(0);
  });

  test('honors exclude paths', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'docs', 'changelog.md'), 'ralph removed');
    fs.writeFileSync(path.join(dir, 'a.md'), 'clean');
    const result = runGate(dir, {
      pattern: 'ralph',
      name: 'ralph',
      excludePaths: ['docs/changelog.md']
    });
    expect(result.passed).toBe(true);
  });

  test('detects alias model IDs', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'agent.md'), 'model: opus\n');
    const result = runGate(dir, {
      pattern: '^model:\\s+(opus|sonnet|haiku)\\s*$',
      name: 'alias-models',
      flags: 'm'
    });
    expect(result.passed).toBe(false);
  });
});
