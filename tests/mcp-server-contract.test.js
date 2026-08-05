// tests/mcp-server-contract.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const srv = require('../plugins/spk/mcp/codebase-search.cjs');
const ENTRY = path.join(__dirname, '..', 'plugins', 'spk', 'mcp', 'codebase-search.cjs');
const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));

describe('tool surface', () => {
  test('exposes the three tools', () => {
    expect(srv.listTools().map((t) => t.name).sort()).toEqual([
      'file_outline',
      'find_symbol',
      'search_code',
    ]);
  });

  test('each tool has a description and input schema', () => {
    for (const t of srv.listTools()) {
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.inputSchema).toBeTruthy();
      expect(t.inputSchema.type).toBe('object');
    }
  });
});

describe('runtime guards', () => {
  test('missing rg yields structured error without honoring executable overrides', () => {
    const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-mcp-project-')));
    let invocation;
    const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const result = srv.runRg(['--json', 'x'], {
      CLAUDE_PROJECT_DIR: project,
      SPK_PROJECT_ROOT: '/project/override',
      SPK_RG_PATH: '/project/override/rg',
      PATH: '/project/override/bin'
    }, {
      spawnSync(command, args, options) {
        invocation = { command, args, options };
        return { error: missing };
      }
    });
    expect(result).toMatchObject({
      error: 'rg-not-found',
    });
    expect(invocation.command).toBe('rg');
    expect(invocation.options.cwd).toBe(project);
    expect(invocation.options.env.PATH).not.toContain('/project/override');
    expect(invocation.options.env).not.toHaveProperty('SPK_RG_PATH');
    fs.rmSync(project, { recursive: true, force: true });
  });

  test('uses only the documented Claude host root and ignores project overrides', () => {
    const claude = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-claude-root-')));
    const codex = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-codex-root-')));
    expect(srv.searchProjectRoot({
      CLAUDE_PROJECT_DIR: claude,
      CODEX_PROJECT_DIR: codex,
      SPK_PROJECT_ROOT: '/project/override'
    })).toBe(claude);
    expect(srv.searchProjectRoot({
      CODEX_PROJECT_DIR: codex,
      SPK_PROJECT_ROOT: '/project/override'
    })).toBeNull();
    expect(srv.searchProjectRoot({
      SPK_PROJECT_ROOT: claude,
    })).toBeNull();
    fs.rmSync(claude, { recursive: true, force: true });
    fs.rmSync(codex, { recursive: true, force: true });
  });

  test('fails closed instead of searching the plugin process cwd', () => {
    expect(srv.dispatch('search_code', { query: 'SERVER_NAME' }, {})).toMatchObject({
      error: 'workspace-root-unavailable',
    });
  });

  test('kill switch disables tools', () => {
    expect(srv.toolsEnabled({ SPK_CODEBASE_SEARCH: 'off' })).toBe(false);
    expect(srv.toolsEnabled({})).toBe(true);
  });

  test('createServer returns an object that can list and dispatch tools', () => {
    const server = srv.createServer();
    expect(typeof server.listTools).toBe('function');
    expect(typeof server.callTool).toBe('function');
    expect(server.listTools().map((t) => t.name).sort()).toEqual([
      'file_outline',
      'find_symbol',
      'search_code',
    ]);
  });

  test('callTool reports disabled when kill switch is set', () => {
    const server = srv.createServer({ SPK_CODEBASE_SEARCH: 'off' });
    const res = server.callTool('search_code', { query: 'foo' });
    expect(res.disabled).toBe(true);
  });
});

