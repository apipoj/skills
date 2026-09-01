'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTRACT = require('../contracts/workflows.json');

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('split-zone artifact routing', () => {
  const byId = Object.fromEntries(CONTRACT.skills.map((skill) => [skill.id, skill]));

  test('declares one policy-driven default for each migrated writer', () => {
    expect(byId.setup.artifacts).toContain('docs/agents/artifacts.md');
    expect(byId.plan.artifacts).toContain('ai_context/work/plans/YYYY-MM-DD-<slug>.md');
    expect(byId.handoff.artifacts).toContain(
      'ai_context/work/handoffs/YYYY-MM-DDTHHMMSSZ-<slug>.md',
    );
    expect(byId['to-questionnaire'].artifacts).toContain(
      'ai_context/work/questionnaires/YYYY-MM-DD-questionnaire-<slug>.md',
    );
    expect(byId.research.artifacts).toContain(
      'ai_context/work/research/YYYY-MM-DD-research-<slug>.md',
    );
    expect(byId['to-spec'].artifacts).toContain(
      'ai_context/work/specs/YYYY-MM-DD-spec-<slug>.md',
    );
  });

  test.each([
    ['setup', 'engineering'],
    ['plan', 'engineering'],
    ['code', 'engineering'],
    ['research', 'engineering'],
    ['to-spec', 'engineering'],
    ['handoff', 'productivity'],
    ['to-questionnaire', 'productivity'],
  ])('%s reads the central artifact policy', (id, bucket) => {
    const payload = read(`plugins/spk/skills/${id}/SKILL.md`);
    const english = read(`locales/en/skills/${bucket}/${id}/SKILL.md`);
    const thai = read(`skills/${bucket}/${id}/SKILL.md`);
    for (const body of [payload, english, thai]) {
      expect(body).toContain('docs/agents/artifacts.md');
    }
  });

  test('setup ships a human-readable routing policy template in every source surface', () => {
    const paths = [
      'skills/engineering/setup/artifacts.md',
      'locales/en/skills/engineering/setup/artifacts.md',
      'plugins/spk/skills/setup/artifacts.md',
    ];
    for (const relativePath of paths) {
      const body = read(relativePath);
      expect(body).toContain('# Project Artifact Policy');
      expect(body).toContain('ai_context/work/');
      expect(body).toContain('Canonical destination');
      expect(body).toContain('Promotion authority');
    }
  });

  test('the local scaffold separates runtime, private sources, derived memory, and work drafts', () => {
    const required = [
      'plugins/spk/templates/ai_context/runtime/.gitkeep',
      'plugins/spk/templates/ai_context/work/archive/.gitkeep',
      'plugins/spk/templates/ai_context/work/handoffs/.gitkeep',
      'plugins/spk/templates/ai_context/work/plans/.gitkeep',
      'plugins/spk/templates/ai_context/work/questionnaires/.gitkeep',
      'plugins/spk/templates/ai_context/work/research/.gitkeep',
      'plugins/spk/templates/ai_context/work/specs/.gitkeep',
    ];
    required.forEach((relativePath) => {
      expect(fs.existsSync(path.join(REPO_ROOT, relativePath))).toBe(true);
    });

    const schema = read('plugins/spk/templates/ai_context/wiki/SCHEMA.md');
    expect(schema).toMatch(/derived (?:memory|index)/i);
    expect(schema).toMatch(/canonical artifact/i);
    expect(schema).toMatch(/must not duplicate/i);
  });

  test('plan readers retain a named compatibility fallback without treating legacy wiki plans as canonical', () => {
    const code = read('plugins/spk/skills/code/SKILL.md');
    expect(code).toContain('ai_context/work/plans/');
    expect(code).toContain('docs/plans/');
    expect(code).toContain('ai_context/wiki/plans/');
    expect(code).toMatch(/legacy compatibility/i);
  });
});
