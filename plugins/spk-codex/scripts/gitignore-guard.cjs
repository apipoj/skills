// hooks/PreToolUse/gitignore-guard.cjs
// Layer 5 of SPK's wiki security: during wiki-build, blocks Read/Grep/Glob on
// files matched by .gitignore. Exempts ai_context/sources/ (the designated
// ingest inbox).
//
// Activation: SPK_WIKI_BUILD=true in the env, OR the marker file
// ai_context/.spk-wiki-build exists. Skills can't set env vars for hooks
// mid-session, so /spk:add-knowledge and /spk:check-wiki create the marker before
// dispatching wiki work and remove it after. The marker expires after
// MARKER_TTL_MS so a crashed wiki-build can never leave the guard blocking
// ordinary sessions forever.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MARKER_FILE = path.join('ai_context', '.spk-wiki-build');
const MARKER_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
// Shell execution is otherwise disabled while the marker is active. Keep this
// allowlist deliberately tiny: one exact, argument-free cleanup spelling for
// each supported shell family. Do not trim, case-fold, or parse these strings;
// exact full-string matching is part of the trust boundary.
const MARKER_CLEANUP_COMMANDS = Object.freeze([
  'rm -f ai_context/.spk-wiki-build',
  'del /f /q ai_context\\.spk-wiki-build',
  'Remove-Item -Force ai_context/.spk-wiki-build',
]);
// Backwards-compatible name for consumers that only need the POSIX spelling.
const MARKER_CLEANUP_COMMAND = MARKER_CLEANUP_COMMANDS[0];

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

function guardProjectRoot(env = process.env, cwd = process.cwd()) {
  return path.resolve(
    env.CLAUDE_PROJECT_DIR ||
    env.CODEX_PROJECT_DIR ||
    env.SPK_PROJECT_ROOT ||
    cwd
  );
}

function markerActive(root, now = Date.now()) {
  try {
    const st = fs.statSync(path.join(root, MARKER_FILE));
    return now - st.mtimeMs < MARKER_TTL_MS;
  } catch {
    return false;
  }
}

