// tests/wiki-secret-scan.test.js
const {
  shouldBlock, isWikiPath, extractPatchOperations, MAX_MOVE_SOURCE_BYTES
} = require('../plugins/spk/scripts/wiki-secret-scan.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('wiki-secret-scan', () => {
  test('allows non-wiki paths even with secrets', () => {
    const result = shouldBlock({
      tool_name: 'Write',
      tool_input: { file_path: '/proj/.env', content: 'API_KEY=sk-abc123xyz789verylongsecretkey1234' }
    });
    expect(result.block).toBe(false);
  });

  test('blocks wiki write with OpenAI key', () => {
    const result = shouldBlock({
      tool_name: 'Write',
      tool_input: {
        file_path: '/proj/ai_context/wiki/entities/service.md',
        content: '# Service\n\napi: sk-abc123xyz789verylongsecretkey1234'
      }
    });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/secret/i);
  });

  test('allows clean wiki write', () => {
    const result = shouldBlock({
      tool_name: 'Write',
      tool_input: {
        file_path: '/proj/ai_context/wiki/entities/service.md',
        content: '# Service\n\nA friendly description.'
      }
    });
    expect(result.block).toBe(false);
  });

  test('allows redacted placeholder', () => {
    const result = shouldBlock({
      tool_name: 'Write',
      tool_input: {
        file_path: '/proj/ai_context/wiki/entities/service.md',
        content: 'api: <REDACTED:openai_api_key origin=sources/x.md:12>'
      }
    });
    expect(result.block).toBe(false);
  });

  test('ignores non-Write tools', () => {
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: '/proj/ai_context/wiki/x.md' }
    });
    expect(result.block).toBe(false);
  });

  test('Edit tool on wiki also scanned', () => {
    const result = shouldBlock({
      tool_name: 'Edit',
      tool_input: {
        file_path: '/proj/ai_context/wiki/concepts/auth.md',
        old_string: 'x',
        new_string: 'api=ghp_abcdefghijklmnopqrstuvwxyz0123456789'
      }
    });
    expect(result.block).toBe(true);
  });

  test.each([
    'ai_context/wiki/note.md',
    './ai_context/wiki/note.md',
    '/proj/tmp/../ai_context/wiki/note.md',
    'C:\\repo\\ai_context\\wiki\\note.md',
    '../project/ai_context/wiki/note.md'
  ])('normalizes relative, absolute, Windows, and traversal wiki path: %s', filePath => {
    expect(isWikiPath(filePath)).toBe(true);
    expect(shouldBlock({
      tool_name: 'Write',
      tool_input: {
        file_path: filePath,
        content: 'api=ghp_abcdefghijklmnopqrstuvwxyz0123456789'
      }
    }).block).toBe(true);
  });

  test.each([
    'ai_context/wiki/../sources/note.md',
    'ai_context/not-wiki/note.md',
    '/proj/my_ai_context/wiki/note.md'
  ])('does not confuse normalized non-wiki path: %s', filePath => {
    expect(isWikiPath(filePath)).toBe(false);
  });

  test('blocks secret-bearing Codex apply_patch additions to the wiki', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: ai_context/wiki/concepts/auth.md',
      '@@',
      '-old value',
      '+token=ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      '*** End Patch'
    ].join('\n');
    const result = shouldBlock({
      tool_name: 'apply_patch',
      tool_input: patch
    });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/apply_patch/);
    expect(result.reason).toMatch(/github_pat/);
  });

  test('blocks the canonical Codex tool_input.command payload', () => {
    const command = [
      '*** Begin Patch',
      '*** Add File: ai_context/wiki/leak.md',
      '+api=sk-abc123xyz789verylongsecretkey1234',
      '*** End Patch'
    ].join('\n');
    expect(shouldBlock({
      tool_name: 'apply_patch',
      tool_input: { command }
    }).block).toBe(true);
  });

  test('supports object apply_patch payloads, multiple files, and Windows paths', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: src/config.js',
      '@@',
      '+const safe = true;',
      '*** Add File: C:\\repo\\ai_context\\wiki\\leak.md',
      '+AWS=AKIAABCDEFGHIJKLMNOP',
      '*** End Patch'
    ].join('\n');
    expect(extractPatchOperations({ patch })).toHaveLength(2);
    expect(shouldBlock({
      toolName: 'functions.apply_patch',
      toolInput: { patch }
    }).block).toBe(true);
  });

  test('allows clean Codex patches and ignores secrets that are only removed', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: ai_context/wiki/concepts/auth.md',
      '@@',
      '-token=ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      '+token=<REDACTED:github_pat>',
      '*** End Patch'
    ].join('\n');
    expect(shouldBlock({
      tool_name: 'apply_patch',
      tool_input: { input: patch }
    }).block).toBe(false);
  });

  test('scans the destination of an apply_patch move into the wiki', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: notes/auth.md',
      '*** Move to: ai_context/wiki/auth.md',
      '@@',
      '+password=hunter2',
      '*** End Patch'
    ].join('\n');
    expect(shouldBlock({ tool_name: 'apply_patch', tool_input: { patch } }).block).toBe(true);
  });

  test('move-only apply_patch scans the validated source file before entering wiki', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-move-'));
    fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
    fs.mkdirSync(path.join(root, 'ai_context/wiki'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'notes/leak.md'),
      'token=ghp_abcdefghijklmnopqrstuvwxyz0123456789\n'
    );
    const patch = [
      '*** Begin Patch',
      '*** Update File: notes/leak.md',
      '*** Move to: ai_context/wiki/leak.md',
      '*** End Patch'
    ].join('\n');
    try {
      const result = shouldBlock({
        tool_name: 'apply_patch',
        tool_input: { command: patch }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/github_pat/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('move with harmless edits still scans unchanged source content', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-move-'));
    fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
    fs.mkdirSync(path.join(root, 'ai_context/wiki'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'notes/leak.md'),
      [
        'token=ghp_abcdefghijklmnopqrstuvwxyz0123456789',
        'title=old'
      ].join('\n')
    );
    const patch = [
      '*** Begin Patch',
      '*** Update File: notes/leak.md',
      '*** Move to: ai_context/wiki/leak.md',
      '@@',
      '-title=old',
      '+title=new',
      '*** End Patch'
    ].join('\n');
    try {
      const result = shouldBlock({
        tool_name: 'apply_patch',
        tool_input: { command: patch }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/github_pat/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test.each([
    ['oversized', Buffer.alloc(MAX_MOVE_SOURCE_BYTES + 1, 'x'), /scan limit/],
    ['binary', Buffer.from([0x41, 0x00, 0x42]), /not a text file/],
  ])('move blocks a %s source before secret scanning', (_kind, content, reason) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-move-'));
    fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
    fs.mkdirSync(path.join(root, 'ai_context/wiki'), { recursive: true });
    fs.writeFileSync(path.join(root, 'notes/input.md'), content);
    const patch = [
      '*** Begin Patch',
      '*** Update File: notes/input.md',
      '*** Move to: ai_context/wiki/input.md',
      '*** End Patch'
    ].join('\n');
    try {
      const result = shouldBlock({
        tool_name: 'apply_patch',
        tool_input: { command: patch }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(reason);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('move-only apply_patch allows a clean regular source', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-move-'));
    fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
    fs.mkdirSync(path.join(root, 'ai_context/wiki'), { recursive: true });
    fs.writeFileSync(path.join(root, 'notes/clean.md'), 'clean notes\n');
    const patch = [
      '*** Begin Patch',
      '*** Update File: notes/clean.md',
      '*** Move to: ai_context/wiki/clean.md',
      '*** End Patch'
    ].join('\n');
    try {
      expect(shouldBlock({
        tool_name: 'apply_patch',
        tool_input: { command: patch }
      }, { SPK_PROJECT_ROOT: root }).block).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test.each([
    'notes/missing.md',
    '../outside.md'
  ])('move-only apply_patch blocks invalid source %s', sourcePath => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-move-'));
    fs.mkdirSync(path.join(root, 'ai_context/wiki'), { recursive: true });
    const patch = [
      '*** Begin Patch',
      `*** Update File: ${sourcePath}`,
      '*** Move to: ai_context/wiki/result.md',
      '*** End Patch'
    ].join('\n');
    try {
      const result = shouldBlock({
        tool_name: 'apply_patch',
        tool_input: { command: patch }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/move source/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a lexical wiki path whose parent symlink escapes the project', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-link-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-outside-'));
    fs.mkdirSync(path.join(root, 'ai_context'), { recursive: true });
    try {
      try {
        fs.symlinkSync(outside, path.join(root, 'ai_context/wiki'), 'dir');
      } catch (exc) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
        throw exc;
      }
      const result = shouldBlock({
        tool_name: 'Write',
        tool_input: {
          file_path: 'ai_context/wiki/clean.md',
          content: 'clean content'
        }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/symlink outside/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('scans a symlink alias that resolves into the project wiki', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wiki-alias-'));
    const wiki = path.join(root, 'ai_context/wiki');
    fs.mkdirSync(wiki, { recursive: true });
    try {
      try {
        fs.symlinkSync(wiki, path.join(root, 'wiki-alias'), 'dir');
      } catch (exc) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
        throw exc;
      }
      const result = shouldBlock({
        tool_name: 'Write',
        tool_input: {
          file_path: 'wiki-alias/leak.md',
          content: 'api=ghp_abcdefghijklmnopqrstuvwxyz0123456789'
        }
      }, { SPK_PROJECT_ROOT: root });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/github_pat/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
