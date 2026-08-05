// tests/mcp-rg.test.js
const { spawnSync } = require('child_process');
const path = require('path');
const {
  buildSearchArgs,
  buildSymbolArgs,
  buildOutlineArgs,
  parseRgJson,
} = require('../plugins/spk/mcp/rg.cjs');

const REPO_ROOT = path.join(__dirname, '..');

// Resolve a real ripgrep binary usable from a spawned process. Production
// intentionally relies on the host executable search path and does not accept
// project-controlled executable overrides, so this live test does the same.
function resolveRgBin() {
  const plain = spawnSync('rg', ['--version'], { encoding: 'utf-8' });
  return !plain.error && plain.status === 0
    ? { bin: 'rg', argv0: undefined }
    : null;
}
const RG = resolveRgBin();
const liveRg = RG ? test : test.skip;

describe('buildSearchArgs', () => {
  test('uses --json and caps results', () => {
    const a = buildSearchArgs({ query: 'foo', maxResults: 50, path: 'src' });
    expect(a).toEqual(expect.arrayContaining(['--json', 'foo', 'src']));
  });

  test('adds literal flag and glob when requested', () => {
    const a = buildSearchArgs({ query: 'a.b', literal: true, glob: '*.js' });
    expect(a).toEqual(expect.arrayContaining(['-F', '-g', '*.js', 'a.b']));
  });

  test('query comes after the -- sentinel, before the positional path', () => {
    const a = buildSearchArgs({ query: 'needle' });
    const sep = a.indexOf('--');
    const q = a.indexOf('needle');
    expect(sep).toBeGreaterThanOrEqual(0);
    expect(q).toBe(sep + 1); // query immediately follows the sentinel
    // With no path the positional defaults to "." (so rg recurses, not stdin).
    expect(a[a.length - 1]).toBe('.');
    expect(a).toContain('--json');
  });
});

describe('buildSymbolArgs', () => {
  test('builds a word-bounded declaration regex for the symbol name', () => {
    const a = buildSymbolArgs('Widget');
    const pattern = a.find((x) => /Widget/.test(x) && /function|class|def/.test(x));
    expect(pattern).toBeTruthy();
    expect(pattern).toMatch(/\\b/);
    expect(a).toContain('--json');
  });

  test('escapes regex metacharacters in the symbol name', () => {
    const a = buildSymbolArgs('foo.bar');
    const pattern = a.find((x) => /foo/.test(x));
    expect(pattern).toContain('foo\\.bar');
  });
});

describe('buildOutlineArgs', () => {
  test('scopes a declaration search to a single file path', () => {
    const a = buildOutlineArgs('src/a.js');
    expect(a).toContain('--json');
    expect(a[a.length - 1]).toBe('src/a.js');
  });
});

// Argument-injection hardening: model-controlled inputs must never be parsed
// by ripgrep as flags. The query is placed after a "--" sentinel, rc-file
// loading is disabled (--no-config blocks rc-based --pre), and positional
// paths starting with "-" are rejected.
describe('argument injection hardening', () => {
  function indexOf(arr, val) {
    return arr.indexOf(val);
  }

  test('buildSearchArgs places query after a -- sentinel so --pre cannot be smuggled', () => {
    const a = buildSearchArgs({ query: '--pre=touch /tmp/pwned' });
    const sep = indexOf(a, '--');
    const q = indexOf(a, '--pre=touch /tmp/pwned');
    expect(sep).toBeGreaterThanOrEqual(0);
    expect(q).toBeGreaterThan(sep); // query sits in positional region
  });

  test('buildSearchArgs disables rc-file config (--no-config)', () => {
    expect(buildSearchArgs({ query: 'x' })).toContain('--no-config');
  });

  test('buildSearchArgs rejects a path that starts with -', () => {
    expect(() => buildSearchArgs({ query: 'x', path: '-evil' })).toThrow(/path/i);
  });

  test('buildSearchArgs rejects a glob that starts with -', () => {
    expect(() => buildSearchArgs({ query: 'x', glob: '-evil' })).toThrow(/glob/i);
  });

  test('buildSymbolArgs places pattern after -- and disables config', () => {
    const a = buildSymbolArgs('Widget');
    expect(a).toContain('--no-config');
    const sep = indexOf(a, '--');
    expect(sep).toBeGreaterThanOrEqual(0);
    const pattern = a.find((x) => /Widget/.test(x));
    expect(indexOf(a, pattern)).toBeGreaterThan(sep);
  });

  test('buildSymbolArgs rejects a path that starts with -', () => {
    expect(() => buildSymbolArgs('Widget', { path: '-evil' })).toThrow(/path/i);
  });

  test('buildOutlineArgs places pattern after -- and rejects a flag-like file path', () => {
    const a = buildOutlineArgs('src/a.js');
    expect(a).toContain('--no-config');
    const sep = indexOf(a, '--');
    expect(sep).toBeGreaterThanOrEqual(0);
    expect(() => buildOutlineArgs('-evil')).toThrow(/path/i);
  });
});

