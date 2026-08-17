const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  collectInvocationAuthorityErrors,
} = require('../scripts/verify-invocation-authority.cjs');

const ROOT = path.join(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

const temporaryRoots = [];

function makeTemp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-invoke-')));
  temporaryRoots.push(dir);
  return dir;
}

// two skills: `manual` is user-invoked, `router` is model-invocable and is the
// one whose body the tests put text into
function fixture(routerBody, manualBody = '# Manual\n') {
  const dir = makeTemp();
  const contract = {
    skills: [
      {
        id: 'router',
        sources: { th: 'skills/x/router', en: 'locales/en/skills/x/router' },
        activation: { allowImplicitInvocation: true },
      },
      {
        id: 'manual',
        sources: { th: 'skills/x/manual', en: 'locales/en/skills/x/manual' },
        activation: { allowImplicitInvocation: false },
      },
    ],
  };
  const write = (rel, body) => {
    const file = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  };
  write('plugins/spk/skills/router/SKILL.md', routerBody);
  write('locales/en/skills/x/router/SKILL.md', routerBody);
  write('plugins/spk/skills/manual/SKILL.md', manualBody);
  write('locales/en/skills/x/manual/SKILL.md', manualBody);
  return { dir, contract };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('invocation authority gate', () => {
  test('passes a body that invokes nothing user-invoked', () => {
    const { dir, contract } = fixture('# Router\n\nRun `/debug` when a test fails.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
  });

  test('flags an operative instruction to run a user-invoked skill', () => {
    const { dir, contract } = fixture('# Router\n\nRun `/manual` if the tracker is missing.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([
      'plugins/spk/skills/router/SKILL.md:3: instructs the agent to invoke `manual`, which is user-invoked',
      'locales/en/skills/x/router/SKILL.md:3: instructs the agent to invoke `manual`, which is user-invoked',
    ]);
  });

  test('flags a hand-off phrased across filler words', () => {
    const { dir, contract } = fixture('# Router\n\nThen hand off to the `/manual` skill with the specifics.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toHaveLength(2);
  });

  // upstream's own rule: router prose that names skills as labels for a human
  // to pick from is not invoking anything
  test('leaves a bare router mention alone', () => {
    const { dir, contract } = fixture('# Router\n\n- split work → `manual`; map an effort → `router`\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
  });

  test('leaves a prohibition alone', () => {
    const { dir, contract } = fixture('# Router\n\n- Never auto-run `manual` across its approval boundary.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
  });

  // `setup`, `triage`, `handoff` and `pr` are ordinary English words, so a bare
  // name match would fire on prose that names no skill at all
  test('leaves the skill name used as an ordinary noun alone', () => {
    const { dir, contract } = fixture('# Router\n\nTell the user how to run it if it is a repeatable manual path.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
  });

  test('leaves an instruction aimed at the user alone', () => {
    const bodies = [
      '# Router\n\nIf the tracker is missing, tell the user to run `/manual`.\n',
      '# Router\n\nRecommend that the user run `manual` with the specifics.\n',
      '# Router\n\nถ้ายังไม่มี tracker ให้บอกผู้ใช้รัน `/manual`\n',
    ];
    for (const body of bodies) {
      const { dir, contract } = fixture(body);
      expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
    }
  });

  test('lets a user-invoked skill refer to itself', () => {
    const { dir, contract } = fixture('# Router\n', '# Manual\n\nRun `/manual` again to redo the interview.\n');
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([]);
  });

  test('reports a missing file rather than throwing', () => {
    const { dir, contract } = fixture('# Router\n');
    fs.rmSync(path.join(dir, 'locales/en/skills/x/router/SKILL.md'));
    expect(collectInvocationAuthorityErrors(dir, contract)).toEqual([
      'MISSING skill file: locales/en/skills/x/router/SKILL.md',
    ]);
  });

  test('reports POSIX paths on every platform', () => {
    const { dir, contract } = fixture('# Router\n\nRun `/manual` now.\n');
    for (const error of collectInvocationAuthorityErrors(dir, contract)) {
      expect(error).not.toContain('\\');
    }
  });

  test('every shipped skill and mirror satisfies the gate', () => {
    expect(collectInvocationAuthorityErrors(ROOT, CONTRACT)).toEqual([]);
  });
});
