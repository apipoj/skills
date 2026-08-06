// spk/tests/regenerate-docs.test.js
const {
  collectMarkerContractErrors,
  parseMarkers,
  regenerateContent,
} = require('../scripts/regenerate-docs.cjs');

describe('parseMarkers', () => {
  test('finds a block between markers', () => {
    const text = `line before
<!-- SPK-COUNTS:start -->
old content
<!-- SPK-COUNTS:end -->
line after`;
    const blocks = parseMarkers(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe('SPK-COUNTS');
    expect(blocks[0].start).toBeGreaterThan(0);
    expect(blocks[0].end).toBeGreaterThan(blocks[0].start);
  });

  test('finds multiple blocks', () => {
    const text = `<!-- SPK-COUNTS:start -->
a
<!-- SPK-COUNTS:end -->
<!-- SPK-AGENTS:start -->
b
<!-- SPK-AGENTS:end -->`;
    const blocks = parseMarkers(text);
    expect(blocks).toHaveLength(2);
    expect(blocks.map(b => b.name)).toEqual(['SPK-COUNTS', 'SPK-AGENTS']);
  });

  test('returns empty array when no markers', () => {
    expect(parseMarkers('plain text')).toEqual([]);
  });

  test('ignores unmatched start marker', () => {
    const text = `<!-- SPK-COUNTS:start -->
no end`;
    expect(parseMarkers(text)).toEqual([]);
  });
});

describe('regenerateContent', () => {
  const manifest = {
    agents: {
      orchestrators: [{ name: 'plan-orchestrator' }, { name: 'build-orchestrator' }],
      specialists: [{ name: 'planner' }, { name: 'implementer' }]
    },
    commands: [{ name: '/spk-plan' }, { name: '/spk-code' }]
  };
  const contract = {
    skills: [
      { id: 'spk-plan', tier: 'core' },
      { id: 'spk-code', tier: 'compat', aliasFor: 'spk-plan' },
    ],
  };

  test('replaces SPK-COUNTS block with totals', () => {
    const input = `## AI Sprint Kit
<!-- SPK-COUNTS:start -->
OLD
<!-- SPK-COUNTS:end -->`;
    const output = regenerateContent(input, manifest);
    expect(output).toContain('**4 subagents**');
    expect(output).toContain('2 orchestrators + 2 specialists');
    expect(output).toContain('**2 skills**');
    expect(output).not.toContain('OLD');
  });

  test('preserves content outside markers', () => {
    const input = `# Header
<!-- SPK-COUNTS:start -->
OLD
<!-- SPK-COUNTS:end -->
# Footer`;
    const output = regenerateContent(input, manifest);
    expect(output).toMatch(/^# Header/);
    expect(output).toMatch(/# Footer$/);
  });

  test('no-op when no markers present', () => {
    const input = '# Header\nplain text';
    expect(regenerateContent(input, manifest)).toBe(input);
  });

  test('preserves CRLF line endings used by Windows checkouts', () => {
    const input = [
      '# Header',
      '<!-- SPK-COUNTS:start -->',
      'OLD',
      '<!-- SPK-COUNTS:end -->',
      '# Footer',
    ].join('\r\n');

    const output = regenerateContent(input, manifest);

    expect(output).toContain('**4 subagents**');
    expect(output.replace(/\r\n/g, '')).not.toContain('\n');
  });

  test('separates canonical skills from compatibility aliases', () => {
    const input = `<!-- SPK-COMMANDS:start -->
OLD
<!-- SPK-COMMANDS:end -->`;
    const output = regenerateContent(input, manifest, contract, 'README.md');
    expect(output).toContain('### ชื่อหลัก');
    expect(output).toContain('`/spk:spk-plan`');
    expect(output).toContain('### ชื่อเดิมที่ยังใช้ได้');
    expect(output).toContain('| `/spk:spk-code` | `/spk:spk-plan` |');
  });

  test('reports canonical and compatibility counts separately', () => {
    const input = `<!-- SPK-COUNTS:start -->
OLD
<!-- SPK-COUNTS:end -->`;
    const output = regenerateContent(input, manifest, contract, 'README-EN.md');
    expect(output).toContain('**1 canonical skills**');
    expect(output).toContain('**1 compatibility aliases**');
    expect(output).not.toContain('**2 skills**');
  });
});

describe('generated marker contract', () => {
  test('requires exactly the configured blocks in public generated docs', () => {
    const complete = [
      '<!-- SPK-COUNTS:start -->old<!-- SPK-COUNTS:end -->',
      '<!-- SPK-AGENTS:start -->old<!-- SPK-AGENTS:end -->',
      '<!-- SPK-COMMANDS:start -->old<!-- SPK-COMMANDS:end -->',
    ].join('\n');
    expect(collectMarkerContractErrors('README.md', complete)).toEqual([]);

    const missing = '<!-- SPK-COUNTS:start -->old<!-- SPK-COUNTS:end -->';
    expect(collectMarkerContractErrors('README.md', missing)).toEqual(expect.arrayContaining([
      'README.md: missing SPK-AGENTS generated block',
      'README.md: missing SPK-COMMANDS generated block',
    ]));

    const duplicate = complete + '\n<!-- SPK-COMMANDS:start -->again<!-- SPK-COMMANDS:end -->';
    expect(collectMarkerContractErrors('README.md', duplicate)).toContain(
      'README.md: duplicate SPK-COMMANDS generated block'
    );
  });
});