// Path-containment hardening: a positional path/filePath must never let
// ripgrep search or read OUTSIDE the project root (no absolute paths, no ../
// traversal). Builders accept an explicit `root` so the check is pure/testable.
describe('path containment hardening', () => {
  const path = require('path');
  const ROOT = path.resolve('/Users/example/project');

  test('buildSearchArgs rejects an absolute path outside root', () => {
    expect(() => buildSearchArgs({ query: 'x', path: '/etc', root: ROOT })).toThrow(/escapes|absolute/i);
  });

  test('buildSearchArgs rejects ../ traversal that escapes root', () => {
    expect(() => buildSearchArgs({ query: 'x', path: '../../foo', root: ROOT })).toThrow(/escapes/i);
  });

  test('buildSearchArgs allows a path inside root', () => {
    const a = buildSearchArgs({ query: 'x', path: 'src/sub', root: ROOT });
    expect(a[a.length - 1]).toBe('src/sub');
  });

  test('buildSearchArgs allows root itself (".")', () => {
    expect(() => buildSearchArgs({ query: 'x', path: '.', root: ROOT })).not.toThrow();
  });

  test('buildSymbolArgs rejects a path that escapes root', () => {
    expect(() => buildSymbolArgs('Widget', { path: '../../../etc', root: ROOT })).toThrow(/escapes/i);
  });

  test('buildSymbolArgs allows a path inside root', () => {
    const a = buildSymbolArgs('Widget', { path: 'src', root: ROOT });
    expect(a[a.length - 1]).toBe('src');
  });

  test('buildOutlineArgs rejects an absolute filePath outside root', () => {
    expect(() => buildOutlineArgs('/etc/passwd', { root: ROOT })).toThrow(/escapes|absolute/i);
  });

  test('buildOutlineArgs rejects ../ traversal in filePath', () => {
    expect(() => buildOutlineArgs('../../../../etc/passwd', { root: ROOT })).toThrow(/escapes/i);
  });

  test('buildOutlineArgs allows a filePath inside root', () => {
    const a = buildOutlineArgs('src/a.js', { root: ROOT });
    expect(a[a.length - 1]).toBe('src/a.js');
  });

  test('builders pass --one-file-system to limit symlink/mount escape', () => {
    expect(buildSearchArgs({ query: 'x' })).toContain('--one-file-system');
    expect(buildSymbolArgs('x')).toContain('--one-file-system');
    expect(buildOutlineArgs('src/a.js')).toContain('--one-file-system');
  });
});

// Pathless queries must default the positional path to "." so ripgrep recurses
// the project root (cwd=root in runRg) instead of reading stdin — the server's
// stdin is the JSON-RPC pipe, which would make rg search 0 bytes.
describe('pathless search defaults positional to "."', () => {
  test('buildSearchArgs ends with "." when no path is given', () => {
    const a = buildSearchArgs({ query: 'x', root: REPO_ROOT });
    expect(a[a.length - 1]).toBe('.');
  });

  test('buildSearchArgs still ends with the (contained) user path when given', () => {
    const a = buildSearchArgs({ query: 'x', path: 'plugins', root: REPO_ROOT });
    expect(a[a.length - 1]).toBe('plugins');
  });

  test('buildSymbolArgs ends with "." when no path is given', () => {
    const a = buildSymbolArgs('x', { root: REPO_ROOT });
    expect(a[a.length - 1]).toBe('.');
  });

  test('buildSymbolArgs still ends with the user path when given', () => {
    const a = buildSymbolArgs('x', { path: 'plugins', root: REPO_ROOT });
    expect(a[a.length - 1]).toBe('plugins');
  });

  test('buildOutlineArgs always carries its required file path positional', () => {
    const a = buildOutlineArgs('plugins/spk/mcp/rg.cjs', { root: REPO_ROOT });
    expect(a[a.length - 1]).toBe('plugins/spk/mcp/rg.cjs');
    expect(a[a.length - 1]).not.toBe('.');
  });
});

