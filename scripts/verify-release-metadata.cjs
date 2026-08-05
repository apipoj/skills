// Release-integrity checks that complement the structural JSON Schema.
//
// JSON Schema draft-07 cannot express uniqueness by one object property or
// cross-reference command targets into sibling rosters, so those invariants
// live here alongside version, release-tag, public count, and secret checks.

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { scanForSecrets } = require('../plugins/spk/scripts/secret-scanner.cjs');
const { collectManifestSemanticErrors } = require('./validate-manifest.cjs');

const REPO_ROOT = path.join(__dirname, '..');

const PUBLIC_TEXT_FILES = [
  'README.md',
  'README-EN.md',
  'INSTALL_FOR_AGENTS.md',
];

const PUBLIC_JSON_FILES = [
  'package.json',
  'plugins/spk/.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'plugins/spk-codex/.codex-plugin/plugin.json',
];

// These files intentionally contain inert secret-shaped fixtures or the
// detector patterns themselves. Keep the allowlist narrow and explicit.
const SECRET_SCAN_EXCLUSIONS = new Set([
  'plugins/spk/scripts/secret-scanner.cjs',
  'tests/hook-output-contract.test.js',
  'tests/secret-scanner.test.js',
  'tests/session-reflect.test.js',
  'tests/skilllab.test.js',
  'tests/wiki-secret-scan.test.js',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getPath(value, keys) {
  let cursor = value;
  for (const key of keys) cursor = cursor?.[key];
  return cursor;
}

function collectVersionErrors(rootDir = REPO_ROOT) {
  const errors = [];
  let manifest;
  try {
    manifest = readJson(path.join(rootDir, 'manifest.json'));
  } catch (error) {
    return [`manifest.json: ${error.message}`];
  }

  const expected = manifest.version;
  const sources = [
    ['package.json', ['version'], true],
    ['package-lock.json', ['version'], true],
    ['package-lock.json packages[""]', ['packages', '', 'version'], true, 'package-lock.json'],
    ['plugins/spk/.claude-plugin/plugin.json', ['version'], true],
    ['.claude-plugin/marketplace.json plugins[0]', ['plugins', 0, 'version'], true, '.claude-plugin/marketplace.json'],
    ['plugins/spk-codex/.codex-plugin/plugin.json', ['version'], false],
  ];

  for (const [label, keys, required, sourceFile = label] of sources) {
    const file = path.join(rootDir, sourceFile);
    if (!fs.existsSync(file)) {
      if (required) errors.push(`${label}: missing`);
      continue;
    }

    let value;
    try {
      value = getPath(readJson(file), keys);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      continue;
    }

    if (value !== expected) {
      errors.push(`${label}: version mismatch (file=${value ?? '<missing>'} manifest=${expected})`);
    }
  }

  return errors;
}

function collectRosterErrors(manifest) {
  return collectManifestSemanticErrors(manifest).map(error => `manifest.json: ${error}`);
}

function extractCountClaims(content) {
  const claims = [];
  const pattern = /\b(\d+)\s+(?:(slash)\s+)?(subagents?|agents?|orchestrators?|specialists?|skills?|commands?)\b/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const rawKind = match[3].toLowerCase();
    let kind;
    if (rawKind.startsWith('orchestrator')) kind = 'orchestrators';
    else if (rawKind.startsWith('specialist')) kind = 'specialists';
    else if (rawKind === 'agent' || rawKind === 'agents' || rawKind.startsWith('subagent')) kind = 'agents';
    else kind = 'commands';
    claims.push({
      count: Number(match[1]),
      index: match.index,
      kind,
      text: match[0],
    });
  }
  return claims;
}

function descriptionStrings(value, label, output = []) {
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value)) {
    const childLabel = Array.isArray(value) ? `${label}[${key}]` : `${label}.${key}`;
    if (key === 'description' && typeof child === 'string') {
      output.push([childLabel, child]);
    } else {
      descriptionStrings(child, childLabel, output);
    }
  }
  return output;
}

function collectCountClaimErrors(rootDir = REPO_ROOT, manifest) {
  const errors = [];
  const expected = {
    orchestrators: manifest.agents.orchestrators.length,
    specialists: manifest.agents.specialists.length,
    agents: manifest.agents.orchestrators.length + manifest.agents.specialists.length,
    commands: manifest.commands.length,
  };
  const sources = [];

  for (const relative of PUBLIC_TEXT_FILES) {
    const file = path.join(rootDir, relative);
    if (!fs.existsSync(file)) {
      errors.push(`${relative}: missing public release metadata`);
      continue;
    }
    sources.push([relative, fs.readFileSync(file, 'utf8')]);
  }

  for (const relative of PUBLIC_JSON_FILES) {
    const file = path.join(rootDir, relative);
    if (!fs.existsSync(file)) continue;
    try {
      sources.push(...descriptionStrings(readJson(file), relative));
    } catch (error) {
      errors.push(`${relative}: ${error.message}`);
    }
  }

  for (const [label, content] of sources) {
    for (const claim of extractCountClaims(content)) {
      if (claim.count !== expected[claim.kind]) {
        errors.push(
          `${label}: stale "${claim.text}" claim (manifest has ${expected[claim.kind]} ${claim.kind})`
        );
      }
    }
  }

  return errors;
}

