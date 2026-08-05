// scripts/session-reflect-run.cjs
// The REFLECTOR — the reasoning half of the self-improving Stop hook, modeled on
// coleam00/helpline's reflect_claude_md.py but adapted to SPK (Node/CJS, keyed
// on SPK's canonical AGENTS.md instead of CLAUDE.md).
//
// session-reflect.cjs (the hook) does the cheap, deterministic part: notice that
// an AGENTS.md-governed area changed, dedup, and spawn THIS file in the
// background. This file does the slow part: gather the session's diff + the
// AGENTS.md of every area that changed, ask headless `claude -p` whether those
// conventions still hold (and whether the session produced a reusable learning),
// and write the proposal to ai_context/session-reflect-review.md.
//
// Two safety properties carried over from the reference:
//   * Recursion guard — the headless `claude` it spawns fires its OWN Stop hook,
//     which would spawn another reflection forever. The child is launched with
//     SPK_REFLECT_LOCK=1; both this file and the hook no-op when it is set.
//   * Graceful fallback — if the `claude` CLI is missing or the call fails, it
//     writes a deterministic "re-check these files" note instead, so drift is
//     still flagged without the model.
//
// Runnable directly for a synchronous reflection (what the tests use):
//   node plugins/spk/scripts/session-reflect-run.cjs

const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextDecoder } = require('util');
const { execFileSync, spawnSync } = require('child_process');
const { scanForSecrets, SECRET_PATTERNS } = require('./secret-scanner.cjs');
const consent = require('./session-reflect-consent.cjs');
const runtime = require('./runtime-core.cjs');

const LOCK_ENV = 'SPK_REFLECT_LOCK';
const FINGERPRINT_ENV = 'SPK_REFLECT_FINGERPRINT';
const BOUND_ROOT_ENV = 'SPK_REFLECT_BOUND_ROOT';
const REVIEW_FILE = path.join('ai_context', 'session-reflect-review.md');
const STATE_FILE = path.join('ai_context', '.session-reflect-state');
const RUN_LOCK_FILE = path.join('ai_context', '.session-reflect.lock');
const RUN_LOCK_TTL_MS = 5 * 60 * 1000;
const MAX_DIFF_CHARS = 12000;
const MAX_UNTRACKED_FILE_BYTES = 64 * 1024;
const MAX_UNTRACKED_TOTAL_BYTES = 256 * 1024;
const CLAUDE_TIMEOUT_MS = 180000;
const CLAUDE_HELP_TIMEOUT_MS = 10000;
const REQUIRED_CLAUDE_FLAGS = Object.freeze([
  '--safe-mode',
  '--tools',
  '--no-session-persistence',
]);
const CHILD_ENV_ALLOWLIST = Object.freeze([
  'LANG', 'LC_ALL', 'LC_CTYPE',
]);
const EXCLUDE = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage',
  '.venv', 'venv', 'env', '__pycache__'
]);

function projectRoot(env) {
  env = env || process.env;
  // Host-owned project variables outrank the private bound-root handoff.
  // Generic SPK_PROJECT_ROOT/REPO_ROOT values are intentionally ignored here:
  // repository settings must not redirect reflection into another checkout.
  const candidate = env.CLAUDE_PROJECT_DIR || env.CODEX_PROJECT_DIR ||
    env[BOUND_ROOT_ENV] || process.cwd();
  return path.resolve(candidate);
}

function isContainedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function operatingSystemHome() {
  const home = os.userInfo().homedir;
  if (!home || !path.isAbsolute(home)) return null;
  try {
    return fs.realpathSync(home);
  } catch {
    return null;
  }
}

function derivedWindowsEnvironment(root) {
  if (process.platform !== 'win32') return {};
  const home = operatingSystemHome();
  if (!home) return {};
  try {
    const systemRoot = fs.realpathSync(
      path.join(path.parse(home).root, 'Windows')
    );
    if (root && isContainedPath(fs.realpathSync(root), systemRoot)) return {};
    return {
      SystemRoot: systemRoot,
      SYSTEMROOT: systemRoot,
      WINDIR: systemRoot,
    };
  } catch {
    return {};
  }
}

