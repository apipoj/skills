'use strict';

// spk-codebase-search: a zero-dependency, index-light MCP stdio server.
//
// Why no @modelcontextprotocol/sdk: the MCP stdio surface needed here is small
// and stable — newline-delimited JSON-RPC 2.0 with initialization, tools, and
// MCP roots negotiation. Hand-rolling it keeps SPK's "Node-only, no new runtime
// dependencies" promise, avoids the supply-chain/version-lock surface of a
// third-party dep (plan risk R5), and is less code to vet than pinning +
// supporting the SDK.
//
// Every tool call shells out to ripgrep (`rg --json`) in the consumer project's
// cwd. No persisted index: correct on a moving codebase, zero warm-up.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileURLToPath } = require('url');
const {
  buildSearchArgs,
  buildSymbolArgs,
  buildOutlineArgs,
  parseRgJson,
  clampMax,
} = require('./rg.cjs');

const SERVER_NAME = 'spk-codebase-search';
const SERVER_VERSION = '0.1.0';
const PROTOCOL_VERSION = '2025-06-18';
const RG_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RESULTS = 50;
const CODEX_SANDBOX_META_CAPABILITY = 'codex/sandbox-state-meta';
const WORKSPACE_ROOT_UNAVAILABLE = Object.freeze({
  error: 'workspace-root-unavailable',
  hint:
    'The MCP client did not provide a trusted consumer workspace root. ' +
    'Use a host that supplies MCP roots, Codex sandbox metadata, or CLAUDE_PROJECT_DIR.',
});

function operatingSystemHome() {
  try {
    return os.userInfo().homedir || null;
  } catch {
    return null;
  }
}

