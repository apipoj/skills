const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  gitEnvironment,
  normalizeChangedPath,
  parseCli,
  planScopedTests,
  scopedProjectRoot,
} = require('../plugins/spk/scripts/scoped-tests.cjs');

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-plugin-scoped-'));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

describe('packaged scoped-test planner', () => {
  test('emits argv arrays for a fully mapped Jest change', () => {
    const root = fixture({
      'package.json': JSON.stringify({ devDependencies: { jest: '^30.0.0' } }),
      'src/add.js': 'module.exports = (a, b) => a + b;\n',
    });
    try {
      expect(planScopedTests({ root, changedPaths: ['src/add.js'] })).toMatchObject({
        schema: 'spk.scoped-tests/v1',
        runner: 'jest',
        mode: 'scoped',
        selected: ['src/add.js'],
        unmapped: [],
        focused: {
          command: 'npx',
          args: ['jest', '--findRelatedTests', '--runInBand', '--', 'src/add.js'],
        },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('fails safe to the full suite when any path is ambiguous', () => {
    const root = fixture({
      'package.json': JSON.stringify({
        scripts: { test: 'jest' },
        devDependencies: { jest: '^30.0.0' },
      }),
      'src/add.js': '',
      'jest.config.js': '',
    });
    try {
      const plan = planScopedTests({
        root,
        changedPaths: ['src/add.js', 'jest.config.js'],
      });
      expect(plan.mode).toBe('full');
      expect(plan.unmapped).toContain('jest.config.js');
      expect(plan.focused).toBeNull();
      expect(plan.full).toEqual({
        command: 'npm',
        args: ['test', '--', '--runInBand'],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('maps Python source to an existing pytest test', () => {
    const root = fixture({
      'pyproject.toml': '[tool.pytest.ini_options]\n',
      'src/calc.py': '',
      'tests/src/test_calc.py': '',
    });
    try {
      const plan = planScopedTests({ root, changedPaths: ['src/calc.py'] });
      expect(plan).toMatchObject({
        runner: 'pytest',
        mode: 'scoped',
        selected: ['tests/src/test_calc.py'],
        focused: {
          command: 'python',
          args: ['-m', 'pytest', 'tests/src/test_calc.py'],
        },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects traversal and paths outside the repository', () => {
    const root = fixture({
      'package.json': JSON.stringify({ devDependencies: { jest: '^30.0.0' } }),
    });
    try {
      expect(normalizeChangedPath(root, '../secret.js')).toBeNull();
      const plan = planScopedTests({ root, changedPaths: ['../secret.js'] });
      expect(plan.mode).toBe('full');
      expect(plan.unmapped).toContain('../secret.js');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a changed symlink that resolves outside the repository', () => {
    const root = fixture({
      'package.json': JSON.stringify({ devDependencies: { jest: '^30.0.0' } }),
    });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-plugin-outside-'));
    try {
      const target = path.join(outside, 'secret.js');
      fs.writeFileSync(target, 'module.exports = "private";\n');
      try {
        fs.symlinkSync(target, path.join(root, 'linked.js'));
      } catch (error) {
        if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error && error.code)) return;
        throw error;
      }
      expect(normalizeChangedPath(root, 'linked.js')).toBeNull();
      expect(planScopedTests({ root, changedPaths: ['linked.js'] })).toMatchObject({
        mode: 'full',
        unmapped: ['linked.js'],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('returns blocked diagnostics instead of guessing a runner', () => {
    const root = fixture({
      'README.md': '# fixture\n',
      'pyproject.toml': '[project]\nname = "generic-python-project"\n',
    });
    try {
      expect(planScopedTests({ root, changedPaths: ['README.md'] })).toMatchObject({
        runner: null,
        mode: 'blocked',
        focused: null,
        full: null,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('prefers host roots and sanitizes Git subprocess state', () => {
    const root = fixture({
      'package.json': JSON.stringify({ devDependencies: { jest: '^30.0.0' } }),
      'src/add.js': 'module.exports = true;\n',
    });
    try {
      const env = {
        CODEX_PROJECT_DIR: root,
        SPK_PROJECT_ROOT: path.join(root, 'project-override')
      };
      expect(scopedProjectRoot(env)).toBe(path.resolve(root));
      expect(parseCli([], env, path.dirname(root)).root).toBe(path.resolve(root));
      expect(planScopedTests({
        env,
        changedPaths: ['src/add.js']
      })).toMatchObject({
        root: path.resolve(root),
        runner: 'jest',
        mode: 'scoped'
      });

      const child = gitEnvironment();
      expect(child.PATH).toBeTruthy();
      expect(child.PATH).not.toContain(path.join(root, 'project-override'));
      expect(child.GIT_OPTIONAL_LOCKS).toBe('0');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
