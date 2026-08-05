// scripts/install/migrate-v2.cjs
// Migrate a v2 SPK project layout to v3 wiki layout.
// Idempotent: safe to re-run.

const fs = require('fs');
const path = require('path');

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'untitled';
}

function splitMarkdownByHeadings(content) {
  const parts = [];
  const lines = content.split('\n');
  let current = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (current) parts.push(current);
      current = { title: h[1], body: '' };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) parts.push(current);
  return parts;
}

function writeWikiPage(outDir, type, title, body, sourcePath) {
  const slug = slugify(title);
  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    '---',
    `title: ${title}`,
    `type: ${type}`,
    `updated: ${today}`,
    `sources: [${sourcePath || ''}]`,
    'links: []',
    '---',
    ''
  ].join('\n');
  const content = frontmatter + body.trim() + '\n';
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${slug}.md`);
  fs.writeFileSync(outFile, content);
  return outFile;
}

function backupAndSplit(projectRoot, inputRel, outType, outSubdir) {
  const input = path.join(projectRoot, inputRel);
  if (!fs.existsSync(input)) return 0;

  const backupDir = path.join(projectRoot, 'ai_context/memory.v2.backup');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(input, path.join(backupDir, path.basename(input)));

  const content = fs.readFileSync(input, 'utf-8');
  const parts = splitMarkdownByHeadings(content);
  const outDir = path.join(projectRoot, 'ai_context/wiki', outSubdir);
  for (const p of parts) {
    writeWikiPage(outDir, outType, p.title, p.body, inputRel);
  }
  fs.rmSync(input);
  return parts.length;
}

function moveReports(projectRoot) {
  const reportsOld = path.join(projectRoot, 'ai_context/reports');
  if (!fs.existsSync(reportsOld)) return 0;
  const reportsNew = path.join(projectRoot, 'ai_context/sources/reports');
  fs.mkdirSync(reportsNew, { recursive: true });
  let count = 0;
  for (const f of fs.readdirSync(reportsOld)) {
    fs.renameSync(path.join(reportsOld, f), path.join(reportsNew, f));
    count++;
  }
  fs.rmdirSync(reportsOld);
  return count;
}

function dropActive(projectRoot) {
  const activeFile = path.join(projectRoot, 'ai_context/memory/active.md');
  if (fs.existsSync(activeFile)) fs.rmSync(activeFile);
}

function migrateV2(projectRoot) {
  const result = {
    learnings: backupAndSplit(projectRoot, 'ai_context/memory/learning.md', 'learning', 'learnings'),
    decisions: backupAndSplit(projectRoot, 'ai_context/memory/decisions.md', 'decision', 'decisions'),
    reports: moveReports(projectRoot),
    migrated: 0
  };
  dropActive(projectRoot);
  result.migrated = result.learnings + result.decisions + result.reports;
  return result;
}

function main() {
  const root = process.argv[2] || process.cwd();
  const result = migrateV2(root);
  console.log(`Migration complete: ${result.migrated} items moved`);
  console.log(`  - ${result.learnings} learnings`);
  console.log(`  - ${result.decisions} decisions`);
  console.log(`  - ${result.reports} report files moved to sources/`);
  if (result.migrated === 0) console.log('  (no v2 files found — nothing to migrate)');
}

if (require.main === module) main();

module.exports = { migrateV2, splitMarkdownByHeadings, slugify };
