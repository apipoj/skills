// tests/uninstall.test.js
const {
  buildUninstallPlan,
  uninstall,
  stripSpkMarkers,
  gitExcludeEdits,
  stripGitExcludeBlock,
  gitDirectoryIsPlain,
  GIT_EXCLUDE_LINES,
  VERSION_MARKER_RELATIVE,
  WEBFETCH_CACHE_DIR_RELATIVE
} = require('../scripts/install/uninstall.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

const temporaryRoots = [];

function makeTemp(prefix = 'spk-uni-') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  temporaryRoots.push(dir);
  return dir;
}

function makeInstalled(baseDirectory) {
  const dir = baseDirectory ? path.join(baseDirectory, 'project') : makeTemp();
  fs.mkdirSync(path.join(dir, '.claude/agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/commands'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/hooks/PreToolUse'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'ai_context/wiki'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.spk'), { recursive: true });

  fs.writeFileSync(path.join(dir, '.spk/manifest.json'), JSON.stringify({
    agents: {
      orchestrators: [{ name: 'plan-orchestrator' }],
      specialists: [{ name: 'planner' }]
    },
    commands: [{ name: '/spk-plan' }]
  }));
  fs.writeFileSync(path.join(dir, '.claude/agents/plan-orchestrator.md'), 'agent');
  fs.writeFileSync(path.join(dir, '.claude/agents/planner.md'), 'agent');
  fs.writeFileSync(path.join(dir, '.claude/agents/user-custom.md'), 'user');
  fs.writeFileSync(path.join(dir, '.claude/commands/spk-plan.md'), 'cmd');
  fs.writeFileSync(path.join(dir, '.claude/commands/user-custom.md'), 'user');
  fs.writeFileSync(path.join(dir, '.claude/hooks/PreToolUse/wiki-secret-scan.cjs'), 'hook');
  fs.writeFileSync(path.join(dir, 'ai_context/wiki/page.md'), 'user data');

  return dir;
}

function approve(dir, token) {
  const preview = buildUninstallPlan(dir);
  return uninstall(dir, { approvalToken: token || preview.approval_token });
}

function makeGitDir(dir) {
  fs.mkdirSync(path.join(dir, '.git/info'), { recursive: true });
}

