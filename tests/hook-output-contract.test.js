// tests/hook-output-contract.test.js
// Pins each hook's process-level contract with Claude Code:
//   - blocking PreToolUse hooks: reason on STDERR + exit 2
//     (stdout JSON is only parsed on exit 0, so a stdout reason is invisible)
//   - non-blocking PostToolUse messages for the model: hookSpecificOutput
//     .additionalContext JSON on STDOUT + exit 0
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPTS = path.join(__dirname, '..', 'plugins', 'spk', 'scripts');
const HOOKS_CONFIG = require('../plugins/spk/hooks/hooks.json');
const PLUGIN_MANIFEST = require('../plugins/spk/.claude-plugin/plugin.json');

function runHook(script, event, env = {}) {
  return spawnSync('node', [path.join(SCRIPTS, script)], {
    input: JSON.stringify(event),
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });
}

function referencesScript(hook, script) {
  return Array.isArray(hook.args) && hook.args.some(argument =>
    typeof argument === 'string' && argument.includes(script)
  );
}

describe('hook output contract', () => {
  test('installs with no user configuration', () => {
    // A required userConfig option with no default made every SessionStart hook
    // fail on a plain `/plugin install`. Hooks now launch `node` from the host
    // lookup, so nothing may reintroduce an install-time prompt.
    expect(PLUGIN_MANIFEST.userConfig).toBeUndefined();

    const payload = JSON.stringify(HOOKS_CONFIG);
    expect(payload).not.toMatch(/\$\{user_config\./);
  });

  test('every command hook declares a short positive timeout', () => {
    const commandHooks = Object.values(HOOKS_CONFIG.hooks)
      .flat()
      .flatMap(entry => entry.hooks || [])
      .filter(hook => hook.type === 'command');

    expect(commandHooks.length).toBeGreaterThan(0);
    for (const hook of commandHooks) {
      expect(Number.isInteger(hook.timeout)).toBe(true);
      expect(hook.timeout).toBeGreaterThan(0);
      expect(hook.timeout).toBeLessThanOrEqual(30);
    }
  });

  test('hook matchers cover guarded shell aliases and explicit Codex apply_patch', () => {
    const preSecretScan = HOOKS_CONFIG.hooks.PreToolUse.find(entry =>
      entry.hooks.some(hook => referencesScript(hook, 'wiki-secret-scan.cjs'))
    );
    const preGuard = HOOKS_CONFIG.hooks.PreToolUse.find(entry =>
      entry.hooks.some(hook => referencesScript(hook, 'gitignore-guard.cjs'))
    );
    const postIngest = HOOKS_CONFIG.hooks.PostToolUse.find(entry =>
      entry.hooks.some(hook => referencesScript(hook, 'auto-ingest.cjs'))
    );
    expect(preGuard.matcher.split('|')).toEqual(expect.arrayContaining([
      'Read', 'Grep', 'Glob', 'Bash', 'shell', 'exec_command'
    ]));
    expect(preSecretScan.matcher.split('|')).toEqual(expect.arrayContaining([
      'Write', 'Edit', 'apply_patch'
    ]));
    expect(postIngest.matcher.split('|')).toEqual(expect.arrayContaining([
      'Write', 'Edit', 'apply_patch'
    ]));
  });

  test('all hooks use user-only absolute-runtime exec form and work from a path with spaces', () => {
    const commandHooks = Object.values(HOOKS_CONFIG.hooks)
      .flat()
      .flatMap(entry => entry.hooks || [])
      .filter(hook => hook.type === 'command');
    for (const hook of commandHooks) {
      expect(hook.command).toBe('node');
      expect(hook.args[0]).toMatch(
        /^\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/[^/]+\.cjs$/
      );
      expect(hook.args.slice(1)).toEqual(
        hook.args.length === 1 ? [] : [expect.stringMatching(/^(?:pre|post)$/)]
      );
    }

    const plugin = fs.mkdtempSync(path.join(os.tmpdir(), 'spk plugin path '));
    fs.cpSync(SCRIPTS, path.join(plugin, 'scripts'), { recursive: true });
    const configured = HOOKS_CONFIG.hooks.PreToolUse[0].hooks[0];
    const args = configured.args.map(argument =>
      argument.replace('${CLAUDE_PLUGIN_ROOT}', plugin)
    );
    try {
      const result = spawnSync(process.execPath, args, {
        encoding: 'utf8',
        input: JSON.stringify({
          tool_name: 'Write',
          tool_input: {
            file_path: '/repo/ai_context/wiki/clean.md',
            content: 'clean'
          }
        })
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      fs.rmSync(plugin, { recursive: true, force: true });
    }
  });

  test('project PATH cannot replace the configured hook runtime', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hook-path-'));
    const fakeNode = path.join(root, process.platform === 'win32' ? 'node.exe' : 'node');
    const sentinel = path.join(root, 'fake-node-ran');
    try {
      if (process.platform !== 'win32') {
        fs.writeFileSync(fakeNode, `#!/bin/sh\nprintf poisoned > ${JSON.stringify(sentinel)}\n`);
        fs.chmodSync(fakeNode, 0o755);
      }
      const configured = HOOKS_CONFIG.hooks.PreToolUse[0].hooks[0];
      const args = configured.args.map(argument =>
        argument.replace('${CLAUDE_PLUGIN_ROOT}', path.join(__dirname, '..', 'plugins', 'spk'))
      );
      const result = spawnSync(process.execPath, args, {
        input: JSON.stringify({ tool_name: 'Write', tool_input: {} }),
        encoding: 'utf8',
        env: { ...process.env, PATH: root },
      });
      expect(result.status).toBe(0);
      expect(fs.existsSync(sentinel)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('wiki-secret-scan blocks with reason on stderr and exit 2', () => {
    const result = runHook('wiki-secret-scan.cjs', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/repo/ai_context/wiki/notes.md',
        content: 'leaked key: AKIAABCDEFGHIJKLMNOP'
      }
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/wiki-secret-scan: blocked Write/);
    expect(result.stderr).toMatch(/aws_access_key/);
    expect(result.stdout).toBe('');
  });

  test('wiki-secret-scan passes clean writes with exit 0 and no output', () => {
    const result = runHook('wiki-secret-scan.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: '/repo/ai_context/wiki/notes.md', content: 'plain notes' }
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  test('wiki-secret-scan blocks Codex apply_patch with reason on stderr and exit 2', () => {
    const result = runHook('wiki-secret-scan.cjs', {
      tool_name: 'apply_patch',
      tool_input: {
        command: [
          '*** Begin Patch',
          '*** Add File: ai_context/wiki/notes.md',
          '+leaked key: AKIAABCDEFGHIJKLMNOP',
          '*** End Patch'
        ].join('\n')
      }
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/wiki-secret-scan: blocked apply_patch/);
    expect(result.stdout).toBe('');
  });

  test('gitignore-guard blocks with reason on stderr and exit 2', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hoc-'));
    fs.writeFileSync(path.join(dir, '.gitignore'), '.env\n');
    const result = runHook('gitignore-guard.cjs', {
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, '.env') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/gitignore-guard: blocked Read/);
    expect(result.stdout).toBe('');
  });

  test('gitignore-guard blocks shell aliases while marker is active', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hoc-'));
    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ai_context/.spk-wiki-build'), '');
    const blocked = runHook('gitignore-guard.cjs', {
      tool_name: 'exec_command',
      tool_input: { cmd: 'cat .env' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toMatch(/shell execution is disabled/);

    const cleanup = runHook('gitignore-guard.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'rm -f ai_context/.spk-wiki-build' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(cleanup.status).toBe(0);
    expect(cleanup.stdout).toBe('');
  });

  test('auto-ingest surfaces new sources via additionalContext JSON on stdout', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hoc-'));
    const srcFile = path.join(dir, 'ai_context', 'sources', 'paper.md');
    fs.mkdirSync(path.dirname(srcFile), { recursive: true });
    fs.writeFileSync(srcFile, '# fresh source');
    const result = runHook('auto-ingest.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: srcFile, content: '# fresh source' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(out.hookSpecificOutput.additionalContext).toMatch(/new source detected/);
    expect(out.hookSpecificOutput.additionalContext).toMatch(/\/spk:add-knowledge/);
    expect(out.hookSpecificOutput.additionalContext).toMatch(/\$spk:add-knowledge/);
  });

  test('auto-ingest stays silent for non-source writes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hoc-'));
    const result = runHook('auto-ingest.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'README.md'), content: 'hi' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('webfetch-cache pre misses locally without opening the network', async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-hoc-'));
    const env = { CLAUDE_PROJECT_DIR: projectRoot };
    try {
      const miss = runHook('webfetch-cache.cjs', {
        tool_input: {
          url: 'https://example.com/x',
          prompt: 'summarize'
        }
      }, env);
      expect(miss.status).toBe(0);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('session-reflect Stop hook writes NOTHING to stdout (loop-proof), exit 0', () => {
    // A Stop hook re-feeds the model only via stdout decision/additionalContext.
    // session-reflect must never do that — it spawns the reflector in the
    // background instead. Kill switch keeps this from touching the repo.
    const result = runHook('session-reflect.cjs', { hook_event_name: 'Stop' }, { SPK_SESSION_REFLECT: 'off' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('malformed stdin never breaks a hook', () => {
    for (const script of ['wiki-secret-scan.cjs', 'gitignore-guard.cjs', 'auto-ingest.cjs', 'webfetch-cache.cjs']) {
      const result = spawnSync('node', [path.join(SCRIPTS, script), 'pre'], {
        input: 'not json{',
        encoding: 'utf-8'
      });
      expect(result.status).toBe(0);
    }
  });
});
