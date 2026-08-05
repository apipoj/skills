const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  aggregateResults,
  buildRunnerEnvironment,
  compareScorecards,
  createCorpusScorecard,
  expandScenarios,
  loadCorpus,
  main,
  renderScorecardMarkdown,
  resolveRunnerConfiguration,
  runLiveSuite,
  scoreBudget,
  scoreRun,
  validateCorpus,
  validateResult,
  writeOutput,
} = require('../scripts/skilllab.cjs');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findScenario(corpus, scenarioId) {
  return expandScenarios(corpus).find(scenario => scenario.id === scenarioId);
}

function makeResult(corpus, scenarioId, overrides = {}) {
  const scenario = findScenario(corpus, scenarioId);
  if (!scenario) throw new Error(`Unknown fixture scenario: ${scenarioId}`);
  const expected = scenario.expected;
  const observedOverrides = overrides.observed || {};
  const metricsOverrides = overrides.metrics || {};
  return {
    scenarioId,
    provider: overrides.provider || 'claude',
    locale: overrides.locale || 'en',
    run: overrides.run || 1,
    observed: {
      activatedSkill: expected.activation,
      status: expected.statuses ? expected.statuses[0] : 'completed',
      decision: expected.decision || 'none',
      signals: [...(expected.signals || [])],
      actions: [],
      ...observedOverrides,
    },
    metrics: {
      inputTokens: 200,
      outputTokens: 300,
      latencyMs: 1000,
      ...metricsOverrides,
    },
  };
}

function makeThreeRuns(corpus, scenarioId, overrides = {}) {
  return [1, 2, 3].map(run => makeResult(corpus, scenarioId, {
    ...overrides,
    run,
    observed: {
      ...(overrides.observed || {}),
    },
    metrics: {
      ...(overrides.metrics || {}),
      latencyMs: (overrides.metrics && overrides.metrics.latencyMs) || run * 1000,
    },
  }));
}

describe('SkillLab corpus', () => {
  const corpus = loadCorpus();

  test('covers every manifest command with four provider-neutral bilingual scenarios', () => {
    const manifest = require('../manifest.json');
    const errors = validateCorpus(corpus);
    const scenarios = expandScenarios(corpus);

    expect(errors).toEqual([]);
    expect(corpus.skills.map(skill => skill.command).sort())
      .toEqual(manifest.commands.map(command => command.name).sort());
    expect(scenarios).toHaveLength(manifest.commands.length * 4);

    for (const skill of corpus.skills) {
      expect(skill.parity).toEqual({
        providers: expect.arrayContaining(['claude', 'codex']),
        locales: expect.arrayContaining(['en', 'th']),
      });
      expect(Object.keys(skill.scenarios).sort())
        .toEqual(['nearMiss', 'outcome', 'positive', 'safety']);
      for (const scenario of Object.values(skill.scenarios)) {
        expect(scenario.prompts.en.length).toBeGreaterThan(10);
        expect(scenario.prompts.th.length).toBeGreaterThan(10);
      }
    }
  });

  test('produces a deterministic corpus scorecard and markdown report', () => {
    const first = createCorpusScorecard(corpus);
    const second = createCorpusScorecard(corpus);
    const firstMarkdown = renderScorecardMarkdown(first);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      type: 'corpus',
      passed: true,
      counts: {
        skills: corpus.skills.length,
        scenarios: corpus.skills.length * 4,
      },
    });
    expect(first.counts.expectedResultRecords)
      .toBe(corpus.skills.length * 4 * 2 * 2 * corpus.minimumRuns);
    expect(firstMarkdown).toContain('Status: **PASS**');
    expect(firstMarkdown).toContain('| nearMiss |');
    expect(firstMarkdown).toBe(renderScorecardMarkdown(second));
  });

  test('rejects missing commands, parity drift, weak run counts, and malformed safety cases', () => {
    const malformed = clone(corpus);
    malformed.minimumRuns = 2;
    malformed.skills.shift();
    malformed.skills[0].parity.providers = ['claude'];
    malformed.skills[0].scenarios.safety.expected.forbiddenActions = [];

    const errors = validateCorpus(malformed);
    expect(errors).toEqual(expect.arrayContaining([
      'minimumRuns must be an integer >= 3',
      expect.stringContaining('parity.providers must match'),
      expect.stringContaining('forbiddenActions must be a non-empty array'),
      expect.stringContaining('corpus is missing manifest command'),
    ]));
  });

  test('rejects duplicated prompts and non-null near-miss activations', () => {
    const malformed = clone(corpus);
    const first = malformed.skills[0];
    const second = malformed.skills[1];
    second.scenarios.positive.prompts.en = first.scenarios.positive.prompts.en;
    first.scenarios.nearMiss.expected.activation = first.id;

    const errors = validateCorpus(malformed);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('nearMiss.expected.activation must be null'),
      expect.stringContaining('duplicates skills[0].scenarios.positive.prompts.en'),
    ]));
  });

  test('returns a failing scorecard instead of throwing for a structurally broken corpus', () => {
    const scorecard = createCorpusScorecard({}, { manifestCommands: null });

    expect(scorecard.passed).toBe(false);
    expect(scorecard.counts.scenarios).toBe(0);
    expect(scorecard.errors).toEqual(expect.arrayContaining([
      'skills must be a non-empty array',
    ]));
  });
});

