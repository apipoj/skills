const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  DOC_FILES,
  collectNativeSkillErrors,
  englishProseOf,
  findSkillFiles,
  headingOf,
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

describe('English mirrors', () => {
  test.each(contract.skills.map(skill => [skill.id, skill.sources.en]))(
    '%s has a translated English mirror',
    (id, source) => {
      const file = path.join(ROOT, source, 'SKILL.md');
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf8');
      const skill = contract.skills.find(entry => entry.id === id);
      expect(parseFrontmatter(content)).toMatchObject({
        name: id,
        description: skill.locales.en.description,
      });
      expect(headingOf(content)).toBe(
        headingOf(fs.readFileSync(path.join(ROOT, 'plugins', 'spk', 'skills', id, 'SKILL.md'), 'utf8')),
      );
      expect(englishProseOf(content).split('\n').filter(line => THAI_CHAR_RE.test(line))).toEqual([]);
    },
  );

  test('every discovered English SKILL.md is declared by the contract', () => {
    const expected = new Set(contract.skills.map(skill => path.resolve(ROOT, skill.sources.en, 'SKILL.md')));
    expect(
      findSkillFiles(path.join(ROOT, 'locales', 'en', 'skills')).filter(file => !expected.has(path.resolve(file))),
    ).toEqual([]);
  });

  test('englishProseOf keeps sanctioned Thai out of the prose but not Thai narration', () => {
    const carriers = [
      'Approve it by saying `เริ่มพัฒนาตาม plan`.',
      'They asked “ขอหลายแบบให้เลือก” instead.',
      'They asked "ทำ design shotgun" instead.',
      'Use Sun Tzu (ซุนวู) as a strategy lens.',
      '```',
      'รัน code review หลาย pass',
      '```',
    ].join('\n');
    expect(englishProseOf(carriers)).not.toMatch(THAI_CHAR_RE);
    expect(englishProseOf('Implement feature จาก plan ที่มีอยู่')).toMatch(THAI_CHAR_RE);
  });

  test('headingOf reads the first H1 through a CRLF checkout', () => {
    expect(headingOf(['---', 'name: debug', '---', '# Root-Cause Debugging', '## Workflow'].join('\r\n')))
      .toBe('Root-Cause Debugging');
    expect(headingOf('no heading here')).toBeNull();
  });

  test('reports a mirror that carries the Thai body instead of a translation', () => {
    const root = englishMirrorFixture();
    expect(collectNativeSkillErrors(root, FIXTURE_CONTRACT)).toEqual([]);

    fs.writeFileSync(
      path.join(root, 'locales', 'en', 'skills', 'engineering', 'demo', 'SKILL.md'),
      ['---', 'name: demo', 'description: คำอธิบายไทย', '---', '# demo', '', 'ทำงานเป็น task เล็ก ๆ', ''].join('\n'),
    );

    const errors = collectNativeSkillErrors(root, FIXTURE_CONTRACT).join('\n');
    expect(errors).toMatch(/description must match contracts\/workflows\.json locales\.en\.description/);
    expect(errors).toMatch(/Thai prose outside a code span, quotation, or gloss/);
    expect(errors).toMatch(/H1 must be "Demo Skill"/);
  });

  test('reports a mirror the contract never declared', () => {
    const root = englishMirrorFixture();
    fs.mkdirSync(path.join(root, 'locales', 'en', 'skills', 'engineering', 'stray'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'locales', 'en', 'skills', 'engineering', 'stray', 'SKILL.md'),
      '---\nname: stray\n---\n# Stray\n',
    );
    expect(collectNativeSkillErrors(root, FIXTURE_CONTRACT).join('\n')).toMatch(/ORPHAN English mirror/);
  });
});

const FIXTURE_CONTRACT = {
  skills: [
    {
      id: 'demo',
      sources: { th: 'skills/engineering/demo', en: 'locales/en/skills/engineering/demo' },
      locales: { th: { description: 'คำอธิบายไทย' }, en: { description: 'Do the demo thing.' } },
    },
  ],
};

function englishMirrorFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-english-mirror-'));
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  write('skills/engineering/demo/SKILL.md', '---\nname: demo\ndescription: คำอธิบายไทย\n---\n# ตัวอย่าง\n\nทำงานเป็น task เล็ก ๆ\n');
  write('locales/en/skills/engineering/demo/SKILL.md', '---\nname: demo\ndescription: Do the demo thing.\n---\n# Demo Skill\n\nWork in small tasks.\n');
  write('plugins/spk/skills/demo/SKILL.md', '---\nname: demo\ndescription: Do the demo thing.\n---\n# Demo Skill\n\nWork in small tasks.\n');
  for (const doc of DOC_FILES) write(doc, 'Run `/spk:demo` to start.\n');
  return root;
}
