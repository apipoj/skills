// tests/uninstall.test.js
const {
  buildUninstallPlan,
  uninstall,
  stripSpkMarkers
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
