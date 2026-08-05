const { migrateV2, splitMarkdownByHeadings } = require('../scripts/install/migrate-v2.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeV2Project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-migrate-'));
  fs.mkdirSync(path.join(dir, 'ai_context/memory'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ai_context/memory/learning.md'),
    '# Lessons\n\n### N+1 Query Incident\n\nDashboard had N+1 queries.\n\n### Test Timing Flake\n\nTimezone-sensitive tests.\n'
  );
  fs.writeFileSync(
    path.join(dir, 'ai_context/memory/decisions.md'),
    '# Decisions\n\n### Use Supabase\n\nChose Supabase for auth + db.\n'
  );
  fs.writeFileSync(
    path.join(dir, 'ai_context/memory/active.md'),
    'current session state'
  );
  fs.mkdirSync(path.join(dir, 'ai_context/reports'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'ai_context/reports/old-report.md'), 'report');
  return dir;
}

describe('splitMarkdownByHeadings', () => {
  test('splits on ### headers', () => {
    const md = '# H1\n\n### First\n\ncontent 1\n\n### Second\n\ncontent 2';
    const parts = splitMarkdownByHeadings(md);
    expect(parts).toHaveLength(2);
    expect(parts[0].title).toBe('First');
    expect(parts[0].body).toContain('content 1');
    expect(parts[1].title).toBe('Second');
    expect(parts[1].body).toContain('content 2');
  });

  test('handles no headings by returning empty list', () => {
    expect(splitMarkdownByHeadings('plain text')).toEqual([]);
  });
});

describe('migrateV2', () => {
  test('splits learning.md into wiki/learnings/*.md', () => {
    const dir = makeV2Project();
    migrateV2(dir);
    const learningsDir = path.join(dir, 'ai_context/wiki/learnings');
    expect(fs.existsSync(learningsDir)).toBe(true);
    const files = fs.readdirSync(learningsDir);
    expect(files.length).toBe(2);
    const first = fs.readFileSync(path.join(learningsDir, files[0]), 'utf-8');
    expect(first).toMatch(/type: learning/);
    expect(first).toMatch(/N\+1|Test Timing/);
  });

  test('splits decisions.md into wiki/decisions/*.md', () => {
    const dir = makeV2Project();
    migrateV2(dir);
    const decisionsDir = path.join(dir, 'ai_context/wiki/decisions');
    const files = fs.readdirSync(decisionsDir);
    expect(files.length).toBe(1);
    const content = fs.readFileSync(path.join(decisionsDir, files[0]), 'utf-8');
    expect(content).toMatch(/type: decision/);
    expect(content).toMatch(/Supabase/);
  });

  test('drops active.md', () => {
    const dir = makeV2Project();
    migrateV2(dir);
    expect(fs.existsSync(path.join(dir, 'ai_context/wiki/active.md'))).toBe(false);
  });

  test('moves reports/ under sources/reports/', () => {
    const dir = makeV2Project();
    migrateV2(dir);
    expect(fs.existsSync(path.join(dir, 'ai_context/sources/reports/old-report.md'))).toBe(true);
  });

  test('backs up v2 memory to memory.v2.backup/', () => {
    const dir = makeV2Project();
    migrateV2(dir);
    expect(fs.existsSync(path.join(dir, 'ai_context/memory.v2.backup/learning.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'ai_context/memory.v2.backup/decisions.md'))).toBe(true);
  });

  test('no-op when no v2 files exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-novs-'));
    const result = migrateV2(dir);
    expect(result.migrated).toBe(0);
  });
});
