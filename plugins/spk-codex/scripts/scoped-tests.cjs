#!/usr/bin/env node
'use strict';

// Provider-neutral scoped-test planner. It never executes tests: callers receive
// argv arrays and decide which process API/tool to use. Any ambiguous relevant
// path produces a full-suite plan instead of silently narrowing coverage.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCHEMA = 'spk.scoped-tests/v1';
const JS_RE = /\.(?:[cm]?[jt]sx?)$/i;
const PY_RE = /\.py$/i;
const GO_RE = /\.go$/i;

function operatingSystemHome() {
  try {
    return os.userInfo().homedir || null;
  } catch {
    return null;
  }
}

function trustedExecutablePath() {
  const executableDir = path.dirname(process.execPath);
  const home = operatingSystemHome();
  if (process.platform === 'win32') {
    const drive = path.win32.parse(process.execPath).root || 'C:\\';
    const systemRoot = path.win32.join(drive, 'Windows');
    return [...new Set([
      executableDir,
      path.win32.join(systemRoot, 'System32'),
      systemRoot,
      home && path.win32.join(home, '.cargo', 'bin'),
      home && path.win32.join(home, 'scoop', 'shims'),
      home && path.win32.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links'),
      home && path.win32.join(home, 'AppData', 'Local', 'Programs', 'Git', 'cmd'),
      path.win32.join(drive, 'Program Files', 'Git', 'cmd'),
    ].filter(Boolean))].join(path.win32.delimiter);
  }
  return [...new Set([
    executableDir,
    home && path.join(home, '.local', 'bin'),
    home && path.join(home, '.cargo', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ].filter(Boolean))].join(path.delimiter);
}

function gitEnvironment() {
  const home = operatingSystemHome();
  const env = {
    PATH: trustedExecutablePath(),
    GIT_OPTIONAL_LOCKS: '0',
    LANG: 'C',
    LC_ALL: 'C',
  };
  if (home) {
    env.HOME = home;
    env.USERPROFILE = home;
  }
  if (process.platform === 'win32') {
    const drive = path.win32.parse(process.execPath).root || 'C:\\';
    const systemRoot = path.win32.join(drive, 'Windows');
    env.SystemRoot = systemRoot;
    env.SYSTEMROOT = systemRoot;
    env.WINDIR = systemRoot;
    env.COMSPEC = path.win32.join(systemRoot, 'System32', 'cmd.exe');
    env.PATHEXT = '.COM;.EXE;.BAT;.CMD';
    env.TEMP = os.tmpdir();
    env.TMP = os.tmpdir();
  } else {
    env.TMPDIR = os.tmpdir();
  }
  return env;
}

function scopedProjectRoot(env = process.env, cwd = process.cwd()) {
  return path.resolve(
    env.CLAUDE_PROJECT_DIR ||
    env.CODEX_PROJECT_DIR ||
    env.SPK_PROJECT_ROOT ||
    cwd
  );
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function fileContains(root, rel, pattern) {
  try {
    return pattern.test(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return false;
  }
}

function detectRunner(root) {
  const pkg = readJson(path.join(root, 'package.json'));
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  if (deps.jest || /\bjest\b/.test(pkg?.scripts?.test || '')) {
    return {
      id: 'jest',
      focused: { command: 'npx', baseArgs: ['jest', '--findRelatedTests', '--runInBand', '--'] },
      full: { command: 'npm', args: ['test', '--', '--runInBand'] },
    };
  }
  const hasPytest = exists(root, 'pytest.ini') ||
    fileContains(root, 'pyproject.toml', /\bpytest\b/i) ||
    fileContains(root, 'setup.cfg', /\bpytest\b/i) ||
    fileContains(root, 'tox.ini', /\bpytest\b/i) ||
    fileContains(root, 'requirements.txt', /(?:^|\n)\s*pytest(?:\b|[<>=])/i) ||
    fileContains(root, 'requirements-dev.txt', /(?:^|\n)\s*pytest(?:\b|[<>=])/i);
  if (hasPytest) {
    return {
      id: 'pytest',
      focused: { command: 'python', baseArgs: ['-m', 'pytest'] },
      full: { command: 'python', args: ['-m', 'pytest'] },
    };
  }
  if (exists(root, 'go.mod')) {
    return {
      id: 'go',
      focused: { command: 'go', baseArgs: ['test'] },
      full: { command: 'go', args: ['test', './...'] },
    };
  }
  if (pkg?.scripts?.test) {
    return {
      id: 'npm',
      focused: null,
      full: { command: 'npm', args: ['test'] },
    };
  }
  return null;
}

function normalizeChangedPath(root, input) {
  if (typeof input !== 'string' || input.includes('\0')) return null;
  const absolute = path.resolve(root, input);
  const rel = path.relative(root, absolute).replace(/\\/g, '/');
  if (!rel || rel === '.' || rel.startsWith('../') || path.isAbsolute(rel)) return null;
  try {
    const realRoot = fs.realpathSync(root);
    const realTarget = fs.realpathSync(absolute);
    const realRel = path.relative(realRoot, realTarget);
    if (realRel.startsWith('..') || path.isAbsolute(realRel)) return null;
  } catch {
    return null;
  }
  return rel;
}

function gitLines(root, args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: gitEnvironment(),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function changedFromGit(root) {
  const tracked = gitLines(root, [
    'diff', '--no-ext-diff', '--name-only', '--diff-filter=ACMR', 'HEAD'
  ]);
  const untracked = gitLines(root, ['ls-files', '--others', '--exclude-standard']);
  return [...new Set([...tracked, ...untracked]
    .map(file => normalizeChangedPath(root, file))
    .filter(Boolean))].sort();
}

function pytestCandidates(root, rel) {
  if (/^(?:tests?|spec)\//.test(rel) || /(?:^|\/)test_[^/]+\.py$/.test(rel) ||
      /(?:^|\/)[^/]+_test\.py$/.test(rel)) {
    return exists(root, rel) ? [rel] : [];
  }

  const parsed = path.posix.parse(rel);
  const names = [
    path.posix.join(parsed.dir, `test_${parsed.base}`),
    path.posix.join(parsed.dir, `${parsed.name}_test.py`),
    path.posix.join('tests', parsed.dir, `test_${parsed.base}`),
    path.posix.join('test', parsed.dir, `test_${parsed.base}`),
  ];
  return [...new Set(names)].filter(candidate => exists(root, candidate));
}

function classify(runner, root, rel) {
  if (runner.id === 'jest') {
    if (/(?:^|\/)(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|jest\.config\.[^/]+|babel\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json)$/i.test(rel)) {
      return { unmapped: true };
    }
    if (JS_RE.test(rel)) return { selected: [rel] };
    return { unmapped: true };
  }
  if (runner.id === 'pytest') {
    if (!PY_RE.test(rel)) return { unmapped: true };
    const selected = pytestCandidates(root, rel);
    return selected.length ? { selected } : { unmapped: true };
  }
  if (runner.id === 'go') {
    if (!GO_RE.test(rel) || /(?:^|\/)go\.(?:mod|sum)$/.test(rel)) {
      return { unmapped: true };
    }
    const dir = path.posix.dirname(rel);
    return { selected: [dir === '.' ? '.' : `./${dir}`] };
  }
  return { unmapped: true };
}

function planScopedTests(options = {}) {
  const {
    root = scopedProjectRoot(options.env || process.env, options.cwd || process.cwd()),
    changedPaths,
  } = options;
  const resolvedRoot = path.resolve(root);
  const runner = detectRunner(resolvedRoot);
  const rawChanged = changedPaths == null ? changedFromGit(resolvedRoot) : changedPaths;
  const invalid = [];
  const changed = [];

  for (const input of rawChanged || []) {
    const rel = normalizeChangedPath(resolvedRoot, input);
    if (rel) changed.push(rel);
    else invalid.push(String(input));
  }

  const uniqueChanged = [...new Set(changed)].sort();
  const base = {
    schema: SCHEMA,
    root: resolvedRoot,
    runner: runner?.id || null,
    changed: uniqueChanged,
    selected: [],
    unmapped: invalid,
  };

  if (!runner) {
    return {
      ...base,
      mode: 'blocked',
      reason: 'No supported test runner detected',
      focused: null,
      full: null,
    };
  }

  if (!uniqueChanged.length) {
    return {
      ...base,
      mode: 'full',
      reason: 'No changed paths were supplied or discovered',
      focused: null,
      full: runner.full,
    };
  }

  const selected = [];
  const unmapped = [...invalid];
  for (const rel of uniqueChanged) {
    const result = classify(runner, resolvedRoot, rel);
    if (result.unmapped) unmapped.push(rel);
    else selected.push(...result.selected);
  }

  const uniqueSelected = [...new Set(selected)].sort();
  if (!runner.focused || unmapped.length || !uniqueSelected.length) {
    return {
      ...base,
      selected: uniqueSelected,
      unmapped: [...new Set(unmapped)].sort(),
      mode: 'full',
      reason: !runner.focused
        ? `${runner.id} has no safe generic focused-test mapping`
        : 'At least one changed path could not be mapped confidently',
      focused: null,
      full: runner.full,
    };
  }

  return {
    ...base,
    selected: uniqueSelected,
    unmapped: [],
    mode: 'scoped',
    reason: 'Every changed path mapped confidently',
    focused: {
      command: runner.focused.command,
      args: [...runner.focused.baseArgs, ...uniqueSelected],
    },
    full: runner.full,
  };
}

function parseCli(argv, env = process.env, cwd = process.cwd()) {
  let root = scopedProjectRoot(env, cwd);
  const changedPaths = [];
  let afterSeparator = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!afterSeparator && arg === '--root') {
      root = argv[++i];
    } else if (!afterSeparator && arg === '--') {
      afterSeparator = true;
    } else if (afterSeparator || !arg.startsWith('--')) {
      changedPaths.push(arg);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return { root, changedPaths: changedPaths.length ? changedPaths : undefined };
}

function main() {
  try {
    const options = parseCli(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(planScopedTests(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  SCHEMA,
  changedFromGit,
  detectRunner,
  normalizeChangedPath,
  parseCli,
  planScopedTests,
  gitEnvironment,
  scopedProjectRoot,
  trustedExecutablePath,
};
