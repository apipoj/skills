// tests/command-manifest-sync.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const PLUGIN_ROOT = path.join(REPO_ROOT, 'plugins', 'spk');
const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifest.json'), 'utf-8'));

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function extractPrecomputedCommands(content) {
  return [...content.matchAll(/^!`([^`]+)`$/gm)].map(m => m[1]);
}

const GIT_COMMAND_RE = /(^|[;&|() ])git(?=\s|$)/;

describe('command manifest sync', () => {
  test.each(manifest.commands.map(c => [c.name, c]))('%s has matching SKILL.md', (name, cmd) => {
    const slug = name.replace(/^\//, '');
    const file = path.join(PLUGIN_ROOT, 'skills', slug, 'SKILL.md');
    expect(fs.existsSync(file)).toBe(true);

    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm.description).toBeTruthy();
  });

  test('no orphan skill dirs in plugins/spk/skills/', () => {
    const expected = new Set(manifest.commands.map(c => c.name.replace(/^\//, '')));
    const actual = fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const dir of actual) {
      expect(expected.has(dir)).toBe(true);
    }
  });

  test.each(manifest.commands.map(c => [c.name, c]))('%s git pre-computed context is optional outside git worktrees', (name) => {
    const slug = name.replace(/^\//, '');
    const file = path.join(PLUGIN_ROOT, 'skills', slug, 'SKILL.md');
    const content = fs.readFileSync(file, 'utf-8');
    const gitCommands = extractPrecomputedCommands(content).filter(command => GIT_COMMAND_RE.test(command));
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-non-git-'));

    try {
      for (const command of gitCommands) {
        expect(() => {
          childProcess.execFileSync('sh', ['-c', command], {
            cwd: tmpDir,
            stdio: 'pipe'
          });
        }).not.toThrow();
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
