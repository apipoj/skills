// scripts/install/smoke-test.cjs
// Structural smoke test: verifies an SPK v3 install is complete.

const fs = require('fs');
const path = require('path');

function runSmokeTest(projectRoot) {
  const failures = [];
  const manifestPath = path.join(projectRoot, '.spk/manifest.json');

  if (!fs.existsSync(manifestPath)) {
    failures.push(`MISSING: .spk/manifest.json`);
    return { passed: false, failures, checks: 1 };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    failures.push(`INVALID: .spk/manifest.json is not valid JSON`);
    return { passed: false, failures, checks: 1 };
  }

  const allAgents = [...manifest.agents.orchestrators, ...manifest.agents.specialists];
  for (const a of allAgents) {
    const f = path.join(projectRoot, `.claude/agents/${a.name}.md`);
    if (!fs.existsSync(f)) failures.push(`MISSING agent: .claude/agents/${a.name}.md`);
  }

  for (const c of manifest.commands) {
    const slug = c.name.replace(/^\//, '');
    const f = path.join(projectRoot, `.claude/commands/${slug}.md`);
    if (!fs.existsSync(f)) failures.push(`MISSING command: .claude/commands/${slug}.md`);
  }

  const wikiFiles = ['index.md', 'log.md', 'SCHEMA.md'];
  for (const f of wikiFiles) {
    const fp = path.join(projectRoot, 'ai_context/wiki', f);
    if (!fs.existsSync(fp)) failures.push(`MISSING wiki file: ai_context/wiki/${f}`);
  }

  if (!fs.existsSync(path.join(projectRoot, 'ai_context/sources'))) {
    failures.push(`MISSING dir: ai_context/sources/`);
  }

  return {
    passed: failures.length === 0,
    failures,
    checks: allAgents.length + manifest.commands.length + wikiFiles.length + 2
  };
}

function main() {
  const root = process.argv[2] || process.cwd();
  const result = runSmokeTest(root);
  if (result.passed) {
    console.log(`SPK smoke test PASS (${result.checks} checks)`);
    process.exit(0);
  }
  console.error(`SPK smoke test FAIL (${result.failures.length} failures):`);
  result.failures.forEach(f => console.error('  -', f));
  process.exit(1);
}

if (require.main === module) main();

module.exports = { runSmokeTest };
