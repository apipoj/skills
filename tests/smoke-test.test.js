const { runSmokeTest } = require('../scripts/install/smoke-test.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeInstalled(manifestOverride) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-smoke-'));
  fs.mkdirSync(path.join(dir, '.claude/agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/commands'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/hooks/PreToolUse'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'ai_context/wiki'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'ai_context/sources'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.spk'), { recursive: true });

  const manifest = manifestOverride || {
    version: '3.0.0',
    released: '2026-04-19',
    brand: 'AI Sprint Kit',
    slug: 'spk',
    tagline: 'test',
    agents: {
      orchestrators: [{ name: 'plan-orchestrator', model: 'claude-opus-4-8', color: 'green', phase: 'planning' }],
      specialists: [{ name: 'planner', model: 'claude-opus-4-8', color: 'green', phase: 'planning' }]
    },
    commands: [{ name: '/spk-plan', orchestrator: 'plan-orchestrator' }]
  };
  fs.writeFileSync(path.join(dir, '.spk/manifest.json'), JSON.stringify(manifest));

  for (const a of [...manifest.agents.orchestrators, ...manifest.agents.specialists]) {
    fs.writeFileSync(
      path.join(dir, `.claude/agents/${a.name}.md`),
      `---\nname: ${a.name}\nmodel: ${a.model}\ncolor: ${a.color}\ndescription: t\n---\n`
    );
  }
  for (const c of manifest.commands) {
    const slug = c.name.replace(/^\//, '');
    fs.writeFileSync(path.join(dir, `.claude/commands/${slug}.md`), `---\ndescription: t\n---\n`);
  }
  fs.writeFileSync(path.join(dir, 'ai_context/wiki/index.md'), '# Index\n');
  fs.writeFileSync(path.join(dir, 'ai_context/wiki/log.md'), '# Log\n');
  fs.writeFileSync(path.join(dir, 'ai_context/wiki/SCHEMA.md'), '# Schema\n');
  return dir;
}

describe('runSmokeTest', () => {
  test('passes on correctly installed SPK', () => {
    const dir = makeInstalled();
    const result = runSmokeTest(dir);
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test('fails if .spk/manifest.json is missing', () => {
    const dir = makeInstalled();
    fs.rmSync(path.join(dir, '.spk/manifest.json'));
    const result = runSmokeTest(dir);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toMatch(/manifest/);
  });

  test('fails if agent file missing', () => {
    const dir = makeInstalled();
    fs.rmSync(path.join(dir, '.claude/agents/planner.md'));
    const result = runSmokeTest(dir);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toMatch(/planner/);
  });

  test('fails if wiki/index.md missing', () => {
    const dir = makeInstalled();
    fs.rmSync(path.join(dir, 'ai_context/wiki/index.md'));
    const result = runSmokeTest(dir);
    expect(result.passed).toBe(false);
    expect(result.failures.join(' ')).toMatch(/index/);
  });

  test('fails if manifest.json is malformed', () => {
    const dir = makeInstalled();
    fs.writeFileSync(path.join(dir, '.spk/manifest.json'), 'not json');
    const result = runSmokeTest(dir);
    expect(result.passed).toBe(false);
  });
});
