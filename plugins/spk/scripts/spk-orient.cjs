// hooks/SessionStart/spk-orient.cjs
// Per-session orientation, READ-ONLY. At session start, inject a short block so
// the model begins already knowing which AGENTS.md-governed area has pending
// work and the recent direction of travel — without spending a turn exploring.
// Adapted from the Helpline self-improving layer, but keyed on SPK's source of
// truth (AGENTS.md, not CLAUDE.md) and kept deterministic: it makes NO LLM call
// and writes NOTHING, so it never costs an API request per session.
// Contract: non-blocking => hookSpecificOutput.additionalContext JSON on stdout
// + exit 0. Kill switch SPK_ORIENT=off => silent exit 0.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const EXCLUDE_DIRS = new Set([
  '.git', '.venv', 'venv', 'env', 'node_modules', '__pycache__',
  '.pytest_cache', '.mypy_cache', '.ruff_cache', 'build', 'dist', 'coverage'
]);

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

function orientProjectRoot(env = process.env, cwd = process.cwd()) {
  return path.resolve(
    env.CLAUDE_PROJECT_DIR ||
    env.CODEX_PROJECT_DIR ||
    env.SPK_PROJECT_ROOT ||
    cwd
  );
}

// Best-effort git read. Returns '' on any failure (no git, not a repo). Never throws.
function git(args, root) {
  try {
    return execFileSync('git', [
      '-c', 'core.fsmonitor=false',
      '-c', 'core.untrackedCache=false',
      ...args,
    ], {
      cwd: root,
      encoding: 'utf-8',
      env: gitEnvironment(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000
    });
  } catch {
    return '';
  }
}

// Every directory (relative posix) carrying its own AGENTS.md, except the repo
// root — the areas SPK's context hierarchy governs. Layout-agnostic. Pure read.
function agentsAreas(root) {
  const areas = new Set();
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    let hasAgents = false;
    for (const e of entries) {
      if (e.isFile() && e.name === 'AGENTS.md') hasAgents = true;
    }
    if (hasAgents) {
      const rel = path.relative(root, dir).replace(/\\/g, '/');
      if (rel && rel !== '.') areas.add(rel);
    }
    for (const e of entries) {
      if (e.isDirectory() && !EXCLUDE_DIRS.has(e.name)) walk(path.join(dir, e.name));
    }
  }
  walk(root);
  return areas;
}

// The nearest AGENTS.md-governed directory containing a changed file, or null.
function areaOf(file, areas) {
  const parts = (file || '').replace(/\\/g, '/').split('/');
  for (let depth = parts.length - 1; depth > 0; depth--) {
    const candidate = parts.slice(0, depth).join('/');
    if (areas.has(candidate)) return candidate;
  }
  return null;
}

// Changed + untracked paths via `git status --porcelain`. [] on failure.
function changedPaths(root) {
  return git(['status', '--porcelain'], root)
    .split('\n')
    .filter(line => line.length > 3)
    .map(line => line.slice(3).trim().replace(/\\/g, '/'))
    .filter(Boolean);
}

// AGENTS.md-governed areas with pending work, sorted.
function activeAreas(root) {
  const governed = agentsAreas(root);
  const found = new Set();
  for (const p of changedPaths(root)) {
    const area = areaOf(p, governed);
    if (area) found.add(area);
  }
  return [...found].sort();
}

// Pending session-reflect proposal, if any. The orienter stays read-only, so
// "pending" simply means the review file exists — applying its proposals and
// deleting the file is how it gets dismissed. The reflector recreates it the
// next time a reflection runs.
const REVIEW_FILE = path.join('ai_context', 'session-reflect-review.md');
function pendingReflection(root) {
  try {
    const st = fs.statSync(path.join(root, REVIEW_FILE));
    return { ageDays: Math.max(0, Math.floor((Date.now() - st.mtimeMs) / 86400000)) };
  } catch {
    return null;
  }
}

// Last few commit subjects, newest first — the recent direction of travel.
function recentCommits(root, limit = 5) {
  return git(['log', `-${limit}`, '--pretty=format:%h %s'], root)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

// Build the orientation block. Pure given its inputs. Returns null when there is
// nothing useful to say (not a git repo / no history and no pending work).
function buildOrientation({ areas, commits, reflection }) {
  if ((!areas || !areas.length) && (!commits || !commits.length) && !reflection) return null;
  const lines = ['[SPK orient] Session orientation (read-only).'];
  if (areas && areas.length) {
    const shown = areas.slice(0, 8).join(', ');
    lines.push(`Active area(s) with pending work: ${shown}${areas.length > 8 ? ', …' : ''}. Load the matching AGENTS.md in each before editing.`);
  } else {
    lines.push('Working tree is clean — no area has pending work.');
  }
  if (commits && commits.length) {
    lines.push('Recent commits (newest first): ' + commits.map(c => `(${c})`).join(' '));
  }
  if (reflection) {
    const age = reflection.ageDays === 0 ? 'today' : `${reflection.ageDays} day(s) ago`;
    lines.push(`A session reflection is pending review at ${REVIEW_FILE.replace(/\\/g, '/')} (written ${age}) — apply its proposals with the SPK load-project/add-knowledge skills, then delete the file.`);
  }
  return lines.join(' ');
}

function orient(event, env) {
  env = env || process.env;
  if ((env.SPK_ORIENT || '').toLowerCase() === 'off') return null;
  const root = orientProjectRoot(env);
  return buildOrientation({
    areas: activeAreas(root),
    commits: recentCommits(root),
    reflection: pendingReflection(root)
  });
}

function main() {
  let raw = '';
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    try { JSON.parse(raw || '{}'); } catch { /* payload unused; ignore */ }
    let block;
    try { block = orient({}); } catch { process.exit(0); }
    if (block) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: block
        }
      }) + '\n');
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  orient, buildOrientation, agentsAreas, areaOf, changedPaths, activeAreas, recentCommits,
  pendingReflection, gitEnvironment, orientProjectRoot, trustedExecutablePath, REVIEW_FILE
};