function fixedExecutableCandidates(kind) {
  const home = operatingSystemHome();
  const candidates = [];
  const add = value => {
    if (value && path.isAbsolute(value) && !candidates.includes(value)) candidates.push(value);
  };

  if (process.platform === 'win32') {
    const drive = home ? path.parse(home).root : 'C:\\';
    if (kind === 'git') {
      add(path.join(drive, 'Program Files', 'Git', 'cmd', 'git.exe'));
      add(path.join(drive, 'Program Files', 'Git', 'bin', 'git.exe'));
      add(path.join(drive, 'Program Files (x86)', 'Git', 'cmd', 'git.exe'));
      if (home) add(path.join(home, 'AppData', 'Local', 'Programs', 'Git', 'cmd', 'git.exe'));
    } else if (kind === 'claude') {
      if (home) {
        add(path.join(home, '.local', 'bin', 'claude.exe'));
        add(path.join(home, '.claude', 'local', 'claude.exe'));
        add(path.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'claude.exe'));
      }
    }
  } else if (kind === 'git') {
    add('/usr/bin/git');
    add('/bin/git');
    add('/opt/homebrew/bin/git');
    add('/usr/local/bin/git');
  } else if (kind === 'claude') {
    if (home) {
      add(path.join(home, '.local', 'bin', 'claude'));
      add(path.join(home, '.claude', 'local', 'claude'));
    }
    add('/opt/homebrew/bin/claude');
    add('/usr/local/bin/claude');
    add('/usr/bin/claude');
    add('/snap/bin/claude');
  }
  return candidates;
}

