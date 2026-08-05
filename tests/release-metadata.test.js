const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  collectCountClaimErrors,
  collectReleaseMetadataErrors,
  collectRepositorySecretErrors,
  collectRosterErrors,
  collectTagErrors,
  collectVersionErrors,
  extractCountClaims,
  parseArgs,
  tagFromEnvironment,
} = require('../scripts/verify-release-metadata.cjs');

function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-release-metadata-'));
  const manifest = {
    version: '3.6.0',
    released: '2026-07-31',
    brand: 'AI Sprint Kit',
    slug: 'spk',
    tagline: 'Fixture',
    agents: {
      orchestrators: [
        { name: 'plan-orchestrator', model: 'claude-opus-4-8', color: 'green', phase: 'planning' },
      ],
      specialists: [
        { name: 'planner', model: 'claude-opus-4-8', color: 'green', phase: 'planning' },
      ],
    },
    commands: [
      { name: '/plan', orchestrator: 'plan-orchestrator' },
    ],
  };

  writeJson(root, 'manifest.json', manifest);
  writeJson(root, 'package.json', {
    version: manifest.version,
    description: 'Fixture with 2 subagents and 1 skill.',
  });
  writeJson(root, 'package-lock.json', {
    version: manifest.version,
    packages: { '': { version: manifest.version } },
  });
  writeJson(root, 'plugins/spk/.claude-plugin/plugin.json', {
    version: manifest.version,
    description: 'Fixture with 1 orchestrator and 1 specialist.',
  });
  writeJson(root, '.claude-plugin/marketplace.json', {
    plugins: [{
      version: manifest.version,
      description: 'Fixture with 2 agents and 1 command.',
    }],
  });
  for (const file of ['README.md', 'README-EN.md', 'INSTALL_FOR_AGENTS.md']) {
    writeText(root, file, 'Fixture: 2 subagents, 1 orchestrator, 1 specialist, and 1 skill.\n');
  }
  writeText(root, 'CHANGELOG.md', '# Changelog\n\n## Unreleased\n\n## 3.6.0 - 2026-07-31\n');
  return { root, manifest };
}

describe('release metadata', () => {
  test('accepts synchronized public release metadata', () => {
    const { root } = createFixture();
    expect(collectReleaseMetadataErrors(root, { scanSecrets: false })).toEqual([]);
  });

  test('detects stale public skill and agent counts', () => {
    const { root, manifest } = createFixture();
    writeText(root, 'README.md', 'Fixture has 9 subagents and 16 slash skills.\n');
    const errors = collectCountClaimErrors(root, manifest);
    expect(errors.join('\n')).toMatch(/9 subagents/);
    expect(errors.join('\n')).toMatch(/16 slash skills/);
  });

  test('extracts count claims without treating unrelated numbers as rosters', () => {
    expect(extractCountClaims('5-layer security, 21 agents, 19 commands')).toEqual([
      expect.objectContaining({ count: 21, kind: 'agents' }),
      expect.objectContaining({ count: 19, kind: 'commands' }),
    ]);
  });

  test('detects version drift in every required source', () => {
    const { root } = createFixture();
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    packageJson.version = '3.5.0';
    writeJson(root, 'package.json', packageJson);
    expect(collectVersionErrors(root).join('\n')).toMatch(/package\.json: version mismatch/);
  });

  test('checks an optional Codex plugin version when present', () => {
    const { root } = createFixture();
    writeJson(root, 'plugins/spk-codex/.codex-plugin/plugin.json', {
      name: 'spk',
      version: '3.5.0',
    });
    expect(collectVersionErrors(root).join('\n')).toMatch(/codex-plugin.*version mismatch/);
  });

  test('detects duplicate names and invalid target references', () => {
    const { manifest } = createFixture();
    manifest.agents.specialists.push({
      ...manifest.agents.specialists[0],
      name: 'plan-orchestrator',
    });
    manifest.commands.push(
      { name: '/plan', direct: true },
      { name: '/missing', agent: 'missing-agent' }
    );
    const errors = collectRosterErrors(manifest).join('\n');
    expect(errors).toMatch(/duplicate agent name/);
    expect(errors).toMatch(/duplicate command name/);
    expect(errors).toMatch(/unknown agent/);
  });

  test('requires the release tag to match the manifest version when requested', () => {
    expect(collectTagErrors('3.6.0', 'v3.6.0', true)).toEqual([]);
    expect(collectTagErrors('3.6.0', 'v3.5.0', true)).toEqual([
      'release tag mismatch (tag=v3.5.0 expected=v3.6.0)',
    ]);
    expect(collectTagErrors('3.6.0', '', true)).toEqual([
      'release tag missing; expected v3.6.0',
    ]);
  });

  test('derives tags from explicit and GitHub environments', () => {
    expect(tagFromEnvironment({ RELEASE_TAG: 'v3.6.0' })).toBe('v3.6.0');
    expect(tagFromEnvironment({
      GITHUB_REF_TYPE: 'tag',
      GITHUB_REF_NAME: 'v3.6.0',
    })).toBe('v3.6.0');
    expect(tagFromEnvironment({ GITHUB_REF: 'refs/tags/v3.6.0' })).toBe('v3.6.0');
    expect(tagFromEnvironment({ GITHUB_REF: 'refs/heads/main' })).toBe('');
  });

  test('parses tag and secret-scan CLI switches strictly', () => {
    expect(parseArgs(['--tag', 'v3.6.0', '--require-tag', '--skip-secret-scan'])).toEqual({
      requireTag: true,
      scanSecrets: false,
      tagName: 'v3.6.0',
    });
    expect(() => parseArgs(['--unknown'])).toThrow(/unknown argument/);
    expect(() => parseArgs(['--tag'])).toThrow(/requires a value/);
  });

  test('scans repository text while skipping binary files', () => {
    const { root } = createFixture();
    writeText(root, 'safe.txt', 'safe\n');
    fs.writeFileSync(path.join(root, 'binary.dat'), Buffer.from([0, 1, 2]));
    const scanner = content => content.includes('safe')
      ? [{ type: 'fixture_secret', line: 1 }]
      : [];
    expect(collectRepositorySecretErrors(root, {
      files: ['safe.txt', 'binary.dat'],
      scanner,
    })).toEqual(['safe.txt:1: potential fixture_secret']);
  });

  test('ignores deleted index entries, directories, and symlinks', () => {
    const { root } = createFixture();
    fs.mkdirSync(path.join(root, 'folder'));
    writeText(root, 'target.txt', 'safe\n');
    fs.symlinkSync('target.txt', path.join(root, 'linked.txt'));

    expect(collectRepositorySecretErrors(root, {
      files: ['deleted.txt', 'folder', 'linked.txt'],
      scanner: () => [{ type: 'fixture_secret', line: 1 }],
    })).toEqual([]);
  });
});