describe('consumer workspace discovery', () => {
  let root;
  let other;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-mcp-root-')));
    other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-mcp-other-')));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  });

  function initialize(session, capabilities = {}, clientName = 'test-client') {
    return srv.handleProtocolMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities,
        clientInfo: { name: clientName, version: '1.0.0' },
      },
    }, session);
  }

  test('advertises Codex sandbox metadata and performs standard roots/list negotiation', () => {
    const session = srv.createProtocolSession({});
    const [initialized] = initialize(session, { roots: { listChanged: true } });
    expect(initialized.result.capabilities.experimental).toHaveProperty(
      'codex/sandbox-state-meta',
    );

    const [request] = srv.handleProtocolMessage({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }, session);
    expect(request).toMatchObject({
      jsonrpc: '2.0',
      method: 'roots/list',
      params: {},
    });

    expect(srv.handleProtocolMessage({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        roots: [{ uri: pathToFileURL(root).href, name: 'workspace' }],
      },
    }, session)).toEqual([]);
    expect(srv.resolveSessionWorkspaceRoot(session, {})).toEqual({ root });

    const [refresh] = srv.handleProtocolMessage({
      jsonrpc: '2.0',
      method: 'notifications/roots/list_changed',
    }, session);
    expect(refresh.method).toBe('roots/list');
    expect(refresh.id).not.toBe(request.id);
  });

  test('uses trusted Codex per-turn sandboxCwd metadata when Codex lacks roots capability', () => {
    const session = srv.createProtocolSession({});
    initialize(session, {}, 'codex-mcp-client');
    const params = {
      _meta: {
        'codex/sandbox-state-meta': {
          sandboxCwd: pathToFileURL(root).href,
        },
      },
    };
    const resolution = srv.resolveSessionWorkspaceRoot(session, params);
    expect(resolution).toEqual({ root });

    const [response] = srv.handleProtocolMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        ...params,
        name: 'not-a-tool',
        arguments: {},
      },
    }, session);
    expect(JSON.parse(response.result.content[0].text)).toMatchObject({
      error: 'unknown-tool',
    });
  });

  test('does not accept a model argument or non-Codex metadata as a workspace root', () => {
    const session = srv.createProtocolSession({});
    initialize(session, {}, 'untrusted-client');
    const [response] = srv.handleProtocolMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_code',
        arguments: {
          query: 'secret',
          workspaceRoot: root,
        },
        _meta: {
          'codex/sandbox-state-meta': {
            sandboxCwd: pathToFileURL(root).href,
          },
        },
      },
    }, session);
    expect(JSON.parse(response.result.content[0].text)).toMatchObject({
      error: 'workspace-root-unavailable',
    });
    expect(response.result.isError).toBe(true);
  });

  test('rejects non-file, remote-authority, malformed, and multiple roots', () => {
    expect(() => srv.workspaceRootFromFileUri('https://example.com/project')).toThrow(/file/i);
    expect(() => srv.workspaceRootFromFileUri('file://remote-host/project')).toThrow(/local|authority/i);
    expect(() => srv.workspaceRootFromFileUri(`${pathToFileURL(root).href}?query=1`)).toThrow(
      /query|fragment|local/i,
    );
    expect(() => srv.rootsResultWorkspaceRoot({
      roots: [
        { uri: pathToFileURL(root).href },
        { uri: pathToFileURL(other).href },
      ],
    })).toThrow(/multiple/i);
  });

  test('canonicalizes a symlink root and still rejects nested symlink escape', () => {
    const rootLink = path.join(os.tmpdir(), `spk-mcp-root-link-${process.pid}-${Date.now()}`);
    const escapeTarget = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-mcp-escape-')));
    try {
      fs.symlinkSync(root, rootLink, 'dir');
      fs.symlinkSync(escapeTarget, path.join(root, 'escape'), 'dir');
    } catch (error) {
      fs.rmSync(rootLink, { force: true });
      fs.rmSync(escapeTarget, { recursive: true, force: true });
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error && error.code)) return;
      throw error;
    }

    try {
      const canonical = srv.workspaceRootFromFileUri(pathToFileURL(rootLink).href);
      expect(canonical).toBe(root);
      const result = srv.dispatch(
        'search_code',
        { query: 'secret', path: 'escape' },
        {},
        { workspaceRoot: canonical },
      );
      expect(result).toMatchObject({ error: 'invalid-argument' });
    } finally {
      fs.rmSync(rootLink, { force: true });
      fs.rmSync(escapeTarget, { recursive: true, force: true });
    }
  });
});

// Symlink-escape hardening: an in-root symlink whose target resolves OUTSIDE
// the project root must be rejected when passed as an explicit path arg. Pure
// path math cannot catch this (it never resolves symlinks), so dispatch must
// add realpath-based containment. A symlink staying inside root is allowed, and
// a not-yet-existing path (ENOENT) must still pass.
describe('symlink escape hardening', () => {
  let root;
  let outside;
  beforeEach(() => {
    // realpathSync resolves macOS /var -> /private/var so comparisons are stable.
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-root-')));
    outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spk-outside-')));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'a.js'), 'const inRoot = 1;\n');
    fs.writeFileSync(path.join(outside, 'leak.txt'), 'SECRET\n');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });

  function call(name, args) {
    return srv.dispatch(name, args, { CLAUDE_PROJECT_DIR: root });
  }

  function createSymlink(target, link, type) {
    try {
      fs.symlinkSync(target, link, type);
      return true;
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error && error.code)) return false;
      throw error;
    }
  }

  test('rejects an in-root symlink that resolves outside root', () => {
    if (!createSymlink(outside, path.join(root, 'escape'), 'dir')) return;
    const res = call('search_code', { query: 'SECRET', path: 'escape' });
    expect(res.error).toBe('invalid-argument');
    expect(res.hint).toMatch(/symlink|escapes/i);
  });

  test('rejects an in-root symlink target for file_outline too', () => {
    if (!createSymlink(path.join(outside, 'leak.txt'), path.join(root, 'escape.txt'))) return;
    const res = call('file_outline', { path: 'escape.txt' });
    expect(res.error).toBe('invalid-argument');
  });

  test('allows an in-root symlink that resolves inside root', () => {
    if (!createSymlink(path.join(root, 'src'), path.join(root, 'innerlink'), 'dir')) return;
    const res = call('search_code', { query: 'inRoot', path: 'innerlink' });
    // Either a clean match set or an rg-availability error, but never an
    // invalid-argument containment rejection.
    expect(res.error).not.toBe('invalid-argument');
  });

  test('allows a normal in-root path', () => {
    const res = call('search_code', { query: 'inRoot', path: 'src' });
    expect(res.error).not.toBe('invalid-argument');
  });

  test('allows a not-yet-existing in-root path (ENOENT passes containment)', () => {
    const res = call('search_code', { query: 'x', path: 'does/not/exist/yet' });
    expect(res.error).not.toBe('invalid-argument');
  });
});

