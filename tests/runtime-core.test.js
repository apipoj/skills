const fs = require('fs');
const os = require('os');
const path = require('path');

const runtime = require('../plugins/spk/scripts/runtime-core.cjs');

describe('SPK runtime core', () => {
  test('parses explicit feature flags without changing unknown values', () => {
    expect(runtime.parseBooleanFlag('on', false)).toBe(true);
    expect(runtime.parseBooleanFlag('OFF', true)).toBe(false);
    expect(runtime.parseBooleanFlag('surprise', true)).toBe(true);
  });

  test('normalizes paths and rejects traversal outside the project root', () => {
    const root = path.join(os.tmpdir(), 'spk-root');
    expect(runtime.normalizeRepoPath('ai_context/wiki/a.md', root)).toEqual(expect.objectContaining({
      relative: 'ai_context/wiki/a.md',
      insideRoot: true,
    }));
    expect(runtime.normalizeRepoPath('../outside.txt', root).insideRoot).toBe(false);
  });

  test('bounds text with explicit truncation metadata', () => {
    expect(runtime.boundedText('abc', 3)).toEqual({
      text: 'abc',
      truncated: false,
      originalLength: 3,
    });
    expect(runtime.boundedText('abcdef', 3)).toEqual(expect.objectContaining({
      truncated: true,
      originalLength: 6,
    }));
  });

  test('writes atomically and serializes locks', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-runtime-'));
    try {
      const output = path.join(root, 'nested', 'value.txt');
      runtime.atomicWrite(output, 'safe');
      expect(fs.readFileSync(output, 'utf8')).toBe('safe');

      const lockPath = path.join(root, '.lock');
      const first = runtime.acquireLock(lockPath);
      const second = runtime.acquireLock(lockPath);
      expect(first.acquired).toBe(true);
      expect(first.token).toMatch(/^[0-9a-f]{32}$/);
      expect(second.acquired).toBe(false);
      first.release();
      const third = runtime.acquireLock(lockPath);
      expect(third.acquired).toBe(true);
      third.release();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('does not reclaim a stale-looking lock owned by a live local PID', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-runtime-lock-'));
    try {
      const lockPath = path.join(root, '.lock');
      const first = runtime.acquireLock(lockPath, { staleMs: 1 });
      const old = (Date.now() - 60_000) / 1000;
      fs.utimesSync(lockPath, old, old);
      expect(runtime.acquireLock(lockPath, { staleMs: 1 }).acquired).toBe(false);
      first.release();
      expect(fs.existsSync(lockPath)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a stale owner cannot release a replacement owner lock', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-runtime-lock-'));
    try {
      const lockPath = path.join(root, '.lock');
      const staleOwner = runtime.acquireLock(lockPath, { staleMs: 1 });
      const staleRecord = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      staleRecord.pid = 2_147_483_647;
      fs.writeFileSync(lockPath, JSON.stringify(staleRecord));
      const old = (Date.now() - 60_000) / 1000;
      fs.utimesSync(lockPath, old, old);

      const replacement = runtime.acquireLock(lockPath, { staleMs: 1 });
      expect(replacement.acquired).toBe(true);
      expect(replacement.token).not.toBe(staleOwner.token);

      staleOwner.release();
      expect(JSON.parse(fs.readFileSync(lockPath, 'utf8')).token)
        .toBe(replacement.token);
      expect(runtime.acquireLock(lockPath, { staleMs: 1 }).acquired).toBe(false);

      replacement.release();
      expect(fs.existsSync(lockPath)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('validates configuration while reflection environment flags can only veto', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-config-'));
    try {
      fs.mkdirSync(path.join(root, 'ai_context'), { recursive: true });
      fs.writeFileSync(path.join(root, runtime.CONFIG_PATH), JSON.stringify({
        version: 1,
        features: { sessionReflection: false },
        limits: { maxReflectionChars: 5000 },
      }));
      const loaded = runtime.loadConfig(root, {
        SPK_PROJECT_ROOT: root,
        SPK_SESSION_REFLECT: 'on',
      });
      expect(loaded.errors).toEqual([]);
      expect(loaded.config.features.sessionReflection).toBe(false);
      expect(loaded.config.limits.maxReflectionChars).toBe(5000);

      fs.writeFileSync(path.join(root, runtime.CONFIG_PATH), JSON.stringify({
        version: 1,
        features: { sessionReflection: true },
      }));
      expect(runtime.loadConfig(root, {
        SPK_PROJECT_ROOT: root,
        SPK_SESSION_REFLECT: 'off',
      }).config.features.sessionReflection).toBe(false);

      expect(runtime.validateConfig({ version: 1, surprise: true })).toEqual({
        valid: false,
        errors: ['unknown top-level key "surprise"'],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('host roots outrank project-controlled SPK compatibility variables', () => {
    const cwd = path.join(os.tmpdir(), 'spk-cwd');
    const claudeProject = path.join(os.tmpdir(), 'claude-project');
    const codexProject = path.join(os.tmpdir(), 'codex-project');
    const claudePlugin = path.join(os.tmpdir(), 'claude-plugin');
    const legacyProject = path.join(os.tmpdir(), 'redirected-project');
    const legacyPlugin = path.join(os.tmpdir(), 'redirected-plugin');

    expect(runtime.projectRoot({
      CLAUDE_PROJECT_DIR: claudeProject,
      CODEX_PROJECT_DIR: codexProject,
      SPK_PROJECT_ROOT: legacyProject,
    }, cwd)).toBe(path.resolve(claudeProject));
    expect(runtime.projectRoot({
      CODEX_PROJECT_DIR: codexProject,
      SPK_PROJECT_ROOT: legacyProject,
    }, cwd)).toBe(path.resolve(codexProject));
    expect(runtime.pluginRoot({
      CLAUDE_PLUGIN_ROOT: claudePlugin,
      SPK_PLUGIN_ROOT: legacyPlugin,
    })).toBe(path.resolve(claudePlugin));
  });

  test('normalizes Claude and Codex hook events', () => {
    expect(runtime.normalizeHookEvent({ tool_name: 'Write', tool_input: { file_path: 'x' } }))
      .toEqual(expect.objectContaining({ host: 'claude', tool: 'write' }));
    expect(runtime.normalizeHookEvent({ tool_name: 'apply_patch', tool_input: { command: 'patch' } }))
      .toEqual(expect.objectContaining({ host: 'codex', tool: 'apply_patch' }));
  });
});