function collectChangelogErrors(rootDir = REPO_ROOT, manifest) {
  const file = path.join(rootDir, 'CHANGELOG.md');
  if (!fs.existsSync(file)) return ['CHANGELOG.md: missing'];

  const changelog = fs.readFileSync(file, 'utf8');
  const match = changelog.match(/^## (?!Unreleased\b)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?) - (\d{4}-\d{2}-\d{2})/m);
  if (!match) return ['CHANGELOG.md: no release heading found'];

  const errors = [];
  if (match[1] !== manifest.version) {
    errors.push(`CHANGELOG.md: newest release is ${match[1]} but manifest version is ${manifest.version}`);
  }
  if (match[2] !== manifest.released) {
    errors.push(
      `CHANGELOG.md: ${match[1]} date is ${match[2]} but manifest released date is ${manifest.released}`
    );
  }
  return errors;
}

function collectTagErrors(version, tagName, requireTag = false) {
  if (!tagName) {
    return requireTag ? [`release tag missing; expected v${version}`] : [];
  }
  const expected = `v${version}`;
  return tagName === expected
    ? []
    : [`release tag mismatch (tag=${tagName} expected=${expected})`];
}

function tagFromEnvironment(environment = process.env) {
  if (environment.RELEASE_TAG) return environment.RELEASE_TAG;
  if (environment.GITHUB_REF_TYPE === 'tag') return environment.GITHUB_REF_NAME || '';
  const prefix = 'refs/tags/';
  if (environment.GITHUB_REF?.startsWith(prefix)) return environment.GITHUB_REF.slice(prefix.length);
  return '';
}

function trackedFiles(rootDir) {
  const output = childProcess.execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return output.split('\0').filter(Boolean);
}

function collectRepositorySecretErrors(rootDir = REPO_ROOT, options = {}) {
  const errors = [];
  let files = options.files;
  if (!files) {
    try {
      files = trackedFiles(rootDir);
    } catch (error) {
      return [`secret scan: could not list repository files (${error.message})`];
    }
  }

  const scanner = options.scanner || scanForSecrets;
  for (const relative of files) {
    const normalized = relative.replace(/\\/g, '/');
    if (SECRET_SCAN_EXCLUSIONS.has(normalized)) continue;

    const file = path.join(rootDir, relative);
    let stat;
    try {
      stat = fs.lstatSync(file);
    } catch (error) {
      // `git ls-files --cached` can report an index entry deleted in the
      // working tree. Scan the candidate contents that actually exist.
      if (error.code === 'ENOENT') continue;
      errors.push(`${normalized}: secret scan could not inspect file (${error.message})`);
      continue;
    }
    // Never follow repository symlinks and never try to read directories.
    if (!stat.isFile()) continue;

    let buffer;
    try {
      buffer = fs.readFileSync(file);
    } catch (error) {
      errors.push(`${normalized}: secret scan could not read file (${error.message})`);
      continue;
    }
    if (buffer.includes(0)) continue;

    for (const finding of scanner(buffer.toString('utf8'))) {
      errors.push(`${normalized}:${finding.line}: potential ${finding.type}`);
    }
  }
  return errors;
}

function collectReleaseMetadataErrors(rootDir = REPO_ROOT, options = {}) {
  let manifest;
  try {
    manifest = readJson(path.join(rootDir, 'manifest.json'));
  } catch (error) {
    return [`manifest.json: ${error.message}`];
  }

  const errors = [
    ...collectVersionErrors(rootDir),
    ...collectRosterErrors(manifest),
    ...collectCountClaimErrors(rootDir, manifest),
    ...collectChangelogErrors(rootDir, manifest),
    ...collectTagErrors(manifest.version, options.tagName, options.requireTag),
  ];
  if (options.scanSecrets !== false) {
    errors.push(...collectRepositorySecretErrors(rootDir, options.secretScanOptions));
  }
  return errors;
}

function parseArgs(argv) {
  const options = {
    requireTag: false,
    scanSecrets: true,
    tagName: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--require-tag') options.requireTag = true;
    else if (arg === '--skip-secret-scan') options.scanSecrets = false;
    else if (arg === '--tag') {
      index += 1;
      if (!argv[index]) throw new Error('--tag requires a value');
      options.tagName = argv[index];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Release metadata FAILED:\n  - ${error.message}`);
    process.exit(1);
  }
  if (!options.tagName) options.tagName = tagFromEnvironment();

  const errors = collectReleaseMetadataErrors(REPO_ROOT, options);
  if (errors.length) {
    console.error('Release metadata FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const manifest = readJson(path.join(REPO_ROOT, 'manifest.json'));
  const agentCount = manifest.agents.orchestrators.length + manifest.agents.specialists.length;
  console.log(
    `Release metadata OK (${agentCount} subagents, ${manifest.commands.length} skills, version ${manifest.version})`
  );
}

if (require.main === module) main();

module.exports = {
  SECRET_SCAN_EXCLUSIONS,
  collectChangelogErrors,
  collectCountClaimErrors,
  collectReleaseMetadataErrors,
  collectRepositorySecretErrors,
  collectRosterErrors,
  collectTagErrors,
  collectVersionErrors,
  descriptionStrings,
  extractCountClaims,
  parseArgs,
  tagFromEnvironment,
};
