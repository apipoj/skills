// tests/reference-integrity.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectReferenceIntegrityErrors,
  collectResolverCoverageErrors,
  isUnderScanRoots,
  isCanonicalSkillFile,
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

  test('reports a missing relative Markdown dependency inside a packaged skill', () => {
    const root = makeFixtureRoot();
    try {
      const skill = 'plugins/spk/skills/plan/SKILL.md';
      writeText(
        path.join(root, skill),
        'Read the full practice in [UPSTREAM.md](UPSTREAM.md).\n',
      );

      expect(collectReferenceIntegrityErrors(root, [skill])).toEqual([
        `${skill}:1: missing local reference UPSTREAM.md`,
      ]);

      writeText(
        path.join(root, 'plugins/spk/skills/plan/UPSTREAM.md'),
        '# Full practice\n',
      );
      expect(collectReferenceIntegrityErrors(root, [skill])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a packaged UPSTREAM file that links to itself', () => {
    const root = makeFixtureRoot();
    try {
      const upstream = 'plugins/spk-codex/skills/plan/UPSTREAM.md';
      writeText(
        path.join(root, upstream),
        'Read [UPSTREAM.md](UPSTREAM.md).\n',
      );

      expect(collectReferenceIntegrityErrors(root, [upstream])).toEqual([
        `${upstream}:1: local reference points to itself: UPSTREAM.md`,
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('allows illustrative relative-looking links inside retained upstream prose', () => {
    const root = makeFixtureRoot();
    try {
      const upstream = 'plugins/spk/skills/plan/UPSTREAM.md';
      writeText(
        path.join(root, upstream),
        'A ticket may carry an illustrative [link](link).\n',
      );
      expect(collectReferenceIntegrityErrors(root, [upstream])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports a missing file dependency linked by retained upstream guidance', () => {
    const root = makeFixtureRoot();
    try {
      const upstream = 'plugins/spk/skills/plan/UPSTREAM.md';
      writeText(
        path.join(root, upstream),
        'See [test examples](tests.md).\n',
      );
      expect(collectReferenceIntegrityErrors(root, [upstream])).toEqual([
        `${upstream}:1: missing local reference tests.md`,
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports a canonical skill body referencing a script.cjs that does not exist', () => {
    const root = makeFixtureRoot();
    try {
      const skill = 'plugins/spk/skills/test-changes/SKILL.md';
      writeText(
        path.join(root, skill),
        'Invoke `node <plugin-root>/scripts/test-changes.cjs -- <path>...` for a plan.\n',
      );
      writeText(
        path.join(root, 'plugins/spk/scripts/scoped-tests.cjs'),
        '// real helper, different name\n',
      );

      expect(collectReferenceIntegrityErrors(root, [skill])).toEqual([
        `${skill}:1: missing script reference scripts/test-changes.cjs ` +
        '(expected plugins/spk/scripts/test-changes.cjs)',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('accepts a canonical skill body referencing a script.cjs that exists', () => {
    const root = makeFixtureRoot();
    try {
      const skill = 'plugins/spk/skills/test-changes/SKILL.md';
      writeText(
        path.join(root, skill),
        'Invoke `node <plugin-root>/scripts/scoped-tests.cjs -- <path>...` for a plan.\n',
      );
      writeText(
        path.join(root, 'plugins/spk/scripts/scoped-tests.cjs'),
        '// real helper\n',
      );

      expect(collectReferenceIntegrityErrors(root, [skill])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('does not re-check the generated Codex payload for script references', () => {
    const root = makeFixtureRoot();
    try {
      const skill = 'plugins/spk-codex/skills/test-changes/SKILL.md';
      writeText(
        path.join(root, skill),
        'Invoke `node <plugin-root>/scripts/test-changes.cjs -- <path>...` for a plan.\n',
      );
      // No plugins/spk/scripts/test-changes.cjs exists anywhere in this fixture,
      // yet the generated payload must not raise the canonical-only rule.
      expect(collectReferenceIntegrityErrors(root, [skill])).toEqual([]);
      expect(isCanonicalSkillFile(skill)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('scan root matcher excludes transient state files', () => {
    expect(isUnderScanRoots('plugins/spk/skills/plan/SKILL.md')).toBe(true);
    expect(isUnderScanRoots('plugins/spk-codex/skills/plan/SKILL.md')).toBe(true);
    expect(isUnderScanRoots('docs/plugin.md')).toBe(true);
    expect(isUnderScanRoots('.omx/state/session.json')).toBe(false);
    expect(isUnderScanRoots('tests/reference-integrity.test.js')).toBe(false);
  });
});
