// tests/init-ai-context.test.js
const {
  runInit, needsScaffold, autoUpdateNudge, initProjectRoot, userSettingsHome
} = require('../plugins/spk/scripts/init-ai-context.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const INIT_SCRIPT = path.join(
  __dirname, '..', 'plugins', 'spk', 'scripts', 'init-ai-context.cjs'
);

function makeTmpProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'spk-init-'));
}

function makePluginRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-pluginroot-'));
  fs.mkdirSync(path.join(dir, 'templates/ai_context/wiki'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'templates/ai_context/sources'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'templates/ai_context/wiki/SCHEMA.md'), 'SCHEMA v3.1.0');
  fs.writeFileSync(path.join(dir, 'templates/ai_context/wiki/index.md'), 'INDEX');
  fs.writeFileSync(path.join(dir, 'templates/ai_context/wiki/log.md'), 'LOG');
  fs.writeFileSync(path.join(dir, 'templates/ai_context/sources/.gitkeep'), '');
  return dir;
}

describe('init-ai-context', () => {
  test('scaffolds when wiki absent', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    const result = runInit(proj, plugin, '3.1.0');
    expect(result.scaffolded).toBe(true);
    expect(fs.existsSync(path.join(proj, 'ai_context/wiki/SCHEMA.md'))).toBe(true);
    expect(fs.existsSync(path.join(proj, 'ai_context/wiki/index.md'))).toBe(true);
    expect(fs.existsSync(path.join(proj, 'ai_context/sources/.gitkeep'))).toBe(true);
    expect(fs.readFileSync(path.join(proj, 'ai_context/sources/.gitignore'), 'utf-8'))
      .toBe('*\n!.gitignore\n');
  });

  test('idempotent — no-op when already scaffolded and version matches', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    runInit(proj, plugin, '3.1.0');
    const result = runInit(proj, plugin, '3.1.0');
    expect(result.scaffolded).toBe(false);
  });

  test('auto-update nudge: fires when not enabled, silent when any scope enables it', () => {
    // ADVISORY ONLY — the hook reads settings scopes, never writes them.
    const proj = makeTmpProject();
    const home = makeTmpProject();
    const options = { userInfo: () => ({ homedir: home }) };
    // No settings anywhere -> nudge.
    expect(autoUpdateNudge(proj, options)).toMatch(/autoUpdate/);
    // Marketplace known but autoUpdate not true -> still nudge.
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'),
      JSON.stringify({ extraKnownMarketplaces: { spk: { source: { source: 'github', repo: 'apipoj/spk' } } } }));
    expect(autoUpdateNudge(proj, options)).toMatch(/autoUpdate/);
    // Enabled at user scope -> silent.
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'),
      JSON.stringify({ extraKnownMarketplaces: { spk: { autoUpdate: true } } }));
    expect(autoUpdateNudge(proj, options)).toBeNull();
    // Enabled at project scope only -> silent.
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{}');
    fs.mkdirSync(path.join(proj, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(proj, '.claude', 'settings.json'),
      JSON.stringify({ extraKnownMarketplaces: { spk: { autoUpdate: true } } }));
    expect(autoUpdateNudge(proj, options)).toBeNull();
    // Malformed settings must never throw.
    fs.writeFileSync(path.join(proj, '.claude', 'settings.json'), '{not json');
    expect(() => autoUpdateNudge(proj, options)).not.toThrow();
    expect(userSettingsHome({ HOME: home })).not.toBe(home);
  });

  test('prefers host project roots over SPK_PROJECT_ROOT', () => {
    expect(initProjectRoot({
      CLAUDE_PROJECT_DIR: '/host/claude',
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/claude'));
    expect(initProjectRoot({
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/codex'));
  });

  test('re-scaffolds SCHEMA.md on version bump', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    runInit(proj, plugin, '3.1.0');
    fs.writeFileSync(path.join(plugin, 'templates/ai_context/wiki/SCHEMA.md'), 'SCHEMA v3.2.0');
    const result = runInit(proj, plugin, '3.2.0');
    expect(result.scaffolded).toBe(true);
    const contents = fs.readFileSync(path.join(proj, 'ai_context/wiki/SCHEMA.md'), 'utf-8');
    expect(contents).toMatch(/v3\.2\.0/);
  });

  test('preserves user-authored wiki pages on version bump', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    runInit(proj, plugin, '3.1.0');
    fs.mkdirSync(path.join(proj, 'ai_context/wiki/entities'), { recursive: true });
    fs.writeFileSync(path.join(proj, 'ai_context/wiki/entities/my-service.md'), 'user content');
    runInit(proj, plugin, '3.2.0');
    expect(fs.readFileSync(path.join(proj, 'ai_context/wiki/entities/my-service.md'), 'utf-8')).toBe('user content');
  });

  test('version upgrades never overwrite the user-owned index or append-only log', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    runInit(proj, plugin, '3.1.0');
    const index = path.join(proj, 'ai_context/wiki/index.md');
    const log = path.join(proj, 'ai_context/wiki/log.md');
    fs.writeFileSync(index, 'USER INDEX\n');
    fs.writeFileSync(log, '2026-07-31T00:00:00Z INGEST source=x\n');
    fs.writeFileSync(path.join(plugin, 'templates/ai_context/wiki/index.md'), 'NEW TEMPLATE INDEX');
    fs.writeFileSync(path.join(plugin, 'templates/ai_context/wiki/log.md'), 'NEW TEMPLATE LOG');

    runInit(proj, plugin, '3.2.0');

    expect(fs.readFileSync(index, 'utf-8')).toBe('USER INDEX\n');
    expect(fs.readFileSync(log, 'utf-8')).toBe('2026-07-31T00:00:00Z INGEST source=x\n');
  });

  test('source inbox ignores raw files without hiding its policy file', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    runInit(proj, plugin, '3.1.0');
    const ignore = fs.readFileSync(
      path.join(proj, 'ai_context/sources/.gitignore'),
      'utf-8'
    );
    expect(ignore).toContain('*');
    expect(ignore).toContain('!.gitignore');

    execFileSync('git', ['init'], { cwd: proj, stdio: 'ignore' });
    fs.writeFileSync(path.join(proj, 'ai_context/sources/private.txt'), 'private');
    const raw = spawnSync(
      'git',
      ['check-ignore', '--no-index', '--quiet', '--', 'ai_context/sources/private.txt'],
      { cwd: proj }
    );
    const policy = spawnSync(
      'git',
      ['check-ignore', '--no-index', '--quiet', '--', 'ai_context/sources/.gitignore'],
      { cwd: proj }
    );
    expect(raw.status).toBe(0);
    expect(policy.status).toBe(1);
  });

  const symlinkTest = process.platform === 'win32' ? test.skip : test;
  for (const segment of ['wiki', 'sources']) {
    for (const location of ['inside', 'outside']) {
      symlinkTest(
        `refuses an ${location}-project ai_context/${segment} directory symlink before writing`,
        () => {
          const proj = makeTmpProject();
          const plugin = makePluginRoot();
          const target = location === 'inside'
            ? path.join(proj, `unrelated-${segment}`)
            : makeTmpProject();
          const sentinelName = segment === 'wiki' ? 'SCHEMA.md' : '.gitignore';
          const sentinel = path.join(target, sentinelName);
          fs.mkdirSync(target, { recursive: true });
          fs.writeFileSync(sentinel, `unrelated ${segment} content`);
          fs.mkdirSync(path.join(proj, 'ai_context'), { recursive: true });
          fs.mkdirSync(
            path.join(proj, 'ai_context', segment === 'wiki' ? 'sources' : 'wiki'),
            { recursive: true }
          );
          fs.symlinkSync(target, path.join(proj, 'ai_context', segment), 'dir');

          const result = runInit(proj, plugin, '3.1.0');

          expect(result).toEqual({
            scaffolded: false,
            reason: 'unsafe ai_context destination: symlinks, special files, and non-directory path components are not allowed'
          });
          expect(fs.readFileSync(sentinel, 'utf-8'))
            .toBe(`unrelated ${segment} content`);
          expect(fs.existsSync(path.join(proj, 'ai_context', '.spk-version')))
            .toBe(false);
          if (segment === 'wiki') {
            expect(fs.existsSync(path.join(proj, 'ai_context', 'sources', '.gitignore')))
              .toBe(false);
          } else {
            expect(fs.existsSync(path.join(proj, 'ai_context', 'wiki', 'SCHEMA.md')))
              .toBe(false);
          }
        }
      );
    }
  }

  symlinkTest('refuses a nested file symlink beneath ai_context before writing', () => {
    const proj = makeTmpProject();
    const plugin = makePluginRoot();
    const sentinel = path.join(proj, 'unrelated-schema.md');
    fs.writeFileSync(sentinel, 'unrelated schema content');
    fs.mkdirSync(path.join(proj, 'ai_context', 'wiki'), { recursive: true });
    fs.mkdirSync(path.join(proj, 'ai_context', 'sources'), { recursive: true });
    fs.symlinkSync(sentinel, path.join(proj, 'ai_context', 'wiki', 'SCHEMA.md'));

    const result = runInit(proj, plugin, '3.1.0');

    expect(result.scaffolded).toBe(false);
    expect(result.reason).toMatch(/^unsafe ai_context destination:/);
    expect(fs.readFileSync(sentinel, 'utf-8')).toBe('unrelated schema content');
    expect(fs.existsSync(path.join(proj, 'ai_context', '.spk-version'))).toBe(false);
    expect(fs.existsSync(path.join(proj, 'ai_context', 'sources', '.gitignore')))
      .toBe(false);
  });

  for (const segment of ['wiki', 'sources']) {
    test(`refuses a non-directory ai_context/${segment} component before writing`, () => {
      const proj = makeTmpProject();
      const plugin = makePluginRoot();
      const component = path.join(proj, 'ai_context', segment);
      fs.mkdirSync(path.join(proj, 'ai_context'), { recursive: true });
      fs.writeFileSync(component, `unrelated ${segment} file`);

      const result = runInit(proj, plugin, '3.1.0');

      expect(result.scaffolded).toBe(false);
      expect(result.reason).toMatch(/^unsafe ai_context destination:/);
      expect(fs.readFileSync(component, 'utf-8')).toBe(`unrelated ${segment} file`);
      expect(fs.existsSync(path.join(proj, 'ai_context', '.spk-version'))).toBe(false);
    });
  }

  test('Codex-standard plugin and project roots scaffold without a Claude nudge', () => {
    const proj = makeTmpProject();
    const projectOverride = makeTmpProject();
    const plugin = makePluginRoot();
    fs.mkdirSync(path.join(plugin, '.codex-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(plugin, '.codex-plugin/plugin.json'),
      JSON.stringify({ name: 'spk', version: '3.5.0' })
    );
    const result = spawnSync(process.execPath, [INIT_SCRIPT], {
      cwd: proj,
      encoding: 'utf-8',
      env: {
        ...process.env,
        SPK_PLUGIN_ROOT: '',
        SPK_PROJECT_ROOT: projectOverride,
        PLUGIN_ROOT: plugin,
        CODEX_PROJECT_DIR: proj,
        CLAUDE_PLUGIN_ROOT: plugin,
        CLAUDE_PROJECT_DIR: ''
      }
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(fs.readFileSync(path.join(proj, 'ai_context/.spk-version'), 'utf-8'))
      .toBe('3.5.0');
    expect(fs.existsSync(path.join(projectOverride, 'ai_context/.spk-version')))
      .toBe(false);
  });
});
