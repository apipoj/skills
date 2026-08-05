// tests/skill-descriptions.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const { collectSkillDescriptionErrors } = require('../scripts/verify-skill-descriptions.cjs');

function writeSkill(root, slug, description) {
  const file = path.join(root, 'plugins/spk/skills', slug, 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\ndescription: ${description}\n---\n# ${slug}\n`);
  return file;
}

describe('skill description lint', () => {
  test('accepts concise capability-led descriptions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-skill-desc-'));
    try {
      const file = writeSkill(root, 'plan', 'Plan implementation work with requirements, architecture, tests, rollout, and verification gates.');
      expect(collectSkillDescriptionErrors(root, [file])).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects missing, weak, stale, and instructional descriptions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-skill-desc-'));
    try {
      const shortFile = writeSkill(root, 'short', 'Too short.');
      const todoFile = writeSkill(root, 'todo', 'TODO implement a better description for this skill before shipping release.');
      const useThisFile = writeSkill(root, 'use-this', 'Use this when you want to run validation gates before release.');
      const longFile = writeSkill(root, 'long', 'x'.repeat(221));

      const errors = collectSkillDescriptionErrors(root, [shortFile, todoFile, useThisFile, longFile]);
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('description too short'),
        expect.stringContaining('TODO/FIXME/XXX/WIP'),
        expect.stringContaining('instructional "Use this..."'),
        expect.stringContaining('description too long'),
      ]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
