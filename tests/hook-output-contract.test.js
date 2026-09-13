'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

describe('hook-free plugin contract', () => {
  test.each(['spk', 'spk-codex'])('%s registers no automatic runtime events', plugin => {
    const root = path.join(ROOT, 'plugins', plugin);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8')))
      .toEqual({ hooks: {} });
    const manifest = JSON.parse(fs.readFileSync(path.join(root,
      plugin === 'spk' ? '.claude-plugin/plugin.json' : '.codex-plugin/plugin.json'), 'utf8'));
    expect(manifest.hooks).toBeUndefined();
    expect(manifest.userConfig).toBeUndefined();
  });

  test('explicit secret checks still block secret-bearing proposed wiki content', () => {
    const result = spawnSync(process.execPath, [
      path.join(ROOT, 'plugins/spk/scripts/wiki-secret-scan.cjs'),
    ], {
      input: JSON.stringify({
        tool_name: 'Write',
        tool_input: {
          file_path: '/repo/ai_context/wiki/notes.md',
          content: 'leaked key: AKIAABCDEFGHIJKLMNOP',
        },
      }),
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('aws_access_key');
    expect(result.stderr).not.toContain('AKIAABCDEFGHIJKLMNOP');
  });

  test.each(['ask-project', 'add-knowledge', 'check-wiki'])('%s uses canonical project knowledge', id => {
    const body = fs.readFileSync(path.join(ROOT, 'plugins/spk/skills', id, 'SKILL.md'), 'utf8');
    expect(body).toContain('CONTEXT.md');
    expect(body).toContain('ADR');
    expect(body).not.toContain('.spk-wiki-build');
    expect(body).not.toContain('ai_context/wiki/index.md');
  });
});