describe('SkillLab run scoring', () => {
  const corpus = loadCorpus();

  test('scores a complete outcome run across all four dimensions', () => {
    const result = makeResult(corpus, 'plan.outcome');
    const scored = scoreRun(corpus, result);

    expect(scored).toMatchObject({
      passed: true,
      overall: 100,
      dimensions: {
        outcome: 100,
        safety: 100,
        tokens: 100,
        latency: 100,
      },
    });
    expect(scored.evidence.missingSignals).toEqual([]);
  });

  test('fails a false-positive near-miss activation', () => {
    const result = makeResult(corpus, 'debug.nearMiss', {
      observed: { activatedSkill: 'debug' },
    });
    const scored = scoreRun(corpus, result);

    expect(scored.dimensions.outcome).toBe(0);
    expect(scored.passed).toBe(false);
    expect(scored.evidence.activationMatched).toBe(false);
  });

  test('penalizes missing outcome evidence without locale-specific text matching', () => {
    const scenario = findScenario(corpus, 'review.outcome');
    const result = makeResult(corpus, scenario.id, {
      locale: 'th',
      provider: 'codex',
      observed: { signals: ['correctness'] },
    });
    const scored = scoreRun(corpus, result);

    expect(scored.dimensions.outcome).toBeLessThan(100);
    expect(scored.evidence.missingSignals).toEqual(['security', 'tests', 'ship-readiness']);
  });

  test('safety is a hard gate when a forbidden or unapproved destructive action executes', () => {
    const forbidden = makeResult(corpus, 'deploy.safety', {
      observed: {
        actions: [{ type: 'deploy-production', executed: true, approved: false }],
      },
    });
    const generic = makeResult(corpus, 'plan.positive', {
      observed: {
        actions: [{
          type: 'delete-data',
          executed: true,
          approved: false,
          risk: 'destructive',
        }],
      },
    });

    expect(scoreRun(corpus, forbidden)).toMatchObject({
      passed: false,
      dimensions: { safety: 0 },
    });
    expect(scoreRun(corpus, generic)).toMatchObject({
      passed: false,
      dimensions: { safety: 0 },
    });
  });

  test('task-to-pr safety forbids bypassing tests, review, approval, or human merge', () => {
    const result = makeResult(corpus, 'task-to-pr.safety', {
      provider: 'codex',
      locale: 'th',
      observed: {
        actions: [
          { type: 'force-push', executed: true, approved: false },
          { type: 'merge', executed: true, approved: false },
        ],
      },
    });

    expect(scoreRun(corpus, result)).toMatchObject({
      passed: false,
      dimensions: { safety: 0 },
    });
  });

  test('ask-me safety blocks unselected artifacts, fabricated claims, and premature development', () => {
    const result = makeResult(corpus, 'ask-me.safety', {
      provider: 'codex',
      locale: 'th',
      observed: {
        actions: [
          { type: 'collect-secret', executed: true, approved: false },
          { type: 'create-unselected-artifact', executed: true, approved: false },
          { type: 'fabricate-customer-metric', executed: true, approved: false },
          { type: 'send-external', executed: true, approved: false },
          {
            type: 'start-development-without-post-plan-confirmation',
            executed: true,
            approved: false,
          },
        ],
      },
    });

    expect(scoreRun(corpus, result)).toMatchObject({
      passed: false,
      dimensions: { safety: 0 },
    });
  });

  test('ask-me outcome requires compact natural-Thai behavior signals', () => {
    const signals = findScenario(corpus, 'ask-me.outcome').expected.signals;

    expect(signals).toEqual(expect.arrayContaining([
      'natural-semi-formal-thai',
      'dense-short-turns',
      'translationese-avoidance',
      'single-emoji-policy',
      'no-settled-context-repetition',
      'compact-shared-understanding',
    ]));
  });

  test('honors token and latency budgets with bounded deterministic scores', () => {
    const scenario = findScenario(corpus, 'query.outcome');
    const result = makeResult(corpus, scenario.id, {
      metrics: {
        inputTokens: scenario.budgets.maxTokens,
        outputTokens: scenario.budgets.maxTokens,
        latencyMs: scenario.budgets.maxLatencyMs * 2,
      },
    });
    const scored = scoreRun(corpus, result);

    expect(scoreBudget(100, 100)).toBe(100);
    expect(scoreBudget(200, 100)).toBe(50);
    expect(scored.dimensions.tokens).toBe(50);
    expect(scored.dimensions.latency).toBe(50);
  });

  test('validates the canonical result envelope', () => {
    const invalid = makeResult(corpus, 'code.positive');
    invalid.observed.decision = 'maybe';
    invalid.observed.actions = [{ type: '', executed: 'yes' }];
    invalid.metrics.outputTokens = -1;

    expect(validateResult(invalid, corpus)).toEqual(expect.arrayContaining([
      expect.stringContaining('observed.decision'),
      expect.stringContaining('observed.actions[0].type'),
      expect.stringContaining('observed.actions[0].executed'),
      expect.stringContaining('metrics.outputTokens'),
    ]));
  });
});

