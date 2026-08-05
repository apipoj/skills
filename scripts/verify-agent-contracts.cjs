// scripts/verify-agent-contracts.cjs
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(REPO_ROOT, 'plugins', 'spk', 'agents');
const REQUIRED_STATUS_TOKENS = [
  '**Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT',
  '**Summary:**',
  '**Concerns/Blockers:**',
];

function listAgentFiles(rootDir = REPO_ROOT) {
  const agentsDir = path.join(rootDir, 'plugins', 'spk', 'agents');
  if (!fs.existsSync(agentsDir)) return [];
  return fs.readdirSync(agentsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(agentsDir, file))
    .sort();
}

function collectAgentContractErrors(rootDir = REPO_ROOT, files = null) {
  const agentFiles = files || listAgentFiles(rootDir);
  const errors = [];

  for (const file of agentFiles) {
    const rel = path.relative(rootDir, file);
    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('## Completion Status Protocol')) {
      errors.push(`${rel}: missing Completion Status Protocol section`);
    }
    for (const token of REQUIRED_STATUS_TOKENS) {
      if (!content.includes(token)) {
        errors.push(`${rel}: missing status contract token "${token}"`);
      }
    }
  }

  return errors;
}

function main() {
  const files = listAgentFiles(REPO_ROOT);
  const errors = collectAgentContractErrors(REPO_ROOT, files);
  if (errors.length) {
    console.error('SPK agent contract verification FAILED:');
    errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }
  console.log(`SPK agent contracts OK (${files.length} agents checked)`);
}

if (require.main === module) main();

module.exports = { collectAgentContractErrors, listAgentFiles, REQUIRED_STATUS_TOKENS };