function gitExcludeBlockText() {
  return `${GIT_EXCLUDE_LINES.join('\n')}\n/ai_context/\n`;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('stripSpkMarkers', () => {
  test('removes content between SPK markers', () => {
    const input = 'prefix\n<!-- SPK:start -->\nSPK CONTENT\n<!-- SPK:end -->\nsuffix';
    const output = stripSpkMarkers(input);
    expect(output).not.toContain('SPK CONTENT');
    expect(output).toContain('prefix');
    expect(output).toContain('suffix');
  });

  test('no-op when no markers', () => {
    const input = 'just plain content';
    expect(stripSpkMarkers(input)).toBe(input);
  });
});

describe('uninstall approval boundary', () => {
  test('previews exact targets and does not delete on invocation alone', () => {
    const dir = makeInstalled();
    const result = uninstall(dir);

    expect(result).toMatchObject({
      schema: 'spk.approval/v1',
      status: 'NEEDS_USER_INPUT',
      operation: 'uninstall'
    });
    expect(result.approval_token).toBe(`spk-approve:${result.intent_digest}`);
    expect(result.intent_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(result.paths).toContain(path.join(dir, '.claude/agents/planner.md'));
    expect(fs.existsSync(path.join(dir, '.claude/agents/planner.md'))).toBe(true);
  });

  test('rejects a wrong or stale approval token without deleting', () => {
    const dir = makeInstalled();
    const preview = buildUninstallPlan(dir);
    fs.writeFileSync(path.join(dir, '.claude/agents/planner.md'), 'changed');

    const result = uninstall(dir, { approvalToken: preview.approval_token });
    expect(result.status).toBe('NEEDS_USER_INPUT');
    expect(result.intent_digest).not.toBe(preview.intent_digest);
    expect(fs.existsSync(path.join(dir, '.claude/agents/planner.md'))).toBe(true);
  });

  test('revalidates each approved file immediately before unlinking', () => {
    const dir = makeInstalled();
    const first = path.join(dir, '.claude/agents/plan-orchestrator.md');
    const later = path.join(dir, '.claude/agents/planner.md');
    const realUnlink = fs.unlinkSync;
    const unlink = jest.spyOn(fs, 'unlinkSync').mockImplementation(filePath => {
      if (filePath === first) fs.writeFileSync(later, 'late user change');
      return realUnlink(filePath);
    });

    try {
      expect(() => approve(dir)).toThrow(/target changed: .*planner\.md/);
    } finally {
      unlink.mockRestore();
    }
    expect(fs.readFileSync(later, 'utf8')).toBe('late user change');
  });

  test('revalidates CLAUDE.md immediately before atomic replacement', () => {
    const dir = makeInstalled();
    const claudeMd = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(
      claudeMd,
      'User content\n<!-- SPK:start -->\nSPK ref\n<!-- SPK:end -->\nMore user content'
    );
    const realFsync = fs.fsyncSync;
    const fsync = jest.spyOn(fs, 'fsyncSync').mockImplementation(fd => {
      const result = realFsync(fd);
      fs.writeFileSync(claudeMd, 'new user content');
      return result;
    });

    try {
      expect(() => approve(dir)).toThrow(/shared file changed before replacement/);
    } finally {
      fsync.mockRestore();
    }
    expect(fs.readFileSync(claudeMd, 'utf8')).toBe('new user content');
    expect(fs.readdirSync(dir).filter(name => name.startsWith('.spk-uninstall-'))).toEqual([]);
  });
});

describe('approved uninstall', () => {
  test('removes manifest agents but preserves user custom', () => {
    const dir = makeInstalled();
    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.existsSync(path.join(dir, '.claude/agents/plan-orchestrator.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '.claude/agents/planner.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '.claude/agents/user-custom.md'))).toBe(true);
  });

  test('removes manifest commands but preserves user custom', () => {
    const dir = makeInstalled();
    approve(dir);
    expect(fs.existsSync(path.join(dir, '.claude/commands/spk-plan.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '.claude/commands/user-custom.md'))).toBe(true);
  });

  test('removes an empty .spk directory after its approved manifest', () => {
    const dir = makeInstalled();
    approve(dir);
    expect(fs.existsSync(path.join(dir, '.spk'))).toBe(false);
  });

  test('preserves unowned files in .spk instead of recursively deleting them', () => {
    const dir = makeInstalled();
    fs.writeFileSync(path.join(dir, '.spk/user-notes.md'), 'keep');
    approve(dir);
    expect(fs.readFileSync(path.join(dir, '.spk/user-notes.md'), 'utf8')).toBe('keep');
    expect(fs.existsSync(path.join(dir, '.spk/manifest.json'))).toBe(false);
  });

  test('preserves ai_context/wiki user data', () => {
    const dir = makeInstalled();
    approve(dir);
    expect(fs.readFileSync(path.join(dir, 'ai_context/wiki/page.md'), 'utf8')).toBe('user data');
  });

  test('strips only the approved SPK block from CLAUDE.md', () => {
    const dir = makeInstalled();
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      'User content\n<!-- SPK:start -->\nSPK ref\n<!-- SPK:end -->\nMore user content'
    );
    approve(dir);
    const content = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    expect(content).not.toContain('SPK ref');
    expect(content).toContain('User content');
    expect(content).toContain('More user content');
  });

  test('is a no-op when no install is detected', () => {
    const dir = makeTemp('spk-noinst-');
    const result = uninstall(dir);
    expect(result).toMatchObject({ status: 'NOT_INSTALLED', removed: 0 });
  });
});

describe('untrusted legacy manifests and filesystem paths', () => {
  test('rejects traversal names and never deletes an out-of-root file', () => {
    const base = makeTemp('spk-traversal-');
    const dir = makeInstalled(base);
    const outside = path.join(base, 'outside.md');
    fs.writeFileSync(outside, 'outside');
    const manifestPath = path.join(dir, '.spk/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.agents.specialists.push({ name: '../../../outside' });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => buildUninstallPlan(dir)).toThrow(/unsafe specialists name/);
    expect(fs.readFileSync(outside, 'utf8')).toBe('outside');
    expect(fs.existsSync(path.join(dir, '.claude/agents/planner.md'))).toBe(true);
  });

  test('rejects a target symlink and never follows it outside the project', () => {
    const base = makeTemp('spk-target-link-');
    const dir = makeInstalled(base);
    const outside = path.join(base, 'outside.md');
    fs.writeFileSync(outside, 'outside');
    const target = path.join(dir, '.claude/agents/planner.md');
    fs.unlinkSync(target);
    fs.symlinkSync(outside, target);

    expect(() => buildUninstallPlan(dir)).toThrow(/symbolic link/);
    expect(fs.readFileSync(outside, 'utf8')).toBe('outside');
  });

  test('rejects an out-of-root symlink in a target parent directory', () => {
    const base = makeTemp('spk-parent-link-');
    const dir = makeInstalled(base);
    const outsideDirectory = path.join(base, 'outside-agents');
    fs.mkdirSync(outsideDirectory);
    fs.writeFileSync(path.join(outsideDirectory, 'planner.md'), 'outside');
    fs.rmSync(path.join(dir, '.claude/agents'), { recursive: true });
    fs.symlinkSync(outsideDirectory, path.join(dir, '.claude/agents'));

    expect(() => buildUninstallPlan(dir)).toThrow(/symbolic link/);
    expect(fs.readFileSync(path.join(outsideDirectory, 'planner.md'), 'utf8')).toBe('outside');
  });
});

describe('modern plugin-install artifacts', () => {
  test('inventories and removes ai_context/.spk-version with no legacy manifest at all', () => {
    const dir = makeTemp('spk-modern-version-');
    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dir, VERSION_MARKER_RELATIVE), '1.2.3');

    const preview = buildUninstallPlan(dir);
    expect(preview.status).toBe('NEEDS_USER_INPUT');
    expect(preview.paths).toContain(path.join(dir, VERSION_MARKER_RELATIVE));

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.existsSync(path.join(dir, VERSION_MARKER_RELATIVE))).toBe(false);
  });

  test('inventories and removes webfetch cache entries and the directory once empty', () => {
    const dir = makeTemp('spk-webfetch-');
    const cacheDir = path.join(dir, WEBFETCH_CACHE_DIR_RELATIVE);
    fs.mkdirSync(cacheDir, { recursive: true });
    const key = 'a'.repeat(32);
    fs.writeFileSync(path.join(cacheDir, `${key}.json`), '{"body":"cached"}');

    const preview = buildUninstallPlan(dir);
    expect(preview.paths).toContain(path.join(cacheDir, `${key}.json`));

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.existsSync(path.join(cacheDir, `${key}.json`))).toBe(false);
    expect(fs.existsSync(cacheDir)).toBe(false);
  });

  test('never matches or removes a file that is not a cache-shaped entry', () => {
    const dir = makeTemp('spk-webfetch-foreign-');
    const cacheDir = path.join(dir, WEBFETCH_CACHE_DIR_RELATIVE);
    fs.mkdirSync(cacheDir, { recursive: true });
    const key = 'b'.repeat(32);
    fs.writeFileSync(path.join(cacheDir, `${key}.json`), '{"body":"cached"}');
    fs.writeFileSync(path.join(cacheDir, 'notes.txt'), 'user left this here');

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.existsSync(path.join(cacheDir, `${key}.json`))).toBe(false);
    // A foreign file blocks the directory from being treated as empty and
    // removed — never delete or recursively clear a directory with unowned
    // content in it.
    expect(fs.readFileSync(path.join(cacheDir, 'notes.txt'), 'utf8')).toBe('user left this here');
    expect(fs.existsSync(cacheDir)).toBe(true);
  });

  test('is a no-op when neither legacy nor modern artifacts are present', () => {
    const dir = makeTemp('spk-modern-noinst-');
    const result = uninstall(dir);
    expect(result).toMatchObject({ status: 'NOT_INSTALLED', removed: 0 });
  });
});

