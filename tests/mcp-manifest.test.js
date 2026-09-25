// tests/mcp-manifest.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLAUDE_MCP_JSON = path.join(ROOT, 'plugins', 'spk', '.mcp.json');
const CODEX_MCP_JSON = path.join(ROOT, 'plugins', 'spk-codex', '.mcp.json');
const CODEX_PLUGIN_JSON = path.join(ROOT, 'plugins', 'spk-codex', '.codex-plugin', 'plugin.json');

describe('default plugin installation', () => {
  test('does not register a local MCP server in either host', () => {
    expect(fs.existsSync(CLAUDE_MCP_JSON)).toBe(false);
    expect(fs.existsSync(CODEX_MCP_JSON)).toBe(false);
    expect(JSON.parse(fs.readFileSync(CODEX_PLUGIN_JSON, 'utf-8'))).not.toHaveProperty('mcpServers');
  });

  test('retains the codebase-search implementation for explicit use', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'plugins', 'spk', 'mcp', 'codebase-search.cjs')),
    ).toBe(true);
  });
});
