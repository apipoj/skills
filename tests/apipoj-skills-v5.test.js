const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manifest = require('../manifest.json');
const contract = require('../contracts/workflows.json');

const upstreamCanonical = [
  'start',
  'debug',
  'ask-with-docs',
  'triage',
  'improve-codebase',
  'setup',
  'tdd',
  'to-spec',
  'to-tickets',
  'wayfinder',
  'code',
  'prototype',
  'research',
  'domain-modeling',
  'codebase-design',
  'code-review',
  'fix-conflicts',
  'asking',
  'handoff',
  'teach',
  'write-skills',
  'wizard',
  'to-questionnaire',
  'wait-what',
];

const spkCore = [
  'ask-me',
  'plan',
  'design-options',
  'deploy',
  'pr',
  'task-to-pr',
  'add-knowledge',
  'load-project',
  'ask-project',
  'check-wiki',
  'doctor',
  'check-release',
  'test-changes',
  'uninstall',
  'bala',
  'sunzi',
];

describe('Apipoj Skills v5 migration contract', () => {
  test('uses the approved product identity and version', () => {
    expect(manifest).toMatchObject({
      version: '6.4.1',
      brand: 'Apipoj Skills',
      slug: 'spk',
    });
    expect(contract.plugin).toMatchObject({
      name: 'spk',
      displayName: 'Apipoj Skills',
      repository: 'https://github.com/apipoj/skills',
    });
  });

  test('declares 40 canonical skills and no compatibility aliases', () => {
    const skills = new Map(contract.skills.map(skill => [skill.id, skill]));
    const canonical = [...upstreamCanonical, ...spkCore];

    expect(new Set(canonical).size).toBe(40);
    expect(contract.skills.filter(skill => skill.tier === 'core')).toHaveLength(40);
    expect(contract.skills.filter(skill => skill.tier === 'compat')).toHaveLength(0);
    expect(contract.skills.every(skill => !skill.aliasFor)).toBe(true);
    expect(contract.skills).toHaveLength(40);
    expect(manifest.commands).toHaveLength(40);

    for (const id of canonical) {
      expect(skills.get(id)).toMatchObject({ tier: 'core' });
      expect(skills.get(id).aliasFor).toBeUndefined();
    }
  });

  test('ships no compatibility bucket', () => {
    expect(fs.existsSync(path.join(ROOT, 'skills/compat'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'locales/en/skills/compat'))).toBe(false);
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

  test('ships the two strategy lenses in the default bundle', () => {
    const commandIds = new Set(manifest.commands.map(command => command.name.slice(1)));
    expect(commandIds.has('bala')).toBe(true);
    expect(commandIds.has('sunzi')).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'skills', 'productivity', 'bala', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'skills', 'productivity', 'sunzi', 'SKILL.md'))).toBe(true);
  });

  test('makes start the Thai-first router and preserves the short namespace', () => {
    const start = contract.skills.find(skill => skill.id === 'start');
    expect(start.locales.th.displayName).toMatch(/เริ่ม|ทางลัด|พร้อมใช้/);
    expect(start.locales.th.description).toMatch(/ไทย/);
    expect(start.workflow.map(step => step.instruction).join('\n')).toMatch(/Thai|ไทย/);
    expect(start.workflow.map(step => step.instruction).join('\n')).toMatch(/one material question|หนึ่งคำถาม/i);
  });
});
