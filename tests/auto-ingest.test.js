// tests/auto-ingest.test.js
const {
  shouldEnqueue, computeSourceHash, isAlreadyIngested, isInSourcesDir
} = require('../plugins/spk/scripts/auto-ingest.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-ai-'));
  fs.mkdirSync(path.join(dir, 'ai_context/sources'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'ai_context/wiki'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'ai_context/wiki/log.md'), '');
  return dir;
}

describe('auto-ingest', () => {
  test('ignores Write outside ai_context/sources', () => {
    const dir = makeTempProject();
    const result = shouldEnqueue({
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, 'README.md'), content: 'hi' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.enqueue).toBe(false);
  });

  test('ignores non-Write tools', () => {
    const dir = makeTempProject();
    const result = shouldEnqueue({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, 'ai_context/sources/x.md') }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.enqueue).toBe(false);
  });

  test('no-op when SPK_AUTO_INGEST is disabled', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/x.md');
    fs.writeFileSync(file, 'hello');
    const result = shouldEnqueue({
      tool_name: 'Write',
      tool_input: { file_path: file, content: 'hello' }
    }, { SPK_PROJECT_ROOT: dir, SPK_AUTO_INGEST: 'false' });
    expect(result.enqueue).toBe(false);
  });

  test('no-op when project config disables auto-ingest', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/x.md');
    fs.writeFileSync(file, 'hello');
    fs.writeFileSync(path.join(dir, 'ai_context/spk.config.json'), JSON.stringify({
      version: 1,
      features: { autoIngest: false }
    }));
    const result = shouldEnqueue({
      tool_name: 'Write',
      tool_input: { file_path: file, content: 'hello' }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.enqueue).toBe(false);
  });

  test('enqueues when Write hits ai_context/sources and auto-ingest ON', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/new-source.md');
    fs.writeFileSync(file, 'hello world');
    const result = shouldEnqueue({
      tool_name: 'Write',
      tool_input: { file_path: file, content: 'hello world' }
    }, { SPK_PROJECT_ROOT: dir, SPK_AUTO_INGEST: 'drop' });
    expect(result.enqueue).toBe(true);
    expect(result.reason).toMatch(/source/i);
  });

  test('idempotent — skips already-ingested file via log.md', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/x.md');
    fs.writeFileSync(file, 'hello');
    const hash = computeSourceHash(file);
    fs.writeFileSync(
      path.join(dir, 'ai_context/wiki/log.md'),
      `2026-04-19T12:00:00Z INGEST source=ai_context/sources/x.md hash=${hash}\n`
    );
    const result = shouldEnqueue({
      tool_name: 'Write',
      tool_input: { file_path: file, content: 'hello' }
    }, { SPK_PROJECT_ROOT: dir, SPK_AUTO_INGEST: 'drop' });
    expect(result.enqueue).toBe(false);
    expect(result.reason).toMatch(/already/i);
  });

  test('computeSourceHash is stable', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/x.md');
    fs.writeFileSync(file, 'content');
    const h1 = computeSourceHash(file);
    const h2 = computeSourceHash(file);
    expect(h1).toBe(h2);
    expect(typeof h1).toBe('string');
    expect(h1.length).toBeGreaterThan(10);
  });

  test('normalizes relative, Windows-separator, and traversal source paths', () => {
    const dir = makeTempProject();
    const file = path.join(dir, 'ai_context/sources/x.md');
    fs.writeFileSync(file, 'hello');
    for (const filePath of [
      'ai_context/sources/x.md',
      'ai_context\\sources\\x.md',
      'tmp/../ai_context/sources/x.md'
    ]) {
      expect(shouldEnqueue({
        tool_name: 'Write',
        tool_input: { file_path: filePath, content: 'hello' }
      }, { SPK_PROJECT_ROOT: dir, SPK_AUTO_INGEST: 'drop' }).enqueue).toBe(true);
    }
  });

  test('supports Claude Edit and Codex apply_patch events', () => {
    const dir = makeTempProject();
    const editFile = path.join(dir, 'ai_context/sources/edit.md');
    const patchFile = path.join(dir, 'ai_context/sources/patch.md');
    fs.writeFileSync(editFile, 'edited');
    fs.writeFileSync(patchFile, 'patched');
    expect(shouldEnqueue({
      tool_name: 'Edit',
      tool_input: { file_path: editFile, new_string: 'edited' }
    }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(true);
    expect(shouldEnqueue({
      tool_name: 'apply_patch',
      tool_input: {
        command: [
          '*** Begin Patch',
          '*** Add File: ai_context/sources/patch.md',
          '+patched',
          '*** End Patch'
        ].join('\n')
      }
    }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(true);
  });

  test('never auto-ingests the source inbox policy files', () => {
    const dir = makeTempProject();
    for (const name of ['.gitignore', '.gitkeep']) {
      const file = path.join(dir, 'ai_context/sources', name);
      fs.writeFileSync(file, '*\n');
      expect(shouldEnqueue({
        tool_name: 'Write',
        tool_input: { file_path: file, content: '*\n' }
      }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(false);
    }
  });

  test('requires a regular non-symlink file whose lexical and real paths are sources', () => {
    const dir = makeTempProject();
    const real = path.join(dir, 'ai_context/sources/real.md');
    const alias = path.join(dir, 'ai_context/sources/alias.md');
    fs.writeFileSync(real, 'source');
    try {
      try {
        fs.symlinkSync(real, alias);
      } catch (exc) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
        throw exc;
      }
      expect(isInSourcesDir(real, dir)).toBe(true);
      expect(isInSourcesDir(alias, dir)).toBe(true);
      expect(shouldEnqueue({
        tool_name: 'Write',
        tool_input: { file_path: alias, content: 'source' }
      }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(false);

      const directory = path.join(dir, 'ai_context/sources/folder');
      fs.mkdirSync(directory);
      expect(shouldEnqueue({
        tool_name: 'Write',
        tool_input: { file_path: directory, content: '' }
      }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects a lexical sources path resolving to a non-sources directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-ai-link-'));
    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'real-sources'), { recursive: true });
    const actual = path.join(dir, 'real-sources/paper.md');
    fs.writeFileSync(actual, 'paper');
    try {
      try {
        fs.symlinkSync(
          path.join(dir, 'real-sources'),
          path.join(dir, 'ai_context/sources'),
          'dir'
        );
      } catch (exc) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
        throw exc;
      }
      const lexical = path.join(dir, 'ai_context/sources/paper.md');
      expect(isInSourcesDir(lexical, dir)).toBe(false);
      expect(shouldEnqueue({
        tool_name: 'Write',
        tool_input: { file_path: lexical, content: 'paper' }
      }, { SPK_PROJECT_ROOT: dir }).enqueue).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
