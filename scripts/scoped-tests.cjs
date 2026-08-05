// scripts/scoped-tests.cjs
// Maps changed files -> the relevant Jest suites so the inner loop runs only
// what a change can affect. CONSERVATIVE BY DESIGN: any file it cannot confidently
// map contributes no suites, and an overall empty map means the caller MUST run the
// full suite (never silently run a subset that misses coverage).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  minimalGitEnvironment,
  resolveTrustedExecutable,
  revalidateInvocation,
} = require('../plugins/spk/scripts/session-reflect-run.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function testExists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

// Plugin scripts that are wired as runtime hooks. ONLY these are covered by
// tests/hook-output-contract.test.js, so the contract suite must be appended
// for these and never for an arbitrary (sibling-less) plugin script — see R7:
// a non-hook script with no sibling test must map to [] so the caller runs the
// full suite instead of falsely reporting zero-coverage code as covered.
// Derived from plugins/spk/hooks/hooks.json when readable; falls back to a
// hardcoded set (keep in sync with hooks.json) if parsing fails.
function deriveHookScripts() {
  try {
    const hooks = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'spk', 'hooks', 'hooks.json'), 'utf-8')
    );
    const names = new Set();
    for (const event of Object.values(hooks.hooks || {})) {
      for (const group of event) {
        for (const hook of group.hooks || []) {
          const serialized = [hook.command, ...(Array.isArray(hook.args) ? hook.args : [])]
            .join(' ');
          const m = serialized.match(/scripts\/([\w-]+)\.cjs/);
          if (m) names.add(m[1]);
        }
      }
    }
    if (names.size) return names;
  } catch {
    /* fall through to hardcoded set */
  }
  return new Set([
    'auto-ingest', 'gitignore-guard', 'init-ai-context',
    'session-reflect', 'spk-orient', 'webfetch-cache', 'wiki-secret-scan',
  ]);
}

const HOOK_SCRIPTS = deriveHookScripts();

// Suites that guard the command/skill/manifest surface.
const MANIFEST_SUITES = [
  'tests/manifest-version-sync.test.js',
  'tests/command-manifest-sync.test.js',
  'tests/validate-manifest.test.js',
  'tests/manifest-command-target-sync.test.js',
  'tests/agent-manifest-sync.test.js',
  'tests/native-skills.test.js',
];
const AGENT_SUITES = [
  'tests/agent-contracts.test.js',
  'tests/agent-manifest-sync.test.js',
];
const SKILL_SUITES = [
  'tests/native-skills.test.js',
  'tests/skill-descriptions.test.js',
  'tests/command-manifest-sync.test.js',
];

// Map a single changed path to candidate suites. Returns [] when unmappable.
function suitesForPath(file) {
  const f = file.replace(/\\/g, '/');

  // Repo-level gate scripts: scripts/<name>.cjs -> tests/<name>.test.js
  let m = f.match(/^scripts\/([^/]+)\.cjs$/);
  if (m) {
    const sibling = `tests/${m[1]}.test.js`;
    return testExists(sibling) ? [sibling] : [];
  }

  // Plugin runtime scripts: plugins/spk/scripts/<name>.cjs -> tests/<name>.test.js
  m = f.match(/^plugins\/spk\/scripts\/([^/]+)\.cjs$/);
  if (m) {
    const name = m[1];
    const sibling = `tests/${name}.test.js`;
    const hits = [];
    if (testExists(sibling)) hits.push(sibling);
    // The hook-output contract suite only covers REGISTERED hooks; appending it
    // to a non-hook script would let a sibling-less script masquerade as covered.
    if (HOOK_SCRIPTS.has(name) && testExists('tests/hook-output-contract.test.js')) {
      hits.push('tests/hook-output-contract.test.js');
    }
    return hits; // [] when a non-hook sibling-less script -> caller runs full suite
  }

  // Hook wiring config.
  if (f === 'plugins/spk/hooks/hooks.json') {
    return testExists('tests/hook-output-contract.test.js') ? ['tests/hook-output-contract.test.js'] : [];
  }

  // Manifest is the source of truth for many gates.
  if (f === 'manifest.json') {
    return MANIFEST_SUITES.filter(testExists);
  }

  // Agent definitions.
  if (/^plugins\/spk\/agents\/.+\.md$/.test(f)) {
    return AGENT_SUITES.filter(testExists);
  }

  // Skills (English plugin payload or native Thai source).
  if (/^plugins\/spk\/skills\/.+/.test(f) || /^skills\/.+/.test(f)) {
    return SKILL_SUITES.filter(testExists);
  }

  // MCP server / .mcp.json.
  if (/^plugins\/spk\/mcp\/.+\.cjs$/.test(f) || f === 'plugins/spk/.mcp.json') {
    return ['tests/mcp-rg.test.js', 'tests/mcp-server-contract.test.js', 'tests/mcp-manifest.test.js']
      .filter(testExists);
  }

  // A test file itself was changed -> run that test.
  m = f.match(/^(tests\/.+\.test\.js)$/);
  if (m) return [m[1]];

  // Unknown / docs / config: cannot confidently scope.
  return [];
}

// Map a set of changed paths to a de-duplicated, sorted list of suites.
// Empty result is meaningful: the caller should run the full suite.
function mapToSuites(changedPaths) {
  const all = [];
  for (const file of changedPaths || []) {
    for (const suite of suitesForPath(file)) all.push(suite);
  }
  return [...new Set(all)].sort();
}

function changedFromGit(options = {}) {
  const root = path.resolve(options.root || REPO_ROOT);
  const runner = options.runner || execFileSync;
  const invocation = options.invocation || resolveTrustedExecutable('git', root);
  if (!invocation || !revalidateInvocation(invocation, root)) return [];

  try {
    const out = runner(invocation.bin, [
      ...(invocation.prefixArgs || []),
      '--no-pager',
      '-c', 'core.fsmonitor=false',
      '-c', 'core.untrackedCache=false',
      '-c', 'diff.external=',
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--name-only',
      'HEAD',
      '--',
    ], {
      cwd: root,
      encoding: 'utf-8',
      env: minimalGitEnvironment(root),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    });
    return String(out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const changed = changedFromGit();
  if (changed.length === 0) {
    console.log('# no changed files vs HEAD; run the full suite');
    console.log('npm test');
    return;
  }
  const suites = mapToSuites(changed);
  const unmapped = changed.filter(f => suitesForPath(f).length === 0);

  if (suites.length === 0) {
    console.log(`# ${changed.length} changed file(s), none confidently mapped to a suite`);
    console.log('# falling back to the full suite to avoid missing coverage');
    console.log('npm test');
    return;
  }

  console.log(`# scoped ${suites.length} suite(s) from ${changed.length} changed file(s)`);
  if (unmapped.length) {
    console.log(`# NOT scoped (run full suite if these matter): ${unmapped.join(', ')}`);
  }
  console.log(`npx jest ${suites.join(' ')}`);
}

if (require.main === module) main();

module.exports = { changedFromGit, mapToSuites, suitesForPath };
