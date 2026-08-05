// spk/tests/validate-manifest.test.js
const { validateManifest } = require('../scripts/validate-manifest.cjs');

describe('validateManifest', () => {
  const validManifest = {
    version: '3.0.0',
    released: '2026-04-19',
    brand: 'AI Sprint Kit',
    slug: 'spk',
    tagline: 'Skills-first subagent development via Claude Code subscription',
    agents: {
      orchestrators: [
        { name: 'plan-orchestrator', model: 'claude-opus-4-8', color: 'green', phase: 'planning' }
      ],
      specialists: [
        { name: 'planner', model: 'claude-opus-4-8', color: 'green', phase: 'planning' }
      ]
    },
    commands: [
      { name: '/spk-plan', orchestrator: 'plan-orchestrator' }
    ]
  };

  test('valid manifest passes', () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects alias model IDs', () => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    bad.agents.specialists[0].model = 'opus';
    const result = validateManifest(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/model/);
  });

  test('rejects invalid color', () => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    bad.agents.specialists[0].color = 'red';
    const result = validateManifest(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/color/);
  });

  test('rejects missing required field', () => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    delete bad.version;
    const result = validateManifest(bad);
    expect(result.valid).toBe(false);
  });

  test.each([
    ['root', manifest => { manifest.typo = true; }],
    ['agents object', manifest => { manifest.agents.typo = true; }],
    ['agent', manifest => { manifest.agents.specialists[0].typo = true; }],
    ['command', manifest => { manifest.commands[0].typo = true; }],
  ])('rejects unknown properties on the %s', (_label, mutate) => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    mutate(bad);
    const result = validateManifest(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/additional properties/);
  });

  test.each([
    ['orchestrators', manifest => { manifest.agents.orchestrators = []; }],
    ['specialists', manifest => { manifest.agents.specialists = []; }],
    ['commands', manifest => { manifest.commands = []; }],
  ])('rejects an empty %s roster', (_label, mutate) => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    mutate(bad);
    expect(validateManifest(bad).valid).toBe(false);
  });

  test('rejects duplicate roster entries and commands', () => {
    const duplicateAgent = JSON.parse(JSON.stringify(validManifest));
    duplicateAgent.agents.specialists.push({ ...duplicateAgent.agents.specialists[0] });
    expect(validateManifest(duplicateAgent).valid).toBe(false);

    const duplicateCommand = JSON.parse(JSON.stringify(validManifest));
    duplicateCommand.commands.push({ ...duplicateCommand.commands[0] });
    expect(validateManifest(duplicateCommand).valid).toBe(false);
  });

  test('rejects duplicate names even when the objects differ', () => {
    const duplicateAgentName = JSON.parse(JSON.stringify(validManifest));
    duplicateAgentName.agents.specialists.push({
      name: 'plan-orchestrator',
      model: 'claude-sonnet-5',
      color: 'blue',
      phase: 'building',
    });
    expect(validateManifest(duplicateAgentName).errors.join(' ')).toMatch(/duplicate agent name/);

    const duplicateCommandName = JSON.parse(JSON.stringify(validManifest));
    duplicateCommandName.commands.push({ name: '/spk-plan', direct: true });
    expect(validateManifest(duplicateCommandName).errors.join(' ')).toMatch(/duplicate command name/);
  });

  test.each([
    ['no target', command => { delete command.orchestrator; }],
    ['two targets', command => { command.agent = 'planner'; }],
    ['nullable agent', command => {
      delete command.orchestrator;
      command.agent = null;
    }],
    ['false direct target', command => {
      delete command.orchestrator;
      command.direct = false;
    }],
  ])('rejects a command with %s', (_label, mutate) => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    mutate(bad.commands[0]);
    expect(validateManifest(bad).valid).toBe(false);
  });

  test('accepts each explicit command target kind', () => {
    const orchestrated = JSON.parse(JSON.stringify(validManifest));
    expect(validateManifest(orchestrated).valid).toBe(true);

    const delegated = JSON.parse(JSON.stringify(validManifest));
    delegated.commands[0] = { name: '/spk-plan', agent: 'planner' };
    expect(validateManifest(delegated).valid).toBe(true);

    const direct = JSON.parse(JSON.stringify(validManifest));
    direct.commands[0] = { name: '/spk-plan', direct: true };
    expect(validateManifest(direct).valid).toBe(true);
  });

  test('rejects malformed command targets', () => {
    const bad = JSON.parse(JSON.stringify(validManifest));
    bad.commands[0].orchestrator = 'Plan Orchestrator';
    const result = validateManifest(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/pattern/);
  });

  test('rejects references outside the matching roster', () => {
    const unknownOrchestrator = JSON.parse(JSON.stringify(validManifest));
    unknownOrchestrator.commands[0].orchestrator = 'missing-orchestrator';
    expect(validateManifest(unknownOrchestrator).errors.join(' ')).toMatch(/unknown orchestrator/);

    const wrongRoster = JSON.parse(JSON.stringify(validManifest));
    wrongRoster.commands[0] = { name: '/spk-plan', agent: 'plan-orchestrator' };
    expect(validateManifest(wrongRoster).errors.join(' ')).toMatch(/unknown agent/);
  });
});
