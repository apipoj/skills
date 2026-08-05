#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const runtime = require('./runtime-core.cjs');
const {
  gitCheckIgnored,
  pathWithinRoot,
} = require('./gitignore-guard.cjs');
const {
  allowlistedChildEnvironment,
  minimalGitEnvironment,
  operatingSystemHome,
  reflectionAuthorization,
  resolveTrustedExecutable,
  revalidateInvocation,
} = require('./session-reflect-run.cjs');

const CANONICAL_SOURCE_IGNORE_RULES = Object.freeze(['*', '!.gitignore']);
const EXPECTED_INVENTORY = Object.freeze({
  sharedSkills: 22,
  claudeAgents: 21,
});
const EXPECTED_HOOK_SCRIPTS = Object.freeze([
  'scripts/wiki-secret-scan.cjs',
  'scripts/gitignore-guard.cjs',
  'scripts/webfetch-cache.cjs',
  'scripts/auto-ingest.cjs',
  'scripts/webfetch-cache.cjs',
  'scripts/init-ai-context.cjs',
  'scripts/spk-orient.cjs',
  'scripts/session-reflect.cjs',
]);

function check(id, status, message, remediation) {
  const value = { id, status, message };
  if (remediation) value.remediation = remediation;
  return value;
}

function resolveDoctorProjectRoot(env = process.env, cwd = process.cwd()) {
  const candidate = env.CLAUDE_PROJECT_DIR || env.CODEX_PROJECT_DIR || cwd;
  return path.resolve(candidate);
}

function resolveDoctorPluginRoot(options = {}) {
  return path.resolve(options.pluginRoot || path.join(__dirname, '..'));
}