function trustedFileIdentity(realFile) {
  const stat = fs.statSync(realFile);
  return {
    path: realFile,
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function validateExternalFile(candidate, root, options = {}) {
  if (
    typeof candidate !== 'string' ||
    !path.isAbsolute(candidate) ||
    candidate.includes('\0')
  ) return null;
  let realRoot, realFile, stat;
  try {
    realRoot = fs.realpathSync(root);
    const lexicalRoot = path.resolve(root);
    const lexical = path.resolve(candidate);
    realFile = fs.realpathSync(lexical);
    stat = fs.statSync(realFile);
    if (!stat.isFile()) return null;
    if (
      isContainedPath(lexicalRoot, lexical) ||
      isContainedPath(realRoot, lexical) ||
      isContainedPath(realRoot, realFile)
    ) return null;
    if (process.platform !== 'win32') {
      const user = os.userInfo();
      if (stat.uid !== 0 && Number.isInteger(user.uid) && stat.uid !== user.uid) return null;
      if ((stat.mode & 0o022) !== 0) return null;
      if (options.executable) fs.accessSync(realFile, fs.constants.X_OK);
    } else if (options.executable && path.extname(realFile).toLowerCase() !== '.exe') {
      return null;
    }
  } catch {
    return null;
  }
  return { path: realFile, identity: trustedFileIdentity(realFile) };
}

function invocationForCandidate(candidate, root) {
  const executable = validateExternalFile(candidate, root, { executable: true });
  if (!executable) return null;
  let prefix = Buffer.alloc(0);
  try {
    const descriptor = fs.openSync(executable.path, 'r');
    try {
      prefix = Buffer.alloc(160);
      prefix = prefix.subarray(0, fs.readSync(descriptor, prefix, 0, prefix.length, 0));
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return null;
  }
  const firstLine = prefix.toString('utf8').split(/\r?\n/, 1)[0];
  if (/^#!.*\bnode(?:\.exe)?\b/i.test(firstLine)) {
    const node = validateExternalFile(fs.realpathSync(process.execPath), root, {
      executable: true,
    });
    if (!node) return null;
    return {
      bin: node.path,
      prefixArgs: [executable.path],
      identities: [node.identity, executable.identity],
      source: 'fixed-candidate',
    };
  }
  return {
    bin: executable.path,
    prefixArgs: [],
    identities: [executable.identity],
    source: 'fixed-candidate',
  };
}

function resolveTrustedExecutable(kind, root, options = {}) {
  const candidates = options.candidates || fixedExecutableCandidates(kind);
  for (const candidate of candidates) {
    const invocation = invocationForCandidate(candidate, root);
    if (invocation) return invocation;
  }
  return null;
}

function revalidateInvocation(invocation, root) {
  if (!invocation || !Array.isArray(invocation.identities)) return false;
  let realRoot;
  try {
    realRoot = fs.realpathSync(root);
    for (const expected of invocation.identities) {
      const realFile = fs.realpathSync(expected.path);
      if (realFile !== expected.path || isContainedPath(realRoot, realFile)) return false;
      const current = trustedFileIdentity(realFile);
      if (
        current.dev !== expected.dev ||
        current.ino !== expected.ino ||
        current.size !== expected.size ||
        current.mtimeMs !== expected.mtimeMs
      ) return false;
    }
  } catch {
    return false;
  }
  return true;
}

function minimalGitEnvironment(root) {
  const env = {
    LANG: 'C',
    LC_ALL: 'C',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : os.devNull,
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: '',
  };
  if (process.platform === 'win32') {
    // Node restores the parent PATH for Windows children when PATH is absent.
    // An explicit empty value keeps project-controlled executables out while
    // absolute Git/Node invocations continue to work.
    env.PATH = '';
    const home = operatingSystemHome();
    if (home) {
      const systemRoot = path.join(path.parse(home).root, 'Windows');
      try {
        const realSystemRoot = fs.realpathSync(systemRoot);
        if (!isContainedPath(fs.realpathSync(root), realSystemRoot)) {
          env.SystemRoot = realSystemRoot;
          env.SYSTEMROOT = realSystemRoot;
        }
      } catch { /* absolute git may still run without it */ }
    }
  }
  return env;
}

function resolveSafeAiContext(root, options = {}) {
  let realRoot;
  try {
    realRoot = fs.realpathSync(root);
  } catch {
    return null;
  }

  const aiContext = path.join(root, 'ai_context');
  let stat;
  try {
    stat = fs.lstatSync(aiContext);
  } catch (error) {
    if (error.code !== 'ENOENT' || !options.create) {
      return error.code === 'ENOENT' ? { path: aiContext, exists: false, realRoot } : null;
    }
    try {
      fs.mkdirSync(aiContext);
      stat = fs.lstatSync(aiContext);
    } catch {
      return null;
    }
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return null;

  let realAiContext;
  try {
    realAiContext = fs.realpathSync(aiContext);
  } catch {
    return null;
  }
  if (!isContainedPath(realRoot, realAiContext)) return null;
  return { path: aiContext, exists: true, realRoot, realAiContext };
}

// Resolve a plugin-owned ai_context artifact without following an escaping
// directory/file symlink. Call immediately before each write.
function safeAiContextTarget(root, relativeFile, options = {}) {
  const normalized = relativeFile.replace(/\\/g, '/');
  if (!normalized.startsWith('ai_context/') || normalized.includes('/../')) return null;

  const context = resolveSafeAiContext(root, options);
  if (!context) return null;
  const target = path.resolve(root, relativeFile);
  if (!isContainedPath(path.resolve(root, 'ai_context'), target)) return null;

  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    const realTarget = fs.realpathSync(target);
    if (!isContainedPath(context.realAiContext, realTarget)) return null;
  } catch (error) {
    if (error.code !== 'ENOENT') return null;
  }
  return target;
}

function git(args, root, timeout = 10000) {
  const invocation = resolveTrustedExecutable('git', root);
  if (!invocation || !revalidateInvocation(invocation, root)) return '';
  try {
    return execFileSync(invocation.bin, [
      ...invocation.prefixArgs,
      '--no-pager',
      '-c', 'core.fsmonitor=false',
      ...args,
    ], {
      cwd: root,
      encoding: 'utf-8',
      timeout,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: minimalGitEnvironment(root),
    });
  } catch {
    return '';
  }
}

// session-reflect's OWN generated files (posix). They live under ai_context/ as
// untracked files; if counted as "changes" they would map to the root area and
// shift the diff fingerprint every run — a feedback loop that breaks dedup and
// makes the hook reflect on its own output. Always excluded.
const SELF_ARTIFACTS = new Set([
  REVIEW_FILE.replace(/\\/g, '/'),
  STATE_FILE.replace(/\\/g, '/'),
  RUN_LOCK_FILE.replace(/\\/g, '/')
]);
function isSelfArtifact(p) {
  return SELF_ARTIFACTS.has(p.replace(/\\/g, '/'));
}

// Working-tree changed paths (posix), best-effort, excluding our own artifacts.
function changedPaths(root) {
  // Ask Git for individual untracked files. Its default directory collapsing
  // would report "ai_context/" for our lock/review files and defeat the exact
  // self-artifact exclusions below.
  return git(['status', '--porcelain', '--untracked-files=all'], root)
    .split('\n')
    .filter(l => l.length > 3)
    .map(l => l.slice(3).trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter(p => !isSelfArtifact(p));
}

// Every directory that carries its own AGENTS.md (the areas the hierarchy
// governs), repo-root included as '.'. Layout-agnostic — works in any repo.
function agentsAreas(root) {
  const areas = new Set();
  (function walk(dir, rel) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some(e => e.isFile() && e.name === 'AGENTS.md')) areas.add(rel || '.');
    for (const e of entries) {
      if (e.isDirectory() && !EXCLUDE.has(e.name)) {
        walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
      }
    }
  })(root, '');
  return areas;
}

// Nearest AGENTS.md-governed directory containing a changed file ('.' = root).
function areaOf(changed, areas) {
  const parts = changed.split('/');
  for (let depth = parts.length - 1; depth >= 1; depth--) {
    const candidate = parts.slice(0, depth).join('/');
    if (areas.has(candidate)) return candidate;
  }
  return areas.has('.') ? '.' : null;
}

// Map touched AGENTS.md areas -> count of files changed.
function touchedAreas(root) {
  const governed = agentsAreas(root);
  const counts = {};
  for (const p of changedPaths(root)) {
    const area = areaOf(p, governed);
    if (area) counts[area] = (counts[area] || 0) + 1;
  }
  return counts;
}

// Untracked files (new this session), scoped to the touched areas.
function untrackedFiles(root, targets) {
  return git(['ls-files', '--others', '--exclude-standard', '--', ...targets], root)
    .split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean)
    .filter(p => !isSelfArtifact(p));
}

function isLikelyBinary(buffer) {
  if (!Buffer.isBuffer(buffer)) return true;
  for (const byte of buffer) {
    // Permit ordinary text whitespace only. NUL, C0 controls, and DEL are a
    // stronger signal than UTF-8 validity alone (many binary formats contain
    // long ASCII runs and no NUL in their first block).
    if ((byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) ||
        byte === 0x7f) return true;
  }
  return false;
}

function readSafeUntrackedFile(root, relativeFile, remainingBytes) {
  if (!Number.isInteger(remainingBytes) || remainingBytes <= 0) return null;
  const normalized = runtime.normalizeRepoPath(relativeFile, root);
  if (!normalized || !normalized.insideRoot || normalized.relative === '') return null;

  let stat;
  try {
    stat = fs.lstatSync(normalized.absolute);
  } catch {
    return null;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return null;
  if (stat.size > MAX_UNTRACKED_FILE_BYTES || stat.size > remainingBytes) return null;

  let realRoot, realFile;
  try {
    realRoot = fs.realpathSync(root);
    // This containment check intentionally sits immediately before open/read.
    realFile = fs.realpathSync(normalized.absolute);
  } catch {
    return null;
  }
  if (!isContainedPath(realRoot, realFile)) return null;

  let descriptor;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    const nonBlock = fs.constants.O_NONBLOCK || 0;
    descriptor = fs.openSync(realFile, fs.constants.O_RDONLY | noFollow | nonBlock);
    const openedStat = fs.fstatSync(descriptor);
    if (!openedStat.isFile()) return null;
    if (
      openedStat.size > MAX_UNTRACKED_FILE_BYTES ||
      openedStat.size > remainingBytes
    ) return null;

    const buffer = Buffer.alloc(openedStat.size);
    const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
    const content = buffer.subarray(0, bytesRead);
    if (isLikelyBinary(content)) return null;
    try {
      return {
        bytes: bytesRead,
        text: new TextDecoder('utf-8', { fatal: true }).decode(content),
      };
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* already closed */ }
    }
  }
}

