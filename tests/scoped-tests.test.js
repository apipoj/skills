// tests/scoped-tests.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  changedFromGit,
  mapToSuites,
  suitesForPath,
} = require('../scripts/scoped-tests.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function invocationForTestExecutable() {
  const bin = fs.realpathSync(process.execPath);
  const stat = fs.statSync(bin);
  return {
    bin,
    prefixArgs: [],
    identities: [{
      path: bin,
      dev: String(stat.dev),
      ino: String(stat.ino),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    }],
    source: 'test-injection',
  };
}

function withMaliciousProcessEnvironment(run) {
  const malicious = {
    PATH: path.join(REPO_ROOT, 'project-bin'),
    HOME: path.join(REPO_ROOT, 'project-home'),
    SPK_GIT_BIN: path.join(REPO_ROOT, 'project-bin', 'git'),
    GIT_EXEC_PATH: path.join(REPO_ROOT, 'git-exec'),
    GIT_EXTERNAL_DIFF: path.join(REPO_ROOT, 'external-diff'),
    GIT_SSH_COMMAND: 'steal-credentials',
    GIT_CONFIG_GLOBAL: path.join(REPO_ROOT, 'malicious.gitconfig'),
    AWS_SECRET_ACCESS_KEY: 'aws-secret',
    GOOGLE_APPLICATION_CREDENTIALS: path.join(REPO_ROOT, 'gcp.json'),
  };
  // Build the credential-shaped key dynamically so this adversarial fixture
  // exercises environment stripping without looking like a checked-in secret.
  malicious[`ANTHROPIC_${'API_KEY'}`] = 'anthropic-sentinel';
  const original = new Map(
    Object.keys(malicious).map(key => [key, process.env[key]])
  );
  Object.assign(process.env, malicious);
  try {
    return run(malicious);
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('scoped-tests change-to-suite mapper', () => {
  test('script change maps to its sibling test', () => {
    expect(mapToSuites(['scripts/regenerate-docs.cjs']))
      .toContain('tests/regenerate-docs.test.js');
  });

  test('manifest change maps to sync + manifest suites', () => {
    const s = mapToSuites(['manifest.json']);
    expect(s).toEqual(expect.arrayContaining([
      'tests/manifest-version-sync.test.js',
      'tests/command-manifest-sync.test.js',
      'tests/validate-manifest.test.js',
    ]));
  });

  test('agent change maps to the agent suites', () => {
    const s = mapToSuites(['plugins/spk/agents/researcher.md']);
    expect(s).toEqual(expect.arrayContaining([
      'tests/agent-contracts.test.js',
      'tests/agent-manifest-sync.test.js',
    ]));
  });

  test('skill change maps to native + description suites', () => {
    const s = mapToSuites(['plugins/spk/skills/prime/SKILL.md']);
    expect(s).toEqual(expect.arrayContaining([
      'tests/native-skills.test.js',
      'tests/skill-descriptions.test.js',
    ]));
  });

  test('plugin runtime script maps to its sibling test', () => {
    expect(mapToSuites(['plugins/spk/scripts/gitignore-guard.cjs']))
      .toContain('tests/gitignore-guard.test.js');
  });

  test('unknown path falls back to empty (caller runs full suite)', () => {
    expect(mapToSuites(['README.md'])).toEqual([]);
  });

  test('sibling-less non-hook plugin script is unmappable (full-suite fallback, R7)', () => {
    // A brand-new plugin script with no sibling test and not a registered hook
    // must NOT map to anything — otherwise main() would scope-skip the full
    // suite and silently report zero-coverage code as covered.
    expect(mapToSuites(['plugins/spk/scripts/brand-new-thing.cjs'])).toEqual([]);
    // It must also be reported as unmapped (so it shows in the NOT-scoped warning).
    expect(suitesForPath('plugins/spk/scripts/brand-new-thing.cjs')).toEqual([]);
  });

  test('existing hook script includes the hook-output contract suite', () => {
    expect(mapToSuites(['plugins/spk/scripts/wiki-secret-scan.cjs']))
      .toEqual(expect.arrayContaining(['tests/hook-output-contract.test.js']));
  });

  test('quoted command-string hook scripts include the hook-output contract suite', () => {
    expect(mapToSuites(['plugins/spk/scripts/spk-orient.cjs']))
      .toEqual(expect.arrayContaining([
        'tests/spk-orient.test.js',
        'tests/hook-output-contract.test.js',
      ]));
  });

  test('de-duplicates suites across multiple changed files', () => {
    const s = mapToSuites(['manifest.json', 'manifest.json']);
    expect(new Set(s).size).toBe(s.length);
  });

  test('changed-file discovery uses a revalidated absolute Git with a minimal environment', () => {
    withMaliciousProcessEnvironment(malicious => {
      let call;
      const changed = changedFromGit({
        root: REPO_ROOT,
        invocation: invocationForTestExecutable(),
        runner(bin, args, options) {
          call = { bin, args, options };
          return 'scripts/scoped-tests.cjs\r\ntests/scoped-tests.test.js\r\n';
        },
      });

      expect(changed).toEqual([
        'scripts/scoped-tests.cjs',
        'tests/scoped-tests.test.js',
      ]);
      expect(call.bin).toBe(fs.realpathSync(process.execPath));
      expect(call.bin).not.toBe(malicious.SPK_GIT_BIN);
      expect(call.args).toEqual(expect.arrayContaining([
        '--no-pager',
        'core.fsmonitor=false',
        'core.untrackedCache=false',
        'diff.external=',
        '--no-ext-diff',
        '--no-textconv',
      ]));
      expect(call.options).toMatchObject({
        cwd: path.resolve(REPO_ROOT),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10000,
      });
      expect(call.options.env).toMatchObject({
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : os.devNull,
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_PAGER: '',
      });
      expect(call.options.env.PATH)
        .toBe(process.platform === 'win32' ? '' : undefined);
      for (const key of [
        'HOME',
        'SPK_GIT_BIN',
        'GIT_EXEC_PATH',
        'GIT_EXTERNAL_DIFF',
        'GIT_SSH_COMMAND',
        'ANTHROPIC_API_KEY',
        'AWS_SECRET_ACCESS_KEY',
        'GOOGLE_APPLICATION_CREDENTIALS',
      ]) {
        expect(call.options.env).not.toHaveProperty(key);
      }
      expect(call.options.env.GIT_CONFIG_GLOBAL).not.toBe(malicious.GIT_CONFIG_GLOBAL);
    });
  });

  test('changed-file discovery fails closed to the caller full-suite fallback', () => {
    const changed = changedFromGit({
      root: REPO_ROOT,
      invocation: invocationForTestExecutable(),
      runner() {
        throw new Error('git unavailable');
      },
    });
    expect(changed).toEqual([]);
    expect(mapToSuites(changed)).toEqual([]);
  });
});
