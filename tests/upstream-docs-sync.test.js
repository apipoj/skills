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

describe('upstream reference doc generator', () => {
  test('renders the banner, the canonical pointer, then the verbatim body', () => {
    const page = renderPage('docs/engineering/implement.md', '## What it does\n\nBody text.\n');
    const lines = page.split('\n');
    expect(lines[0]).toBe(BANNER_NOTICE);
    expect(lines[1]).toBe('> **Canonical SPK skill:** `/code`');
    expect(lines[2]).toBe('');
    expect(page.endsWith('## What it does\n\nBody text.\n')).toBe(true);
  });

  test('says so when SPK ships no counterpart', () => {
    expect(renderCanonicalLine(null)).toBe(NO_COUNTERPART);
    expect(renderCanonicalLine('code')).toBe('> **Canonical SPK skill:** `/code`');
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

  test('bodyOf ignores banner edits, so hashes track upstream content only', () => {
    const body = 'Body.\n';
    const page = renderPage('docs/engineering/tdd.md', body);
    const edited = page.replace('> **Canonical SPK skill:** `/tdd`', '> **Canonical SPK skill:** `/other`');
    expect(bodyOf(edited)).toBe(bodyOf(page));
  });

  test('builds a pinned hash index over post-banner bodies', () => {
    const index = buildHashIndex({ 'docs/engineering/tdd.md': 'Body.\n' }, 'abc123');
    expect(index).toEqual({
      pin: 'abc123',
      algorithm: 'sha256',
      pages: { 'docs/engineering/tdd.md': sha256('Body.\n') },
    });
  });

  test('maps every shipped reference page to a reviewed decision', () => {
    expect(Object.keys(CANONICAL_BY_DOC)).toHaveLength(25);
    expect(CANONICAL_BY_DOC['docs/productivity/grill-me.md']).toBe('ask-me');
    expect(CANONICAL_BY_DOC['docs/productivity/writing-for-agents.md']).toBe('write-skills');
  });
});
