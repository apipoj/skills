const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectResponsePolicyErrors } = require('../scripts/verify-response-policy.cjs');

const ROOT = path.join(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

const temporaryRoots = [];

function makeTemp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-resp-')));
  temporaryRoots.push(dir);
  return dir;
}

function contractWith(skills) {
  return { responsePolicy: CONTRACT.responsePolicy, skills };
}

// one skill, both locales, each carrying whatever body the test needs
function fixture(bodies) {
  const dir = makeTemp();
  const skill = {
    id: 'demo',
    sources: { th: 'skills/demo', en: 'locales/en/skills/demo' },
  };
  const targets = {
    spk: path.join(dir, 'plugins/spk/skills/demo/SKILL.md'),
    en: path.join(dir, 'locales/en/skills/demo/SKILL.md'),
  };
  for (const [key, file] of Object.entries(targets)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bodies[key]);
  }
  return { dir, contract: contractWith([skill]), targets };
}

const { heading, block, choicePromptAddendum } = CONTRACT.responsePolicy;
const CANONICAL = `# Demo\n\n${heading}\n\n${block}\n\n## Workflow\n`;

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('response policy gate', () => {
  test('passes when both locales carry the canonical block', () => {
    const { dir, contract } = fixture({ spk: CANONICAL, en: CANONICAL });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([]);
  });

  test('rejects a reworded block', () => {
    const reworded = CANONICAL.replace('one idea per sentence', 'one thought per sentence');
    const { dir, contract } = fixture({ spk: reworded, en: CANONICAL });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([
      'plugins/spk/skills/demo/SKILL.md: missing the canonical "## Response Rules" block verbatim',
    ]);
  });

  test('rejects a missing block in the English mirror', () => {
    const { dir, contract } = fixture({ spk: CANONICAL, en: '# Demo\n\n## Workflow\n' });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([
      'locales/en/skills/demo/SKILL.md: missing the canonical "## Response Rules" block verbatim',
    ]);
  });

  test('accepts the choice-prompt addendum directly after the block', () => {
    const withAddendum = `# Demo\n\n${heading}\n\n${block}\n\n${choicePromptAddendum}\n\n## Workflow\n`;
    const { dir, contract } = fixture({ spk: withAddendum, en: withAddendum });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([]);
  });

  test('rejects an addendum that floats elsewhere in the file', () => {
    const floating = `# Demo\n\n${choicePromptAddendum}\n\n${heading}\n\n${block}\n\n## Workflow\n`;
    const { dir, contract } = fixture({ spk: floating, en: floating });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([
      'plugins/spk/skills/demo/SKILL.md: choicePromptAddendum must directly follow the block',
      'locales/en/skills/demo/SKILL.md: choicePromptAddendum must directly follow the block',
    ]);
  });

  test('rejects the retired Thai-first heading', () => {
    const stale = `${CANONICAL}\n## Thai-first Experience\n`;
    const { dir, contract } = fixture({ spk: stale, en: CANONICAL });
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([
      'plugins/spk/skills/demo/SKILL.md: still carries the retired "## Thai-first Experience" heading',
    ]);
  });

  test('reports a missing file rather than throwing', () => {
    const { dir, contract, targets } = fixture({ spk: CANONICAL, en: CANONICAL });
    fs.rmSync(targets.en);
    expect(collectResponsePolicyErrors(dir, contract)).toEqual([
      'MISSING skill file: locales/en/skills/demo/SKILL.md',
    ]);
  });

  // 6.3.0 built these with path.join, so Windows reported "locales\en\..." and
  // the suite failed there while passing on macOS
  test('reports POSIX paths on every platform', () => {
    const { dir, contract, targets } = fixture({ spk: '# Demo\n', en: '# Demo\n' });
    fs.rmSync(targets.en);
    const errors = collectResponsePolicyErrors(dir, contract);
    expect(errors).toHaveLength(2);
    for (const error of errors) {
      expect(error).not.toContain('\\');
      expect(error).toMatch(/(plugins|locales)\/[\w/-]+\/SKILL\.md/);
    }
  });

  test('every shipped skill and mirror satisfies the gate', () => {
    expect(collectResponsePolicyErrors(ROOT, CONTRACT)).toEqual([]);
  });

  // the gate only checks that contract and files agree, so a bad edit to the
  // contract propagates into 120 files without failing anything. These two pin
  // what the block is supposed to say.
  test('the canonical block carries every named rule', () => {
    for (const rule of ['Simplicity', 'Brevity', 'Clarity', 'Humanity', 'Terminology']) {
      expect(block).toContain(`- **${rule}** — `);
    }
  });

  test('the Terminology rule keeps both failure shapes it exists to prevent', () => {
    expect(block).toContain('ผลเทสท์'); // phonetic respelling of an English term
    expect(block).toContain('หูจับ'); // literal translation of an English term
  });
});
