// tests/reference-integrity.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectReferenceIntegrityErrors,
  collectResolverCoverageErrors,
  isUnderScanRoots,
} = require('../scripts/verify-reference-integrity.cjs');

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function makeFixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reference-integrity-'));
  writeJson(path.join(root, 'manifest.json'), {
    agents: {
      orchestrators: [{ name: 'plan-orchestrator' }],
      specialists: [{ name: 'planner' }],
    },
    commands: [
      { name: '/plan', orchestrator: 'plan-orchestrator' },
      { name: '/sunzi', agent: 'planner' },
    ],
  });
  return root;
}

describe('SPK reference integrity', () => {
  test('accepts registered slash commands and namespaced agents', () => {
    const root = makeFixtureRoot();
    try {
      writeText(path.join(root, 'README.md'), [
        'Use /spk:plan for planning.',
        'Dispatch to spk:plan-orchestrator and spk:planner.',
        'The /spk:sunzi command is also valid.',
      ].join('\n'));

      expect(collectReferenceIntegrityErrors(root, ['README.md'])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports unknown commands and agent references with locations', () => {
    const root = makeFixtureRoot();
    try {
      writeText(path.join(root, 'README.md'), [
        'Bad command: /spk:missing.',
        'Bad agent: spk:ghost-agent.',
      ].join('\n'));

      const errors = collectReferenceIntegrityErrors(root, ['README.md']);
      expect(errors).toEqual([
        'README.md:1: unknown /spk:missing command',
        'README.md:2: unknown spk:ghost-agent reference',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports commands missing from RESOLVER.md coverage', () => {
    const root = makeFixtureRoot();
    try {
      writeText(path.join(root, 'RESOLVER.md'), 'Only /spk:plan is documented.\n');
      expect(collectResolverCoverageErrors(root)).toEqual([
        'RESOLVER.md: missing /spk:sunzi command coverage',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('scan root matcher excludes transient state files', () => {
    expect(isUnderScanRoots('plugins/spk/skills/plan/SKILL.md')).toBe(true);
    expect(isUnderScanRoots('docs/plugin.md')).toBe(true);
    expect(isUnderScanRoots('.omx/state/session.json')).toBe(false);
    expect(isUnderScanRoots('tests/reference-integrity.test.js')).toBe(false);
  });
});
