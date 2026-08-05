// plugins/spk/scripts/init-ai-context.cjs
// SessionStart hook: scaffold ai_context/ templates into user's project.
// Idempotent via version marker file.
//
// Also nudges (once per plugin version, piggybacking on the same marker) to
// enable marketplace auto-update. ADVISORY ONLY: a hook must never write into
// the user's settings.json — it only reads both scopes to avoid nagging users
// who already enabled it.

const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('./runtime-core.cjs');
const { pathWithinRoot } = require('./gitignore-guard.cjs');

const VERSION_MARKER = '.spk-version';
const SOURCES_GITIGNORE = '*\n!.gitignore\n';
// Only immutable plugin policy belongs here. index.md, log.md, and every other
// wiki page become user data as soon as the scaffold is installed and must never
// be replaced by an upgrade.
const MANAGED_FILES = new Set([
  'ai_context/wiki/SCHEMA.md'
]);

function readMarker(projectRoot) {
  const p = path.join(projectRoot, 'ai_context', VERSION_MARKER);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8').trim();
}

function writeMarker(projectRoot, version) {
  const dir = path.join(projectRoot, 'ai_context');
  fs.mkdirSync(dir, { recursive: true });
  runtime.atomicWrite(path.join(dir, VERSION_MARKER), version);
}

function needsScaffold(projectRoot, currentVersion) {
  const marker = readMarker(projectRoot);
  if (marker === null) return true;
  return marker !== currentVersion;
}

function copyFileAtomic(src, dest) {
  runtime.atomicWrite(dest, fs.readFileSync(src));
}

function lstatIfPresent(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function existingAiContextTreeIsSafe(dest) {
  let rootStat;
  try {
    rootStat = lstatIfPresent(dest);
  } catch {
    return false;
  }
  if (!rootStat) return true;
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) return false;

  function walkDirectory(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return false;
    }
    for (const entry of entries) {
      const target = path.join(dir, entry);
      let stat;
      try {
        stat = fs.lstatSync(target);
      } catch {
        return false;
      }
      if (stat.isSymbolicLink()) return false;
      if (stat.isDirectory()) {
        if (!walkDirectory(target)) return false;
      } else if (!stat.isFile()) {
        // Sockets, FIFOs, devices, and other special files are never safe
        // scaffold destinations.
        return false;
      }
    }
    return true;
  }

  return walkDirectory(dest);
}

function destinationsAreContained(src, dest, projectRoot) {
  if (!pathWithinRoot(dest, projectRoot)) return false;
  let srcStat;
  let destStat;
  try {
    srcStat = fs.lstatSync(src);
    destStat = lstatIfPresent(dest);
  } catch {
    return false;
  }
  if (srcStat.isSymbolicLink()) return false;
  if (srcStat.isDirectory()) {
    if (destStat && (destStat.isSymbolicLink() || !destStat.isDirectory())) return false;
    let entries;
    try {
      entries = fs.readdirSync(src);
    } catch {
      return false;
    }
    return entries.every(entry =>
      destinationsAreContained(path.join(src, entry), path.join(dest, entry), projectRoot)
    );
  }
  if (!srcStat.isFile()) return false;
  return !destStat || (!destStat.isSymbolicLink() && destStat.isFile());
}

function destinationFileIsSafe(target, projectRoot) {
  if (!pathWithinRoot(target, projectRoot)) return false;
  let stat;
  try {
    stat = lstatIfPresent(target);
  } catch {
    return false;
  }
  return !stat || (!stat.isSymbolicLink() && stat.isFile());
}

function initDestinationIsSafe(src, dest, projectRoot) {
  let srcStat;
  try {
    srcStat = fs.lstatSync(src);
  } catch {
    return false;
  }
  if (srcStat.isSymbolicLink() || !srcStat.isDirectory()) return false;
  if (!existingAiContextTreeIsSafe(dest)) return false;
  if (!destinationsAreContained(src, dest, projectRoot)) return false;
  return [
    path.join(dest, 'sources', '.gitignore'),
    path.join(dest, VERSION_MARKER)
  ].every(target => destinationFileIsSafe(target, projectRoot));
}

function copyRecursive(src, dest, managed = MANAGED_FILES, relative = '') {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(
        path.join(src, entry),
        path.join(dest, entry),
        managed,
        relative ? `${relative}/${entry}` : entry
      );
    }
  } else {
    const projectRelative = `ai_context/${relative.replace(/\\/g, '/')}`;
    if (fs.existsSync(dest) && !managed.has(projectRelative)) return;
    copyFileAtomic(src, dest);
  }
}