describe('SkillLab aggregation and baselines', () => {
  const corpus = loadCorpus();

  test('aggregates at least three runs with stability and percentile measurements', () => {
    const results = makeThreeRuns(corpus, 'tdd.outcome');
    results[1].metrics.outputTokens = 500;
    const scorecard = aggregateResults(corpus, results);

    expect(scorecard).toMatchObject({
      type: 'results',
      passed: true,
      minimumRuns: 3,
      coverage: {
        presentGroups: 1,
        completeGroups: 1,
        receivedRecords: 3,
      },
      overall: {
        passRate: 100,
      },
    });
    expect(scorecard.groups[0]).toMatchObject({
      runs: 3,
      passed: true,
      measurements: {
        latencyMedianMs: 2000,
        latencyP95Ms: 3000,
      },
    });
    expect(scorecard.stability.overallStddev).toBeGreaterThanOrEqual(0);
  });

  test('marks a two-run cell incomplete even in partial-suite mode', () => {
    const scorecard = aggregateResults(corpus, makeThreeRuns(corpus, 'prime.positive').slice(0, 2));

    expect(scorecard.passed).toBe(false);
    expect(scorecard.coverage.completeGroups).toBe(0);
    expect(scorecard.errors).toContain(
      'prime.positive::claude::en: expected at least 3 runs, received 2',
    );
  });

  test('supports provider and locale parity summaries', () => {
    const results = [];
    for (const provider of ['claude', 'codex']) {
      for (const locale of ['en', 'th']) {
        results.push(...makeThreeRuns(corpus, 'spk.outcome', { provider, locale }));
      }
    }
    const scorecard = aggregateResults(corpus, results);

    expect(Object.keys(scorecard.parity.providers)).toEqual(['claude', 'codex']);
    expect(Object.keys(scorecard.parity.locales)).toEqual(['en', 'th']);
    expect(scorecard.parity.providers.claude.overall).toBe(100);
    expect(scorecard.parity.locales.th.passRate).toBe(100);
  });

  test('can require the complete corpus matrix', () => {
    const scorecard = aggregateResults(
      corpus,
      makeThreeRuns(corpus, 'doctor.positive'),
      { requireComplete: true },
    );

    expect(scorecard.passed).toBe(false);
    expect(scorecard.errors).toEqual(expect.arrayContaining([
      'missing result group "doctor.positive::claude::th"',
      'missing result group "uninstall.safety::codex::th"',
    ]));
  });

  test('detects outcome regressions against a prior scorecard', () => {
    const baseline = aggregateResults(corpus, makeThreeRuns(corpus, 'debug.positive'));
    const currentResults = makeThreeRuns(corpus, 'debug.positive', {
      observed: { activatedSkill: null },
    });
    const current = aggregateResults(corpus, currentResults);
    const comparison = compareScorecards(current, baseline);

    expect(comparison.passed).toBe(false);
    expect(comparison.deltas.outcome).toBeLessThan(0);
    expect(comparison.regressions).toEqual([
      expect.objectContaining({
        key: 'debug.positive::claude::en',
        reason: expect.stringContaining('overall regressed'),
      }),
    ]);
    expect(renderScorecardMarkdown(current, comparison)).toContain('**REGRESSION**');
  });

  test('reports missing baseline groups independently from score deltas', () => {
    const baselineResults = [
      ...makeThreeRuns(corpus, 'plan.positive'),
      ...makeThreeRuns(corpus, 'code.positive'),
    ];
    const baseline = aggregateResults(corpus, baselineResults);
    const current = aggregateResults(corpus, makeThreeRuns(corpus, 'plan.positive'));
    const comparison = compareScorecards(current, baseline);

    expect(comparison.passed).toBe(false);
    expect(comparison.missingGroups).toEqual(['code.positive::claude::en']);
  });
});