// Output bounding: rg -m caps matches PER FILE, so a broad query can return
// max * fileCount matches. dispatch must enforce a real GLOBAL cap and report
// `truncated` based on the true total, not the per-file cap.
describe('global result cap', () => {
  function makeMatches(n) {
    return Array.from({ length: n }, (_, i) => ({ file: `f${i}.js`, line: 1, col: 0, text: 'x' }));
  }

  test('slices to max and reports truncated:true when total exceeds max', () => {
    const out = srv.applyGlobalCap(makeMatches(120), 50);
    expect(out.matches).toHaveLength(50);
    expect(out.truncated).toBe(true);
    expect(out.count).toBe(50);
  });

  test('does not truncate when total is at or under max', () => {
    const out = srv.applyGlobalCap(makeMatches(40), 50);
    expect(out.matches).toHaveLength(40);
    expect(out.truncated).toBe(false);
    expect(out.count).toBe(40);
  });

  test('exactly max is not flagged as truncated', () => {
    const out = srv.applyGlobalCap(makeMatches(50), 50);
    expect(out.truncated).toBe(false);
    expect(out.matches).toHaveLength(50);
  });
});

function liveRgAvailable() {
  const probe = spawnSync('rg', ['--version'], {
    encoding: 'utf-8',
    env: srv.executableEnvironment()
  });
  return !probe.error && probe.status === 0;
}
const liveSearch = liveRgAvailable() ? test : test.skip;

describe('stdio JSON-RPC handshake (live process)', () => {
  function rpc(messages, env = {}) {
    const input = messages.map((m) => JSON.stringify(m)).join('\n') + '\n';
    const r = spawnSync('node', [ENTRY], {
      input,
      encoding: 'utf-8',
      env: { ...process.env, ...env },
      timeout: 10000,
    });
    const lines = r.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    return { lines, status: r.status, stderr: r.stderr };
  }

  test('responds to initialize then tools/list over stdio', () => {
    const { lines } = rpc([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    ]);
    const init = lines.find((l) => l.id === 1);
    expect(init.result.protocolVersion).toBeTruthy();
    expect(init.result.serverInfo.name).toBe('spk-codebase-search');

    const list = lines.find((l) => l.id === 2);
    expect(list.result.tools.map((t) => t.name).sort()).toEqual([
      'file_outline',
      'find_symbol',
      'search_code',
    ]);
  });

  liveSearch('search_code over stdio returns capped file/line matches on a real dir', () => {
    const { lines } = rpc([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_code',
          arguments: { query: 'buildSearchArgs', path: 'plugins/spk/mcp' },
        },
      },
    ], { CLAUDE_PROJECT_DIR: REPO_ROOT });
    const call = lines.find((l) => l.id === 2);
    expect(call.result).toBeTruthy();
    const payload = JSON.parse(call.result.content[0].text);
    expect(Array.isArray(payload.matches)).toBe(true);
    expect(payload.matches.length).toBeGreaterThan(0);
    expect(payload.matches[0]).toHaveProperty('file');
    expect(payload.matches[0]).toHaveProperty('line');
  });

  // End-to-end repro of the no-path / empty-stdin bug: full server process,
  // JSON-RPC over a real stdin pipe, NO path arg. Before the "." default this
  // returned 0 matches because rg read the (drained) JSON-RPC stdin.
  liveSearch('find_symbol over stdio with NO path finds a repo symbol', () => {
    const { lines } = rpc([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'find_symbol', arguments: { name: 'escapeRegex' } },
      },
    ], { CLAUDE_PROJECT_DIR: REPO_ROOT });
    const call = lines.find((l) => l.id === 2);
    const payload = JSON.parse(call.result.content[0].text);
    expect(payload.matches.length).toBeGreaterThanOrEqual(1);
    expect(payload.matches.some((m) => /rg\.cjs$/.test(m.file))).toBe(true);
  });

  test('roots/list request and client response stay newline-delimited and response-safe', () => {
    const { lines, status, stderr } = rpc([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { roots: { listChanged: true } },
          clientInfo: { name: 'roots-client', version: '1.0.0' },
        },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      {
        jsonrpc: '2.0',
        id: 'spk-roots-1',
        result: { roots: [{ uri: pathToFileURL(REPO_ROOT).href }] },
      },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    ]);
    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(lines.filter((line) => line.id === 'spk-roots-1')).toEqual([
      expect.objectContaining({ method: 'roots/list' }),
    ]);
    expect(lines.find((line) => line.id === 2).result.tools).toHaveLength(3);
  });
});
