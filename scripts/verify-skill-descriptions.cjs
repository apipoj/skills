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
  const normalized = content.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\s*\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return fm;
}

// Claude Code and the skills.sh adapters parse this frontmatter as YAML, so a
// value that only looks fine to our own regex can still break an installer.
// Frontmatter here is uniformly flat `key: value`, which lets us enforce a
// house rule that is strictly narrower than YAML and therefore always parses:
// a value is either properly quoted, or a plain scalar free of the constructs
// that change how YAML reads it.
const YAML_INDICATOR_CHARS = '-?:,[]{}#&*!|>%@`';

function frontmatterValueError(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const quote = trimmed[0];
  if (quote === '"' || quote === "'") {
    if (trimmed.length < 2 || !trimmed.endsWith(quote)) return 'unterminated quote';
    const inner = trimmed.slice(1, -1);
    // A closing quote mid-value means the rest sits outside the scalar.
    const stray = quote === '"' ? /(?<!\\)"/.test(inner) : /''/.test(inner) === false && inner.includes("'");
    return stray ? `stray ${quote === '"' ? 'double' : 'single'} quote inside a quoted value` : null;
  }

  if (YAML_INDICATOR_CHARS.includes(trimmed[0])) {
    return `starts with the YAML indicator character "${trimmed[0]}" — quote the value`;
  }
  if (trimmed.includes(': ')) {
    return 'unquoted value contains ": ", which YAML reads as a second key — quote it or rephrase';
  }
  if (trimmed.endsWith(':')) {
    return 'unquoted value ends with ":", which YAML reads as a key — quote it or rephrase';
  }
  if (trimmed.includes(' #')) {
    return 'unquoted value contains " #", which YAML reads as a comment — quote it or rephrase';
  }
  return null;
}

function collectFrontmatterYamlErrors(rootDir = REPO_ROOT, files = null) {
  const skillFiles = files || listSkillFiles(rootDir);
  const errors = [];

  for (const file of skillFiles) {
    const rel = path.relative(rootDir, file);
    const normalized = fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');
    const m = normalized.match(/^---\s*\n([\s\S]+?)\n---/);
    if (!m) {
      errors.push(`${rel}: missing or malformed frontmatter`);
      continue;
    }
    for (const line of m[1].split('\n')) {
      if (line.trim() === '') continue;
      const kv = line.match(/^([A-Za-z_-]+):(.*)$/);
      if (!kv) {
        errors.push(`${rel}: frontmatter line is not a "key: value" pair — ${JSON.stringify(line.slice(0, 60))}`);
        continue;
      }
      const problem = frontmatterValueError(kv[2]);
      if (problem) errors.push(`${rel}: ${kv[1]}: ${problem}`);
    }
  }

  return errors;
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
  const errors = [
    ...collectFrontmatterYamlErrors(REPO_ROOT, files),
    ...collectSkillDescriptionErrors(REPO_ROOT, files),
  ];
  if (errors.length) {
    console.error('SPK skill description lint FAILED:');
    errors.forEach(error => console.error('  -', error));
    process.exit(1);
  }
  console.log(`SPK skill descriptions OK (${files.length} skills checked)`);
}

if (require.main === module) main();

module.exports = {
  collectFrontmatterYamlErrors,
  collectSkillDescriptionErrors,
  frontmatterValueError,
  listSkillFiles,
  parseFrontmatter,
  MIN_DESCRIPTION_CHARS,
  MAX_DESCRIPTION_CHARS,
};
