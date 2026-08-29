const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  CANONICAL_PARAGRAPHS,
  closingClauseFrom,
  collectAutonomyProfileErrors,
  collectContractDriftErrors,
} = require('../scripts/verify-autonomy-profiles.cjs');

const ROOT = path.join(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

const temporaryRoots = [];

function makeTemp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-autonomy-')));
  temporaryRoots.push(dir);
  return dir;
}

function fixture(bodies, { profile = 'afk_local', autonomyProfiles = CONTRACT.autonomyProfiles } = {}) {
  const dir = makeTemp();
  const skill = {
    id: 'demo',
    autonomyProfile: profile,
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
  return { dir, contract: { skills: [skill], autonomyProfiles }, targets };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function wrap(paragraph) {
  return `# Demo\n\n## Autonomy Profile\n\n${paragraph}\n\n## Guardrails\n`;
}

describe('autonomy profile gate', () => {
  test('passes when both locales carry the canonical paragraph for the declared profile', () => {
    const body = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: body, mirror: body });
    expect(collectAutonomyProfileErrors(dir, contract)).toEqual([]);
  });

  test('rejects a reworded paragraph in the payload', () => {
    const reworded = wrap(CANONICAL_PARAGRAPHS.afk_local.replace('bounded work', 'scoped work'));
    const canonical = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: reworded, mirror: canonical });
    expect(collectAutonomyProfileErrors(dir, contract)).toEqual([
      'plugins/spk/skills/demo/SKILL.md: missing the canonical "afk_local" Autonomy Profile paragraph verbatim',
    ]);
  });

  test('rejects a missing paragraph in the English mirror', () => {
    const canonical = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: canonical, mirror: '# Demo\n\n## Guardrails\n' });
    expect(collectAutonomyProfileErrors(dir, contract)).toEqual([
      'locales/en/skills/demo/SKILL.md: missing the canonical "afk_local" Autonomy Profile paragraph verbatim',
    ]);
  });

  test('rejects a skill declaring an unknown autonomy profile', () => {
    const canonical = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: canonical, mirror: canonical }, { profile: 'made_up_profile' });
    expect(collectAutonomyProfileErrors(dir, contract)).toEqual([
      'demo: declares unknown autonomyProfile "made_up_profile"',
    ]);
  });

  test('reports a missing file rather than throwing', () => {
    const canonical = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: canonical });
    expect(collectAutonomyProfileErrors(dir, contract)).toEqual([
      'MISSING skill file: locales/en/skills/demo/SKILL.md',
    ]);
  });

  test('reports POSIX paths on every platform', () => {
    const canonical = wrap(CANONICAL_PARAGRAPHS.afk_local);
    const { dir, contract } = fixture({ payload: canonical });
    const errors = collectAutonomyProfileErrors(dir, contract);
    expect(errors).toHaveLength(1);
    for (const error of errors) {
      expect(error).not.toContain('\\');
      expect(error).toMatch(/(plugins|locales)\/[\w/-]+\/SKILL\.md/);
    }
  });

  test('every canonical paragraph carries the contract budgets, continuation, and checkpoint', () => {
    expect(collectContractDriftErrors(CONTRACT)).toEqual([]);
  });

  test('flags a canonical paragraph whose prompt/repair budget no longer matches the contract', () => {
    const badContract = {
      autonomyProfiles: {
        ...CONTRACT.autonomyProfiles,
        afk_local: { ...CONTRACT.autonomyProfiles.afk_local, promptBudget: 9 },
      },
    };
    expect(collectContractDriftErrors(badContract)).toEqual([
      'afk_local: canonical paragraph says prompt budget 0 but the contract says 9',
    ]);
  });

  test('flags a canonical paragraph whose continuation sentence no longer matches the contract', () => {
    const badContract = {
      autonomyProfiles: {
        ...CONTRACT.autonomyProfiles,
        afk_local: { ...CONTRACT.autonomyProfiles.afk_local, continuation: 'Something entirely different.' },
      },
    };
    expect(collectContractDriftErrors(badContract)).toEqual([
      'afk_local: canonical paragraph no longer contains the contract\'s continuation sentence verbatim',
    ]);
  });

  test('flags a contract profile with no canonical paragraph pinned', () => {
    const badContract = {
      autonomyProfiles: { ...CONTRACT.autonomyProfiles, brand_new_profile: { promptBudget: 0, repairBudget: 0 } },
    };
    expect(collectContractDriftErrors(badContract)).toEqual([
      'contracts/workflows.json defines autonomyProfile "brand_new_profile" with no canonical paragraph in scripts/verify-autonomy-profiles.cjs',
    ]);
  });

  test('closingClauseFrom strips a trailing "before any pause." clause and lowercases the rest', () => {
    expect(closingClauseFrom('Record phase and evidence before any pause.')).toBe('record phase and evidence');
    expect(closingClauseFrom('Return the decision ledger and evidence.')).toBe('return the decision ledger and evidence.');
  });

  test('every shipped skill and mirror carries its declared profile\'s canonical paragraph', () => {
    expect(collectAutonomyProfileErrors(ROOT, CONTRACT)).toEqual([]);
  });
});