function trustedExecutablePath() {
  const executableDir = path.dirname(process.execPath);
  const home = operatingSystemHome();
  if (process.platform === 'win32') {
    const drive = path.win32.parse(process.execPath).root || 'C:\\';
    const systemRoot = path.win32.join(drive, 'Windows');
    return [...new Set([
      executableDir,
      path.win32.join(systemRoot, 'System32'),
      systemRoot,
      home && path.win32.join(home, '.cargo', 'bin'),
      home && path.win32.join(home, 'scoop', 'shims'),
      home && path.win32.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links'),
      path.win32.join(drive, 'Program Files', 'ripgrep'),
    ].filter(Boolean))].join(path.win32.delimiter);
  }
  return [...new Set([
    executableDir,
    home && path.join(home, '.local', 'bin'),
    home && path.join(home, '.cargo', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].filter(Boolean))].join(path.delimiter);
}

function executableEnvironment() {
  const home = operatingSystemHome();
  const env = {
    PATH: trustedExecutablePath(),
    LANG: 'C',
    LC_ALL: 'C',
  };
  if (home) {
    env.HOME = home;
    env.USERPROFILE = home;
  }
  if (process.platform === 'win32') {
    const drive = path.win32.parse(process.execPath).root || 'C:\\';
    const systemRoot = path.win32.join(drive, 'Windows');
    env.SystemRoot = systemRoot;
    env.SYSTEMROOT = systemRoot;
    env.WINDIR = systemRoot;
    env.COMSPEC = path.win32.join(systemRoot, 'System32', 'cmd.exe');
    env.PATHEXT = '.COM;.EXE;.BAT;.CMD';
    env.TEMP = os.tmpdir();
    env.TMP = os.tmpdir();
  } else {
    env.TMPDIR = os.tmpdir();
  }
  return env;
}

function canonicalDirectory(candidate) {
  if (typeof candidate !== 'string' || !candidate || !path.isAbsolute(candidate)) return null;
  try {
    const real = fs.realpathSync(candidate);
    return fs.statSync(real).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

// Host-defined project variables remain the compatibility path for Claude.
// Never fall back to process.cwd(): Codex intentionally launches plugin MCPs
// from the installed plugin root, which is not the consumer workspace.
function searchProjectRoot(env = process.env) {
  return canonicalDirectory(env.CLAUDE_PROJECT_DIR);
}

function workspaceRootFromFileUri(uri) {
  if (typeof uri !== 'string') {
    throw new Error('workspace root URI must be a string');
  }
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('workspace root must be a valid file:// URI');
  }
  if (
    parsed.protocol !== 'file:' ||
    parsed.username ||
    parsed.password ||
    parsed.host ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('workspace root must be a local file:// URI without authority, query, or fragment');
  }
  let localPath;
  try {
    localPath = fileURLToPath(parsed);
  } catch {
    throw new Error('workspace root contains an invalid file:// path');
  }
  const root = canonicalDirectory(localPath);
  if (!root) throw new Error('workspace root must identify an existing directory');
  return root;
}

function rootsResultWorkspaceRoot(result) {
  if (!result || !Array.isArray(result.roots) || result.roots.length === 0) {
    throw new Error('client returned no workspace roots');
  }
  const roots = result.roots.map((entry) => workspaceRootFromFileUri(entry && entry.uri));
  const unique = [...new Set(roots)];
  if (unique.length !== 1) {
    throw new Error('client returned multiple workspace roots; choose one workspace for this MCP server');
  }
  return unique[0];
}

function codexMetadataWorkspaceRoot(meta, clientName) {
  if (clientName !== 'codex-mcp-client' || !meta || typeof meta !== 'object') return null;
  const sandbox = meta[CODEX_SANDBOX_META_CAPABILITY];
  if (!sandbox || typeof sandbox !== 'object') return null;
  try {
    return workspaceRootFromFileUri(sandbox.sandboxCwd);
  } catch {
    return null;
  }
}

// ---- Kill switch -----------------------------------------------------------
function toolsEnabled(env = process.env) {
  return String(env.SPK_CODEBASE_SEARCH || '').toLowerCase() !== 'off';
}

// ---- ripgrep invocation ----------------------------------------------------
// Returns { matches } on success, { error } on failure — never throws.
function runRg(args, env = process.env, options = {}) {
  const run = options.spawnSync || spawnSync;
  const root = Object.prototype.hasOwnProperty.call(options, 'workspaceRoot')
    ? canonicalDirectory(options.workspaceRoot)
    : searchProjectRoot(env);
  if (!root) return { ...WORKSPACE_ROOT_UNAVAILABLE };
  let res;
  try {
    res = run('rg', args, {
      encoding: 'utf-8',
      timeout: RG_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      cwd: root,
      env: executableEnvironment(),
      // Defensive: never let rg inherit/observe the server's JSON-RPC stdin.
      // The "." positional default is the real fix; this guarantees rg can
      // never block on or read an inherited stdin even if a path were missing.
      input: '',
    });
  } catch (e) {
    return { error: 'rg-spawn-failed', hint: String((e && e.message) || e) };
  }
  if (res.error) {
    if (res.error.code === 'ENOENT') {
      return { error: 'rg-not-found', hint: 'install ripgrep in a standard user or system executable directory' };
    }
    return { error: 'rg-spawn-failed', hint: String(res.error.message || res.error) };
  }
  // rg exit 1 = no matches (not an error); >1 = real error.
  if (res.status && res.status > 1) {
    return { error: 'rg-failed', status: res.status, hint: (res.stderr || '').trim().slice(0, 240) };
  }
  return { matches: parseRgJson(res.stdout || '') };
}

// ---- Tool definitions ------------------------------------------------------
const TOOLS = [
  {
    name: 'search_code',
    description:
      'Search code across the project with ripgrep (regex by default, literal optional). ' +
      'Returns capped file/line/col matches. Precise — prefer this over raw grep in large repos.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Pattern to search for' },
        path: { type: 'string', description: 'Optional path/dir to scope the search' },
        glob: { type: 'string', description: 'Optional rg glob filter, e.g. "*.ts"' },
        literal: { type: 'boolean', description: 'Treat query as a literal string (rg -F)' },
        maxResults: { type: 'number', description: 'Cap on matches (default 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_symbol',
    description:
      'Best-effort, pattern-based symbol definition lookup (function/class/def/const/type/...). ' +
      'Not AST-accurate; may miss or over-match. Use search_code for precise text search.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Symbol name to locate a declaration for' },
        path: { type: 'string', description: 'Optional path/dir to scope the search' },
        maxResults: { type: 'number', description: 'Cap on matches (default 50)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'file_outline',
    description:
      'Best-effort, pattern-based outline of top-level declarations in a single file. ' +
      'Not AST-accurate. Use to get a quick map of a file before reading it fully.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to outline' },
        maxResults: { type: 'number', description: 'Cap on declarations (default 50)' },
      },
      required: ['path'],
    },
  },
];

function listTools() {
  return TOOLS;
}