// The working-tree change set to reflect on. `git diff HEAD` only covers TRACKED
// changes, so untracked new files (common in SPK work) are appended as synthetic
// added-file blocks — otherwise a session that only adds files would show an
// empty diff and always fall back to the deterministic note.
function scopedDiff(root, areas, maxChars = MAX_DIFF_CHARS) {
  const targets = Object.keys(areas).map(a => (a === '.' ? '.' : a));
  let diff = git([
    'diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--', ...targets
  ], root);
  let untrackedBytes = 0;
  for (const f of untrackedFiles(root, targets)) {
    const remaining = MAX_UNTRACKED_TOTAL_BYTES - untrackedBytes;
    const safeFile = readSafeUntrackedFile(root, f, remaining);
    if (!safeFile) continue;
    untrackedBytes += safeFile.bytes;
    const added = safeFile.text.split('\n').map(l => '+' + l).join('\n');
    diff += `\n--- /dev/null\n+++ b/${f}\n${added}\n`;
  }
  // This is an intermediate bound before the complete prompt is assembled.
  // Redact first here as well: otherwise a token crossing this boundary could
  // be reduced to an undetectable-but-sensitive prefix before safePrompt sees it.
  const bounded = runtime.boundedText(redactSecrets(diff), maxChars);
  return bounded.truncated
    ? bounded.text.replace('... (truncated by SPK)', '... (diff truncated for the reflection)')
    : bounded.text;
}