function fixedCodexExecutableCandidates() {
  const home = operatingSystemHome();
  const candidates = [];
  const add = value => {
    if (value && path.isAbsolute(value) && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  if (process.platform === 'win32') {
    const drive = home ? path.parse(home).root : 'C:\\';
    if (home) {
      add(path.join(home, '.local', 'bin', 'codex.exe'));
      add(path.join(home, '.codex', 'bin', 'codex.exe'));
      add(path.join(home, 'AppData', 'Local', 'Programs', 'Codex', 'codex.exe'));
      add(path.join(home, 'AppData', 'Local', 'OpenAI', 'Codex', 'codex.exe'));
    }
    add(path.join(drive, 'Program Files', 'Codex', 'codex.exe'));
  } else {
    if (home) {
      add(path.join(home, '.local', 'bin', 'codex'));
      add(path.join(home, '.codex', 'bin', 'codex'));
      add(path.join(home, '.npm-global', 'bin', 'codex'));
    }
    add('/opt/homebrew/bin/codex');
    add('/usr/local/bin/codex');
    add('/usr/bin/codex');
    add('/snap/bin/codex');
  }
  return candidates;
}

function versionEnvironment(kind, env, root) {
  if (kind === 'git') return minimalGitEnvironment(root);
  return allowlistedChildEnvironment(env || {}, { NO_COLOR: '1' }, {
    projectRoot: root,
  });
}

function commandVersion(invocation, args, options = {}) {
  const root = options.root || process.cwd();
  if (!invocation || !revalidateInvocation(invocation, root)) return null;
  try {
    const result = spawnSync(
      invocation.bin,
      [...invocation.prefixArgs, ...args],
      {
        cwd: options.cwd || os.tmpdir(),
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: options.env || {},
        windowsHide: true,
      }
    );
    if (result.error || result.status !== 0) return null;
    return String(result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}

function trustedCommandVersion(kind, root, env, options = {}) {
  const candidates = options.executableCandidates &&
    options.executableCandidates[kind];
  const resolutionOptions = candidates
    ? { candidates }
    : kind === 'codex'
      ? { candidates: fixedCodexExecutableCandidates() }
      : {};
  const invocation = resolveTrustedExecutable(kind, root, resolutionOptions);
  return commandVersion(invocation, ['--version'], {
    root,
    env: versionEnvironment(kind, env, root),
  });
}

function sourceIgnoreIsSafe(file, testOptions = {}) {
  const options = typeof testOptions === 'string'
    ? { gitBin: testOptions }
    : testOptions;
  const root = path.resolve(path.dirname(file), '..', '..');
  const contained = pathWithinRoot(file, root);
  if (!contained) return false;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
  } catch {
    return false;
  }

  let rules;
  try {
    rules = fs.readFileSync(contained.realAbsolute || contained.absolute, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return false;
  }
  if (
    rules.length !== CANONICAL_SOURCE_IGNORE_RULES.length ||
    rules.some((rule, index) => rule !== CANONICAL_SOURCE_IGNORE_RULES[index])
  ) return false;

  // The override is an in-process test seam only. Production resolves Git from
  // a fixed, non-project candidate list and passes its absolute path to the
  // guard's minimized child environment.
  let gitBin = options.gitBin;
  if (!gitBin) {
    const invocation = resolveTrustedExecutable('git', root);
    if (!invocation || invocation.prefixArgs.length ||
        !revalidateInvocation(invocation, root)) return false;
    gitBin = invocation.bin;
  }

  const privateProbe = path.relative(
    root,
    path.join(path.dirname(file), '__spk_private_probe__')
  );
  const policy = path.relative(root, file);
  const rawResult = gitCheckIgnored(privateProbe, root, gitBin);
  const policyResult = gitCheckIgnored(policy, root, gitBin);
  return rawResult.known && policyResult.known &&
    rawResult.ignored && !policyResult.ignored;
}

function isRegularNonSymlinkFile(file) {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function readJsonFile(file) {
  if (!isRegularNonSymlinkFile(file)) {
    return { ok: false, error: 'missing or not a regular file' };
  }
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (error) {
    return { ok: false, error: `invalid JSON: ${error.message}` };
  }
}

function inspectManifests(plugin) {
  const candidates = [
    ['Claude', path.join(plugin, '.claude-plugin', 'plugin.json')],
    ['Codex', path.join(plugin, '.codex-plugin', 'plugin.json')],
  ];
  const present = candidates.filter(([, file]) => fs.existsSync(file));
  if (present.length === 0) {
    return check(
      'plugin.manifests',
      'fail',
      'No supported client manifest is present.',
      'Reinstall the host-specific SPK package.'
    );
  }
  const inspected = present.map(([name, file]) => [name, readJsonFile(file)]);
  const invalid = inspected.filter(([, result]) => !result.ok);
  if (invalid.length > 0) {
    const details = invalid.map(([name, result]) => `${name}: ${result.error}`).join('; ');
    return check(
      'plugin.manifests',
      'fail',
      `Client manifest is invalid (${details}).`,
      'Reinstall the host-specific SPK package.'
    );
  }
  const versions = inspected.map(([name, result]) => [
    name,
    result.value && result.value.version,
  ]);
  const invalidVersions = versions.filter(([, version]) =>
    typeof version !== 'string' || !version
  );
  const uniqueVersions = new Set(versions.map(([, version]) => version));
  if (invalidVersions.length > 0 || uniqueVersions.size !== 1) {
    const details = versions
      .map(([name, version]) => `${name}: ${version || 'missing'}`)
      .join('; ');
    return check(
      'plugin.manifests',
      'fail',
      `Client manifest versions differ or are missing (${details}).`,
      'Reinstall SPK so every manifest in this package comes from one release.'
    );
  }
  const version = versions[0][1];
  return check(
    'plugin.manifests',
    'pass',
    `${versions.map(([name]) => name).join(' and ')} manifest${versions.length > 1 ? 's are' : ' is'} valid at version ${version}.`
  );
}

function countSkillFolders(plugin) {
  const directory = path.join(plugin, 'skills');
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry =>
        entry.isDirectory() &&
        isRegularNonSymlinkFile(path.join(directory, entry.name, 'SKILL.md'))
      ).length;
  } catch {
    return 0;
  }
}

function countClaudeAgents(plugin) {
  const directory = path.join(plugin, 'agents');
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        isRegularNonSymlinkFile(path.join(directory, entry.name))
      ).length;
  } catch {
    return 0;
  }
}

function inspectInventory(plugin) {
  const skills = countSkillFolders(plugin);
  const agents = countClaudeAgents(plugin);
  const includesClaude = fs.existsSync(
    path.join(plugin, '.claude-plugin', 'plugin.json')
  );
  const expectedAgents = includesClaude ? EXPECTED_INVENTORY.claudeAgents : 0;
  const valid = skills === EXPECTED_INVENTORY.sharedSkills &&
    agents === expectedAgents;
  return check(
    'plugin.inventory',
    valid ? 'pass' : 'fail',
    `Bundled inventory: ${skills}/${EXPECTED_INVENTORY.sharedSkills} skills and ${agents}/${expectedAgents} Claude agent files.`,
    valid ? null : 'Reinstall SPK; the installed plugin payload is incomplete or from a mixed release.'
  );
}

function commandHooks(hooksDocument) {
  const registrations = [];
  if (
    !hooksDocument ||
    typeof hooksDocument !== 'object' ||
    Array.isArray(hooksDocument) ||
    !hooksDocument.hooks ||
    typeof hooksDocument.hooks !== 'object' ||
    Array.isArray(hooksDocument.hooks)
  ) return null;

  for (const eventEntries of Object.values(hooksDocument.hooks)) {
    if (!Array.isArray(eventEntries)) return null;
    for (const eventEntry of eventEntries) {
      if (!eventEntry || !Array.isArray(eventEntry.hooks)) return null;
      for (const hook of eventEntry.hooks) {
        if (hook && hook.type === 'command') registrations.push(hook);
      }
    }
  }
  return registrations;
}

function hookScriptReference(hook) {
  if (
    ['node', '${user_config.node_path}'].includes(hook.command) &&
    Array.isArray(hook.args)
  ) {
    const references = hook.args.filter(argument =>
      typeof argument === 'string' &&
      argument.replace(/\\/g, '/').startsWith('${CLAUDE_PLUGIN_ROOT}/')
    );
    if (references.length !== 1) return null;
    return references[0].replace(/\\/g, '/')
      .slice('${CLAUDE_PLUGIN_ROOT}/'.length);
  }
  if (typeof hook.command !== 'string') return null;
  const match = hook.command.match(
    /^\s*node\s+(?:"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"|'\$\{CLAUDE_PLUGIN_ROOT\}\/([^']+)'|\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s]+))(?:\s+.*)?$/
  );
  return match ? (match[1] || match[2] || match[3]).replace(/\\/g, '/') : null;
}

