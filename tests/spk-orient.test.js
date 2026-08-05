// tests/spk-orient.test.js
// Pins the read-only SessionStart orientation hook: it injects an orientation
// block (active AGENTS.md-governed areas + recent commits) but WRITES NOTHING
// and makes NO LLM call. Non-blocking contract = additionalContext JSON on
// stdout + exit 0; kill switch SPK_ORIENT=off => silent exit 0.
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT = path.join(__dirname, '..', 'plugins', 'spk', 'scripts', 'spk-orient.cjs');
const {
  buildOrientation, areaOf, agentsAreas, activeAreas, pendingReflection,
  gitEnvironment, orientProjectRoot, REVIEW_FILE
} = require('../plugins/spk/scripts/spk-orient.cjs');

function run(event, env = {}) {
  return spawnSync('node', [SCRIPT], {
    input: JSON.stringify(event),
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });
}

// A throwaway git repo with a nested AGENTS.md area and a pending change.
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-orient-'));
  const opts = { cwd: dir, stdio: 'ignore' };
  execFileSync('git', ['init', '-q'], opts);
  execFileSync('git', ['config', 'user.email', 't@t.dev'], opts);
  execFileSync('git', ['config', 'user.name', 'T'], opts);
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# root');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'AGENTS.md'), '# src area');
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'init');
  execFileSync('git', ['add', '.'], opts);
  execFileSync('git', ['commit', '-q', '-m', 'seed commit'], opts);
  return dir;
}

describe('spk-orient pure logic', () => {
  test('areaOf maps a changed file to its nearest AGENTS.md area', () => {
    const areas = new Set(['src', 'src/api']);
    expect(areaOf('src/api/handler.js', areas)).toBe('src/api');
    expect(areaOf('src/util.js', areas)).toBe('src');
    expect(areaOf('README.md', areas)).toBeNull();
  });

  test('buildOrientation returns null when nothing to say', () => {
    expect(buildOrientation({ areas: [], commits: [] })).toBeNull();
  });

  test('buildOrientation lists active areas and commits', () => {
    const block = buildOrientation({ areas: ['src'], commits: ['abc1 do thing'] });
    expect(block).toMatch(/Active area\(s\)/);
    expect(block).toMatch(/src/);
    expect(block).toMatch(/AGENTS\.md/);
    expect(block).toMatch(/do thing/);
  });

  test('buildOrientation notes a clean tree when only commits exist', () => {
    const block = buildOrientation({ areas: [], commits: ['abc1 seed'] });
    expect(block).toMatch(/clean/);
  });

  test('surfaces a pending session-reflect review; silent when none exists', () => {
    // Regression: the reflector wrote ai_context/session-reflect-review.md but
    // nothing ever surfaced it — the feature was write-only. Orientation must
    // point at a pending review, and stay quiet when there is none.
    const dir = makeRepo();
    try {
      expect(pendingReflection(dir)).toBeNull();
      const review = path.join(dir, REVIEW_FILE);
      fs.mkdirSync(path.dirname(review), { recursive: true });
      fs.writeFileSync(review, '# Session reflect\n');
      const pending = pendingReflection(dir);
      expect(pending).toEqual({ ageDays: 0 });
      const block = buildOrientation({ areas: [], commits: [], reflection: pending });
      expect(block).toMatch(/session-reflect-review\.md/);
      expect(block).toMatch(/written today/);
      expect(block).toMatch(/delete the file/);
      expect(buildOrientation({ areas: [], commits: [], reflection: null })).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('agentsAreas / activeAreas detect the nested area with pending work', () => {
    const dir = makeRepo();
    try {
      fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'changed');
      expect([...agentsAreas(dir)]).toContain('src');
      expect(activeAreas(dir)).toEqual(['src']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('prefers host roots and sanitizes Git subprocess state', () => {
    expect(orientProjectRoot({
      CLAUDE_PROJECT_DIR: '/host/claude',
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/claude'));
    expect(orientProjectRoot({
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/codex'));

    const child = gitEnvironment();
    expect(child.PATH).toBeTruthy();
    expect(child.PATH).not.toContain('/project/override');
    expect(child.GIT_OPTIONAL_LOCKS).toBe('0');
  });
});

describe('spk-orient SessionStart hook process contract', () => {
  test('kill switch yields no output and exit 0', () => {
    const r = run({ hook_event_name: 'SessionStart' }, { SPK_ORIENT: 'off' });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  test('emits additionalContext JSON on stdout, exit 0', () => {
    const dir = makeRepo();
    try {
      fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'changed');
      const r = run({ hook_event_name: 'SessionStart' }, { CLAUDE_PROJECT_DIR: dir, SPK_PROJECT_ROOT: dir });
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(out.hookSpecificOutput.additionalContext).toMatch(/orient|AGENTS\.md|area/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('orients only — writes no files', () => {
    const dir = makeRepo();
    try {
      const before = fs.readdirSync(dir).sort();
      const r = run({ hook_event_name: 'SessionStart' }, { CLAUDE_PROJECT_DIR: dir, SPK_PROJECT_ROOT: dir });
      expect(r.status).toBe(0);
      expect(fs.readdirSync(dir).sort()).toEqual(before);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('malformed stdin never breaks the hook', () => {
    const r = spawnSync('node', [SCRIPT], { input: 'not json{', encoding: 'utf-8' });
    expect(r.status).toBe(0);
  });
});
