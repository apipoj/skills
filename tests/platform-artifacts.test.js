'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CODEX_MANIFEST_RELATIVE,
  CODEX_PLUGIN_ROOT_RELATIVE,
  CONTRACT_RELATIVE,
  MARKETPLACE_RELATIVE,
  buildArtifactMap,
  generatePlatformArtifacts,
  loadInputs,
  parseFrontmatter,
  renderOpenAiYaml,
  validateContract,
  validateSharedSkills,
} = require('../scripts/generate-platform-artifacts.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

function normalizeLineEndings(content) {
  return content.replace(/\r\n/g, '\n');
}

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function portableSkillMarkdown(skill) {
  return [
    '---',
    `name: ${skill.id}`,
    `description: ${JSON.stringify(skill.locales.en.description)}`,
    ...(!skill.activation.allowImplicitInvocation
      ? ['disable-model-invocation: true']
      : []),
    '---',
    '',
    `# ${skill.locales.en.displayName}`,
    '',
    '## Workflow',
    '',
    'Follow the canonical workflow phases for the current request.',
    '',
    '## Evidence Receipt',
    '',
    'Return the inspected paths, commands, results, risks, and next gate.',
    '',
    '## Guardrails',
    '',
    'Respect the declared effect level and approval boundary.',
    '',
  ].join('\n');
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-platform-artifacts-'));
  const contract = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, CONTRACT_RELATIVE), 'utf8'),
  );
  const manifest = {
    version: '9.8.7',
    slug: 'spk',
    commands: contract.skills.map((skill) => ({
      name: `/${skill.id}`,
      direct: true,
    })),
  };

  writeFile(root, CONTRACT_RELATIVE, `${JSON.stringify(contract, null, 2)}\n`);
  writeFile(root, 'manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  for (const skill of contract.skills) {
    writeFile(
      root,
      path.join('plugins/spk/skills', skill.id, 'SKILL.md'),
      portableSkillMarkdown(skill),
    );
  }

  return {
    contract,
    manifest,
    root,
  };
}