function inspectHooks(plugin) {
  const file = path.join(plugin, 'hooks', 'hooks.json');
  const parsed = readJsonFile(file);
  if (!parsed.ok) {
    return check(
      'plugin.hooks',
      'fail',
      `Hook configuration is ${parsed.error}.`,
      'Reinstall SPK to restore hooks/hooks.json.'
    );
  }
  const registrations = commandHooks(parsed.value);
  if (!registrations) {
    return check(
      'plugin.hooks',
      'fail',
      'Hook configuration has an invalid registration structure.',
      'Reinstall SPK to restore hooks/hooks.json.'
    );
  }
  const scripts = registrations.map(hookScriptReference);
  const expected = [...EXPECTED_HOOK_SCRIPTS].sort();
  const actual = scripts.filter(Boolean).sort();
  const rosterMatches =
    scripts.length === registrations.length &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
  const missingFiles = actual.filter(relative => {
    const contained = pathWithinRoot(path.join(plugin, relative), plugin);
    return !contained ||
      !isRegularNonSymlinkFile(contained.realAbsolute || contained.absolute);
  });
  const valid = rosterMatches && missingFiles.length === 0;
  return check(
    'plugin.hooks',
    valid ? 'pass' : 'fail',
    valid
      ? `Hooks parsed: ${registrations.length} command registrations and ${new Set(actual).size} bundled script files verified.`
      : `Hook registration mismatch: ${registrations.length}/${EXPECTED_HOOK_SCRIPTS.length} commands; ${scripts.filter(Boolean).length} recognized script references; ${missingFiles.length} missing script files.`,
    valid ? null : 'Reinstall SPK to restore the bundled hook registrations and scripts.'
  );
}

function reflectionDisableCommand(plugin, root) {
  const cli = path.join(plugin, 'scripts', 'session-reflect-consent.cjs');
  return `Run: node ${JSON.stringify(cli)} disable ${JSON.stringify(root)}`;
}

