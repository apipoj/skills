const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'contracts', 'workflows.json'), 'utf8'));

const FORBIDDEN_TOKENS = [
  'Task(',
  'Task (',
  'subagent_type',
  'spk:',
  '/plugin ',
];
const THAI_CHAR_RE = /[\u0E00-\u0E7F]/;
const DOC_FILES = ['README.md', 'README-EN.md', 'INSTALL_FOR_AGENTS.md'];

function missingFromDocs(ids, content) {
  return ids.filter(id => {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|[^a-z0-9-])/spk:${escaped}([^a-z0-9-]|$)`).test(content);
  }).sort();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([a-z-]+):\s*(.+)$/);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  return fields;
}

function checkForbiddenTokens(content) {
  const hits = [];
  content.split('\n').forEach((line, index) => {
    for (const token of FORBIDDEN_TOKENS) {
      if (line.includes(token)) hits.push({ line: index + 1, token, text: line.trim() });
    }
  });
  return hits;
}

function findSkillFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) findSkillFiles(target, files);
    else if (entry.isFile() && entry.name === 'SKILL.md') files.push(target);
  }
  return files;
}

function collectNativeSkillErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const errors = [];
  const expectedFiles = new Set();

  for (const skill of contract.skills) {
    const relative = path.join(skill.sources.th, 'SKILL.md');
    const file = path.join(rootDir, relative);
    expectedFiles.add(path.resolve(file));
    if (!fs.existsSync(file)) {
      errors.push(`MISSING Thai skill: ${relative}`);
      continue;
    }
    const content = fs.readFileSync(file, 'utf8');
    const metadata = parseFrontmatter(content);
    if (!metadata) errors.push(`${relative}: missing frontmatter`);
    else {
      if (metadata.name !== skill.id) errors.push(`${relative}: name must be ${skill.id}`);
      if (!metadata.description) errors.push(`${relative}: missing description`);
    }
    const body = content.replace(/^---\n[\s\S]+?\n---/, '');
    if (!THAI_CHAR_RE.test(body)) errors.push(`${relative}: body lacks native Thai content`);
    for (const hit of checkForbiddenTokens(content)) {
      errors.push(`${relative}:${hit.line}: forbidden token "${hit.token}"`);
    }
  }

  for (const file of findSkillFiles(path.join(rootDir, 'skills'))) {
    if (!expectedFiles.has(path.resolve(file))) {
      errors.push(`ORPHAN Thai skill: ${path.relative(rootDir, file)}`);
    }
  }

  const ids = contract.skills.map(skill => skill.id);
  for (const doc of DOC_FILES) {
    const file = path.join(rootDir, doc);
    if (!fs.existsSync(file)) {
      errors.push(`MISSING doc file: ${doc}`);
      continue;
    }
    for (const id of missingFromDocs(ids, fs.readFileSync(file, 'utf8'))) {
      errors.push(`${doc}: /spk:${id} is not listed`);
    }
  }
  return errors;
}

function main() {
  const errors = collectNativeSkillErrors();
  if (errors.length) {
    console.error('Native skills verification FAILED:');
    errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }
  console.log(`Native skills OK (${CONTRACT.skills.length} Thai-first skills verified across bucketed sources)`);
}

if (require.main === module) main();

module.exports = {
  DOC_FILES,
  FORBIDDEN_TOKENS,
  THAI_CHAR_RE,
  checkForbiddenTokens,
  collectNativeSkillErrors,
  findSkillFiles,
  missingFromDocs,
  parseFrontmatter,
};
