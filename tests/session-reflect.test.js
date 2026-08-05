// tests/session-reflect.test.js
// The self-improving session-reflect Stop hook, redesigned (v3.4.0) on the
// coleam00/helpline pattern: the Stop hook (session-reflect.cjs) does cheap
// deterministic detection + dedup and spawns the reflector
// (session-reflect-run.cjs) in the BACKGROUND, which calls headless `claude -p`
// and writes ai_context/session-reflect-review.md when explicitly enabled.
//
// Loop-proof contract: the hook writes NOTHING to stdout (no decision / no
// additionalContext), so it can never re-feed the model or trip the
// "blocked the turn from ending N times" loop. Guards: recursion lock, dedup
// fingerprint after success, opt-in consent, serialized runs, secret redaction,
// and deterministic fallback when `claude` is absent.
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK = path.join(__dirname, '..', 'plugins', 'spk', 'scripts', 'session-reflect.cjs');
const reflector = require('../plugins/spk/scripts/session-reflect-run.cjs');
const hook = require('../plugins/spk/scripts/session-reflect.cjs');
const consent = require('../plugins/spk/scripts/session-reflect-consent.cjs');

// A claude bin that does not exist -> runClaude fails -> deterministic fallback.
// Guarantees tests never make a real `claude -p` call.
const NO_CLAUDE = path.join(os.tmpdir(), 'spk-no-such-claude-binary');
const consentRoots = new Map();
let trustedTestNodeRoot;
let trustedTestNode;

beforeAll(() => {
  trustedTestNodeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-test-node-'));
  trustedTestNode = path.join(
    trustedTestNodeRoot,
    process.platform === 'win32' ? 'node.exe' : 'node',
  );
  fs.copyFileSync(fs.realpathSync(process.execPath), trustedTestNode);
  if (process.platform !== 'win32') fs.chmodSync(trustedTestNode, 0o755);
});

afterAll(() => {
  fs.rmSync(trustedTestNodeRoot, { recursive: true, force: true });
});

afterEach(() => {
  for (const root of consentRoots.values()) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  consentRoots.clear();
});

function consentOptions(project) {
  if (!consentRoots.has(project)) {
    const consentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-consent-'));
    consent.enableConsent(project, { consentRoot });
    consentRoots.set(project, consentRoot);
  }
  return { consentRoot: consentRoots.get(project) };
}

function gitInitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init');
  g('config', 'user.email', 't@t.t');
  g('config', 'user.name', 't');
  g('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Root\n');
  fs.mkdirSync(path.join(dir, 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pkg', 'AGENTS.md'), '# pkg area\n');
  fs.writeFileSync(path.join(dir, 'pkg', 'a.js'), 'const a = 1;\n');
  g('add', '-A');
  g('commit', '-m', 'init');
  return dir;
}

function touch(dir, rel, body) {
  fs.writeFileSync(path.join(dir, rel), body);
}

function createFakeClaude(dir, runSource, name = 'fake-claude.cjs') {
  const script = path.join(dir, name);
  fs.writeFileSync(script, [
    "const args = process.argv.slice(2);",
    "if (args.includes('--help')) {",
    "  process.stdout.write('--safe-mode\\n--tools\\n--no-session-persistence\\n');",
    '  process.exit(0);',
    '}',
    runSource,
  ].join('\n'));
  return {
    // Keep the test double independent from host-managed Node toolcache modes
    // and ownership. Production still validates its resolved executable.
    bin: trustedTestNode,
    prefixArgs: [script],
  };
}

function runHook(event, env = {}) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(event || { hook_event_name: 'Stop' }),
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });
}

