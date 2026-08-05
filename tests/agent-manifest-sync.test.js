// tests/agent-manifest-sync.test.js
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const PLUGIN_ROOT = path.join(REPO_ROOT, 'plugins', 'spk');
const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifest.json'), 'utf-8'));

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

describe('agent manifest sync', () => {
  const allAgents = [
    ...manifest.agents.orchestrators,
    ...manifest.agents.specialists
  ];

  test.each(allAgents.map(a => [a.name, a]))('%s has matching .md file', (name, agent) => {
    const file = path.join(PLUGIN_ROOT, 'agents', `${name}.md`);
    expect(fs.existsSync(file)).toBe(true);

    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm.name).toBe(agent.name);
    expect(fm.model).toBe(agent.model);
    expect(fm.color).toBe(agent.color);
    expect(fm.description).toBeTruthy();
  });

  test('no orphan .md files in plugins/spk/agents/', () => {
    const expected = new Set(allAgents.map(a => `${a.name}.md`));
    const actual = fs.readdirSync(path.join(PLUGIN_ROOT, 'agents')).filter(f => f.endsWith('.md'));
    for (const f of actual) {
      expect(expected.has(f)).toBe(true);
    }
  });
});
