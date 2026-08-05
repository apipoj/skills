const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manifest = require('../manifest.json');
const contract = require('../contracts/workflows.json');

const upstreamCanonical = [
  'start',
  'diagnosing-bugs',
  'grill-with-docs',
  'triage',
  'improve-codebase-architecture',
  'setup',
  'tdd',
  'to-spec',
  'to-tickets',
  'wayfinder',
  'implement',
  'prototype',
  'research',
  'domain-modeling',
  'codebase-design',
  'code-review',
  'resolving-merge-conflicts',
  'grill-me',
  'grilling',
  'handoff',
  'teach',
  'writing-great-skills',
];

const spkCore = [
  'ask-me',
  'plan',
  'design-shotgun',
  'deploy',
  'pr',
  'task-to-pr',
  'ingest',
  'prime',
  'query',
  'wiki-lint',
  'doctor',
  'release-check',
  'scoped-tests',
  'uninstall',
];

const aliases = {
  'ask-matt': 'start',
  'setup-matt-pocock-skills': 'setup',
  spk: 'start',
  jumpstart: 'start',
  code: 'implement',
  debug: 'diagnosing-bugs',
  review: 'code-review',
};

describe('Apipoj Skills v5 migration contract', () => {
  test('uses the approved product identity and version', () => {
    expect(manifest).toMatchObject({
      version: '5.0.0',
      brand: 'Apipoj Skills',
      slug: 'spk',
    });
    expect(contract.plugin).toMatchObject({
      name: 'spk',
      displayName: 'Apipoj Skills',
      repository: 'https://github.com/apipoj/skills',
    });
  });

  test('declares 36 canonical skills and seven temporary aliases', () => {
    const skills = new Map(contract.skills.map(skill => [skill.id, skill]));
    const canonical = [...upstreamCanonical, ...spkCore];

    expect(new Set(canonical).size).toBe(36);
    expect(contract.skills).toHaveLength(43);
    expect(manifest.commands).toHaveLength(43);

    for (const id of canonical) {
      expect(skills.get(id)).toMatchObject({ tier: 'core' });
      expect(skills.get(id).aliasFor).toBeUndefined();
    }
    for (const [id, target] of Object.entries(aliases)) {
      expect(skills.get(id)).toMatchObject({
        tier: 'compat',
        aliasFor: target,
        activation: { allowImplicitInvocation: false },
      });
    }
  });

  test('records Thai and English source directories for every shipped skill', () => {
    for (const skill of contract.skills) {
      expect(skill.sources).toEqual({
        th: expect.any(String),
        en: expect.any(String),
      });
      for (const locale of ['th', 'en']) {
        const dir = path.join(ROOT, skill.sources[locale]);
        expect(fs.existsSync(path.join(dir, 'SKILL.md'))).toBe(true);
      }
    }
  });

  test('keeps the two strategy skills outside the default bundle', () => {
    const commandIds = new Set(manifest.commands.map(command => command.name.slice(1)));
    expect(commandIds.has('bala')).toBe(false);
    expect(commandIds.has('sunzi')).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'extras', 'skills', 'bala', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'extras', 'skills', 'sunzi', 'SKILL.md'))).toBe(true);
  });

  test('makes start the Thai-first router and preserves the short namespace', () => {
    const start = contract.skills.find(skill => skill.id === 'start');
    expect(start.locales.th.displayName).toMatch(/เริ่ม|ทางลัด|พร้อมใช้/);
    expect(start.locales.th.description).toMatch(/ไทย/);
    expect(start.workflow.map(step => step.instruction).join('\n')).toMatch(/Thai|ไทย/);
    expect(start.workflow.map(step => step.instruction).join('\n')).toMatch(/one material question|หนึ่งคำถาม/i);
  });
});
