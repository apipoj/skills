// scripts/verify-skill-descriptions.cjs
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'plugins', 'spk', 'skills');
const MIN_DESCRIPTION_CHARS = 50;
const MAX_DESCRIPTION_CHARS = 220;
const FORBIDDEN_DESCRIPTION_RE = /\b(TODO|FIXME|XXX|WIP)\b/i;
const INSTRUCTIONAL_PREFIX_RE = /^\s*['"]?Use\s+this\s+(when|skill|for|to)\b/i;

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return fm;
}

function listSkillFiles(rootDir = REPO_ROOT) {
  const skillsDir = path.join(rootDir, 'plugins', 'spk', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(skillsDir, entry.name, 'SKILL.md'))
    .filter(file => fs.existsSync(file))
    .sort();
}

function collectSkillDescriptionErrors(rootDir = REPO_ROOT, files = null) {
  const skillFiles = files || listSkillFiles(rootDir);
  const errors = [];

  for (const file of skillFiles) {
    const rel = path.relative(rootDir, file);
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      errors.push(`${rel}: missing or malformed frontmatter`);
      continue;
    }
    const description = fm.description || '';
    if (!description) {
      errors.push(`${rel}: missing description`);
      continue;
    }
    if (description.length < MIN_DESCRIPTION_CHARS) {
      errors.push(`${rel}: description too short (${description.length} chars, min ${MIN_DESCRIPTION_CHARS})`);
    }
    if (description.length > MAX_DESCRIPTION_CHARS) {
      errors.push(`${rel}: description too long (${description.length} chars, max ${MAX_DESCRIPTION_CHARS})`);
    }
    if (FORBIDDEN_DESCRIPTION_RE.test(description)) {
      errors.push(`${rel}: description contains TODO/FIXME/XXX/WIP marker`);
    }
    if (INSTRUCTIONAL_PREFIX_RE.test(description)) {
      errors.push(`${rel}: description starts with instructional "Use this..." prefix; lead with capability instead`);
    }
  }

  return errors;
}

function main() {
  const files = listSkillFiles(REPO_ROOT);
  const errors = collectSkillDescriptionErrors(REPO_ROOT, files);
  if (errors.length) {
    console.error('SPK skill description lint FAILED:');
    errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }
  console.log(`SPK skill descriptions OK (${files.length} skills checked)`);
}

if (require.main === module) main();

module.exports = {
  collectSkillDescriptionErrors,
  listSkillFiles,
  parseFrontmatter,
  MIN_DESCRIPTION_CHARS,
  MAX_DESCRIPTION_CHARS,
};