function lexicalPathWithinRoot(filePath, root) {
  if (!filePath) return null;
  const rawPath = String(filePath).replace(/\\/g, '/');
  const rawRoot = String(root).replace(/\\/g, '/');
  const windowsStyle = /^[A-Za-z]:\//.test(rawPath) || /^[A-Za-z]:\//.test(rawRoot);
  const api = windowsStyle ? path.win32 : path;
  const input = windowsStyle ? String(filePath).replace(/\//g, '\\') : rawPath;
  const base = windowsStyle ? String(root).replace(/\//g, '\\') : path.resolve(root);
  const absolute = api.isAbsolute(input) ? api.resolve(input) : api.resolve(base, input);
  const relative = api.relative(api.resolve(base), absolute).replace(/\\/g, '/');
  if (relative === '..' || relative.startsWith('../') || api.isAbsolute(relative)) return null;
  return { absolute, relative: relative || '.' };
}

function realPathThroughExistingAncestor(absolute) {
  let current = absolute;
  const suffix = [];
  while (true) {
    try {
      fs.lstatSync(current);
      const real = fs.realpathSync.native(current);
      return path.resolve(real, ...suffix);
    } catch (exc) {
      if (exc && exc.code !== 'ENOENT' && exc.code !== 'ENOTDIR') return null;
      // A broken symlink exists lexically but cannot be contained safely.
      try {
        if (fs.lstatSync(current).isSymbolicLink()) return null;
      } catch { /* genuinely absent — climb to its parent */ }
      const parent = path.dirname(current);
      if (parent === current) return null;
      suffix.unshift(path.basename(current));
      current = parent;
    }
  }
}

function pathWithinRoot(filePath, root) {
  const lexical = lexicalPathWithinRoot(filePath, root);
  if (!lexical) return null;

  let realRoot;
  try {
    realRoot = fs.realpathSync.native(path.resolve(root));
  } catch {
    // A synthetic/non-existent root (for example a cross-platform dry run) can
    // only be checked lexically.
    return lexical;
  }
  const realAbsolute = realPathThroughExistingAncestor(lexical.absolute);
  if (!realAbsolute) return null;
  const realRelative = path.relative(realRoot, realAbsolute).replace(/\\/g, '/');
  if (
    realRelative === '..' ||
    realRelative.startsWith('../') ||
    path.isAbsolute(realRelative)
  ) return null;
  return {
    ...lexical,
    realAbsolute,
    realRelative: realRelative || '.'
  };
}

function gitCheckIgnored(filePath, root, gitBin = 'git') {
  const info = pathWithinRoot(filePath, root);
  if (!info) return { known: true, ignored: false };
  const candidates = [...new Set([info.relative, info.realRelative].filter(Boolean))];
  let ignored = false;
  for (const candidate of candidates) {
    let result;
    try {
      result = spawnSync(
        gitBin,
        ['check-ignore', '--no-index', '--quiet', '--', candidate],
        {
          cwd: root,
          env: gitEnvironment(),
          stdio: 'ignore',
          timeout: 5000
        }
      );
    } catch {
      return { known: false, ignored: false, candidates };
    }
    if (result.error || (result.status !== 0 && result.status !== 1)) {
      return { known: false, ignored: false, candidates };
    }
    if (result.status === 0) ignored = true;
  }
  return { known: true, ignored, candidates };
}

function isGitIgnored(filePath, root, gitBin) {
  const checked = gitCheckIgnored(filePath, root, gitBin);
  return !checked.known || checked.ignored;
}

function normalizedGuardTool(event) {
  const raw = String(event && (event.tool_name || event.toolName) || '');
  const short = raw.split('.').pop().toLowerCase();
  if (['bash', 'shell', 'exec_command', 'execcommand'].includes(short)) return 'shell';
  return short;
}

function extractReadPath(toolName, toolInput) {
  if (!toolInput) return null;
  if (toolName === 'read') return toolInput.file_path || toolInput.filePath || toolInput.path;
  if (toolName === 'grep' || toolName === 'glob') return toolInput.path;
  return null;
}

function isExempt(filePath, root) {
  const info = pathWithinRoot(filePath, root);
  if (!info) return false;
  const underSources = relative =>
    typeof relative === 'string' &&
    (relative === 'ai_context/sources' || relative.startsWith('ai_context/sources/'));
  return underSources(info.relative) && underSources(info.realRelative);
}

function isExactMarkerCleanup(event, root) {
  const input = event && (event.tool_input || event.toolInput) || {};
  const command = input.command !== undefined ? input.command : input.cmd;
  if (!MARKER_CLEANUP_COMMANDS.includes(command)) return false;
  const cwd = input.cwd || input.workdir || (event && event.cwd);
  if (!cwd) return true;
  const info = pathWithinRoot(cwd, root);
  return Boolean(info && info.relative === '.' && info.realRelative === '.');
}

function shouldBlock(event, env, options = {}) {
  env = env || process.env;
  const root = guardProjectRoot(env);
  if (env.SPK_WIKI_BUILD !== 'true' && !markerActive(root)) return { block: false };

  const toolName = normalizedGuardTool(event);
  const displayName = event && (event.tool_name || event.toolName) || toolName;
  const toolInput = event && (event.tool_input || event.toolInput);
  if (toolName === 'shell') {
    if (isExactMarkerCleanup(event, root)) return { block: false };
    return {
      block: true,
      reason: `gitignore-guard: blocked ${displayName} during wiki-build — shell execution is disabled while ${MARKER_FILE.replace(/\\/g, '/')} is active. Only an exact marker-cleanup command is allowed (${MARKER_CLEANUP_COMMANDS.map(command => `"${command}"`).join(', ')}).`
    };
  }
  if (!['read', 'grep', 'glob'].includes(toolName)) return { block: false };

  const target = extractReadPath(toolName, toolInput);
  if (!target) return { block: false };

  if (!pathWithinRoot(target, root)) {
    return {
      block: true,
      reason: `gitignore-guard: blocked ${displayName} of ${target} during wiki-build — path escapes the project root or resolves through a symlink outside it.`
    };
  }

  if (isExempt(target, root)) return { block: false };

  const ignored = gitCheckIgnored(target, root, options.gitBin || 'git');
  if (!ignored.known) {
    return {
      block: true,
      reason: `gitignore-guard: blocked ${displayName} of ${target} during wiki-build — could not verify Git ignore status, so the guard failed closed.`
    };
  }
  if (!ignored.ignored) return { block: false };

  return {
    block: true,
    reason: `gitignore-guard: blocked ${displayName} of ${target} during wiki-build — path is in .gitignore. Wiki build must not read ignored content. If the wiki-build is finished, delete ${MARKER_FILE.replace(/\\/g, '/')} (and unset SPK_WIKI_BUILD) to deactivate this guard.`
  };
}

function main() {
  let raw = '';
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let event;
    try { event = JSON.parse(raw || '{}'); } catch { process.exit(0); }
    const result = shouldBlock(event);
    if (result.block) {
      // Exit 2 blocks the tool call; Claude Code feeds STDERR (not stdout)
      // back to the model, so the reason must go there to be seen.
      process.stderr.write(result.reason + '\n');
      process.exit(2);
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  shouldBlock, markerActive, lexicalPathWithinRoot, pathWithinRoot,
  gitCheckIgnored, isGitIgnored, isExempt, isExactMarkerCleanup,
  gitEnvironment, guardProjectRoot, trustedExecutablePath,
  normalizedGuardTool, MARKER_CLEANUP_COMMAND, MARKER_CLEANUP_COMMANDS,
  MARKER_FILE, MARKER_TTL_MS
};