describe('session-reflect-run.cjs (reflector)', () => {
  test('host project roots outrank project-controlled generic root variables', () => {
    const trusted = gitInitRepo();
    const redirected = gitInitRepo();
    try {
      expect(reflector.projectRoot({
        CLAUDE_PROJECT_DIR: trusted,
        SPK_PROJECT_ROOT: redirected,
        REPO_ROOT: redirected,
      })).toBe(path.resolve(trusted));
      expect(reflector.projectRoot({
        CODEX_PROJECT_DIR: trusted,
        SPK_PROJECT_ROOT: redirected,
      })).toBe(path.resolve(trusted));
    } finally {
      fs.rmSync(trusted, { recursive: true, force: true });
      fs.rmSync(redirected, { recursive: true, force: true });
    }
  });

  test('agentsAreas finds every AGENTS.md dir incl. root', () => {
    const dir = gitInitRepo();
    try {
      const areas = reflector.agentsAreas(dir);
      expect(areas.has('.')).toBe(true);
      expect(areas.has('pkg')).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('areaOf maps a changed file to its nearest AGENTS.md area', () => {
    const areas = new Set(['.', 'pkg']);
    expect(reflector.areaOf('pkg/a.js', areas)).toBe('pkg');
    expect(reflector.areaOf('root-file.js', areas)).toBe('.');
  });

  test('reflection guidance names both Claude and Codex skill syntax', () => {
    const dir = gitInitRepo();
    try {
      const prompt = reflector.buildPrompt(dir, { pkg: 1 }, 'diff');
      const fallback = reflector.deterministicNote(
        dir,
        { pkg: 1 },
        '2026-01-01T00:00:00Z'
      );
      for (const text of [prompt, fallback]) {
        expect(text).toContain('/spk:prime');
        expect(text).toContain('$spk:prime');
        expect(text).toContain('/spk:ingest');
        expect(text).toContain('$spk:ingest');
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('touchedAreas counts changed files per area', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 2;\n');
      const counts = reflector.touchedAreas(dir);
      expect(counts.pkg).toBe(1);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  (process.platform === 'win32' ? test.skip : test)(
    'git operations ignore a project-prepended PATH executable',
    () => {
      const dir = gitInitRepo();
      const binDir = path.join(dir, 'bin');
      const marker = path.join(dir, 'fake-git-ran');
      const helperMarker = path.join(dir, 'git-helper-ran');
      const fakeGit = path.join(binDir, 'git');
      const helper = path.join(binDir, 'git-helper');
      const priorPath = process.env.PATH;
      try {
        fs.mkdirSync(binDir);
        fs.writeFileSync(fakeGit, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 1\n`);
        fs.writeFileSync(
          helper,
          `#!/bin/sh\ntouch ${JSON.stringify(helperMarker)}\nexit 0\n`
        );
        fs.chmodSync(fakeGit, 0o755);
        fs.chmodSync(helper, 0o755);
        execFileSync('git', ['config', 'core.fsmonitor', helper], {
          cwd: dir,
          stdio: 'ignore',
        });
        execFileSync('git', ['config', 'diff.external', helper], {
          cwd: dir,
          stdio: 'ignore',
        });
        process.env.PATH = `${binDir}${path.delimiter}${priorPath || ''}`;
        touch(dir, 'pkg/a.js', 'const a = 2;\n');
        expect(reflector.touchedAreas(dir)).toMatchObject({ pkg: 1 });
        expect(reflector.scopedDiff(dir, { pkg: 1 })).toContain('const a = 2');
        expect(fs.existsSync(marker)).toBe(false);
        expect(fs.existsSync(helperMarker)).toBe(false);
      } finally {
        if (priorPath === undefined) delete process.env.PATH;
        else process.env.PATH = priorPath;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  test('trusted executable resolution rejects candidates inside the project', () => {
    const dir = gitInitRepo();
    const holder = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-cli-candidate-'));
    const fake = path.join(dir, process.platform === 'win32' ? 'claude.exe' : 'claude');
    try {
      fs.copyFileSync(process.execPath, fake);
      if (process.platform !== 'win32') fs.chmodSync(fake, 0o755);
      expect(reflector.resolveTrustedExecutable('claude', dir, {
        candidates: [fake],
      })).toBeNull();
      if (process.platform !== 'win32') {
        const alias = path.join(holder, 'claude');
        fs.symlinkSync(fake, alias);
        expect(reflector.resolveTrustedExecutable('claude', dir, {
          candidates: [alias],
        })).toBeNull();
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(holder, { recursive: true, force: true });
    }
  });

  test('minimal git environment carries neither PATH nor provider credentials', () => {
    const dir = gitInitRepo();
    try {
      const env = reflector.minimalGitEnvironment(dir);
      expect(env.PATH).toBe(process.platform === 'win32' ? '' : undefined);
      expect(env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
      expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
      expect(env.GIT_CONFIG_NOSYSTEM).toBe('1');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('scopedDiff includes UNTRACKED new files, not just tracked changes', () => {
    // Regression: `git diff HEAD` omits untracked files, so a session that only
    // ADDS files would show an empty diff and never reach claude. The diff must
    // include new files' contents.
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/newfile.js', 'const POOLED_ONLY = true;\n');
      const diff = reflector.scopedDiff(dir, { pkg: 1 });
      expect(diff).toMatch(/pkg\/newfile\.js/);
      expect(diff).toMatch(/POOLED_ONLY/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('untracked collection skips symlinks, binary files, and oversized files', () => {
    const dir = gitInitRepo();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-outside-'));
    try {
      fs.writeFileSync(path.join(outside, 'secret.txt'), 'DO_NOT_EXFILTRATE\n');
      if (process.platform !== 'win32') {
        fs.symlinkSync(
          path.join(outside, 'secret.txt'),
          path.join(dir, 'pkg', 'linked.txt')
        );
      }
      fs.writeFileSync(
        path.join(dir, 'pkg', 'binary.dat'),
        Buffer.concat([
          Buffer.from('BINARY_PREFIX'),
          Buffer.from([0x01, 0x02, 0x03]),
          Buffer.from('BINARY_SECRET'),
        ])
      );
      fs.writeFileSync(
        path.join(dir, 'pkg', 'oversized.txt'),
        Buffer.alloc(reflector.MAX_UNTRACKED_FILE_BYTES + 1, 'X')
      );

      const diff = reflector.scopedDiff(dir, { pkg: 3 }, 1024 * 1024);
      if (process.platform !== 'win32') expect(diff).not.toContain('DO_NOT_EXFILTRATE');
      expect(diff).not.toContain('BINARY_PREFIX');
      expect(diff).not.toContain('oversized.txt');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('untracked collection enforces an aggregate byte cap', () => {
    const dir = gitInitRepo();
    try {
      const perFile = 60 * 1024;
      for (let index = 0; index < 5; index += 1) {
        fs.writeFileSync(
          path.join(dir, 'pkg', `aggregate-${index}.txt`),
          `MARKER_${index}\n${'A'.repeat(perFile - 10)}`
        );
      }
      const diff = reflector.scopedDiff(dir, { pkg: 5 }, 1024 * 1024);
      expect(diff).toContain('MARKER_0');
      expect(diff).toContain('MARKER_3');
      expect(diff).not.toContain('MARKER_4');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  (process.platform === 'win32' ? test.skip : test)(
    'untracked collection skips FIFOs without blocking',
    () => {
      const dir = gitInitRepo();
      try {
        execFileSync('mkfifo', [path.join(dir, 'pkg', 'named-pipe')]);
        const diff = reflector.scopedDiff(dir, { pkg: 1 });
        expect(diff).not.toContain('named-pipe');
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  );

  test('writes a deterministic fallback review when claude is unavailable', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 99;\n');
      const code = reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on'
      }, {
        ...consentOptions(dir),
        claudeInvocation: { bin: NO_CLAUDE, prefixArgs: [] },
      });
      expect(code).toBe(0);
      const review = fs.readFileSync(path.join(dir, reflector.REVIEW_FILE), 'utf-8');
      expect(review).toMatch(/Session reflect/);
      expect(review).toMatch(/deterministic fallback/);
      expect(review).toMatch(/pkg/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('pins the reflection model to the fixed reflection default', () => {
    // Regression: an unpinned `claude -p` inherits the user's session default —
    // a background drift check could silently run on Opus. The invocation must
    // always carry an explicit --model.
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-args-'));
    const argsOut = path.join(out, 'args.json');
    const stdinOut = path.join(out, 'stdin.txt');
    const fake = createFakeClaude(out, [
      `require('fs').writeFileSync(${JSON.stringify(argsOut)}, JSON.stringify(args));`,
      "let input=''; process.stdin.on('data', c => { input += c; });",
      "process.stdin.on('end', () => {",
      `  require('fs').writeFileSync(${JSON.stringify(stdinOut)}, input);`,
      "process.stdout.write('REFLECTION BODY');"
      + '});'
    ].join('\n'));
    const baseEnv = {
      CLAUDE_PROJECT_DIR: dir,
      SPK_SESSION_REFLECT: 'on',
      PATH: process.env.PATH
    };
    try {
      touch(dir, 'pkg/a.js', 'const a = 7;\n');
      expect(reflector.reflect(baseEnv, {
        ...consentOptions(dir),
        claudeInvocation: fake,
      })).toBe(0);
      expect(JSON.parse(fs.readFileSync(argsOut, 'utf-8')))
        .toEqual([
          '-p',
          '--model', reflector.DEFAULT_REFLECT_MODEL,
          '--output-format', 'text',
          '--safe-mode',
          '--tools', '',
          '--no-session-persistence',
        ]);
      expect(reflector.DEFAULT_REFLECT_MODEL).toBe('claude-sonnet-5');
      const review = fs.readFileSync(path.join(dir, reflector.REVIEW_FILE), 'utf-8');
      expect(review).toMatch(/REFLECTION BODY/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('recursion lock: reflector no-ops and writes nothing', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 5;\n');
      const code = reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        [reflector.LOCK_ENV]: '1'
      }, { claudeInvocation: { bin: NO_CLAUDE, prefixArgs: [] } });
      expect(code).toBe(0);
      expect(fs.existsSync(path.join(dir, reflector.REVIEW_FILE))).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('no touched AGENTS.md area: reflector writes nothing', () => {
    const dir = gitInitRepo();
    try {
      const code = reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on'
      }, {
        ...consentOptions(dir),
        claudeInvocation: { bin: NO_CLAUDE, prefixArgs: [] },
      });
      expect(code).toBe(0);
      expect(fs.existsSync(path.join(dir, reflector.REVIEW_FILE))).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('redacts detected secrets before submitting the prompt', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-redact-'));
    const stdinOut = path.join(out, 'stdin.txt');
    const fake = createFakeClaude(out, [
      "let input=''; process.stdin.on('data', c => { input += c; });",
      "process.stdin.on('end', () => {",
      `require('fs').writeFileSync(${JSON.stringify(stdinOut)}, input);`,
      "process.stdout.write('SAFE REFLECTION');",
      '});'
    ].join('\n'));
    try {
      touch(dir, 'pkg/a.js', "const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';\n");
      expect(reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        PATH: process.env.PATH
      }, { ...consentOptions(dir), claudeInvocation: fake })).toBe(0);
      const submitted = fs.readFileSync(stdinOut, 'utf-8');
      expect(submitted).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789');
      expect(submitted).toContain('<REDACTED:github_pat>');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('tracked project config can disable or tune but can never grant consent', () => {
    const dir = gitInitRepo();
    try {
      fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'ai_context/spk.config.json'), JSON.stringify({
        version: 1,
        features: { sessionReflection: true },
        limits: { maxReflectionChars: 1000 }
      }));
      expect(reflector.reflectionEnabled({ CLAUDE_PROJECT_DIR: dir })).toBe(false);
      const localConsent = consentOptions(dir);
      expect(reflector.reflectionEnabled({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        SPK_REFLECT_CONSENT_ROOT: localConsent.consentRoot,
      })).toBe(false);
      expect(reflector.reflectionEnabled(
        { CLAUDE_PROJECT_DIR: dir },
        localConsent
      )).toBe(true);
      expect(reflector.reflectionEnabled(
        { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'on' },
        localConsent
      )).toBe(true);
      expect(reflector.reflectionEnabled(
        { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'off' },
        localConsent
      )).toBe(false);
      expect(reflector.reflectionEnabled(
        { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'malformed' },
        localConsent
      )).toBe(false);

      fs.writeFileSync(path.join(dir, 'ai_context/spk.config.json'), JSON.stringify({
        version: 1,
        features: { sessionReflection: false }
      }));
      expect(reflector.reflectionEnabled({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on'
      }, localConsent)).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('tracked project opt-in cannot launch the outbound reflector', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-no-project-consent-'));
    const invoked = path.join(out, 'invoked');
    const fake = createFakeClaude(out, [
      `require('fs').writeFileSync(${JSON.stringify(invoked)}, 'yes');`,
      "process.stdout.write('SHOULD NOT RUN');",
    ].join('\n'));
    try {
      fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'ai_context/spk.config.json'), JSON.stringify({
        version: 1,
        features: { sessionReflection: true }
      }));
      touch(dir, 'pkg/a.js', 'const a = 41;\n');
      expect(reflector.reflect(
        {
          CLAUDE_PROJECT_DIR: dir,
          SPK_SESSION_REFLECT: 'on',
          PATH: process.env.PATH,
        },
        { claudeInvocation: fake }
      ))
        .toBe(0);
      expect(fs.existsSync(invoked)).toBe(false);
      expect(fs.existsSync(path.join(dir, reflector.REVIEW_FILE))).toBe(false);
      expect(fs.existsSync(path.join(dir, reflector.RUN_LOCK_FILE))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('sanitizes complete input and output before truncation boundaries', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-boundary-'));
    const stdinOut = path.join(out, 'stdin.txt');
    const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
    const fake = createFakeClaude(out, [
      "let input=''; process.stdin.on('data', c => { input += c; });",
      "process.stdin.on('end', () => {",
      `require('fs').writeFileSync(${JSON.stringify(stdinOut)}, input);`,
      `process.stdout.write('O'.repeat(990) + ${JSON.stringify(token)});`,
      '});'
    ].join('\n'));
    try {
      fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'ai_context/spk.config.json'), JSON.stringify({
        version: 1,
        limits: { maxReflectionChars: 1000 }
      }));
      const result = reflector.runClaude(
        'I'.repeat(990) + token,
        dir,
        { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'on', PATH: process.env.PATH },
        fake
      );
      const submitted = fs.readFileSync(stdinOut, 'utf8');
      expect(submitted).not.toContain(token);
      expect(submitted).not.toContain('ghp_');
      expect(submitted).toContain('<REDACTED:');
      expect(result).not.toContain(token);
      expect(result).not.toContain('ghp_');
      expect(result).toContain('<REDACTED:');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('redacts the complete diff before applying its intermediate bound', () => {
    const dir = gitInitRepo();
    const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
    const limit = 1000;
    try {
      let padding = 1100;
      touch(dir, 'pkg/a.js', `${'I'.repeat(padding)}${token}\n`);
      let rawDiff = execFileSync(
        'git', ['diff', 'HEAD', '--', 'pkg'], { cwd: dir, encoding: 'utf8' }
      );
      padding += (limit - 5) - rawDiff.indexOf(token);
      touch(dir, 'pkg/a.js', `${'I'.repeat(padding)}${token}\n`);
      rawDiff = execFileSync(
        'git', ['diff', 'HEAD', '--', 'pkg'], { cwd: dir, encoding: 'utf8' }
      );
      expect(rawDiff.indexOf(token)).toBe(limit - 5);

      const bounded = reflector.scopedDiff(dir, { pkg: 1 }, limit);
      expect(bounded).not.toContain(token);
      expect(bounded).not.toContain('ghp_');
      expect(bounded).toContain('<REDA');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('uses a neutral cwd, no-tools isolation flags, and an allowlisted child environment', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-isolation-'));
    const capture = path.join(out, 'capture.json');
    const fake = createFakeClaude(out, [
      "let input=''; process.stdin.on('data', c => { input += c; });",
      "process.stdin.on('end', () => {",
      `require('fs').writeFileSync(${JSON.stringify(capture)}, JSON.stringify({`,
      '  args, cwd: process.cwd(), env: process.env, input',
      '}));',
      "process.stdout.write('ISOLATED');",
      '});'
    ].join('\n'));
    try {
      const result = reflector.runClaude('safe prompt', dir, {
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: path.join(dir, 'project-controlled-tmp'),
        TEMP: path.join(dir, 'project-controlled-temp'),
        TMP: path.join(dir, 'project-controlled-tmp-win'),
        NODE_OPTIONS: '--require=/project/attacker.cjs',
        MALICIOUS_PROJECT_SECRET: 'must-not-reach-child',
        ANTHROPIC_API_KEY: 'sk-ant-test-value-that-must-not-reach-a-test-override',
      }, fake);
      expect(result).toBe('ISOLATED');
      const observed = JSON.parse(fs.readFileSync(capture, 'utf8'));
      expect(observed.cwd).not.toBe(dir);
      expect(
        observed.cwd.startsWith(os.tmpdir()) ||
        observed.cwd.startsWith(fs.realpathSync(os.tmpdir()))
      ).toBe(true);
      expect(fs.existsSync(observed.cwd)).toBe(false);
      expect(observed.args).toEqual(expect.arrayContaining([
        '--safe-mode', '--tools', '', '--no-session-persistence'
      ]));
      expect(observed.env.NODE_OPTIONS).toBeUndefined();
      expect(observed.env.MALICIOUS_PROJECT_SECRET).toBeUndefined();
      expect(observed.env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(observed.env.PATH).toBe(process.platform === 'win32' ? '' : undefined);
      expect(observed.env[reflector.LOCK_ENV]).toBe('1');
      expect(observed.env.TMPDIR).toBe(observed.env.TEMP);
      expect(observed.env.TMPDIR).toBe(observed.env.TMP);
      expect(path.basename(observed.env.TMPDIR)).toBe(path.basename(observed.cwd));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  test('falls back without invoking reflection when required isolation flags are unsupported', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-old-cli-'));
    const invoked = path.join(out, 'invoked');
    const script = path.join(out, 'old-claude.cjs');
    fs.writeFileSync(script, [
      "const args = process.argv.slice(2);",
      "if (args.includes('--help')) { process.stdout.write('--tools\\n'); process.exit(0); }",
      `require('fs').writeFileSync(${JSON.stringify(invoked)}, 'yes');`,
      "process.stdout.write('UNSAFE');",
    ].join('\n'));
    try {
      touch(dir, 'pkg/a.js', 'const a = 42;\n');
      expect(reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        PATH: process.env.PATH,
      }, {
        ...consentOptions(dir),
        claudeInvocation: { bin: process.execPath, prefixArgs: [script] }
      })).toBe(0);
      expect(fs.existsSync(invoked)).toBe(false);
      expect(fs.readFileSync(path.join(dir, reflector.REVIEW_FILE), 'utf8'))
        .toMatch(/deterministic fallback/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  (process.platform === 'win32' ? test.skip : test.each([
    reflector.REVIEW_FILE,
    reflector.STATE_FILE,
    reflector.RUN_LOCK_FILE,
  ]))('rejects an escaping symlink before writing %s', relativeFile => {
    const dir = gitInitRepo();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-write-escape-'));
    try {
      fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
      const outsideTarget = path.join(outside, path.basename(relativeFile));
      fs.writeFileSync(outsideTarget, 'UNCHANGED');
      fs.symlinkSync(outsideTarget, path.join(dir, relativeFile));
      touch(dir, 'pkg/a.js', 'const a = 43;\n');
      expect(reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on'
      }, consentOptions(dir))).toBe(0);
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('UNCHANGED');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  (process.platform === 'win32' ? test.skip : test)(
    'rejects an ai_context directory symlink that escapes the project',
    () => {
      const dir = gitInitRepo();
      const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-context-escape-'));
      try {
        fs.symlinkSync(outside, path.join(dir, 'ai_context'));
        touch(dir, 'pkg/a.js', 'const a = 44;\n');
        expect(reflector.reflect({
          CLAUDE_PROJECT_DIR: dir,
          SPK_SESSION_REFLECT: 'on'
        }, consentOptions(dir))).toBe(0);
        expect(fs.readdirSync(outside)).toEqual([]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
      }
    }
  );

  test('serializes concurrent reflector runs with an atomic lock', () => {
    const dir = gitInitRepo();
    try {
      const first = reflector.acquireRunLock(dir);
      expect(first).not.toBeNull();
      expect(reflector.acquireRunLock(dir)).toBeNull();
      reflector.releaseRunLock(first);
      const next = reflector.acquireRunLock(dir);
      expect(next).not.toBeNull();
      reflector.releaseRunLock(next);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('records dedup state only after a completed LLM or fallback review', () => {
    const dir = gitInitRepo();
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-success-'));
    const fake = createFakeClaude(out, 'process.stdout.write("OK");');
    const fingerprint = 'a'.repeat(64);
    try {
      touch(dir, 'pkg/a.js', 'const a = 10;\n');
      expect(reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        [reflector.FINGERPRINT_ENV]: fingerprint,
        PATH: process.env.PATH
      }, { ...consentOptions(dir), claudeInvocation: fake })).toBe(0);
      expect(fs.readFileSync(path.join(dir, reflector.STATE_FILE), 'utf-8')).toBe(fingerprint);

      fs.unlinkSync(path.join(dir, reflector.STATE_FILE));
      touch(dir, 'pkg/a.js', 'const a = 11;\n');
      expect(reflector.reflect({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
        [reflector.FINGERPRINT_ENV]: 'b'.repeat(64)
      }, {
        ...consentOptions(dir),
        claudeInvocation: { bin: NO_CLAUDE, prefixArgs: [] },
      })).toBe(0);
      expect(fs.readFileSync(path.join(dir, reflector.STATE_FILE), 'utf-8'))
        .toBe('b'.repeat(64));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('session-reflect.cjs (Stop hook trigger)', () => {
  test('background runner receives only allowlisted environment and control values', () => {
    const fingerprint = 'f'.repeat(64);
    const env = hook.runnerEnvironment('/project', {
      PATH: process.env.PATH,
      HOME: '/project/project-controlled-home',
      USERPROFILE: 'C:\\project\\project-controlled-home',
      NODE_OPTIONS: '--require=/project/attacker.cjs',
      PROJECT_SECRET: 'do-not-forward',
      ANTHROPIC_API_KEY: 'sk-ant-user-owned-auth-value',
      AWS_SECRET_ACCESS_KEY: 'must-not-cross-provider-boundary',
      SPK_REFLECT_CLAUDE_BIN: '/project/attacker',
      SPK_REFLECT_CLAUDE_ARGS: '--steal-secrets',
      SPK_REFLECT_RUNNER: '/project/attacker-runner.cjs',
      SPK_REFLECT_CONSENT_ROOT: '/project/consents',
    }, fingerprint);
    expect(env.PATH).toBe(process.platform === 'win32' ? '' : undefined);
    expect(env[hook.BOUND_ROOT_ENV]).toBe('/project');
    expect(env.SPK_PROJECT_ROOT).toBeUndefined();
    expect(env.SPK_SESSION_REFLECT).toBeUndefined();
    expect(env[hook.FINGERPRINT_ENV]).toBe(fingerprint);
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.NODE_OPTIONS).toBeUndefined();
    expect(env.PROJECT_SECRET).toBeUndefined();
    expect(env.SPK_REFLECT_CLAUDE_BIN).toBeUndefined();
    expect(env.SPK_REFLECT_CLAUDE_ARGS).toBeUndefined();
    expect(env.SPK_REFLECT_RUNNER).toBeUndefined();
    expect(env.SPK_REFLECT_CONSENT_ROOT).toBeUndefined();
    if (process.platform === 'win32') {
      expect(env.USERPROFILE).toBe(reflector.operatingSystemHome());
    } else {
      expect(env.HOME).toBe(reflector.operatingSystemHome());
    }
  });

  test('LOOP-PROOF: hook never writes to stdout, exit 0', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 3;\n');
      const r = runHook({ hook_event_name: 'Stop' }, { CLAUDE_PROJECT_DIR: dir });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe(''); // no decision / no additionalContext -> no re-feed -> no loop
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('kill switch SPK_SESSION_REFLECT=off: no spawn, no state', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 4;\n');
      const code = hook.propose(
        { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'off' },
        consentOptions(dir)
      );
      expect(code).toBe(0);
      expect(fs.existsSync(path.join(dir, hook.STATE_FILE))).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('environment truth cannot grant consent; stored consent works when unset', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 4;\n');
      expect(hook.reflectDecision({
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on',
      })).toMatchObject({ act: false, reason: 'consent-required' });
      expect(hook.propose({ CLAUDE_PROJECT_DIR: dir })).toBe(0);
      expect(fs.existsSync(path.join(dir, hook.STATE_FILE))).toBe(false);

      expect(hook.reflectDecision(
        { CLAUDE_PROJECT_DIR: dir },
        consentOptions(dir)
      ).act).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('recursion lock: hook no-ops, no state written', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 6;\n');
      const code = hook.propose({ CLAUDE_PROJECT_DIR: dir, [hook.LOCK_ENV]: '1' });
      expect(code).toBe(0);
      expect(fs.existsSync(path.join(dir, hook.STATE_FILE))).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('no changes: hook no-ops, no state written', () => {
    const dir = gitInitRepo();
    try {
      const code = hook.propose(
        { CLAUDE_PROJECT_DIR: dir },
        consentOptions(dir)
      );
      expect(code).toBe(0);
      expect(fs.existsSync(path.join(dir, hook.STATE_FILE))).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('dedup decision: act on a new diff, skip when fingerprint already seen', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 7;\n');
      const env = { CLAUDE_PROJECT_DIR: dir, SPK_SESSION_REFLECT: 'on' };
      const options = consentOptions(dir);

      const d1 = hook.reflectDecision(env, options);
      expect(d1.act).toBe(true);
      expect(d1.fingerprint).toMatch(/^[0-9a-f]{64}$/);

      // Simulate a prior reflection of this exact diff.
      fs.mkdirSync(path.dirname(path.join(dir, hook.STATE_FILE)), { recursive: true });
      fs.writeFileSync(path.join(dir, hook.STATE_FILE), d1.fingerprint);

      const d2 = hook.reflectDecision(env, options);
      expect(d2.act).toBe(false);
      expect(d2.reason).toBe('dedup');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('trigger does not record dedup before the background runner succeeds', () => {
    const dir = gitInitRepo();
    try {
      touch(dir, 'pkg/a.js', 'const a = 8;\n');
      const env = {
        CLAUDE_PROJECT_DIR: dir,
        SPK_SESSION_REFLECT: 'on'
      };

      const options = {
        ...consentOptions(dir),
        spawnReflector: () => true,
      };
      expect(hook.propose(env, options)).toBe(0);
      const state = path.join(dir, hook.STATE_FILE);
      expect(fs.existsSync(state)).toBe(false);
      expect(hook.reflectDecision(env, options).act).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('malformed stdin never breaks the hook', () => {
    const r = spawnSync('node', [HOOK], { input: 'not json{', encoding: 'utf-8',
      env: { ...process.env, SPK_SESSION_REFLECT: 'off' } });
    expect(r.status).toBe(0);
  });
});