function buildPrompt(root, areas, diff) {
  const blocks = Object.keys(areas).sort().map(area => {
    const file = path.join(root, area === '.' ? '' : area, 'AGENTS.md');
    let content;
    try { content = fs.readFileSync(file, 'utf-8'); }
    catch { content = '(this area has no AGENTS.md yet)'; }
    return `### ${area}/AGENTS.md\n\n${content}`;
  });
  return `You are auditing whether a codebase's AGENTS.md files still match reality \
after a coding session. AGENTS.md is the canonical instruction file an AI coding \
agent loads for that part of the repo (CLAUDE.md just points at it).

Below is the git diff of the session's uncommitted changes, then the current \
AGENTS.md for every area that changed.

For EACH area, output exactly one of:
- \`No change needed\` — the AGENTS.md still holds; or
- a concrete proposed edit: the specific line(s) to add, change, or remove, plus \
one sentence on why. Apply it with the load-project skill (\`/spk:load-project <area>\` in \
Claude Code or \`$spk:load-project <area>\` in Codex).

Then, separately, under a \`## Learnings\` heading, note any reusable decision, \
gotcha, or pattern this session produced that is worth capturing as a wiki \
learning via the add-knowledge skill (\`/spk:add-knowledge\` in Claude Code or \`$spk:add-knowledge\` in \
Codex) — or write \`No learnings\` if none.

Only propose updates for genuine new conventions, gotchas, commands, or \
constraints the AGENTS.md does not yet capture. No stylistic rewrites. Be terse. \
Respond in plain text; do not use tools.

## Git diff (uncommitted work this session)

\`\`\`diff
${diff}
\`\`\`

## Current AGENTS.md file(s)

${blocks.join('\n\n')}
`;
}

// Reflection is an unsupervised background job, so the model is pinned rather
// than inherited from the user's session default (which could silently spend
// Opus on a drift check). Sonnet-tier is the right ceiling for this workload.
const DEFAULT_REFLECT_MODEL = 'claude-sonnet-5';

function projectReflectionPolicy(root) {
  const config = path.join(root, 'ai_context', 'spk.config.json');
  if (!fs.existsSync(config)) return { disabled: false, source: 'absent' };
  const safeConfig = safeAiContextTarget(root, path.join('ai_context', 'spk.config.json'));
  if (!safeConfig) return { disabled: true, source: 'unsafe-project-config' };
  try {
    const raw = JSON.parse(fs.readFileSync(safeConfig, 'utf8'));
    return {
      disabled: raw?.features?.sessionReflection === false,
      source: 'project-config',
    };
  } catch {
    return { disabled: true, source: 'invalid-project-config' };
  }
}

function environmentPermitsReflection(env) {
  env = env || process.env;
  if (!Object.prototype.hasOwnProperty.call(env, 'SPK_SESSION_REFLECT')) return true;
  // Truthy only permits consulting the user-owned store. It never grants.
  // False, empty, or malformed values fail closed as a local kill switch.
  return runtime.parseBooleanFlag(env.SPK_SESSION_REFLECT, null) === true;
}

