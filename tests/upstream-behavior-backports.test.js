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

  test.each([
    ['tdd', ['docs/agents/domain.md', 'GLOSSARY-MAP.md', 'CONTEXT-MAP.md', 'what it catches and what it misses']],
    ['code-review', ['CODING_STANDARDS.md', 'CONTRIBUTING.md', 'wait\nfor their reports']],
    ['code', ['ticket reference', 'acceptance criteria', 'ambiguous']],
    ['asking', ['bare "yes"', 'meaning is explicit']],
    ['teach', ['directory\nwhere teaching was requested', 'correct answer\'s position']],
    ['wayfinder', ['type label', 'real identifiers', 'exact approval']],
    ['to-tickets', ['separate relationships', 'native blocking edges were verified']],
    ['wizard', ['inside `run_wizard`', 'mode 0600']],
  ])('%s packages the reviewed guidance on all source surfaces', (id, guidance) => {
    for (const text of surfacesFor(id)) {
      for (const phrase of guidance) {
        expect(text.replace(/\s+/g, ' ')).toContain(phrase.replace(/\s+/g, ' '));
      }
    }
  });

  test('glossary compatibility does not create competing canonical records', () => {
    for (const id of ['domain-modeling', 'setup', 'ask-project', 'check-wiki', 'load-project', 'add-knowledge']) {
      for (const text of surfacesFor(id)) {
        expect(text).toContain('one canonical glossary');
        expect(text).toContain('ask which is authoritative before writing');
      }
    }
  });
});
