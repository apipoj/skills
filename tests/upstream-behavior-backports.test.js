const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const contract = require('../contracts/workflows.json');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function surfacesFor(id) {
  const skill = contract.skills.find(candidate => candidate.id === id);
  return [
    skill.sources.th,
    skill.sources.en,
    `plugins/spk/skills/${id}`,
  ].map(directory => read(path.join(directory, 'SKILL.md')));
}

describe('reviewed upstream behavior backports', () => {
  test('wait-what follows CONTEXT-MAP.md before selecting project vocabulary', () => {
    for (const text of surfacesFor('wait-what')) {
      expect(text).toContain('CONTEXT-MAP.md');
      expect(text).toContain('CONTEXT.md');
    }
  });

  test('asking visibly separates adjacent questions in a round', () => {
    for (const text of surfacesFor('asking')) {
      expect(text).toMatch(/\n\s*---\n\n\s*❓ \*\*Q2\*\*/);
    }
  });
});