function reflectionAuthorization(env, options = {}) {
  env = env || process.env;
  const requestedRoot = projectRoot(env);
  if (!environmentPermitsReflection(env)) {
    return { enabled: false, reason: 'environment-disabled', requestedRoot };
  }
  const policy = projectReflectionPolicy(requestedRoot);
  if (policy.disabled) {
    return { enabled: false, reason: 'project-disabled', requestedRoot, policy };
  }
  const status = consent.consentStatus(requestedRoot, {
    consentRoot: options.consentRoot,
  });
  if (!status.enabled) {
    return {
      enabled: false,
      reason: status.reason === 'missing' ? 'consent-required' : status.reason,
      requestedRoot,
      consent: status,
    };
  }
  return {
    enabled: true,
    reason: 'authorized',
    requestedRoot,
    realProjectRoot: status.realProjectRoot,
    consent: status,
    policy,
  };
}

function reflectionEnabled(env, options = {}) {
  return reflectionAuthorization(env, options).enabled;
}

function redactSecrets(content) {
  let redacted = String(content || '');
  for (const { type, re } of SECRET_PATTERNS) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    redacted = redacted.replace(new RegExp(re.source, flags), `<REDACTED:${type}>`);
  }
  return redacted;
}

function safePrompt(prompt) {
  const redacted = redactSecrets(prompt);
  return scanForSecrets(redacted).length === 0 ? redacted : null;
}

function allowlistedChildEnvironment(env, additions = {}, options = {}) {
  const child = {};
  for (const key of CHILD_ENV_ALLOWLIST) {
    if (env[key] !== undefined && !String(env[key]).includes('\0')) {
      child[key] = String(env[key]);
    }
  }
  const home = operatingSystemHome();
  if (home) {
    if (process.platform === 'win32') child.USERPROFILE = home;
    else child.HOME = home;
  }
  if (process.platform === 'win32') child.PATH = '';
  Object.assign(child, derivedWindowsEnvironment(options.projectRoot));
  for (const [key, value] of Object.entries(additions)) {
    if (value !== undefined && !String(value).includes('\0')) child[key] = String(value);
  }
  return child;
}

function normalizeClaudeInvocation(candidate, root) {
  const invocation = candidate;
  if (
    !invocation ||
    typeof invocation.bin !== 'string' ||
    !path.isAbsolute(invocation.bin) ||
    !Array.isArray(invocation.prefixArgs) ||
    invocation.prefixArgs.length > 8 ||
    invocation.prefixArgs.some(argument =>
      typeof argument !== 'string' || argument.includes('\0'))
  ) return null;
  const executable = validateExternalFile(invocation.bin, root, { executable: true });
  if (!executable) return null;
  const identities = [executable.identity];
  const prefixArgs = [];
  for (const argument of invocation.prefixArgs) {
    if (path.isAbsolute(argument)) {
      const artifact = validateExternalFile(argument, root);
      if (!artifact) return null;
      identities.push(artifact.identity);
      prefixArgs.push(artifact.path);
    } else {
      prefixArgs.push(argument);
    }
  }
  return {
    bin: executable.path,
    prefixArgs,
    identities,
    source: 'direct-test-override',
  };
}

function supportsRequiredClaudeFlags(invocation, root, cwd, env) {
  if (!revalidateInvocation(invocation, root)) return false;
  let help;
  try {
    help = spawnSync(invocation.bin, [...invocation.prefixArgs, '--help'], {
      cwd,
      encoding: 'utf8',
      timeout: CLAUDE_HELP_TIMEOUT_MS,
      env,
      windowsHide: true,
    });
  } catch {
    return false;
  }
  if (help.error || help.status !== 0) return false;
  const output = `${help.stdout || ''}\n${help.stderr || ''}`;
  return REQUIRED_CLAUDE_FLAGS.every(flag => output.includes(flag));
}

