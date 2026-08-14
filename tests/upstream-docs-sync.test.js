const fs = require('fs');
const path = require('path');

const {
  BANNER_NOTICE,
  CANONICAL_BY_DOC,
  NO_COUNTERPART,
  bodyOf,
  buildHashIndex,
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
});
