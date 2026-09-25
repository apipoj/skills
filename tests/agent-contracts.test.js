// tests/agent-contracts.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const { collectAgentContractErrors } = require('../scripts/verify-agent-contracts.cjs');

function writeAgent(root, name, body) {
  const file = path.join(root, 'plugins/spk/agents', `${name}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  return file;
}

describe('agent status contract', () => {
  test('accepts agents with the standard completion status block', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-agent-contract-'));
    try {
      const file = writeAgent(root, 'planner', [
        '# Planner',
        '## Completion Status Protocol',
        '**Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT',
        '**Summary:** <1-2 sentences>',
        '**Concerns/Blockers:** <none or details>',
      ].join('\n'));
      expect(collectAgentContractErrors(root, [file])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('search-aware agents use host search without requiring an MCP', () => {
    const AGENTS_DIR = path.join(__dirname, '..', 'plugins', 'spk', 'agents');
    for (const f of ['researcher', 'implementer', 'plan-orchestrator', 'build-orchestrator']) {
      const t = fs.readFileSync(path.join(AGENTS_DIR, `${f}.md`), 'utf-8');
      expect(t).toMatch(/file search|Grep\/Glob/i);
      expect(t).not.toMatch(/spk-codebase-search/i);
    }
  });

  test('tester agent prefers scoped tests in the inner loop', () => {
    const AGENTS_DIR = path.join(__dirname, '..', 'plugins', 'spk', 'agents');
    const t = fs.readFileSync(path.join(AGENTS_DIR, 'tester.md'), 'utf-8');
    expect(t).toMatch(/scoped[- ]?tests|scoped-tests\.cjs/i);
    expect(t).toMatch(/full suite|before sign-?off/i);
  });

  test('reports missing status protocol and tokens', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-agent-contract-'));
    try {
      const file = writeAgent(root, 'planner', '# Planner\nNo protocol here.\n');
      const errors = collectAgentContractErrors(root, [file]);
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('missing Completion Status Protocol section'),
        expect.stringContaining('missing status contract token'),
      ]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