// Call headless `claude -p`. Returns the reflection text, or null on failure.
function runClaude(prompt, root, env, invocationOverride) {
  env = env || process.env;
  const limit = runtime.loadConfig(root, {}).config.limits.maxReflectionChars;
  // Sanitize the complete value before bounding. Bounding first can split a
  // secret token and leak its unmatched prefix across the truncation boundary.
  const fullySanitized = safePrompt(prompt);
  if (fullySanitized === null) return null;
  const sanitized = runtime.boundedText(fullySanitized, limit).text;
  // Production always resolves the normal `claude` executable. The explicit
  // argv override is dependency injection for cross-platform tests; it is not
  // read from project or process environment.
  const invocation = invocationOverride
    ? normalizeClaudeInvocation(invocationOverride, root)
    : resolveTrustedExecutable('claude', root);
  if (!invocation) return null;
  let neutralCwd;
  let result;
  try {
    neutralCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-reflect-claude-'));
    const realRoot = fs.realpathSync(root);
    const realNeutralCwd = fs.realpathSync(neutralCwd);
    if (isContainedPath(realRoot, realNeutralCwd)) return null;
    const neutral = {
      [LOCK_ENV]: '1',
      TMPDIR: neutralCwd,
      TEMP: neutralCwd,
      TMP: neutralCwd,
    };
    const probeEnv = allowlistedChildEnvironment(env, neutral, {
      projectRoot: root,
    });
    if (!probeEnv ||
        !supportsRequiredClaudeFlags(invocation, root, neutralCwd, probeEnv)) return null;
    const childEnv = allowlistedChildEnvironment(env, neutral, {
      projectRoot: root,
    });
    if (!childEnv || !revalidateInvocation(invocation, root)) return null;
    result = spawnSync(invocation.bin, [
      ...invocation.prefixArgs,
      '-p',
      '--model', DEFAULT_REFLECT_MODEL,
      '--output-format', 'text',
      '--safe-mode',
      '--tools', '',
      '--no-session-persistence',
    ], {
      cwd: neutralCwd,
      input: sanitized,
      encoding: 'utf-8',
      timeout: CLAUDE_TIMEOUT_MS,
      env: childEnv,
      windowsHide: true,
    });
  } catch {
    return null;
  } finally {
    if (neutralCwd) {
      try { fs.rmSync(neutralCwd, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
  if (result.error || result.status !== 0) return null;
  const output = (result.stdout || '').trim();
  if (!output) return null;
  const safeOutput = safePrompt(output);
  return safeOutput === null ? null : runtime.boundedText(safeOutput, limit).text;
}

function acquireRunLock(root, now = Date.now()) {
  const file = safeAiContextTarget(root, RUN_LOCK_FILE, { create: true });
  if (!file) return null;
  const lock = runtime.acquireLock(file, { staleMs: RUN_LOCK_TTL_MS });
  return lock.acquired ? { file, root, release: lock.release, startedAt: now } : null;
}

function releaseRunLock(lock) {
  if (!lock) return;
  if (safeAiContextTarget(lock.root, RUN_LOCK_FILE) !== lock.file) return;
  lock.release();
}

function recordSuccessfulFingerprint(root, env) {
  const fingerprint = String((env || process.env)[FINGERPRINT_ENV] || '');
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) return true;
  const state = safeAiContextTarget(root, STATE_FILE, { create: true });
  if (!state) return false;
  try {
    runtime.atomicWrite(state, fingerprint);
    return true;
  } catch (exc) {
    process.stderr.write(`[session-reflect] could not write ${STATE_FILE}: ${exc}\n`);
    return false;
  }
}

function deterministicNote(root, areas, stamp) {
  const lines = [
    `# Session reflect — ${stamp}`,
    '',
    '_`claude` CLI unavailable — deterministic fallback. The areas below changed ' +
      'this session; re-check their AGENTS.md with the load-project skill ' +
      '(`/spk:load-project` in Claude Code or `$spk:load-project` in Codex) and capture any learning ' +
      'with the add-knowledge skill (`/spk:add-knowledge` or `$spk:add-knowledge`)._',
    ''
  ];
  for (const area of Object.keys(areas).sort()) {
    const file = path.join(root, area === '.' ? '' : area, 'AGENTS.md');
    const count = areas[area];
    if (fs.existsSync(file)) {
      lines.push(`- **${area}** (${count} file(s)) — re-read \`${area}/AGENTS.md\`: do its conventions still hold?`);
    } else {
      lines.push(`- **${area}** (${count} file(s)) — no \`${area}/AGENTS.md\` exists; consider the load-project skill for ${area}.`);
    }
  }
  return lines.join('\n') + '\n';
}

function reflect(env, options = {}) {
  env = env || process.env;
  // Recursion guard: if we are already inside a reflection-spawned `claude`, do
  // nothing — this is what stops the Stop hook from looping forever.
  if (env[LOCK_ENV]) return 0;

  const authorization = reflectionAuthorization(env, options);
  if (!authorization.enabled) return 0;
  const root = authorization.realProjectRoot;
  const reviewTarget = safeAiContextTarget(root, REVIEW_FILE, { create: true });
  const stateTarget = safeAiContextTarget(root, STATE_FILE, { create: true });
  const lockTarget = safeAiContextTarget(root, RUN_LOCK_FILE, { create: true });
  if (!reviewTarget || !stateTarget || !lockTarget) {
    process.stderr.write('[session-reflect] unsafe ai_context path — skipped\n');
    return 0;
  }
  const loaded = runtime.loadConfig(root, {});
  const lock = acquireRunLock(root);
  if (!lock) return 0;
  try {
    const areas = touchedAreas(root);
    if (Object.keys(areas).length === 0) return 0;

    const diff = scopedDiff(root, areas, loaded.config.limits.maxReflectionChars);
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    let body, mode;
    let reflection = null;
    if (diff.trim()) {
      // Consent can be revoked while this detached job is gathering its diff.
      // Re-read the user-owned record immediately before the outbound call.
      const currentAuthorization = reflectionAuthorization(env, options);
      if (
        !currentAuthorization.enabled ||
        currentAuthorization.realProjectRoot !== root
      ) return 0;
      reflection = runClaude(
        buildPrompt(root, areas, diff),
        root,
        env,
        options.claudeInvocation
      );
    }
    if (reflection) {
      const list = Object.keys(areas).sort().join(', ');
      body = `# Session reflect — ${stamp}\n\n_Reflection by \`claude -p\` over ${Object.keys(areas).length} touched area(s): ${list}._\n\n${reflection}\n`;
      mode = 'LLM reflection';
    } else {
      body = deterministicNote(root, areas, stamp);
      mode = 'deterministic fallback';
    }

    const review = safeAiContextTarget(root, REVIEW_FILE, { create: true });
    if (!review) {
      process.stderr.write('[session-reflect] unsafe review path — skipped\n');
      return 1;
    }
    try {
      runtime.atomicWrite(review, body);
    } catch (exc) {
      process.stderr.write(`[session-reflect] could not write ${REVIEW_FILE}: ${exc}\n`);
      return 1;
    }
    // A deterministic fallback is also a completed review. Persist dedup only
    // after the review file is safely in place, never when the trigger merely
    // spawns this runner.
    if (!recordSuccessfulFingerprint(root, env)) return 1;
    process.stderr.write(`[session-reflect] wrote ${REVIEW_FILE} (${mode})\n`);
    return 0;
  } finally {
    releaseRunLock(lock);
  }
}

if (require.main === module) process.exit(reflect());

module.exports = {
  reflect, projectRoot, changedPaths, agentsAreas, areaOf, touchedAreas,
  scopedDiff, buildPrompt, deterministicNote, REVIEW_FILE, STATE_FILE, LOCK_ENV,
  runClaude, reflectionEnabled, reflectionAuthorization,
  environmentPermitsReflection, redactSecrets, safePrompt,
  acquireRunLock, releaseRunLock, recordSuccessfulFingerprint,
  FINGERPRINT_ENV, BOUND_ROOT_ENV, RUN_LOCK_FILE, RUN_LOCK_TTL_MS,
  DEFAULT_REFLECT_MODEL,
  MAX_UNTRACKED_FILE_BYTES, MAX_UNTRACKED_TOTAL_BYTES, REQUIRED_CLAUDE_FLAGS,
  CHILD_ENV_ALLOWLIST, isContainedPath, resolveSafeAiContext, safeAiContextTarget,
  isLikelyBinary, readSafeUntrackedFile, projectReflectionPolicy,
  allowlistedChildEnvironment, operatingSystemHome,
  fixedExecutableCandidates, validateExternalFile, resolveTrustedExecutable,
  revalidateInvocation, minimalGitEnvironment, normalizeClaudeInvocation,
  supportsRequiredClaudeFlags
};
