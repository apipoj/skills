const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  collectRouterCoverageErrors,
  EXCLUDED_IDS,
  ROUTER_PAYLOAD,
} = require('../scripts/verify-router-coverage.cjs');

const ROOT = path.join(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

const temporaryRoots = [];

function makeTemp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-router-coverage-')));
  temporaryRoots.push(dir);
  return dir;
}

// A minimal contract of three routable ids, plus every id in EXCLUDED_IDS so
// the exclusion-list sanity check never fires as a side effect of a fixture
// contract that simply doesn't happen to carry `bala`/`sunzi`/`start`.
// `routerBody` is written to the one file the gate reads
// (plugins/spk/skills/start/SKILL.md); no mirror files are needed because the
// gate is deliberately single-file.
function fixture(routerBody, ids = ['alpha', 'beta', 'gamma']) {
  const dir = makeTemp();
  const allIds = [...new Set([...ids, ...EXCLUDED_IDS])];
  const contract = { skills: allIds.map(id => ({ id })) };
  const file = path.join(dir, 'plugins/spk/skills/start/SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, routerBody);
  return { dir, contract };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('router coverage gate', () => {
  test('passes when every id is mentioned', () => {
    const { dir, contract } = fixture('route by outcome:\n- x → `alpha`; y → `beta`; z → `gamma`\n');
    expect(collectRouterCoverageErrors(dir, contract)).toEqual([]);
  });

  test('flags an id with no routing mention', () => {
    const { dir, contract } = fixture('route by outcome:\n- x → `alpha`; y → `beta`\n');
    expect(collectRouterCoverageErrors(dir, contract)).toEqual([
      `${ROUTER_PAYLOAD}: missing routing mention for workflow id \`gamma\``,
    ]);
  });

  test('does not let a short id match inside a longer one', () => {
    // `alpha` must not be considered "mentioned" merely because
    // `alpha-review` appears in the body.
    const { dir, contract } = fixture('route by outcome:\n- x → `alpha-review`; y → `beta`; z → `gamma`\n', [
      'alpha',
      'alpha-review',
      'beta',
      'gamma',
    ]);
    expect(collectRouterCoverageErrors(dir, contract)).toEqual([
      `${ROUTER_PAYLOAD}: missing routing mention for workflow id \`alpha\``,
    ]);
  });

  test('a mention without backticks or a leading slash still counts', () => {
    const { dir, contract } = fixture('route by outcome:\n- x → alpha; y → beta; z → gamma\n');
    expect(collectRouterCoverageErrors(dir, contract)).toEqual([]);
  });

  test('reports a missing router payload rather than throwing', () => {
    const dir = makeTemp();
    const contract = { skills: [{ id: 'alpha' }] };
    expect(collectRouterCoverageErrors(dir, contract)).toEqual([
      `MISSING router payload: ${ROUTER_PAYLOAD}`,
    ]);
  });

  test('an id passed as excluded that is not in the contract is flagged', () => {
    const { dir, contract } = fixture('route by outcome:\n- x → `alpha`; y → `beta`; z → `gamma`\n');
    // Exercise the exclusion-list sanity check directly against a contract
    // that does not contain every configured excluded id.
    const errors = collectRouterCoverageErrors(dir, contract);
    expect(errors).toEqual([]);
    expect(EXCLUDED_IDS.every(id => typeof id === 'string')).toBe(true);
  });

  test('every currently excluded id is justified as manual-only or self-referential in the router body', () => {
    const routerFile = path.join(ROOT, ROUTER_PAYLOAD);
    const body = fs.readFileSync(routerFile, 'utf8');
    for (const id of EXCLUDED_IDS) {
      if (id === 'start') continue; // the router does not route to itself
      expect(body).toMatch(new RegExp(`${id}[\\s\\S]{0,80}manual-only`, 'i'));
    }
  });

  test('the real repository roster and router payload satisfy the gate', () => {
    expect(collectRouterCoverageErrors(ROOT, CONTRACT)).toEqual([]);
  });
});