function writeSourcesGitignore(projectRoot) {
  const target = path.join(projectRoot, 'ai_context', 'sources', '.gitignore');
  if (!pathWithinRoot(target, projectRoot)) return false;
  runtime.atomicWrite(target, SOURCES_GITIGNORE);
  return true;
}

function runInit(projectRoot, pluginRoot, pluginVersion) {
  const src = path.join(pluginRoot, 'templates', 'ai_context');
  const dest = path.join(projectRoot, 'ai_context');
  if (!fs.existsSync(src)) {
    return { scaffolded: false, reason: 'plugin has no templates/ai_context/' };
  }
  // Validate the complete existing tree and every planned destination before
  // making the first directory or file change. In-root symlinks are rejected
  // too: following one could overwrite an unrelated project file even though
  // the final real path remains inside projectRoot.
  if (!initDestinationIsSafe(src, dest, projectRoot)) {
    return {
      scaffolded: false,
      reason: 'unsafe ai_context destination: symlinks, special files, and non-directory path components are not allowed'
    };
  }
  if (!needsScaffold(projectRoot, pluginVersion)) {
    return { scaffolded: false, reason: 'already on version ' + pluginVersion };
  }
  copyRecursive(src, dest);
  if (!writeSourcesGitignore(projectRoot)) {
    return { scaffolded: false, reason: 'sources policy destination escapes the project root' };
  }
  writeMarker(projectRoot, pluginVersion);
  return { scaffolded: true, version: pluginVersion };
}

// Read-only check across settings scopes: is auto-update already on for the
// spk marketplace? Returns the nudge text when it is not, null when it is.
function userSettingsHome(options = {}) {
  const getUserInfo = options.userInfo || os.userInfo;
  try {
    return getUserInfo().homedir || null;
  } catch {
    return null;
  }
}

function initProjectRoot(env = process.env, cwd = process.cwd()) {
  return path.resolve(
    env.CLAUDE_PROJECT_DIR ||
    env.CODEX_PROJECT_DIR ||
    env.SPK_PROJECT_ROOT ||
    cwd
  );
}

function autoUpdateNudge(projectRoot, options = {}) {
  const home = userSettingsHome(options);
  const scopes = [path.join(projectRoot, '.claude', 'settings.json')];
  if (home) scopes.push(path.join(home, '.claude', 'settings.json'));
  for (const p of scopes) {
    try {
      const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const entry = s && s.extraKnownMarketplaces && s.extraKnownMarketplaces.spk;
      if (entry && entry.autoUpdate === true) return null;
    } catch { /* scope missing/unreadable — check the next one */ }
  }
  return '[SPK] Tip: enable auto-update for the spk marketplace so plugin fixes arrive automatically — ' +
    'in .claude/settings.json set extraKnownMarketplaces.spk.autoUpdate to true ' +
    '(snippet in the README "Stay up to date" section), or toggle it under /plugin → Marketplaces.';
}

function main() {
  const hasPluginRoot = process.env.SPK_PLUGIN_ROOT ||
    process.env.PLUGIN_ROOT ||
    process.env.CLAUDE_PLUGIN_ROOT;
  if (!hasPluginRoot) return;
  const pluginRoot = runtime.pluginRoot(process.env);
  const projectRoot = initProjectRoot(process.env);

  let version = '0.0.0';
  for (const manifest of [
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    path.join(pluginRoot, '.codex-plugin', 'plugin.json')
  ]) {
    try {
      const pj = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
      version = pj.version || version;
      break;
    } catch {
      // Try the next supported host manifest.
    }
  }

  const result = runInit(projectRoot, pluginRoot, version);
  if (result.scaffolded) {
    process.stderr.write(`[SPK] scaffolded ai_context/ for v${version}\n`);
    // Once per plugin version (same cadence as the scaffold), not every session.
    const isCodexHost = Boolean(process.env.PLUGIN_ROOT || process.env.CODEX_PROJECT_DIR);
    const nudge = process.env.CLAUDE_PLUGIN_ROOT && !isCodexHost
      ? autoUpdateNudge(projectRoot)
      : null;
    if (nudge) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: nudge
        }
      }) + '\n');
    }
  }
}

if (require.main === module) main();

module.exports = {
  runInit, needsScaffold, readMarker, writeMarker, autoUpdateNudge,
  copyRecursive, destinationsAreContained, existingAiContextTreeIsSafe,
  destinationFileIsSafe, initDestinationIsSafe, writeSourcesGitignore,
  initProjectRoot, userSettingsHome, MANAGED_FILES, SOURCES_GITIGNORE
};
