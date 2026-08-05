// spk/scripts/verify-grep-gates.cjs
const fs = require('fs');
const path = require('path');

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'coverage') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, files);
    else if (/\.(md|json|js|cjs|mjs|ts|yml|yaml|sh|toml|hbs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function runGate(rootDir, { pattern, name, flags = 'i', excludePaths = [] }) {
  const re = new RegExp(pattern, flags);
  const abs = path.resolve(rootDir);
  const excludes = new Set(excludePaths.map(p => path.resolve(abs, p)));
  const files = walkFiles(abs);
  const hits = [];
  for (const file of files) {
    if (excludes.has(file)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    const matches = text.split('\n').map((line, i) => ({ line, num: i + 1 })).filter(l => re.test(l.line));
    if (matches.length) {
      hits.push({ file: path.relative(abs, file), matches });
    }
  }
  return { name, passed: hits.length === 0, hits };
}

// Gate config + test fixtures self-exempt — the script and its tests
// necessarily contain the literal patterns they detect in user code.
const GATES = [
  { pattern: 'ralph',             name: 'no-ralph',        flags: 'i',
    excludePaths: [
      'docs/changelog-v3.0.md',
      'CHANGELOG.md',
      'INSTALL_FOR_AGENTS.md',
      'scripts/verify-grep-gates.cjs',
      'tests/verify-grep-gates.test.js'
    ] },
  { pattern: 'ai-sprint-kit',     name: 'no-old-slug',     flags: 'i',
    excludePaths: [
      'README.md',
      'docs/changelog-v3.0.md',
      'CHANGELOG.md',
      'INSTALL_FOR_AGENTS.md',
      'RESOLVER.md',
      'manifest.json',
      'scripts/verify-grep-gates.cjs',
      'plugins/spk/.claude-plugin/plugin.json'
    ] },
  { pattern: '^model:\\s+(opus|sonnet|haiku)\\s*$', name: 'no-alias-models', flags: 'm' }
];

function main() {
  const rootDir = path.join(__dirname, '..');
  let allPassed = true;
  for (const gate of GATES) {
    const result = runGate(rootDir, gate);
    if (!result.passed) {
      allPassed = false;
      console.error(`FAIL: ${gate.name} — ${result.hits.length} file(s) matched`);
      for (const h of result.hits) {
        for (const m of h.matches) {
          console.error(`  ${h.file}:${m.num}  ${m.line.trim()}`);
        }
      }
    } else {
      console.log(`PASS: ${gate.name}`);
    }
  }
  if (!allPassed) process.exit(1);
}

if (require.main === module) main();

module.exports = { runGate, walkFiles, GATES };