describe('.git/info/exclude SPK block removal', () => {
  test('removes exactly the SPK block and preserves surrounding content', () => {
    const dir = makeTemp('spk-exclude-');
    makeGitDir(dir);
    const excludeFile = path.join(dir, '.git/info/exclude');
    fs.writeFileSync(
      excludeFile,
      `*.log\n${gitExcludeBlockText()}node_modules/\n`
    );

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    const content = fs.readFileSync(excludeFile, 'utf8');
    expect(content).toContain('*.log');
    expect(content).toContain('node_modules/');
    expect(content).not.toContain('ai_context/');
    expect(content).not.toContain(GIT_EXCLUDE_LINES[0]);
  });

  test('removes an SPK block nested under a project-subdirectory prefix', () => {
    const dir = makeTemp('spk-exclude-nested-');
    makeGitDir(dir);
    const excludeFile = path.join(dir, '.git/info/exclude');
    fs.writeFileSync(excludeFile, `${GIT_EXCLUDE_LINES.join('\n')}\n/apps/web/ai_context/\n`);

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.readFileSync(excludeFile, 'utf8')).toBe('\n');
  });

  test('refuses to touch a block whose comment text was modified', () => {
    const dir = makeTemp('spk-exclude-modified-');
    makeGitDir(dir);
    const excludeFile = path.join(dir, '.git/info/exclude');
    const modified = `# Apipoj Skills (SPK): edited by hand\n${GIT_EXCLUDE_LINES[1]}\n/ai_context/\n`;
    fs.writeFileSync(excludeFile, modified);

    expect(gitExcludeEdits(modified)).toEqual([]);
    // Also present, unrelated SPK-owned artifacts still get uninstalled, but
    // the mismatched exclude block is left exactly as the user made it.
    const dirWithVersion = dir;
    fs.mkdirSync(path.join(dirWithVersion, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dirWithVersion, VERSION_MARKER_RELATIVE), '1.0.0');

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(result.edited).toEqual([]);
    expect(fs.readFileSync(excludeFile, 'utf8')).toBe(modified);
  });

  test('refuses to touch a block missing its pattern line', () => {
    const dir = makeTemp('spk-exclude-truncated-');
    makeGitDir(dir);
    const excludeFile = path.join(dir, '.git/info/exclude');
    const truncated = `${GIT_EXCLUDE_LINES.join('\n')}\n`;
    fs.writeFileSync(excludeFile, truncated);

    expect(gitExcludeEdits(truncated)).toEqual([]);
    expect(stripGitExcludeBlock(truncated)).toBe(truncated);
  });

  test('is skipped, not crashed on, inside a linked worktree where .git is a file', () => {
    const dir = makeTemp('spk-exclude-worktree-');
    fs.writeFileSync(path.join(dir, '.git'), 'gitdir: /somewhere/else/.git/worktrees/x\n');
    expect(gitDirectoryIsPlain(dir)).toBe(false);

    fs.mkdirSync(path.join(dir, 'ai_context'), { recursive: true });
    fs.writeFileSync(path.join(dir, VERSION_MARKER_RELATIVE), '1.0.0');
    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.readFileSync(path.join(dir, '.git'), 'utf8')).toBe('gitdir: /somewhere/else/.git/worktrees/x\n');
  });

  test('stays in sync with plugins/spk/scripts/init-ai-context.cjs EXCLUDE_LINES', () => {
    const initAiContext = require('../plugins/spk/scripts/init-ai-context.cjs');
    expect(GIT_EXCLUDE_LINES).toEqual(initAiContext.EXCLUDE_LINES);
  });
});

