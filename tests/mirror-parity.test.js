const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectMirrorParityErrors } = require('../scripts/verify-mirror-parity.cjs');

const ROOT = path.join(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

const temporaryRoots = [];

function makeTemp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-mirror-')));
  temporaryRoots.push(dir);
  return dir;
}

// one skill, both locales, each carrying whatever body the test needs
function fixture(bodies) {
  const dir = makeTemp();
  const skill = {
    id: 'demo',
    sources: { th: 'skills/demo', en: 'locales/en/skills/demo' },
  };
  const targets = {
    payload: path.join(dir, 'plugins/spk/skills/demo/SKILL.md'),
    mirror: path.join(dir, 'locales/en/skills/demo/SKILL.md'),
  };
  for (const [key, file] of Object.entries(targets)) {
    if (bodies[key] === undefined) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bodies[key]);
  }
  return { dir, contract: { skills: [skill] }, targets };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const CANONICAL = '# Demo\n\n## Workflow\n\nDo the thing.\n';

describe('mirror parity gate', () => {
  test('passes when the mirror is byte-identical to the payload', () => {
    const { dir, contract } = fixture({ payload: CANONICAL, mirror: CANONICAL });
    expect(collectMirrorParityErrors(dir, contract)).toEqual([]);
  });

  test('rejects a mirror that drifted from the payload', () => {
    const drifted = CANONICAL.replace('Do the thing.', 'Do the other thing.');
    const { dir, contract } = fixture({ payload: CANONICAL, mirror: drifted });
    expect(collectMirrorParityErrors(dir, contract)).toEqual([
      'demo: locales/en/skills/demo/SKILL.md is not byte-identical to plugins/spk/skills/demo/SKILL.md — sync the mirror to the payload body',
    ]);
  });

  test('is insensitive to CRLF vs LF line endings alone', () => {
    const crlf = CANONICAL.replace(/\n/g, '\r\n');
    const { dir, contract } = fixture({ payload: CANONICAL, mirror: crlf });
    expect(collectMirrorParityErrors(dir, contract)).toEqual([]);
  });

  test('reports a missing payload file rather than throwing', () => {
    const { dir, contract } = fixture({ mirror: CANONICAL });
    expect(collectMirrorParityErrors(dir, contract)).toEqual([
      'MISSING skill file: plugins/spk/skills/demo/SKILL.md',
    ]);
  });

  test('reports a missing mirror file rather than throwing', () => {
    const { dir, contract } = fixture({ payload: CANONICAL });
    expect(collectMirrorParityErrors(dir, contract)).toEqual([
      'MISSING skill file: locales/en/skills/demo/SKILL.md',
    ]);
  });

  test('reports POSIX paths on every platform', () => {
    const { dir, contract } = fixture({ payload: CANONICAL });
    const errors = collectMirrorParityErrors(dir, contract);
    expect(errors).toHaveLength(1);
    for (const error of errors) {
      expect(error).not.toContain('\\');
      expect(error).toMatch(/(plugins|locales)\/[\w/-]+\/SKILL\.md/);
    }
  });

  test('an allowlisted skill id is exempt from the byte-identity check', () => {
    const { ALLOWED_MISMATCHES } = require('../scripts/verify-mirror-parity.cjs');
    const drifted = CANONICAL.replace('Do the thing.', 'Do the other thing.');
    const { dir, contract } = fixture({ payload: CANONICAL, mirror: drifted });
    expect(ALLOWED_MISMATCHES.has('demo')).toBe(false);
    ALLOWED_MISMATCHES.add('demo');
    try {
      expect(collectMirrorParityErrors(dir, contract)).toEqual([]);
    } finally {
      ALLOWED_MISMATCHES.delete('demo');
    }
  });

  test('every shipped skill has a byte-identical EN mirror', () => {
    expect(collectMirrorParityErrors(ROOT, CONTRACT)).toEqual([]);
  });

  test('the shipped allowlist stays empty', () => {
    const { ALLOWED_MISMATCHES } = require('../scripts/verify-mirror-parity.cjs');
    expect(ALLOWED_MISMATCHES.size).toBe(0);
  });
});