// Regression for the empty-stdin / no-path bug: run rg exactly as the server
// does — empty stdin (simulating the JSON-RPC pipe) and cwd=root — and assert a
// known repo symbol is found WITHOUT passing a path. argv-only tests masked this.
describe('live empty-stdin no-path search (server condition)', () => {
  function runRgLive(args) {
    return spawnSync(RG.bin, args, {
      encoding: 'utf-8',
      input: '', // empty stdin, exactly like the server's JSON-RPC pipe after reads
      cwd: REPO_ROOT,
      argv0: RG.argv0,
    });
  }

  liveRg('find_symbol with NO path finds a symbol that exists in the repo', () => {
    const args = buildSymbolArgs('escapeRegex', { root: REPO_ROOT });
    const r = runRgLive(args);
    const matches = parseRgJson(r.stdout || '');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.some((m) => /rg\.cjs$/.test(m.file))).toBe(true);
  });

  liveRg('search_code with NO path finds a string that exists in the repo', () => {
    const args = buildSearchArgs({ query: 'buildSearchArgs', root: REPO_ROOT });
    const r = runRgLive(args);
    const matches = parseRgJson(r.stdout || '');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

describe('maxResults ceiling', () => {
  test('clampMax caps an absurd request to the 1000 ceiling', () => {
    const a = buildSearchArgs({ query: 'x', maxResults: 1e9 });
    const i = a.indexOf('-m');
    expect(a[i + 1]).toBe('1000');
  });

  test('clampMax preserves a reasonable request', () => {
    const a = buildSearchArgs({ query: 'x', maxResults: 25 });
    const i = a.indexOf('-m');
    expect(a[i + 1]).toBe('25');
  });
});

describe('parseRgJson', () => {
  test('extracts file/line/col/text from rg match lines', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'src/a.js' },
        line_number: 12,
        lines: { text: 'const foo = 1\n' },
        submatches: [{ start: 6, end: 9 }],
      },
    });
    const out = parseRgJson(line + '\n');
    expect(out[0]).toMatchObject({ file: 'src/a.js', line: 12, col: 6 });
    expect(out[0].text).toContain('const foo');
  });

  test('ignores non-match event types', () => {
    const begin = JSON.stringify({ type: 'begin', data: { path: { text: 'x' } } });
    expect(parseRgJson(begin + '\n')).toEqual([]);
  });

  test('truncates long match text to a bounded length', () => {
    const long = 'x'.repeat(1000);
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'src/b.js' },
        line_number: 1,
        lines: { text: long + '\n' },
        submatches: [{ start: 0, end: 1 }],
      },
    });
    const out = parseRgJson(line + '\n');
    expect(out[0].text.length).toBeLessThanOrEqual(240);
  });

  test('normalizes windows path separators to forward slashes', () => {
    const line = JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'src\\win\\a.js' },
        line_number: 3,
        lines: { text: 'const z = 1\n' },
        submatches: [{ start: 6, end: 7 }],
      },
    });
    const out = parseRgJson(line + '\n');
    expect(out[0].file).toBe('src/win/a.js');
  });

  test('tolerates blank lines and malformed json lines', () => {
    const good = JSON.stringify({
      type: 'match',
      data: {
        path: { text: 'src/a.js' },
        line_number: 1,
        lines: { text: 'ok\n' },
        submatches: [{ start: 0, end: 1 }],
      },
    });
    const out = parseRgJson('\nnot-json\n' + good + '\n');
    expect(out).toHaveLength(1);
    expect(out[0].file).toBe('src/a.js');
  });
});
