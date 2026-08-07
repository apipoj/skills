const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const consent = require('../plugins/spk/scripts/session-reflect-consent.cjs');
const doctor = require('../plugins/spk/scripts/spk-doctor.cjs');

function writePluginFixture(plugin, version = '3.5.0') {
  fs.mkdirSync(path.join(plugin, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(plugin, '.codex-plugin'), { recursive: true });
  fs.mkdirSync(path.join(plugin, 'mcp'), { recursive: true });
  fs.writeFileSync(
    path.join(plugin, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'spk', version })
  );
  fs.writeFileSync(
    path.join(plugin, '.codex-plugin', 'plugin.json'),
    JSON.stringify({ name: 'spk', version })
  );
  fs.writeFileSync(path.join(plugin, '.mcp.json'), '{}');
  fs.writeFileSync(path.join(plugin, 'mcp', 'codebase-search.cjs'), '');

  for (let index = 0; index < doctor.EXPECTED_INVENTORY.sharedSkills; index += 1) {
    const directory = path.join(plugin, 'skills', `skill-${index}`);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'SKILL.md'), `# Skill ${index}\n`);
  }
  fs.mkdirSync(path.join(plugin, 'agents'), { recursive: true });
  for (let index = 0; index < doctor.EXPECTED_INVENTORY.claudeAgents; index += 1) {
    fs.writeFileSync(path.join(plugin, 'agents', `agent-${index}.md`), `# Agent ${index}\n`);
  }

  const hookEntries = doctor.EXPECTED_HOOK_SCRIPTS.map((relative, index) => ({
    matcher: `Fixture${index}`,
    hooks: [{
      type: 'command',
      command: 'node',
      args: [`\${CLAUDE_PLUGIN_ROOT}/${relative}`],
    }],
  }));
  fs.mkdirSync(path.join(plugin, 'hooks'), { recursive: true });
  fs.writeFileSync(
    path.join(plugin, 'hooks', 'hooks.json'),
    JSON.stringify({ hooks: { PreToolUse: hookEntries } })
  );
  for (const relative of new Set(doctor.EXPECTED_HOOK_SCRIPTS)) {
    const file = path.join(plugin, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
  }
  fs.writeFileSync(path.join(plugin, 'scripts', 'session-reflect-consent.cjs'), '');
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-project-'));
  const plugin = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-plugin-'));
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  fs.mkdirSync(path.join(root, 'ai_context', 'wiki'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ai_context', 'sources'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ai_context', 'sources', '.gitignore'), '*\n!.gitignore\n');
  writePluginFixture(plugin);
  return { root, plugin };
}