describe('wiki and sources preservation alongside modern-artifact removal', () => {
  test('preserves ai_context/wiki and ai_context/sources while removing the version marker', () => {
    const dir = makeTemp('spk-preserve-');
    fs.mkdirSync(path.join(dir, 'ai_context/wiki'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'ai_context/sources'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ai_context/wiki/page.md'), 'wiki content');
    fs.writeFileSync(path.join(dir, 'ai_context/sources/raw.txt'), 'source content');
    fs.writeFileSync(path.join(dir, VERSION_MARKER_RELATIVE), '1.2.3');

    const preview = buildUninstallPlan(dir);
    expect(preview.preserve).toContain(path.join(dir, 'ai_context/wiki'));
    expect(preview.preserve).toContain(path.join(dir, 'ai_context/sources'));

    const result = approve(dir);
    expect(result.status).toBe('APPLIED');
    expect(fs.existsSync(path.join(dir, VERSION_MARKER_RELATIVE))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'ai_context/wiki/page.md'), 'utf8')).toBe('wiki content');
    expect(fs.readFileSync(path.join(dir, 'ai_context/sources/raw.txt'), 'utf8')).toBe('source content');
    expect(result.preserved).toContain(path.join(dir, 'ai_context/wiki'));
    expect(result.preserved).toContain(path.join(dir, 'ai_context/sources'));
  });
});
