// scripts/verify-reference-integrity.cjs
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const COMMAND_REF_RE = /\/spk:([a-z][a-z0-9-]*)/g;
const SPK_REF_RE = /(?<!\/)\bspk:([a-z][a-z0-9-]*)/g;
const MARKDOWN_LINK_RE = /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g;
const SCRIPT_REF_RE = /\bscripts\/([A-Za-z0-9][\w.-]*\.cjs)\b/g;
const CANONICAL_SCRIPTS_DIR = 'plugins/spk/scripts';

const DEFAULT_SCAN_ROOTS = [
  'README.md',
  'README-EN.md',
  'USER_GUIDE.md',
  'USER_GUIDE-EN.md',
  'CHANGELOG.md',
  'INSTALL_FOR_AGENTS.md',
  'RESOLVER.md',
  'docs',
  'plugins/spk',
  'plugins/spk-codex',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function isTextFile(file) {
  return file.endsWith('.md') || file.endsWith('.json');
}

function isUnderScanRoots(file, scanRoots = DEFAULT_SCAN_ROOTS) {
  return scanRoots.some(root => file === root || file.startsWith(`${root}/`));
}

function walkFiles(rootDir, scanRoots = DEFAULT_SCAN_ROOTS) {
  const results = [];
  for (const root of scanRoots) {
    const abs = path.join(rootDir, root);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      if (isTextFile(root)) results.push(root);
      continue;
    }
    const stack = [root];
    while (stack.length) {
      const relDir = stack.pop();
      const absDir = path.join(rootDir, relDir);
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        const rel = path.join(relDir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) stack.push(rel);
        else if (entry.isFile() && isTextFile(rel)) results.push(rel);
      }
    }
  }
  return results.sort();
}

