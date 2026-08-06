const fs = require('fs');
const path = require('path');
const {
  collectNativeSkillErrors,
  findSkillFiles,
  missingFromDocs,
  parseFrontmatter,
  THAI_CHAR_RE,
} = require('../scripts/verify-native-skills.cjs');

const ROOT = path.join(__dirname, '..');
const contract = require('../contracts/workflows.json');

describe('bucketed Thai-first skills', () => {
  test('parses native skill frontmatter from Windows CRLF checkouts', () => {
    const content = [
      '---',
      'name: debug',
      'description: หาต้นเหตุของบั๊ก',
      '---',
      '# Debug',
    ].join('\r\n');

    expect(parseFrontmatter(content)).toMatchObject({
      name: 'debug',
      description: 'หาต้นเหตุของบั๊ก',
    });
  });

  test.each(contract.skills.map(skill => [skill.id, skill.sources.th]))('%s has its declared Thai source', (id, source) => {
    const file = path.join(ROOT, source, 'SKILL.md');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    expect(parseFrontmatter(content)).toMatchObject({ name: id });
    expect(content.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]+?\n---/, '')).toMatch(THAI_CHAR_RE);
  });

  test('every discovered Thai SKILL.md is declared by the contract', () => {
    const expected = new Set(contract.skills.map(skill => path.resolve(ROOT, skill.sources.th, 'SKILL.md')));
    expect(findSkillFiles(path.join(ROOT, 'skills')).filter(file => !expected.has(path.resolve(file)))).toEqual([]);
  });

  test('docs cover exact namespaced commands', () => {
    expect(missingFromDocs(['pr'], 'Use `/spk:load-project` only')).toEqual(['pr']);
    expect(missingFromDocs(['pr'], 'Use `/spk:pr`')).toEqual([]);
  });

  test('repository native-skill contract is clean', () => {
    expect(collectNativeSkillErrors(ROOT, contract)).toEqual([]);
  });
});
