// tests/skill-descriptions.test.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectFrontmatterYamlErrors,
  collectSkillDescriptionErrors,
  parseFrontmatter,
} = require('../scripts/verify-skill-descriptions.cjs');

const ROOT = path.join(__dirname, '..');

function writeRawSkill(root, slug, frontmatter) {
  const file = path.join(root, 'plugins/spk/skills', slug, 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\n${frontmatter}\n---\n# ${slug}\n`);
  return root;
}

describe('skill frontmatter is parseable YAML', () => {
  // Claude Code and the skills.sh adapters read this frontmatter as YAML. A
  // plain scalar carrying ": " is not valid YAML, and 6.0.0 shipped exactly
  // one — the installer caught it in the field, no gate did.
  test('the shipped payload parses', () => {
    expect(collectFrontmatterYamlErrors(ROOT)).toEqual([]);
  });

  test('rejects a colon-space inside an unquoted value', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-fm-'));
    writeRawSkill(root, 'wait-what', 'name: wait-what\ndescription: Re-pitch what did not land: add the missing context.');
    expect(collectFrontmatterYamlErrors(root).join('\n')).toMatch(/wait-what.*unquoted value contains ": "/);
  });

  test('accepts the same text once it is quoted', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-fm-'));
    writeRawSkill(root, 'ok', 'name: ok\ndescription: "Re-pitch what did not land: add the missing context."');
    expect(collectFrontmatterYamlErrors(root)).toEqual([]);
  });

  test('rejects an unterminated quote', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-fm-'));
    writeRawSkill(root, 'oops', 'name: oops\ndescription: "never closed');
    expect(collectFrontmatterYamlErrors(root).join('\n')).toMatch(/oops.*unterminated quote/);
  });

  test('rejects a value opening with a YAML indicator character', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-fm-'));
    writeRawSkill(root, 'anchor', 'name: anchor\ndescription: *not-an-anchor please');
    expect(collectFrontmatterYamlErrors(root).join('\n')).toMatch(/anchor.*indicator character/);
  });

  test('rejects an inline comment marker that would truncate the value', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-fm-'));
    writeRawSkill(root, 'hash', 'name: hash\ndescription: Route work #2 through triage.');
    expect(collectFrontmatterYamlErrors(root).join('\n')).toMatch(/hash.*" #"/);
  });
});

function writeSkill(root, slug, description) {
  const file = path.join(root, 'plugins/spk/skills', slug, 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---\ndescription: ${description}\n---\n# ${slug}\n`);
  return file;
}

describe('skill description lint', () => {
  test('parses skill frontmatter from Windows CRLF checkouts', () => {
    const content = [
      '---',
      'description: Plan implementation work with requirements, tests, and verification gates.',
      '---',
    ].join('\r\n');

    expect(parseFrontmatter(content)).toMatchObject({
      description: 'Plan implementation work with requirements, tests, and verification gates.',
    });
  });

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