function listTrackedScanFiles(rootDir = REPO_ROOT, scanRoots = DEFAULT_SCAN_ROOTS) {
  const files = new Set(walkFiles(rootDir, scanRoots));
  try {
    const output = childProcess.execFileSync('git', ['ls-files'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const file of output.split('\n')) {
      if (file && isTextFile(file) && isUnderScanRoots(file, scanRoots)) files.add(file);
    }
  } catch {
    // Non-git fixtures still use filesystem walking above.
  }
  return [...files].sort();
}

function buildRegistry(rootDir = REPO_ROOT) {
  const manifest = readJson(path.join(rootDir, 'manifest.json'));
  const commands = new Set(manifest.commands.map(cmd => cmd.name.replace(/^\//, '')));
  const agents = new Set([
    ...manifest.agents.orchestrators.map(agent => agent.name),
    ...manifest.agents.specialists.map(agent => agent.name),
  ]);
  return { commands, agents };
}

function isPackagedSkillFile(relFile) {
  const packaged = relFile.startsWith('plugins/spk/skills/') ||
    relFile.startsWith('plugins/spk-codex/skills/');
  return packaged && ['SKILL.md', 'UPSTREAM.md'].includes(path.basename(relFile));
}

// Only the canonical (hand-authored) payload is checked against the real
// scripts/ directory. The generated Codex payload (plugins/spk-codex/) is a
// mechanical copy produced by generate-platform-artifacts.cjs and verified
// against its own source by `npm run verify:platforms`; re-checking it here
// would just re-report the same drift under a rule this script cannot fix.
function isCanonicalSkillFile(relFile) {
  return relFile.startsWith('plugins/spk/skills/') && path.basename(relFile) === 'SKILL.md';
}

function localMarkdownTarget(rawTarget) {
  const withoutFragment = rawTarget.split('#', 1)[0];
  if (!withoutFragment || withoutFragment.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(withoutFragment)) {
    return null;
  }
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function collectReferencesFromFile(rootDir, relFile) {
  const content = fs.readFileSync(path.join(rootDir, relFile), 'utf-8');
  const refs = [];

  content.split('\n').forEach((line, idx) => {
    COMMAND_REF_RE.lastIndex = 0;
    let commandMatch;
    while ((commandMatch = COMMAND_REF_RE.exec(line)) !== null) {
      refs.push({ type: 'command', name: commandMatch[1], file: relFile, line: idx + 1 });
    }

    SPK_REF_RE.lastIndex = 0;
    let spkMatch;
    while ((spkMatch = SPK_REF_RE.exec(line)) !== null) {
      refs.push({ type: 'spk', name: spkMatch[1], file: relFile, line: idx + 1 });
    }

    if (isPackagedSkillFile(relFile)) {
      MARKDOWN_LINK_RE.lastIndex = 0;
      let linkMatch;
      while ((linkMatch = MARKDOWN_LINK_RE.exec(line)) !== null) {
        const target = localMarkdownTarget(linkMatch[1] || linkMatch[2]);
        if (target) {
          refs.push({ type: 'local', target, file: relFile, line: idx + 1 });
        }
      }
    }

    if (isCanonicalSkillFile(relFile)) {
      SCRIPT_REF_RE.lastIndex = 0;
      let scriptMatch;
      while ((scriptMatch = SCRIPT_REF_RE.exec(line)) !== null) {
        refs.push({ type: 'script', name: scriptMatch[1], file: relFile, line: idx + 1 });
      }
    }
  });

  return refs;
}

function collectResolverCoverageErrors(rootDir = REPO_ROOT) {
  const resolverPath = path.join(rootDir, 'RESOLVER.md');
  if (!fs.existsSync(resolverPath)) return ['RESOLVER.md: missing resolver file'];

  const resolver = fs.readFileSync(resolverPath, 'utf-8');
  const { commands } = buildRegistry(rootDir);
  const errors = [];

  for (const command of [...commands].sort()) {
    if (!resolver.includes(`/spk:${command}`)) {
      errors.push(`RESOLVER.md: missing /spk:${command} command coverage`);
    }
  }

  return errors;
}

function collectReferenceIntegrityErrors(rootDir = REPO_ROOT, files = null) {
  const { commands, agents } = buildRegistry(rootDir);
  const scanFiles = files || listTrackedScanFiles(rootDir);
  const errors = [];

  if (files === null) {
    errors.push(...collectResolverCoverageErrors(rootDir));
  }

  for (const file of scanFiles) {
    for (const ref of collectReferencesFromFile(rootDir, file)) {
      if (ref.type === 'local') {
        const source = path.resolve(rootDir, ref.file);
        const target = path.resolve(path.dirname(source), ref.target);
        if (path.basename(source) === 'UPSTREAM.md' && source === target) {
          errors.push(
            `${ref.file}:${ref.line}: local reference points to itself: ${ref.target}`,
          );
        } else if (
          !fs.existsSync(target) &&
          (path.basename(source) === 'SKILL.md' || path.extname(ref.target) !== '')
        ) {
          errors.push(`${ref.file}:${ref.line}: missing local reference ${ref.target}`);
        }
      } else if (ref.type === 'command') {
        if (!commands.has(ref.name)) {
          errors.push(`${ref.file}:${ref.line}: unknown /spk:${ref.name} command`);
        }
      } else if (ref.type === 'script') {
        const target = path.resolve(rootDir, CANONICAL_SCRIPTS_DIR, ref.name);
        if (!fs.existsSync(target)) {
          errors.push(
            `${ref.file}:${ref.line}: missing script reference scripts/${ref.name} ` +
            `(expected ${CANONICAL_SCRIPTS_DIR}/${ref.name})`,
          );
        }
      } else if (!commands.has(ref.name) && !agents.has(ref.name)) {
        errors.push(`${ref.file}:${ref.line}: unknown spk:${ref.name} reference`);
      }
    }
  }

  return errors;
}

function main() {
  const errors = collectReferenceIntegrityErrors(REPO_ROOT);
  if (errors.length) {
    console.error('SPK reference integrity FAILED:');
    errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }

  const files = listTrackedScanFiles(REPO_ROOT);
  console.log(`SPK reference integrity OK (${files.length} tracked docs/plugin files checked)`);
}

if (require.main === module) main();

module.exports = {
  DEFAULT_SCAN_ROOTS,
  CANONICAL_SCRIPTS_DIR,
  collectReferenceIntegrityErrors,
  collectReferencesFromFile,
  collectResolverCoverageErrors,
  isUnderScanRoots,
  isPackagedSkillFile,
  isCanonicalSkillFile,
  listTrackedScanFiles,
  localMarkdownTarget,
};