function cleanup(...directories) {
  for (const directory of directories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function checkOf(report, id) {
  return report.checks.find(item => item.id === id);
}

describe('SPK doctor', () => {
  test('reports structured installation, inventory, hook, and privacy checks', () => {
    const { root, plugin } = fixture();
    try {
      const report = doctor.diagnose({
        cwd: root,
        pluginRoot: plugin,
        env: { PATH: process.env.PATH },
      });
      expect(report.checks).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'privacy.sources-ignore', status: 'pass' }),
        expect.objectContaining({ id: 'privacy.reflection', status: 'pass' }),
        expect.objectContaining({ id: 'plugin.manifests', status: 'pass' }),
        expect.objectContaining({ id: 'plugin.inventory', status: 'pass' }),
        expect.objectContaining({ id: 'plugin.hooks', status: 'pass' }),
        expect.objectContaining({ id: 'plugin.mcp', status: 'pass' }),
      ]));
      expect(report.counts.fail).toBe(0);
      expect(doctor.renderHuman(report)).toContain('SPK doctor');
    } finally {
      cleanup(root, plugin);
    }
  });

  test('accepts separate host-specific package roots', () => {
    const claudeFixture = fixture();
    const codexFixture = fixture();
    try {
      fs.rmSync(path.join(claudeFixture.plugin, '.codex-plugin'), { recursive: true });
      let report = doctor.diagnose({
        cwd: claudeFixture.root,
        pluginRoot: claudeFixture.plugin,
        env: {},
      });
      expect(checkOf(report, 'plugin.manifests').status).toBe('pass');
      expect(checkOf(report, 'plugin.inventory').status).toBe('pass');

      fs.rmSync(path.join(codexFixture.plugin, '.claude-plugin'), { recursive: true });
      fs.rmSync(path.join(codexFixture.plugin, 'agents'), { recursive: true });
      report = doctor.diagnose({
        cwd: codexFixture.root,
        pluginRoot: codexFixture.plugin,
        env: {},
      });
      expect(checkOf(report, 'plugin.manifests').status).toBe('pass');
      expect(checkOf(report, 'plugin.inventory')).toEqual(expect.objectContaining({
        status: 'pass',
        message: expect.stringContaining('0/0 Claude agent files'),
      }));
    } finally {
      cleanup(
        claudeFixture.root,
        claudeFixture.plugin,
        codexFixture.root,
        codexFixture.plugin
      );
    }
  });

  test('only host roots or explicit in-process options select project and plugin', () => {
    const { root, plugin } = fixture();
    const poisonRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-poison-root-'));
    const poisonPlugin = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-poison-plugin-'));
    try {
      expect(doctor.resolveDoctorProjectRoot({
        CLAUDE_PROJECT_DIR: root,
        CODEX_PROJECT_DIR: poisonRoot,
        SPK_PROJECT_ROOT: poisonRoot,
      }, poisonRoot)).toBe(path.resolve(root));
      expect(doctor.resolveDoctorProjectRoot({
        CODEX_PROJECT_DIR: root,
        SPK_PROJECT_ROOT: poisonRoot,
      }, poisonRoot)).toBe(path.resolve(root));
      expect(doctor.resolveDoctorProjectRoot({
        SPK_PROJECT_ROOT: poisonRoot,
      }, root)).toBe(path.resolve(root));
      expect(doctor.resolveDoctorPluginRoot({
        pluginRoot: plugin,
        env: { CLAUDE_PLUGIN_ROOT: poisonPlugin, SPK_PLUGIN_ROOT: poisonPlugin },
      })).toBe(path.resolve(plugin));

      const report = doctor.diagnose({
        cwd: root,
        pluginRoot: plugin,
        env: {
          SPK_PROJECT_ROOT: poisonRoot,
          SPK_PLUGIN_ROOT: poisonPlugin,
          PATH: poisonRoot,
        },
      });
      expect(checkOf(report, 'memory.wiki').status).toBe('pass');
      expect(checkOf(report, 'privacy.sources-ignore').status).toBe('pass');
      expect(checkOf(report, 'plugin.manifests').status).toBe('pass');
    } finally {
      cleanup(root, plugin, poisonRoot, poisonPlugin);
    }
  });

  (process.platform === 'win32' ? test.skip : test)(
    'never executes Git, Claude, or Codex from a project-controlled PATH',
    () => {
      const { root, plugin } = fixture();
      const fakeBin = path.join(root, 'fake-bin');
      const sentinel = path.join(root, 'project-path-was-executed');
      try {
        fs.mkdirSync(fakeBin);
        for (const name of ['git', 'claude', 'codex']) {
          const file = path.join(fakeBin, name);
          fs.writeFileSync(file, `#!/bin/sh\nprintf poisoned > ${JSON.stringify(sentinel)}\nexit 0\n`);
          fs.chmodSync(file, 0o755);
        }
        const report = doctor.diagnose({
          cwd: root,
          pluginRoot: plugin,
          env: { PATH: fakeBin },
        });
        expect(fs.existsSync(sentinel)).toBe(false);
        expect(checkOf(report, 'privacy.sources-ignore').status).toBe('pass');
      } finally {
        cleanup(root, plugin);
      }
    }
  );

  test('project configuration and environment opt-in cannot grant reflection consent', () => {
    const { root, plugin } = fixture();
    try {
      fs.writeFileSync(path.join(root, 'ai_context', 'spk.config.json'), JSON.stringify({
        version: 1,
        features: { sessionReflection: true },
      }));
      const report = doctor.diagnose({
        cwd: root,
        pluginRoot: plugin,
        env: {
          SPK_SESSION_REFLECT: 'on',
          SPK_PROJECT_ROOT: root,
        },
      });
      expect(checkOf(report, 'privacy.reflection')).toEqual(expect.objectContaining({
        status: 'pass',
        message: expect.stringContaining('cannot grant consent'),
      }));
    } finally {
      cleanup(root, plugin);
    }
  });

  test('warns only for a real user-local consent record and gives the bundled disable command', () => {
    const { root, plugin } = fixture();
    const consentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-consent-'));
    try {
      if (process.platform !== 'win32') fs.chmodSync(consentRoot, 0o700);
      consent.enableConsent(root, { consentRoot });
      const report = doctor.diagnose({
        cwd: root,
        pluginRoot: plugin,
        consentRoot,
        env: { SPK_SESSION_REFLECT: 'on' },
      });
      expect(checkOf(report, 'privacy.reflection')).toEqual(expect.objectContaining({
        status: 'warn',
        remediation: expect.stringContaining(
          JSON.stringify(path.join(plugin, 'scripts', 'session-reflect-consent.cjs'))
        ),
      }));
      expect(checkOf(report, 'privacy.reflection').remediation).toContain(' disable ');
    } finally {
      cleanup(root, plugin, consentRoot);
    }
  });

  test('fails safely when source privacy policy is missing', () => {
    const { root, plugin } = fixture();
    try {
      fs.unlinkSync(path.join(root, 'ai_context', 'sources', '.gitignore'));
      const report = doctor.diagnose({ cwd: root, pluginRoot: plugin, env: {} });
      expect(report.status).toBe('error');
      expect(checkOf(report, 'privacy.sources-ignore').status).toBe('fail');
    } finally {
      cleanup(root, plugin);
    }
  });

  test('detects manifest version drift, inventory loss, and hook corruption', () => {
    const { root, plugin } = fixture();
    try {
      fs.writeFileSync(
        path.join(plugin, '.codex-plugin', 'plugin.json'),
        JSON.stringify({ name: 'spk', version: '99.0.0' })
      );
      fs.rmSync(path.join(plugin, 'skills', 'skill-0'), { recursive: true });
      const hooksFile = path.join(plugin, 'hooks', 'hooks.json');
      const hooks = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
      hooks.hooks.PreToolUse[0].hooks[0].args[0] =
        '${CLAUDE_PLUGIN_ROOT}/scripts/missing-hook.cjs';
      fs.writeFileSync(hooksFile, JSON.stringify(hooks));

      const report = doctor.diagnose({ cwd: root, pluginRoot: plugin, env: {} });
      expect(checkOf(report, 'plugin.manifests')).toEqual(expect.objectContaining({
        status: 'fail',
        message: expect.stringContaining('Claude: 3.5.0; Codex: 99.0.0'),
      }));
      expect(checkOf(report, 'plugin.inventory')).toEqual(expect.objectContaining({
        status: 'fail',
        message: expect.stringContaining('21/22 skills'),
      }));
      expect(checkOf(report, 'plugin.hooks')).toEqual(expect.objectContaining({
        status: 'fail',
        message: expect.stringContaining('1 missing script files'),
      }));
    } finally {
      cleanup(root, plugin);
    }
  });

  test('invalid manifest and hook JSON are exact installation failures', () => {
    const { root, plugin } = fixture();
    try {
      fs.writeFileSync(path.join(plugin, '.claude-plugin', 'plugin.json'), '{');
      fs.writeFileSync(path.join(plugin, 'hooks', 'hooks.json'), '{');
      const report = doctor.diagnose({ cwd: root, pluginRoot: plugin, env: {} });
      expect(checkOf(report, 'plugin.manifests')).toEqual(expect.objectContaining({
        status: 'fail',
        message: expect.stringContaining('invalid JSON'),
      }));
      expect(checkOf(report, 'plugin.hooks')).toEqual(expect.objectContaining({
        status: 'fail',
        message: expect.stringContaining('invalid JSON'),
      }));
    } finally {
      cleanup(root, plugin);
    }
  });

  test('source ignore policy requires both ignore-all and self-allow rules', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-ignore-'));
    try {
      execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
      const file = path.join(root, 'ai_context', 'sources', '.gitignore');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '*\n');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(false);
      fs.writeFileSync(file, '*\n!.gitignore\n');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(true);
      fs.writeFileSync(file, '!.gitignore\n*\n');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(false);
      fs.writeFileSync(file, '*\n!.gitignore\n!public.md\n');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  test('source ignore policy verifies real Git behavior when in a worktree', () => {
    const { root, plugin } = fixture();
    try {
      const file = path.join(root, 'ai_context/sources/.gitignore');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(true);
      fs.writeFileSync(path.join(root, '.gitignore'), 'ai_context/sources/\n');
      expect(doctor.sourceIgnoreIsSafe(file)).toBe(false);
    } finally {
      cleanup(root, plugin);
    }
  });

  test('source ignore policy fails closed when Git behavior is unavailable', () => {
    const { root, plugin } = fixture();
    try {
      const file = path.join(root, 'ai_context/sources/.gitignore');
      expect(doctor.sourceIgnoreIsSafe(
        file,
        path.join(root, 'missing-git-binary')
      )).toBe(false);
    } finally {
      cleanup(root, plugin);
    }
  });

  (process.platform === 'win32' ? test.skip : test)(
    'source ignore policy rejects an in-repository symlink',
    () => {
      const { root, plugin } = fixture();
      try {
        const policy = path.join(root, 'policy.txt');
        const file = path.join(root, 'ai_context/sources/.gitignore');
        fs.writeFileSync(policy, '*\n!.gitignore\n');
        fs.unlinkSync(file);
        fs.symlinkSync(policy, file);
        expect(doctor.sourceIgnoreIsSafe(file)).toBe(false);
      } finally {
        cleanup(root, plugin);
      }
    }
  );

  (process.platform === 'win32' ? test.skip : test)(
    'source ignore policy rejects an escaping sources symlink',
    () => {
      const { root, plugin } = fixture();
      const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-doctor-outside-'));
      try {
        fs.rmSync(path.join(root, 'ai_context/sources'), { recursive: true, force: true });
        fs.writeFileSync(path.join(outside, '.gitignore'), '*\n!.gitignore\n');
        fs.symlinkSync(outside, path.join(root, 'ai_context/sources'), 'dir');
        expect(doctor.sourceIgnoreIsSafe(
          path.join(root, 'ai_context/sources/.gitignore')
        )).toBe(false);
      } finally {
        cleanup(root, plugin, outside);
      }
    }
  );
});
