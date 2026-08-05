// tests/gitignore-guard.test.js
const {
  shouldBlock, markerActive, pathWithinRoot, isGitIgnored, isExempt,
  gitEnvironment, guardProjectRoot,
  MARKER_CLEANUP_COMMAND, MARKER_CLEANUP_COMMANDS, MARKER_FILE, MARKER_TTL_MS
} = require('../plugins/spk/scripts/gitignore-guard.cjs');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeRepo(gitignoreLines = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-gi-'));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, '.gitignore'), gitignoreLines.join('\n'));
  return dir;
}

describe('gitignore-guard', () => {
  test('no-op when SPK_WIKI_BUILD is not set', () => {
    const dir = makeRepo(['.env']);
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, '.env') }
    }, { SPK_WIKI_BUILD: undefined, SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(false);
  });

  test('blocks Read of gitignored file during wiki-build', () => {
    const dir = makeRepo(['.env', 'private/']);
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, '.env') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/gitignore/i);
  });

  test('allows read of non-gitignored file during wiki-build', () => {
    const dir = makeRepo(['.env']);
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, 'README.md') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(false);
  });

  test('exempts ai_context/sources/ even if gitignored', () => {
    const dir = makeRepo(['ai_context/sources/', '.env']);
    fs.mkdirSync(path.join(dir, 'ai_context/sources'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ai_context/sources/file.md'), 'hello');
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, 'ai_context/sources/file.md') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(false);
  });

  test('ignores non-read tools', () => {
    const dir = makeRepo(['.env']);
    const result = shouldBlock({
      tool_name: 'Write',
      tool_input: { file_path: path.join(dir, '.env'), content: 'X=1' }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(false);
  });

  test('marker file activates the guard without SPK_WIKI_BUILD env', () => {
    // Skills can't set env vars for hooks mid-session, so /spk:ingest and
    // /spk:wiki-lint arm the guard by touching ai_context/.spk-wiki-build.
    const dir = makeRepo(['.env']);
    const event = {
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, '.env') }
    };
    expect(shouldBlock(event, { SPK_PROJECT_ROOT: dir }).block).toBe(false);
    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dir, MARKER_FILE), '');
    const result = shouldBlock(event, { SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/\.spk-wiki-build/);
  });

  test('a stale marker (past TTL) no longer activates the guard', () => {
    // A crashed wiki-build must never leave the guard blocking ordinary
    // sessions forever — the marker expires after MARKER_TTL_MS.
    const dir = makeRepo(['.env']);
    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dir, MARKER_FILE), '');
    expect(markerActive(dir)).toBe(true);
    expect(markerActive(dir, Date.now() + MARKER_TTL_MS + 1000)).toBe(false);
    const old = (Date.now() - MARKER_TTL_MS - 60000) / 1000;
    fs.utimesSync(path.join(dir, MARKER_FILE), old, old);
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: path.join(dir, '.env') }
    }, { SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(false);
  });

  test('blocks Grep and Glob when SPK_WIKI_BUILD set and path gitignored', () => {
    const dir = makeRepo(['private/']);
    fs.mkdirSync(path.join(dir, 'private'), { recursive: true });
    const grep = shouldBlock({
      tool_name: 'Grep',
      tool_input: { path: path.join(dir, 'private') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(grep.block).toBe(true);

    const glob = shouldBlock({
      tool_name: 'Glob',
      tool_input: { path: path.join(dir, 'private') }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(glob.block).toBe(true);
  });

  test('normalizes relative, Windows-separator, and traversal paths against root', () => {
    const dir = makeRepo(['.env', 'private/']);
    for (const target of ['.env', 'folder\\..\\.env', 'tmp/../.env']) {
      const result = shouldBlock({
        tool_name: 'Read',
        tool_input: { file_path: target }
      }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
      expect(result.block).toBe(true);
    }
    expect(pathWithinRoot('../outside.txt', dir)).toBeNull();
    expect(pathWithinRoot('C:\\repo\\private\\x.txt', 'C:\\repo'))
      .toMatchObject({ relative: 'private/x.txt' });
  });

  test('uses git check-ignore semantics for nested rules and negation', () => {
    const dir = makeRepo(['private/*', '!private/public.txt']);
    fs.mkdirSync(path.join(dir, 'private'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'private/.gitignore'), '*.key\n');
    fs.writeFileSync(path.join(dir, 'private/hidden.key'), 'secret');
    fs.writeFileSync(path.join(dir, 'private/public.txt'), 'safe');
    expect(isGitIgnored('private/hidden.key', dir)).toBe(true);
    expect(isGitIgnored('private/public.txt', dir)).toBe(false);
  });

  test('fails closed when git ignore status is unavailable', () => {
    const dir = makeRepo(['private/', '*.pem']);
    const missingGit = path.join(dir, 'missing-git');
    expect(isGitIgnored('private/notes.txt', dir, path.join(dir, 'missing-git'))).toBe(true);
    expect(isGitIgnored('cert.pem', dir, path.join(dir, 'missing-git'))).toBe(true);
    expect(isGitIgnored('README.md', dir, path.join(dir, 'missing-git'))).toBe(true);
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: 'README.md' }
    }, {
      SPK_WIKI_BUILD: 'true',
      SPK_PROJECT_ROOT: dir,
    }, { gitBin: missingGit });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/failed closed/);

    const production = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: 'README.md' }
    }, {
      SPK_WIKI_BUILD: 'true',
      SPK_PROJECT_ROOT: dir,
      SPK_GIT_BIN: missingGit
    });
    expect(production.block).toBe(false);
  });

  test('prefers host project roots and gives Git a sanitized environment', () => {
    expect(guardProjectRoot({
      CLAUDE_PROJECT_DIR: '/host/claude',
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/claude'));
    expect(guardProjectRoot({
      CODEX_PROJECT_DIR: '/host/codex',
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(path.resolve('/host/codex'));

    const child = gitEnvironment();
    expect(child.PATH).toBeTruthy();
    expect(child.PATH).not.toContain('/project/override');
    expect(child).not.toHaveProperty('SPK_GIT_BIN');
    expect(child.GIT_OPTIONAL_LOCKS).toBe('0');
  });

  test('sources exemption works for relative and Windows-separator paths', () => {
    const dir = makeRepo(['ai_context/sources/']);
    for (const target of [
      'ai_context/sources/paper.md',
      'ai_context\\sources\\paper.md',
      'tmp/../ai_context/sources/paper.md'
    ]) {
      expect(shouldBlock({
        tool_name: 'Read',
        tool_input: { file_path: target }
      }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir }).block).toBe(false);
    }
  });

  test('rejects an in-root symlink that resolves outside the project', () => {
    const dir = makeRepo(['escape/']);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-gi-outside-'));
    fs.writeFileSync(path.join(outside, 'private.md'), 'private');
    try {
      try {
        fs.symlinkSync(outside, path.join(dir, 'escape'), 'dir');
      } catch (exc) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
        throw exc;
      }
      expect(pathWithinRoot('escape/private.md', dir)).toBeNull();
      const result = shouldBlock({
        tool_name: 'Read',
        tool_input: { file_path: 'escape/private.md' }
      }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
      expect(result.block).toBe(true);
      expect(result.reason).toMatch(/symlink outside|escapes the project/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('checks both lexical and resolved Git ignore paths', () => {
    const dir = makeRepo(['real-secret/']);
    fs.mkdirSync(path.join(dir, 'real-secret'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'real-secret/data.md'), 'private');
    try {
      fs.symlinkSync(path.join(dir, 'real-secret'), path.join(dir, 'alias'), 'dir');
    } catch (exc) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
      throw exc;
    }
    const result = shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: 'alias/data.md' }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/gitignore/i);
  });

  test('sources exemption requires both lexical and resolved paths in real sources', () => {
    const dir = makeRepo(['ai_context/sources/']);
    fs.mkdirSync(path.join(dir, 'ai_context/sources'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'safe'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'safe/data.md'), 'not a source');
    const source = path.join(dir, 'ai_context/sources/source.md');
    fs.writeFileSync(source, 'source');
    expect(isExempt(source, dir)).toBe(true);
    try {
      fs.symlinkSync(
        path.join(dir, 'safe/data.md'),
        path.join(dir, 'ai_context/sources/alias.md')
      );
    } catch (exc) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(exc && exc.code)) return;
      throw exc;
    }
    expect(isExempt('ai_context/sources/alias.md', dir)).toBe(false);
    expect(shouldBlock({
      tool_name: 'Read',
      tool_input: { file_path: 'ai_context/sources/alias.md' }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir }).block).toBe(true);
  });

  test.each([
    ['Bash', { command: 'cat README.md' }],
    ['shell', { command: 'pwd' }],
    ['exec_command', { cmd: 'rg secret' }],
    ['functions.exec_command', { cmd: 'rg secret' }]
  ])('blocks %s shell execution while wiki-build is active', (toolName, toolInput) => {
    const dir = makeRepo([]);
    const result = shouldBlock({
      tool_name: toolName,
      tool_input: toolInput
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir });
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/shell execution is disabled/);
  });

  test.each(MARKER_CLEANUP_COMMANDS)(
    'allows the exact cross-platform marker cleanup command: %s',
    cleanupCommand => {
      const dir = makeRepo([]);
      expect(shouldBlock({
        tool_name: 'Bash',
        tool_input: { command: cleanupCommand }
      }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir }).block).toBe(false);
    }
  );

  test('blocks marker cleanup near-misses and cleanup outside project root', () => {
    const dir = makeRepo([]);
    for (const command of [
      `${MARKER_CLEANUP_COMMAND} && echo done`,
      ` ${MARKER_CLEANUP_COMMAND}`,
      'DEL /F /Q ai_context\\.spk-wiki-build',
      'Remove-Item -Force ai_context/.spk-wiki-build ',
    ]) {
      expect(shouldBlock({
        tool_name: 'Bash',
        tool_input: { command }
      }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir }).block).toBe(true);
    }
    expect(shouldBlock({
      tool_name: 'exec_command',
      tool_input: { cmd: MARKER_CLEANUP_COMMAND, cwd: path.dirname(dir) }
    }, { SPK_WIKI_BUILD: 'true', SPK_PROJECT_ROOT: dir }).block).toBe(true);
  });
});
