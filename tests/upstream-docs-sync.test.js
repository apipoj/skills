const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const {
  BANNER_NOTICE,
  CANONICAL_BY_DOC,
  NO_COUNTERPART,
  bodyOf,
  buildHashIndex,
  buildUpstreamSkillArtifactMap,
  canonicalizeUpstreamSkillBody,
  indexUpstreamSkillFiles,
  normalizeEol,
  renderCanonicalLine,
  renderPage,
  sha256,
} = require('../scripts/sync-upstream-docs.cjs');

const manifest = require('../manifest.json');

describe('upstream reference doc generator', () => {
  test('renders the banner, the canonical pointer, then the verbatim body', () => {
    const page = renderPage('docs/engineering/implement.md', '## What it does\n\nBody text.\n');
    const lines = page.split('\n');
    expect(lines[0]).toBe(BANNER_NOTICE);
    expect(lines[1]).toBe('> **Canonical SPK skill:** `/spk:code`');
    expect(lines[2]).toBe('');
    expect(page.endsWith('## What it does\n\nBody text.\n')).toBe(true);
  });

  test('BANNER_NOTICE matches the banner already shipped on a live reference page', () => {
    // Guards against a mutated constant staying green just because renderPage
    // uses it consistently with itself — compare against the real, currently
    // shipped byte content instead. Read-only: this file is repo-checked-in
    // and this test must never write to it.
    const shipped = fs.readFileSync(
      path.join(__dirname, '..', 'docs', 'engineering', 'tdd.md'),
      'utf8',
    );
    const shippedFirstLine = shipped.split('\n')[0];
    expect(BANNER_NOTICE).toBe(shippedFirstLine);
  });

  test('says so when SPK ships no counterpart', () => {
    expect(renderCanonicalLine(null)).toBe(NO_COUNTERPART);
    expect(renderCanonicalLine('code')).toBe('> **Canonical SPK skill:** `/spk:code`');
  });

  test('refuses to render a page nobody has reviewed', () => {
    expect(() => renderPage('docs/engineering/brand-new.md', 'Body.\n')).toThrow(
      /docs\/engineering\/brand-new\.md.*CANONICAL_BY_DOC/,
    );
  });

  test('bodyOf is the inverse of renderPage', () => {
    const body = '## What it does\n\nBody text.\n';
    expect(bodyOf(renderPage('docs/engineering/tdd.md', body))).toBe(body);
  });

  test('bodyOf strips a banner block regardless of its line count', () => {
    // Must not be satisfiable by a hardcoded skip-count: the real banner is
    // two lines today, but the property this task guarantees is "strip every
    // leading `>` line plus the one blank separator after it", not "skip
    // exactly two lines". Exercise a banner shape with a different line
    // count than renderPage produces.
    const body = 'Body text.\n';
    const twoLineBanner = `> line one\n> line two\n\n${body}`;
    const threeLineBanner = `> line one\n> line two\n> line three\n\n${body}`;
    const oneLineBanner = `> line one\n\n${body}`;
    expect(bodyOf(twoLineBanner)).toBe(body);
    expect(bodyOf(threeLineBanner)).toBe(body);
    expect(bodyOf(oneLineBanner)).toBe(body);
  });

  test('bodyOf consumes exactly the one blank separator line, so a body that itself starts blank round-trips', () => {
    const body = '\nBody text.\n';
    const page = renderPage('docs/engineering/tdd.md', body);
    expect(bodyOf(page)).toBe(body);
  });

  test('builds a pinned hash index over post-banner bodies', () => {
    const index = buildHashIndex({ 'docs/engineering/tdd.md': 'Body.\n' }, 'abc123');
    expect(index).toEqual({
      pin: 'abc123',
      algorithm: 'sha256',
      pages: { 'docs/engineering/tdd.md': sha256('Body.\n') },
    });
    // Pin one hardcoded digest independent of sha256() itself, so swapping
    // the algorithm (e.g. to md5) cannot pass by comparing against its own
    // output.
    expect(index.pages['docs/engineering/tdd.md']).toBe(
      '44261ce242e1b99d52c7d2a4cb6dbcb5a4ab507bed9b9b303062a969fafe1d1e',
    );
  });

  test('indexes pinned upstream skill instructions and their sibling files', () => {
    const index = indexUpstreamSkillFiles([
      'skills/engineering/tdd/SKILL.md',
      'skills/engineering/tdd/tests.md',
      'skills/engineering/tdd/agents/openai.yaml',
      'skills/productivity/teach/SKILL.md',
    ]);

    expect(index.get('tdd')).toEqual({
      skillPath: 'skills/engineering/tdd/SKILL.md',
      auxiliaryPaths: [
        'skills/engineering/tdd/agents/openai.yaml',
        'skills/engineering/tdd/tests.md',
      ],
    });
    expect(index.get('teach').skillPath).toBe('skills/productivity/teach/SKILL.md');
  });

  test('rewrites upstream command and Skill tool ids to the canonical SPK roster', () => {
    const contract = {
      skills: [
        { id: 'asking', origin: { repository: 'mattpocock/skills', skill: 'grilling' } },
        { id: 'setup', origin: { repository: 'mattpocock/skills', skill: 'setup-matt-pocock-skills' } },
      ],
    };
    const upstream = [
      'Tell the user to run `/setup-matt-pocock-skills`.',
      'Call the Skill tool with "grilling".',
      'Use `/grill-me` outside a working directory.',
      'Keep ordinary prose unchanged.',
    ].join('\n');

    expect(canonicalizeUpstreamSkillBody(upstream, contract)).toBe([
      'Tell the user to run `/setup`.',
      'Call the Skill tool with "asking".',
      'Use `/ask-me` outside a working directory.',
      'Keep ordinary prose unchanged.',
    ].join('\n'));
  });

  test('manual writing guidance is a reference rather than an unauthorized invocation', () => {
    const contract = { skills: [{
      id: 'write-skills', origin: { repository: 'mattpocock/skills', skill: 'writing-for-agents' },
      activation: { allowImplicitInvocation: false },
    }] };
    expect(canonicalizeUpstreamSkillBody('Call the Skill tool with "writing-for-agents".', contract))
      .toBe('Read the write-skills guidance as a reference without executing its workflow.');
  });

  test('selective skill pins control both instruction and auxiliary reads', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-selective-upstream-'));
    const spy = jest.spyOn(childProcess, 'execFileSync').mockImplementation((command, args) => {
      if (command !== 'git') throw new Error('unexpected command');
      if (args[0] === 'ls-tree') {
        return args[3] === 'base-pin' ? 'skills/engineering/tdd/SKILL.md\n'
          : 'skills/engineering/retro/SKILL.md\nskills/engineering/retro/reference.md\n';
      }
      const bodies = {
        'base-pin:skills/engineering/tdd/SKILL.md': 'Base instruction.\n',
        'new-pin:skills/engineering/retro/SKILL.md': 'Reviewed instruction.\n',
        'new-pin:skills/engineering/retro/reference.md': 'Reviewed reference.\n',
      };
      if (!(args[1] in bodies)) throw new Error(`wrong pin: ${args[1]}`);
      return bodies[args[1]];
    });
    try {
      const artifacts = buildUpstreamSkillArtifactMap(fixture, 'base-pin', { skills: [
        { id: 'tdd', tier: 'core', origin: { repository: 'mattpocock/skills', skill: 'tdd' },
          sources: { th: 'skills/engineering/tdd', en: 'locales/en/skills/engineering/tdd' } },
        { id: 'retro', tier: 'core', origin: { repository: 'mattpocock/skills', skill: 'retro', commit: 'new-pin' },
          sources: { th: 'skills/engineering/retro', en: 'locales/en/skills/engineering/retro' } },
      ] }, fixture);
      expect(artifacts.get('skills/engineering/tdd/UPSTREAM.md')).toBe('Base instruction.\n');
      expect(artifacts.get('locales/en/skills/engineering/retro/UPSTREAM.md')).toBe('Reviewed instruction.\n');
      expect(artifacts.get('skills/engineering/retro/reference.md')).toBe('Reviewed reference.\n');
    } finally {
      spy.mockRestore();
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test('hash index can pin retained upstream skill mirrors alongside docs', () => {
    const index = buildHashIndex(
      { 'docs/engineering/tdd.md': 'Docs.\n' },
      'abc123',
      { 'skills/engineering/tdd/UPSTREAM.md': 'Skill.\n' },
    );

    expect(index.skillMirrors).toEqual({
      'skills/engineering/tdd/UPSTREAM.md': sha256('Skill.\n'),
    });
  });

  test('maps every shipped reference page to a reviewed decision', () => {
    expect(Object.keys(CANONICAL_BY_DOC)).toHaveLength(25);
    expect(CANONICAL_BY_DOC['docs/productivity/grill-me.md']).toBe('ask-me');
    expect(CANONICAL_BY_DOC['docs/productivity/writing-for-agents.md']).toBe('write-skills');
  });

  test('every non-null CANONICAL_BY_DOC value is a real shipped SPK command', () => {
    const commandNames = new Set(manifest.commands.map(command => command.name));
    const unshipped = Object.entries(CANONICAL_BY_DOC)
      .filter(([, skill]) => skill !== null && !commandNames.has(`/${skill}`))
      .map(([docPath, skill]) => `${docPath} -> /${skill}`);
    expect(unshipped).toEqual([]);
  });

  test('a CRLF page hashes identically to its LF twin', () => {
    // The property Windows depends on: core.autocrlf=true rewrites every line
    // ending on checkout, and the page still carries upstream's content.
    const page = renderPage('docs/engineering/tdd.md', '## What it does\n\nBody.\n');
    const crlf = page.replace(/\n/g, '\r\n');
    expect(crlf).not.toBe(page);
    expect(normalizeEol(crlf)).toBe(page);
    expect(sha256(bodyOf(normalizeEol(crlf)))).toBe(sha256(bodyOf(page)));
  });

  test('normalizeEol leaves a lone carriage return alone', () => {
    // Only CRLF pairs are checkout artefacts. A bare \r inside content is
    // content, and silently rewriting it would let real drift pass the gate.
    expect(normalizeEol('a\rb')).toBe('a\rb');
    expect(normalizeEol('a\r\nb')).toBe('a\nb');
  });
});
