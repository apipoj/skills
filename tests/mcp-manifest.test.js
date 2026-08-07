// tests/mcp-manifest.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MCP_JSON = path.join(ROOT, 'plugins', 'spk', '.mcp.json');

describe('plugin .mcp.json', () => {
  let mcp;
  beforeAll(() => {
    mcp = JSON.parse(fs.readFileSync(MCP_JSON, 'utf-8'));
  });

  test('declares spk-codebase-search over the host Node lookup', () => {
    const s = mcp.mcpServers['spk-codebase-search'];
    expect(s).toBeTruthy();
    expect(s.command).toBe('node');
    expect(s.args[0]).toMatch(/\$\{CLAUDE_PLUGIN_ROOT\}\/mcp\/codebase-search\.cjs/);
  });

  test('entry file referenced by manifest exists', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'plugins', 'spk', 'mcp', 'codebase-search.cjs')),
    ).toBe(true);
  });

  test('is valid JSON with no extra top-level keys beyond mcpServers', () => {
    expect(Object.keys(mcp)).toEqual(['mcpServers']);
  });
});