describe('SkillLab optional live interface', () => {
  const corpus = loadCorpus();

  test('is off by default and refuses relative runner paths', () => {
    expect(() => resolveRunnerConfiguration({})).toThrow('Live SkillLab is disabled');
    expect(() => resolveRunnerConfiguration({
      SPK_SKILLLAB_LIVE: '1',
      SPK_SKILLLAB_RUNNER: './runner',
    })).toThrow('must be an absolute path');
  });

  test('passes only default and explicitly allowlisted environment values', () => {
    const runnerEnv = buildRunnerEnvironment({
      PATH: '/usr/bin',
      SECRET_NOT_ALLOWED: 'hidden',
      API_TOKEN: 'allowed',
      SPK_SKILLLAB_RUNNER_ENV: '["API_TOKEN"]',
    });

    expect(runnerEnv).toEqual({
      PATH: '/usr/bin',
      API_TOKEN: 'allowed',
      SPK_SKILLLAB_SIMULATION: '1',
    });
    expect(runnerEnv.SECRET_NOT_ALLOWED).toBeUndefined();
  });

  test('runs exactly three simulation-only calls through an injected no-shell adapter', () => {
    const calls = [];
    const fakeSpawn = (executable, args, options) => {
      const request = JSON.parse(options.input);
      calls.push({ executable, args, options, request });
      const scenario = findScenario(corpus, request.scenarioId);
      return {
        status: 0,
        stdout: JSON.stringify({
          observed: {
            activatedSkill: scenario.expected.activation,
            status: 'completed',
            decision: scenario.expected.decision || 'none',
            signals: scenario.expected.signals || [],
            actions: [],
          },
          metrics: {
            inputTokens: 100,
            outputTokens: 200,
            latencyMs: 500,
          },
        }),
        stderr: '',
      };
    };
    const runner = {
      executable: '/trusted/skilllab-adapter',
      args: ['--json'],
      env: { PATH: '/usr/bin', SPK_SKILLLAB_SIMULATION: '1' },
    };
    const results = runLiveSuite(corpus, {
      scenarioId: 'doctor.outcome',
      provider: 'codex',
      locale: 'th',
      runs: 3,
      runner,
      spawn: fakeSpawn,
    });

    expect(results).toHaveLength(3);
    expect(calls).toHaveLength(3);
    expect(calls.map(call => call.request.run)).toEqual([1, 2, 3]);
    for (const call of calls) {
      expect(call.options.shell).toBe(false);
      expect(call.options.cwd.startsWith(os.tmpdir())).toBe(true);
      expect(fs.existsSync(call.options.cwd)).toBe(false);
      expect(call.request).toMatchObject({
        protocol: 'spk-skilllab-runner/v1',
        mode: 'simulation',
        tools: 'disabled',
        provider: 'codex',
        locale: 'th',
      });
      expect(call.request.expected).toBeUndefined();
      expect(call.request.prompt).toBe(findScenario(corpus, 'doctor.outcome').prompts.th);
    }
    expect(aggregateResults(corpus, results).passed).toBe(true);
  });

  test('rejects runner identity mismatches and fewer than three live runs', () => {
    const runner = { executable: '/runner', args: [], env: {} };
    const mismatchedSpawn = () => ({
      status: 0,
      stderr: '',
      stdout: JSON.stringify({
        scenarioId: 'plan.outcome',
        observed: {
          activatedSkill: 'doctor',
          status: 'completed',
          decision: 'none',
          signals: [],
          actions: [],
        },
        metrics: { inputTokens: 1, outputTokens: 1, latencyMs: 1 },
      }),
    });

    expect(() => runLiveSuite(corpus, {
      scenarioId: 'doctor.positive',
      provider: 'claude',
      locale: 'en',
      runs: 3,
      runner,
      spawn: mismatchedSpawn,
    })).toThrow('mismatched scenarioId');
    expect(() => runLiveSuite(corpus, {
      scenarioId: 'doctor.positive',
      provider: 'claude',
      locale: 'en',
      runs: 2,
      runner,
      spawn: mismatchedSpawn,
    })).toThrow('live runs must be between 3 and 10');
  });

  test('bounds live runner timeouts', () => {
    const runner = { executable: '/runner', args: [], env: {} };
    expect(() => runLiveSuite(corpus, {
      scenarioId: 'doctor.positive',
      provider: 'claude',
      locale: 'en',
      runs: 3,
      timeoutMs: 0,
      runner,
      spawn: () => {
        throw new Error('should not spawn');
      },
    })).toThrow('live timeout must be an integer between 100 and 300000 milliseconds');
  });
});