// Realpath-based containment: after the pure-path containPath gate, resolve
// symlinks so an in-root symlink pointing OUTSIDE root cannot leak out-of-root
// content via an explicit path arg. A not-yet-existing path (ENOENT) is already
// cleared by the pure-path check, so it passes here. Throws on escape.
function assertRealpathContained(userPath, root) {
  if (!userPath) return;
  const base = path.resolve(root);
  const resolved = path.resolve(base, userPath);
  let realBase;
  try {
    realBase = fs.realpathSync(base);
  } catch (e) {
    if (e.code === 'ENOENT') return; // root itself missing — nothing to leak
    throw e;
  }
  let realResolved;
  try {
    realResolved = fs.realpathSync(resolved);
  } catch (e) {
    if (e.code === 'ENOENT') return; // path doesn't exist yet — pure-path check sufficed
    throw e;
  }
  if (realResolved !== realBase && !realResolved.startsWith(realBase + path.sep)) {
    throw new Error('path escapes project root via symlink');
  }
}

// ---- Tool dispatch ---------------------------------------------------------
function dispatch(name, args = {}, env = process.env, options = {}) {
  if (!toolsEnabled(env)) {
    return { disabled: true, reason: 'SPK_CODEBASE_SEARCH=off' };
  }
  const max = Number.isFinite(Number(args.maxResults)) ? Number(args.maxResults) : DEFAULT_MAX_RESULTS;
  // Project root = the same cwd ripgrep runs in (see runRg). Used to confine
  // model-controlled positional paths so they cannot escape the project.
  const root = Object.prototype.hasOwnProperty.call(options, 'workspaceRoot')
    ? canonicalDirectory(options.workspaceRoot)
    : searchProjectRoot(env);
  if (!root) return { ...WORKSPACE_ROOT_UNAVAILABLE };
  let rgArgs;
  try {
    // Pure-path containment runs inside the builders; realpath containment runs
    // here (dispatch has fs access; builders stay fs-free and unit-testable).
    assertRealpathContained(args.path, root);
    if (name === 'search_code') {
      rgArgs = buildSearchArgs({
        query: args.query,
        path: args.path,
        glob: args.glob,
        literal: args.literal,
        maxResults: max,
        root,
      });
    } else if (name === 'find_symbol') {
      rgArgs = buildSymbolArgs(args.name, { path: args.path, maxResults: max, root });
    } else if (name === 'file_outline') {
      rgArgs = buildOutlineArgs(args.path, { maxResults: max, root });
    } else {
      return { error: 'unknown-tool', hint: name };
    }
  } catch (e) {
    // Containment / flag-injection rejections surface as a structured error,
    // never an uncaught throw across the JSON-RPC boundary.
    return { error: 'invalid-argument', hint: String((e && e.message) || e) };
  }
  const out = runRg(rgArgs, env, { ...options, workspaceRoot: root });
  if (out.error) return out;
  // rg -m caps PER FILE; enforce the authoritative GLOBAL cap here.
  return applyGlobalCap(out.matches, clampMax(max));
}

// Enforce a global result cap and report truncation against the true total.
function applyGlobalCap(matches, max) {
  const list = Array.isArray(matches) ? matches : [];
  const capped = list.slice(0, max);
  return { matches: capped, count: capped.length, truncated: list.length > max };
}

// ---- Server object (for tests + reuse) -------------------------------------
function createServer(env = process.env, options = {}) {
  return {
    listTools,
    callTool(name, args) {
      return dispatch(name, args || {}, env, options);
    },
  };
}

// ---- JSON-RPC over stdio ---------------------------------------------------
function createProtocolSession(env = process.env) {
  return {
    env,
    clientName: null,
    supportsRoots: false,
    rootsListChanged: false,
    rootsRequestSequence: 0,
    pendingRootsRequestId: null,
    workspaceRoot: null,
    workspaceRootError: null,
  };
}

function rootsListRequest(session) {
  session.workspaceRoot = null;
  session.workspaceRootError = null;
  session.rootsRequestSequence += 1;
  session.pendingRootsRequestId = `spk-roots-${session.rootsRequestSequence}`;
  return {
    jsonrpc: '2.0',
    id: session.pendingRootsRequestId,
    method: 'roots/list',
    params: {},
  };
}