function diagnose(options = {}) {
  const env = options.env || process.env;
  const root = resolveDoctorProjectRoot(env, options.cwd || process.cwd());
  const plugin = resolveDoctorPluginRoot(options);
  const checks = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push(check(
    'runtime.node',
    nodeMajor >= 20 ? 'pass' : 'fail',
    `Node.js ${process.versions.node}`,
    nodeMajor >= 20 ? null : 'Install Node.js 20 or newer.'
  ));

  const gitVersion = trustedCommandVersion('git', root, env, options);
  checks.push(check(
    'runtime.git',
    gitVersion ? 'pass' : 'warn',
    gitVersion || 'Git is unavailable.',
    gitVersion ? null : 'Install Git to enable repository-aware guards and workflows.'
  ));

  const claudeVersion = trustedCommandVersion('claude', root, env, options);
  const codexVersion = trustedCommandVersion('codex', root, env, options);
  checks.push(check(
    'host.clients',
    claudeVersion || codexVersion ? 'pass' : 'warn',
    `Detected clients: ${[claudeVersion && 'Claude Code', codexVersion && 'Codex'].filter(Boolean).join(', ') || 'none'}.`,
    claudeVersion || codexVersion ? null : 'Install Claude Code or Codex before using SPK.'
  ));

  const configResult = runtime.loadConfig(root, { CLAUDE_PROJECT_DIR: root });
  checks.push(check(
    'config.project',
    configResult.errors.length ? 'fail' : 'pass',
    configResult.errors.length
      ? `Project configuration has ${configResult.errors.length} validation error(s).`
      : `Configuration source: ${configResult.source}.`,
    configResult.errors.length ? `Fix ${runtime.CONFIG_PATH}; run doctor again.` : null
  ));

  const authorization = reflectionAuthorization({
    CLAUDE_PROJECT_DIR: root,
    ...(Object.prototype.hasOwnProperty.call(env, 'SPK_SESSION_REFLECT')
      ? { SPK_SESSION_REFLECT: env.SPK_SESSION_REFLECT }
      : {}),
  }, {
    consentRoot: options.consentRoot,
  });
  checks.push(check(
    'privacy.reflection',
    authorization.enabled ? 'warn' : 'pass',
    authorization.enabled
      ? 'LLM-backed session reflection has user-local consent and is enabled.'
      : 'LLM-backed session reflection is disabled; project configuration and environment opt-in cannot grant consent.',
    authorization.enabled
      ? reflectionDisableCommand(plugin, authorization.realProjectRoot || root)
      : null
  ));

  const wikiDir = path.join(root, 'ai_context', 'wiki');
  const sourceDir = path.join(root, 'ai_context', 'sources');
  checks.push(check(
    'memory.wiki',
    fs.existsSync(wikiDir) ? 'pass' : 'warn',
    fs.existsSync(wikiDir) ? 'Project wiki is present.' : 'Project wiki has not been scaffolded yet.',
    fs.existsSync(wikiDir) ? null : 'Start a new host session or create ai_context/wiki through the SPK bootstrap.'
  ));

  const sourceIgnore = path.join(sourceDir, '.gitignore');
  const sourceIgnoreSafe = sourceIgnoreIsSafe(
    sourceIgnore,
    options.gitBin ? { gitBin: options.gitBin } : {}
  );
  checks.push(check(
    'privacy.sources-ignore',
    sourceIgnoreSafe ? 'pass' : 'fail',
    sourceIgnoreSafe
      ? 'Raw source storage has an effective ignore-all policy.'
      : 'Raw source storage is missing or does not enforce the SPK ignore-all policy.',
    sourceIgnoreSafe
      ? null
      : 'Restore ai_context/sources/.gitignore to exactly * followed by !.gitignore.'
  ));

  checks.push(inspectManifests(plugin));
  checks.push(inspectInventory(plugin));
  checks.push(inspectHooks(plugin));

  const mcpConfig = path.join(plugin, '.mcp.json');
  const mcpScript = path.join(plugin, 'mcp', 'codebase-search.cjs');
  checks.push(check(
    'plugin.mcp',
    isRegularNonSymlinkFile(mcpConfig) && isRegularNonSymlinkFile(mcpScript) ? 'pass' : 'warn',
    isRegularNonSymlinkFile(mcpConfig) && isRegularNonSymlinkFile(mcpScript)
      ? 'Bundled codebase-search MCP files are present.'
      : 'Bundled codebase-search MCP files are incomplete.',
    isRegularNonSymlinkFile(mcpConfig) && isRegularNonSymlinkFile(mcpScript)
      ? null
      : 'Reinstall SPK and run doctor again.'
  ));

  const counts = checks.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { pass: 0, warn: 0, fail: 0 });
  return {
    status: counts.fail ? 'error' : counts.warn ? 'warning' : 'ok',
    counts,
    checks,
  };
}

function renderHuman(report) {
  const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const lines = ['SPK doctor', ''];
  for (const item of report.checks) {
    lines.push(`[${icon[item.status]}] ${item.id}: ${item.message}`);
    if (item.remediation) lines.push(`  Fix: ${item.remediation}`);
  }
  lines.push('');
  lines.push(`Result: ${report.status} (${report.counts.pass} pass, ${report.counts.warn} warn, ${report.counts.fail} fail)`);
  return lines.join('\n');
}

function main(argv = process.argv.slice(2)) {
  const report = diagnose();
  process.stdout.write(argv.includes('--json')
    ? JSON.stringify(report, null, 2) + '\n'
    : renderHuman(report) + '\n');
  return report.counts.fail ? 1 : 0;
}

if (require.main === module) process.exitCode = main();

module.exports = {
  CANONICAL_SOURCE_IGNORE_RULES,
  EXPECTED_HOOK_SCRIPTS,
  EXPECTED_INVENTORY,
  commandVersion,
  countClaudeAgents,
  countSkillFolders,
  diagnose,
  fixedCodexExecutableCandidates,
  hookScriptReference,
  inspectHooks,
  inspectInventory,
  inspectManifests,
  main,
  renderHuman,
  resolveDoctorPluginRoot,
  resolveDoctorProjectRoot,
  sourceIgnoreIsSafe,
  trustedCommandVersion,
};