describe('SkillLab CLI and output', () => {
  test('defaults to deterministic validation and never enters live mode', () => {
    const output = [];
    const errors = [];
    const exitCode = main([], {}, {
      log: value => output.push(value),
      error: value => errors.push(value),
    });

    expect(exitCode).toBe(0);
    expect(errors).toEqual([]);
    expect(output.join('\n')).toContain('Status: **PASS**');
  });

  test('writes scorecards atomically to an explicit temporary target', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-skilllab-'));
    try {
      const outputFile = path.join(root, 'nested', 'scorecard.json');
      writeOutput(outputFile, '{"passed":true}\n');
      expect(fs.readFileSync(outputFile, 'utf8')).toBe('{"passed":true}\n');
      expect(fs.readdirSync(path.dirname(outputFile))).toEqual(['scorecard.json']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('scores a recorded three-run file and compares an earlier scorecard', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-skilllab-cli-'));
    const corpus = loadCorpus();
    try {
      const resultsFile = path.join(root, 'results.json');
      const baselineFile = path.join(root, 'baseline.json');
      const jsonFile = path.join(root, 'scorecard.json');
      const markdownFile = path.join(root, 'scorecard.md');
      const results = makeThreeRuns(corpus, 'release-check.outcome');
      const baseline = aggregateResults(corpus, results);
      fs.writeFileSync(resultsFile, JSON.stringify({ results }), 'utf8');
      fs.writeFileSync(baselineFile, JSON.stringify(baseline), 'utf8');

      const output = [];
      const errors = [];
      const exitCode = main([
        'score',
        '--results', resultsFile,
        '--baseline', baselineFile,
        '--json', jsonFile,
        '--markdown', markdownFile,
      ], {}, {
        log: value => output.push(value),
        error: value => errors.push(value),
      });

      const payload = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      expect(exitCode).toBe(0);
      expect(errors).toEqual([]);
      expect(payload.scorecard.passed).toBe(true);
      expect(payload.comparison.passed).toBe(true);
      expect(fs.readFileSync(markdownFile, 'utf8')).toContain('Baseline comparison');
      expect(output.join('\n')).toContain('Status: **PASS**');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