function acceptRootsResponse(session, msg) {
  if (msg.id !== session.pendingRootsRequestId) return false;
  session.pendingRootsRequestId = null;
  if (msg.error) {
    session.workspaceRootError = `roots/list failed: ${String(msg.error.message || 'client error')}`;
    return true;
  }
  try {
    session.workspaceRoot = rootsResultWorkspaceRoot(msg.result);
  } catch (error) {
    session.workspaceRootError = String(error.message || error);
  }
  return true;
}

function resolveSessionWorkspaceRoot(session, params) {
  if (session.supportsRoots) {
    if (session.workspaceRoot) return { root: session.workspaceRoot };
    if (session.workspaceRootError) {
      return {
        error: 'workspace-root-invalid',
        hint: session.workspaceRootError,
      };
    }
  }

  const hostRoot = searchProjectRoot(session.env);
  if (hostRoot) return { root: hostRoot };

  const codexRoot = codexMetadataWorkspaceRoot(
    params && params._meta,
    session.clientName,
  );
  if (codexRoot) return { root: codexRoot };

  return { ...WORKSPACE_ROOT_UNAVAILABLE };
}

function handleProtocolMessage(msg, session) {
  // A JSON-RPC response to a server-initiated roots/list request must not
  // itself receive a response.
  if (
    msg &&
    msg.method === undefined &&
    msg.id !== undefined &&
    (Object.prototype.hasOwnProperty.call(msg, 'result') ||
      Object.prototype.hasOwnProperty.call(msg, 'error'))
  ) {
    acceptRootsResponse(session, msg);
    return [];
  }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    const clientCapabilities = (params && params.capabilities) || {};
    session.clientName =
      params && params.clientInfo && typeof params.clientInfo.name === 'string'
        ? params.clientInfo.name
        : null;
    session.supportsRoots = Boolean(
      clientCapabilities.roots && typeof clientCapabilities.roots === 'object',
    );
    session.rootsListChanged = Boolean(
      session.supportsRoots && clientCapabilities.roots.listChanged,
    );
    return [{
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION,
        capabilities: {
          tools: {},
          experimental: {
            [CODEX_SANDBOX_META_CAPABILITY]: {},
          },
        },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      },
    }];
  }

  if (method === 'notifications/initialized') {
    return session.supportsRoots ? [rootsListRequest(session)] : [];
  }
  if (method === 'notifications/roots/list_changed') {
    return session.supportsRoots && session.rootsListChanged
      ? [rootsListRequest(session)]
      : [];
  }
  if (method === 'tools/list') {
    return [{ jsonrpc: '2.0', id, result: { tools: listTools() } }];
  }
  if (method === 'tools/call') {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    const rootResolution = resolveSessionWorkspaceRoot(session, params);
    const result = rootResolution.root
      ? dispatch(name, args, session.env, { workspaceRoot: rootResolution.root })
      : rootResolution;
    const isError = Boolean(result && (result.error || result.disabled));
    return [{
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError,
      },
    }];
  }
  if (method === 'ping') {
    return [{ jsonrpc: '2.0', id, result: {} }];
  }

  // Notifications (no id) get no response.
  if (id === undefined || id === null) return [];
  return [{
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }];
}

function handleRequest(msg, env = process.env, session = createProtocolSession(env)) {
  return handleProtocolMessage(msg, session)[0] || null;
}

function startStdio(env = process.env) {
  const session = createProtocolSession(env);
  let buffer = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // ignore malformed lines per stdio contract
      }
      let responses;
      try {
        responses = handleProtocolMessage(msg, session);
      } catch (e) {
        responses = msg && msg.id != null
          ? [{ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e.message || e) } }]
          : [];
      }
      for (const response of responses) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

module.exports = {
  SERVER_NAME,
  SERVER_VERSION,
  PROTOCOL_VERSION,
  CODEX_SANDBOX_META_CAPABILITY,
  WORKSPACE_ROOT_UNAVAILABLE,
  canonicalDirectory,
  workspaceRootFromFileUri,
  rootsResultWorkspaceRoot,
  codexMetadataWorkspaceRoot,
  executableEnvironment,
  searchProjectRoot,
  trustedExecutablePath,
  toolsEnabled,
  runRg,
  listTools,
  dispatch,
  applyGlobalCap,
  createServer,
  createProtocolSession,
  rootsListRequest,
  acceptRootsResponse,
  resolveSessionWorkspaceRoot,
  handleProtocolMessage,
  handleRequest,
  startStdio,
};

if (require.main === module) {
  startStdio(process.env);
}