describe('platform artifact compiler', () => {
  test('canonical contract covers every manifest command with bilingual activation and evidence fields', () => {
    const { contract, manifest } = loadInputs(REPO_ROOT);
    expect(validateContract(contract, manifest)).toEqual([]);
    expect(contract.skills.map((skill) => skill.id)).toEqual(
      manifest.commands.map((command) => command.name.slice(1)),
    );

    for (const skill of contract.skills) {
      expect(skill.locales.en.triggers.length).toBeGreaterThanOrEqual(2);
      expect(skill.locales.en.negativeTriggers.length).toBeGreaterThanOrEqual(2);
      expect(skill.locales.th.triggers.length).toBeGreaterThanOrEqual(2);
      expect(skill.locales.th.negativeTriggers.length).toBeGreaterThanOrEqual(2);
      expect(skill.workflow.length).toBeGreaterThanOrEqual(2);
      expect(skill.artifacts.length).toBeGreaterThan(0);
      expect(skill.evidence.length).toBeGreaterThan(0);
      expect(typeof skill.activation.allowImplicitInvocation).toBe('boolean');
      expect(contract.effectLevels).toHaveProperty(skill.effectLevel);
    }
  });

  test('declares truthful effects for dynamic routing and audit workflows', () => {
    const { contract } = loadInputs(REPO_ROOT);
    const byId = Object.fromEntries(contract.skills.map((skill) => [skill.id, skill]));

    expect(byId.start.effectLevel).toBe('workspace_write');
    expect(byId.start.activation.allowImplicitInvocation).toBe(true);
    expect(fs.readFileSync(
      path.join(REPO_ROOT, 'plugins/spk/skills/start/SKILL.md'),
      'utf8',
    )).toMatch(/planning approval does not authorize implementation/i);

    expect(byId['ask-me'].effectLevel).toBe('read_only');
    expect(byId['ask-me'].activation.allowImplicitInvocation).toBe(false);
    expect(byId['ask-me'].workflow.find((step) => step.phase === 'voice').instruction)
      .toMatch(/dense, native, semi-formal Thai[\s\S]*no literal translationese[\s\S]*no other emoji/i);
    expect(byId['ask-me'].workflow.find((step) => step.phase === 'ask').instruction)
      .toMatch(/exactly one decision question per message[\s\S]*eight non-option lines[\s\S]*recommended answer/i);
    expect(byId['ask-me'].workflow.find((step) => step.phase === 'confirm').instruction)
      .toMatch(/compact brief[\s\S]*eight one-line bullets/i);
    expect(byId['ask-me'].workflow.find((step) => step.phase === 'recommend').instruction)
      .toMatch(/two or three context-relevant candidates[\s\S]*exactly one recommendation/i);
    expect(byId['ask-me'].workflow.find((step) => step.phase === 'handoff').instruction)
      .toMatch(/new scoped artifact request[\s\S]*default to an in-conversation draft[\s\S]*post-plan confirmation[\s\S]*references rather than repeats/i);
    expect(byId['ask-me'].guardrails.join('\n'))
      .toMatch(/ask-me remains read-only[\s\S]*never begin development until a reviewed plan/i);
    expect(byId['ask-me'].guardrails.join('\n'))
      .toMatch(/external delivery requires separate approval[\s\S]*artifact, recipients, and channel/i);

    expect(byId.plan.effectLevel).toBe('workspace_write');
    expect(byId.plan.workflow.find((step) => step.phase === 'handoff').instruction)
      .toMatch(/pre-plan request to develop authorizes planning only/i);
    expect(byId.code.effectLevel).toBe('workspace_write');
    expect(fs.readFileSync(
      path.join(REPO_ROOT, 'plugins/spk/skills/code/SKILL.md'),
      'utf8',
    )).toMatch(/exact plan that was just presented/i);

    expect(byId['code-review'].effectLevel).toBe('read_only');
    expect(byId.debug.effectLevel).toBe('read_only');

    expect(byId['check-wiki'].effectLevel).toBe('workspace_write');
    expect(byId['check-wiki'].activation.allowImplicitInvocation).toBe(true);
    expect(byId['check-wiki'].workflow.find((step) => step.phase === 'guard').instruction)
      .toMatch(/only project write/i);
    expect(byId['check-wiki'].guardrails.join('\n'))
      .toMatch(/explicit wiki-audit intent[\s\S]*bounded temporary guard marker/i);

    const wikiLintSkill = fs.readFileSync(
      path.join(REPO_ROOT, 'plugins/spk/skills/check-wiki/SKILL.md'),
      'utf8',
    );
    expect(wikiLintSkill).toMatch(/only permitted project write/i);

    for (const id of [
      'ask-matt',
      'setup-matt-pocock-skills',
      'spk',
      'jumpstart',
      'review',
      'grill-me',
      'grilling',
      'grill-with-docs',
      'diagnosing-bugs',
      'implement',
      'design-shotgun',
      'resolving-merge-conflicts',
      'writing-great-skills',
      'prime',
      'query',
      'ingest',
      'wiki-lint',
      'improve-codebase-architecture',
      'scoped-tests',
      'release-check',
    ]) {
      expect(byId[id].tier).toBe('compat');
      expect(byId[id].activation.allowImplicitInvocation).toBe(false);
      expect(byId[id].aliasFor).toBeTruthy();
    }
  });

  test('ignores only the project runtime scaffold, not packaged templates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-ignore-scope-'));
    fs.copyFileSync(path.join(REPO_ROOT, '.gitignore'), path.join(root, '.gitignore'));
    const paths = [
      'ai_context/wiki/index.md',
      'plugins/spk/templates/ai_context/wiki/index.md',
      'plugins/spk-codex/templates/ai_context/wiki/index.md',
    ];
    paths.forEach((relativePath) => writeFile(root, relativePath, '# fixture\n'));
    execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });

    const isIgnored = (relativePath) => {
      const result = spawnSync(
        'git',
        ['check-ignore', '--no-index', '--quiet', '--', relativePath],
        { cwd: root, encoding: 'utf8' },
      );
      expect([0, 1]).toContain(result.status);
      return result.status === 0;
    };

    expect(isIgnored(paths[0])).toBe(true);
    expect(isIgnored(paths[1])).toBe(false);
    expect(isIgnored(paths[2])).toBe(false);
  });

  test('generates deterministic Codex metadata and detects stale artifacts in check mode', () => {
    const fixture = createFixture();
    const first = generatePlatformArtifacts({ repoRoot: fixture.root });
    expect(first.ok).toBe(true);
    expect(first.written).toHaveLength(fixture.contract.skills.length * 3 + 2);

    const firstManifest = fs.readFileSync(
      path.join(fixture.root, CODEX_MANIFEST_RELATIVE),
      'utf8',
    );
    const firstMetadata = fs.readFileSync(
      path.join(fixture.root, 'plugins/spk-codex/skills/start/agents/openai.yaml'),
      'utf8',
    );

    const second = generatePlatformArtifacts({ repoRoot: fixture.root });
    expect(second.ok).toBe(true);
    expect(
      fs.readFileSync(path.join(fixture.root, CODEX_MANIFEST_RELATIVE), 'utf8'),
    ).toBe(firstManifest);
    expect(
      fs.readFileSync(
        path.join(fixture.root, 'plugins/spk-codex/skills/start/agents/openai.yaml'),
        'utf8',
      ),
    ).toBe(firstMetadata);
    expect(generatePlatformArtifacts({ repoRoot: fixture.root, check: true })).toEqual({
      ok: true,
      errors: [],
      written: [],
    });

    writeFile(fixture.root, MARKETPLACE_RELATIVE, '{}\n');
    const stale = generatePlatformArtifacts({ repoRoot: fixture.root, check: true });
    expect(stale.ok).toBe(false);
    expect(stale.errors).toContain(
      `${MARKETPLACE_RELATIVE} is stale; run node scripts/generate-platform-artifacts.cjs`,
    );
  });

  test('detects and removes orphaned files only inside the generated Codex payload', () => {
    const fixture = createFixture();
    expect(generatePlatformArtifacts({ repoRoot: fixture.root }).ok).toBe(true);
    const orphan = path.join(
      CODEX_PLUGIN_ROOT_RELATIVE,
      'skills',
      'orphan',
      'SKILL.md',
    );
    writeFile(fixture.root, orphan, '# stale generated file\n');

    const stale = generatePlatformArtifacts({ repoRoot: fixture.root, check: true });
    expect(stale.ok).toBe(false);
    expect(stale.errors).toContain(
      `${orphan} is an orphaned generated artifact; run node scripts/generate-platform-artifacts.cjs`,
    );

    expect(generatePlatformArtifacts({ repoRoot: fixture.root }).ok).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, orphan))).toBe(false);
  });

  test('renders native plugin, MCP, marketplace, and invocation policy metadata', () => {
    const { contract, manifest } = loadInputs(REPO_ROOT);
    const artifacts = buildArtifactMap(contract, manifest);
    const plugin = JSON.parse(artifacts.get(CODEX_MANIFEST_RELATIVE));
    const marketplace = JSON.parse(artifacts.get(MARKETPLACE_RELATIVE));

    expect(plugin.name).toBe('spk');
    expect(plugin.version).toBe(manifest.version);
    expect(plugin.skills).toBe('./skills/');
    expect(plugin.mcpServers['spk-codebase-search']).toEqual({
      command: 'node',
      args: ['mcp/codebase-search.cjs'],
      cwd: '.',
    });
    expect(JSON.parse(
      artifacts.get(path.join(CODEX_PLUGIN_ROOT_RELATIVE, '.mcp.json'))
    ).mcpServers['spk-codebase-search'].command).toBe('node');
    const generatedHooks = JSON.parse(
      artifacts.get(path.join(CODEX_PLUGIN_ROOT_RELATIVE, 'hooks', 'hooks.json'))
    );
    const generatedCommandHooks = Object.values(generatedHooks.hooks)
      .flat()
      .flatMap(entry => entry.hooks || []);
    expect(generatedCommandHooks.length).toBeGreaterThan(0);
    expect(generatedCommandHooks.every(hook => hook.command === 'node')).toBe(true);
    expect(plugin.interface.privacyPolicyURL).toBe(
      'https://github.com/apipoj/skills/blob/main/PRIVACY.md',
    );
    expect(plugin.interface.termsOfServiceURL).toBe(
      'https://github.com/apipoj/skills/blob/main/TERMS.md',
    );
    expect(plugin.interface.supportURL).toBeUndefined();

    expect(marketplace.plugins).toEqual([
      {
        name: 'spk',
        source: {
          source: 'local',
          path: './plugins/spk-codex',
        },
        policy: {
          installation: 'AVAILABLE',
          authentication: 'ON_INSTALL',
        },
        category: 'Developer Tools',
      },
    ]);
    expect(normalizeLineEndings(artifacts.get(
      path.join(CODEX_PLUGIN_ROOT_RELATIVE, 'scripts', 'spk-doctor.cjs'),
    ))).toBe(
      normalizeLineEndings(fs.readFileSync(
        path.join(REPO_ROOT, 'plugins/spk/scripts/spk-doctor.cjs'),
        'utf8',
      )),
    );
    expect(normalizeLineEndings(artifacts.get(
      path.join(CODEX_PLUGIN_ROOT_RELATIVE, 'mcp', 'codebase-search.cjs'),
    ))).toBe(
      normalizeLineEndings(fs.readFileSync(
        path.join(REPO_ROOT, 'plugins/spk/mcp/codebase-search.cjs'),
        'utf8',
      )),
    );
    expect(normalizeLineEndings(artifacts.get(
      path.join(
        CODEX_PLUGIN_ROOT_RELATIVE,
        'templates',
        'ai_context',
        'wiki',
        'SCHEMA.md',
      ),
    ))).toBe(
      normalizeLineEndings(fs.readFileSync(
        path.join(REPO_ROOT, 'plugins/spk/templates/ai_context/wiki/SCHEMA.md'),
        'utf8',
      )),
    );

    const deploy = contract.skills.find((skill) => skill.id === 'deploy');
    const deployMetadata = renderOpenAiYaml(deploy);
    expect(deployMetadata).toContain('allow_implicit_invocation: false');
    expect(deployMetadata).toContain('default_prompt: "Use $spk:deploy:');
    expect(deployMetadata).not.toContain('products:');
    const deployClaude = fs.readFileSync(
      path.join(REPO_ROOT, 'plugins/spk/skills/deploy/SKILL.md'),
      'utf8',
    );
    const deployCodex = artifacts.get(
      path.join(CODEX_PLUGIN_ROOT_RELATIVE, 'skills', 'deploy', 'SKILL.md'),
    );
    expect(deployClaude).toContain('disable-model-invocation: true');
    expect(deployCodex).not.toContain('disable-model-invocation');
    expect(deployCodex).toContain('Generated by scripts/generate-platform-artifacts.cjs');

    const router = contract.skills.find((skill) => skill.id === 'start');
    const routerMetadata = renderOpenAiYaml(router);
    expect(routerMetadata).toContain('allow_implicit_invocation: true');
    expect(routerMetadata).toContain('default_prompt: "Use $spk:start:');

    const thaiRouterMetadata = artifacts.get(
      path.join(router.sources.th, 'agents', 'openai.yaml'),
    );
    expect(thaiRouterMetadata).toContain('display_name: "เริ่มงานแบบพร้อมใช้"');
    expect(thaiRouterMetadata).toContain('default_prompt: "ใช้ $spk:start:');

    const taskToPr = contract.skills.find((skill) => skill.id === 'task-to-pr');
    expect(renderOpenAiYaml(taskToPr)).toContain('allow_implicit_invocation: false');

    const askMe = contract.skills.find((skill) => skill.id === 'ask-me');
    const askMeMetadata = renderOpenAiYaml(askMe);
    expect(askMeMetadata).toContain('allow_implicit_invocation: false');
    expect(askMeMetadata).toContain('default_prompt: "Use $spk:ask-me:');
  });

  test('rejects provider-specific skill syntax, invocation-policy drift, and contract drift', () => {
    const fixture = createFixture();
    const planPath = path.join(
      fixture.root,
      'plugins/spk/skills/plan/SKILL.md',
    );
    const portable = fs.readFileSync(planPath, 'utf8');
    fs.writeFileSync(
      planPath,
      portable.replace(
        'name: plan',
        'name: plan\ndisable-model-invocation: true\nargument-hint: "<feature>"',
      ).replace(
        'Follow the canonical workflow phases for the current request.',
        'Dispatch Task(subagent_type="planner") with $ARGUMENTS and /spk:plan.',
      ),
      'utf8',
    );

    const errors = validateSharedSkills(fixture.root, fixture.contract);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('contains Claude Task dispatch'),
        expect.stringContaining('contains Claude argument expansion'),
        expect.stringContaining('contains Claude namespaced slash invocation'),
        expect.stringContaining('contains unsupported Claude source frontmatter'),
        expect.stringContaining('must omit disable-model-invocation'),
      ]),
    );

    const driftedManifest = {
      ...fixture.manifest,
      commands: [...fixture.manifest.commands, { name: '/missing', direct: true }],
    };
    expect(validateContract(fixture.contract, driftedManifest)).toContain(
      'contract is missing manifest commands: missing',
    );
  });

  test('rejects unsafe locale sources, invalid tiers, and broken compatibility targets', () => {
    const fixture = createFixture();
    const drifted = JSON.parse(JSON.stringify(fixture.contract));
    drifted.skills[0].tier = 'default';
    drifted.skills[0].sources.th = '../outside/start';
    drifted.skills[0].origin.repository = '';
    const alias = drifted.skills.find(skill => skill.tier === 'compat');
    alias.aliasFor = 'missing-canonical-skill';

    const errors = validateContract(drifted, fixture.manifest).join('\n');
    expect(errors).toMatch(/tier must be core or compat/);
    expect(errors).toMatch(/sources\.th must be a canonical Thai skill directory/);
    expect(errors).toMatch(/origin\.repository must be a non-empty string/);
    expect(errors).toMatch(/aliasFor must reference a canonical core skill/);
  });

  test('parses quoted frontmatter scalars used by shared skills', () => {
    const parsed = parseFrontmatter(
      [
        '---',
        'name: example',
        'description: "A description: with punctuation."',
        'disable-model-invocation: true',
        '---',
        '',
        '# Example',
        '',
      ].join('\n'),
    );
    expect(parsed.fields).toEqual({
      name: 'example',
      description: 'A description: with punctuation.',
      'disable-model-invocation': true,
    });
  });
});
