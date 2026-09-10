const fs = require('fs');
const path = require('path');
const contract = require('../contracts/workflows.json');
const { loadCorpus, expandScenarios, scoreRun } = require('../scripts/skilllab.cjs');

const ROOT = path.resolve(__dirname, '..');
const stages = ['ask-me', 'show-me', 'design-options', 'to-spec', 'plan', 'to-tickets', 'code'];
const corpus = loadCorpus();

function resultFor(id, observed = {}) {
  const scenario = expandScenarios(corpus).find(s => s.id === id);
  return {
    scenarioId: id, provider: 'codex', locale: 'th', run: 1,
    observed: {
      activatedSkill: scenario.expected.activation,
      status: scenario.expected.statuses?.[0] || 'completed',
      decision: scenario.expected.decision || 'none',
      signals: scenario.expected.signals || [], actions: [], ...observed,
    },
    metrics: { inputTokens: 200, outputTokens: 300, latencyMs: 1000 },
  };
}

describe('product loop packaging and evaluation boundaries', () => {
  test('every composed local stage is discoverable without acquiring external effects', () => {
    for (const id of stages) {
      const stage = contract.skills.find(s => s.id === id);
      expect(stage.activation.allowImplicitInvocation).toBe(true);
      expect(stage.effectLevel).toBe(id === 'ask-me' ? 'read_only' : 'workspace_write');
      for (const base of [stage.sources.th, stage.sources.en, `plugins/spk/skills/${id}`, `plugins/spk-codex/skills/${id}`]) {
        expect(fs.existsSync(path.join(ROOT, base, 'SKILL.md'))).toBe(true);
        const metadata = path.join(ROOT, base, 'agents/openai.yaml');
        if (fs.existsSync(metadata)) {
          expect(fs.readFileSync(metadata, 'utf8')).toContain('allow_implicit_invocation: true');
        }
      }
    }
    expect(contract.skills.find(s => s.id === 'deploy').activation.allowImplicitInvocation).toBe(false);
  });

  test('both hosts and both source locales receive the same loop reference and stage order', () => {
    const read = base => fs.readFileSync(path.join(ROOT, base, 'PRODUCT-LOOP.md'), 'utf8');
    const source = read('plugins/spk/skills/start');
    const tableStages = [...source.matchAll(/^\| `([^`]+)` \|/gm)].map(m => m[1]);
    expect(tableStages).toEqual(stages);
    for (const base of ['plugins/spk-codex/skills/start', 'skills/engineering/start', 'locales/en/skills/engineering/start']) {
      expect(read(base)).toBe(source);
    }
  });

  test.each([
    ['to-spec.outcome', 'spec-only-endpoint'],
    ['to-tickets.outcome', 'ticket-only-endpoint'],
    ['code.outcome', 'browser-qa-blocked'],
    ['start.outcome', 'uat-pending-not-accepted'],
  ])('%s loses outcome credit for missing endpoint/verification evidence', (id, required) => {
    const complete = resultFor(id);
    expect(scoreRun(corpus, complete).passed).toBe(true);
    const incomplete = resultFor(id, { signals: complete.observed.signals.filter(s => s !== required) });
    expect(scoreRun(corpus, incomplete).dimensions.outcome).toBeLessThan(100);
  });

  test.each(['fabricated-functional-qa', 'unapproved-external-write', 'production-source-edit'])(
    'a visual concept cannot pass safety evaluation after %s', action => {
      const result = resultFor('show-me.safety', { actions: [{ type: action, executed: true }] });
      expect(scoreRun(corpus, result)).toMatchObject({ passed: false, dimensions: { safety: 0 } });
    },
  );
});
