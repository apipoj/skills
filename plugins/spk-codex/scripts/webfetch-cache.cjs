// hooks/PreToolUse+PostToolUse/webfetch-cache.cjs
// Short-lived local cache for host-provided WebFetch results, keyed by the
// normalized URL AND the exact prompt. WebFetch responses are prompt-shaped,
// so results from different prompts must never share an entry.
//
// pre  mode: for a fresh exact-key hit, writes the cached body to stderr and
//            exits 2 so Claude Code delivers it in place of WebFetch.
// post mode: stores the result already returned by the host in
//            .claude/spk-webfetch-cache/<sha>.json.
//
// This hook never opens a socket or performs a fetch of its own. Network
// access remains entirely behind the host's WebFetch permissions. A fixed,
// conservative TTL bounds stale reuse; expired entries fail open to WebFetch.
//
// Kill switch: SPK_WEBFETCH_CACHE=off bypasses both modes.
//
// Cache placement is intentionally not configurable through project
// environment variables. A checked-in setting must not be able to redirect
// hook reads or writes outside the host-provided project root.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const MAX_CONTENT_BYTES = 1024 * 1024;
const MAX_ENTRY_BYTES = MAX_CONTENT_BYTES + (128 * 1024);

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value) return null;

  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    parsed.hash = '';
    return parsed.href;
  } catch {
    return null;
  }
}

function exactPrompt(value) {
  return typeof value === 'string' ? value : null;
}

function cacheKey(url, prompt) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || typeof prompt !== 'string') return null;
  return crypto.createHash('sha256')
    .update(normalizedUrl)
    .update('\0')
    .update(prompt)
    .digest('hex')
    .slice(0, 32);
}

function isContained(base, target) {
  const relative = path.relative(base, target);
  return relative === ''
    || (!path.isAbsolute(relative)
      && relative !== '..'
      && !relative.startsWith(`..${path.sep}`));
}

function samePath(left, right) {
  return path.relative(left, right) === '';
}

function trustedProjectRoot(env) {
  env = env || process.env;
  const raw = env.CLAUDE_PROJECT_DIR || env.CODEX_PROJECT_DIR || process.cwd();
  if (typeof raw !== 'string' || !raw) return null;

  try {
    const resolved = fs.realpathSync(path.resolve(raw));
    const stat = fs.statSync(resolved);
    return stat.isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

function cacheLocation(env, opts) {
  opts = opts || {};

  // Explicit in-process seam for isolated tests. It is deliberately not read
  // from env, config files, or hook input.
  if (Object.prototype.hasOwnProperty.call(opts, 'cacheDir')) {
    if (typeof opts.cacheDir !== 'string' || !opts.cacheDir) return null;

    try {
      const requested = path.resolve(opts.cacheDir);
      const parent = path.dirname(requested);
      const name = path.basename(requested);
      if (!name || samePath(requested, parent)) return null;
      const parentLstat = fs.lstatSync(parent);
      if (parentLstat.isSymbolicLink() || !parentLstat.isDirectory()) return null;
      const root = fs.realpathSync(parent);
      return {
        root,
        dir: path.join(root, name),
        components: [name]
      };
    } catch {
      return null;
    }
  }

  const root = trustedProjectRoot(env);
  if (!root) return null;
  return {
    root,
    dir: path.join(root, '.claude', 'spk-webfetch-cache'),
    components: ['.claude', 'spk-webfetch-cache']
  };
}

function cacheDir(env, opts) {
  const location = cacheLocation(env, opts);
  return location ? location.dir : null;
}

function cacheFile(url, prompt, env, opts) {
  const dir = cacheDir(env, opts);
  const key = cacheKey(url, prompt);
  return dir && key ? path.join(dir, key + '.json') : null;
}

function disabled(env) {
  env = env || process.env;
  return env.SPK_WEBFETCH_CACHE === 'off';
}

function ensureCacheDirectory(location, create) {
  if (!location || !location.root || !location.dir) return null;

  let current = location.root;
  try {
    const rootLstat = fs.lstatSync(current);
    if (rootLstat.isSymbolicLink() || !rootLstat.isDirectory()) return null;
    const realRoot = fs.realpathSync(current);
    if (!samePath(realRoot, location.root)) return null;

    for (const component of location.components) {
      current = path.join(current, component);
      let stat;
      try {
        stat = fs.lstatSync(current);
      } catch (error) {
        if (!create || !error || error.code !== 'ENOENT') return null;
        try {
          fs.mkdirSync(current, { mode: 0o700 });
        } catch (mkdirError) {
          if (!mkdirError || mkdirError.code !== 'EEXIST') return null;
        }
        stat = fs.lstatSync(current);
      }

      if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
      const realCurrent = fs.realpathSync(current);
      if (!isContained(location.root, realCurrent) || !samePath(realCurrent, current)) {
        return null;
      }
    }

    const realDir = fs.realpathSync(current);
    if (!samePath(realDir, location.dir) || !isContained(location.root, realDir)) {
      return null;
    }
    return realDir;
  } catch {
    return null;
  }
}

function preparedEntry(url, prompt, env, opts, create) {
  const location = cacheLocation(env, opts);
  if (!location) return null;
  const dir = ensureCacheDirectory(location, create);
  if (!dir) return null;

  const key = cacheKey(url, prompt);
  if (!key) return null;
  const file = path.join(dir, key + '.json');
  if (!isContained(dir, file) || path.dirname(file) !== dir) return null;
  return { location, dir, file };
}

function inspectRegularEntry(file, dir) {
  try {
    if (!isContained(dir, file) || path.dirname(file) !== dir) return null;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_ENTRY_BYTES) {
      return null;
    }
    const realFile = fs.realpathSync(file);
    if (!isContained(dir, realFile) || path.dirname(realFile) !== dir) return null;
    return stat;
  } catch {
    return null;
  }
}

function readBoundedEntry(prepared) {
  if (!prepared) return null;
  if (!ensureCacheDirectory(prepared.location, false)) return null;
  if (!inspectRegularEntry(prepared.file, prepared.dir)) return null;

  let fd;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(prepared.file, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_ENTRY_BYTES) return null;
    if (!ensureCacheDirectory(prepared.location, false)) return null;

    const buffer = Buffer.allocUnsafe(MAX_ENTRY_BYTES + 1);
    let total = 0;
    while (total < buffer.length) {
      const count = fs.readSync(fd, buffer, total, buffer.length - total, null);
      if (count === 0) break;
      total += count;
    }
    if (total > MAX_ENTRY_BYTES) return null;
    if (!ensureCacheDirectory(prepared.location, false)) return null;
    return buffer.subarray(0, total).toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* best-effort cache */ }
    }
  }
}

function parseEntry(raw, url, prompt) {
  let entry;
  try { entry = JSON.parse(raw); } catch { return null; }

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  if (entry.url !== url || entry.prompt !== prompt) return null;
  if (typeof entry.content !== 'string' || !entry.content) return null;
  if (Buffer.byteLength(entry.content, 'utf8') > MAX_CONTENT_BYTES) return null;
  if (typeof entry.fetched_at !== 'number' || !Number.isFinite(entry.fetched_at)) return null;
  return entry;
}

function safeRemoveEntry(url, prompt, env, opts) {
  const prepared = preparedEntry(url, prompt, env, opts, false);
  if (!prepared || !inspectRegularEntry(prepared.file, prepared.dir)) return false;
  if (!ensureCacheDirectory(prepared.location, false)) return false;

  try {
    fs.unlinkSync(prepared.file);
    return true;
  } catch {
    return false;
  }
}

function safeCleanupTemp(file, prepared) {
  if (!file || !prepared || !isContained(prepared.dir, file)) return;
  if (!ensureCacheDirectory(prepared.location, false)) return;
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) return;
    const realFile = fs.realpathSync(file);
    if (!isContained(prepared.dir, realFile) || path.dirname(realFile) !== prepared.dir) return;
    fs.unlinkSync(file);
  } catch {
    // Best-effort cleanup only.
  }
}

function destinationIsSafe(file, dir) {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_ENTRY_BYTES) {
      return false;
    }
    const realFile = fs.realpathSync(file);
    return isContained(dir, realFile) && path.dirname(realFile) === dir;
  } catch (error) {
    return Boolean(error && error.code === 'ENOENT');
  }
}

function atomicWriteEntry(prepared, serialized) {
  const bytes = Buffer.from(serialized, 'utf8');
  if (bytes.length > MAX_ENTRY_BYTES) return false;
  if (!ensureCacheDirectory(prepared.location, false)) return false;
  if (!destinationIsSafe(prepared.file, prepared.dir)) return false;

  let tmp = null;
  let fd;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const random = crypto.randomBytes(16).toString('hex');
      const candidate = path.join(
        prepared.dir,
        `.${path.basename(prepared.file)}.${random}.tmp`
      );
      if (!isContained(prepared.dir, candidate) || path.dirname(candidate) !== prepared.dir) {
        return false;
      }

      try {
        const noFollow = fs.constants.O_NOFOLLOW || 0;
        fd = fs.openSync(
          candidate,
          fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow,
          0o600
        );
        tmp = candidate;
        break;
      } catch (error) {
        if (!error || error.code !== 'EEXIST') return false;
      }
    }
    if (fd === undefined || !tmp) return false;

    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.writeSync(fd, bytes, offset, bytes.length - offset);
      if (count <= 0) return false;
      offset += count;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    const tmpStat = fs.lstatSync(tmp);
    if (tmpStat.isSymbolicLink() || !tmpStat.isFile() || tmpStat.size !== bytes.length) {
      return false;
    }
    const realTmp = fs.realpathSync(tmp);
    if (!isContained(prepared.dir, realTmp) || path.dirname(realTmp) !== prepared.dir) {
      return false;
    }

    // Recheck both the directory chain and destination immediately before the
    // atomic replacement. A final symlink must never be followed or replaced.
    if (!ensureCacheDirectory(prepared.location, false)) return false;
    if (!destinationIsSafe(prepared.file, prepared.dir)) return false;
    fs.renameSync(tmp, prepared.file);
    tmp = null;

    if (!ensureCacheDirectory(prepared.location, false)) return false;
    return Boolean(inspectRegularEntry(prepared.file, prepared.dir));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* best-effort cache */ }
    }
    safeCleanupTemp(tmp, prepared);
  }
}

// Extract the model-readable body from a WebFetch tool_response.
// Shape as of Claude Code 2026-04: object with content at .result; the
// other keys are defensive fallbacks. String handles older integrations.
function extractContent(toolResponse) {
  if (typeof toolResponse === 'string') return toolResponse || null;
  if (toolResponse && typeof toolResponse === 'object') {
    return toolResponse.result
      || toolResponse.output
      || toolResponse.text
      || toolResponse.content
      || toolResponse.body
      || null;
  }
  return null;
}

// pre mode: returns { hit: false } or { hit: true, payload }.
// Never throws — any failure means "let WebFetch proceed".
async function preCheck(event, opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  if (disabled(env)) return { hit: false };

  const input = event && event.tool_input;
  const normalizedUrl = normalizeUrl(input && input.url);
  if (!normalizedUrl) return { hit: false };
  const prompt = exactPrompt(input && input.prompt);
  if (prompt === null) return { hit: false };

  const prepared = preparedEntry(normalizedUrl, prompt, env, opts, false);
  const raw = readBoundedEntry(prepared);
  if (raw === null) return { hit: false };
  const entry = parseEntry(raw, normalizedUrl, prompt);
  if (!entry) return { hit: false };

  const now = opts.now === undefined ? Date.now() : opts.now;
  if (typeof now !== 'number' || !Number.isFinite(now)) return { hit: false };
  const fetchedAtMs = entry.fetched_at * 1000;
  const ageMs = now - fetchedAtMs;
  if (ageMs < -MAX_CLOCK_SKEW_MS || ageMs > CACHE_TTL_MS) {
    safeRemoveEntry(normalizedUrl, prompt, env, opts);
    return { hit: false };
  }

  let fetchedAt = 'unknown';
  try {
    fetchedAt = new Date(fetchedAtMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
  } catch {
    return { hit: false };
  }

  const lines = [
    `[spk-webfetch-cache] Fresh local cache hit for ${normalizedUrl}`,
    '',
    `Captured from the host's WebFetch result at ${fetchedAt}. This hook made`,
    'no network request. Use the cached content only for the exact prompt below.',
    ''
  ];
  lines.push(`Exact WebFetch prompt: ${JSON.stringify(entry.prompt)}`, '');
  lines.push(
    '----- BEGIN CACHED CONTENT -----',
    entry.content,
    '----- END CACHED CONTENT -----'
  );
  return { hit: true, payload: lines.join('\n') };
}

// post mode: returns { stored, removed, reason } for tests/debugging.
// Never throws — caching is best-effort.
async function postStore(event, opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  if (disabled(env)) return { stored: false, reason: 'disabled' };

  const input = event && event.tool_input;
  const normalizedUrl = normalizeUrl(input && input.url);
  if (!normalizedUrl) return { stored: false, reason: 'invalid url' };
  const prompt = exactPrompt(input && input.prompt);
  if (prompt === null) return { stored: false, reason: 'invalid prompt' };

  const content = extractContent(event.tool_response);
  if (!content) return { stored: false, reason: 'no content in tool_response' };
  if (typeof content !== 'string') return { stored: false, reason: 'content must be text' };
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
    return { stored: false, reason: 'content too large' };
  }

  const response = event && event.tool_response;
  if (response && typeof response === 'object') {
    const status = response.status ?? response.statusCode ?? response.code;
    if (typeof status === 'number' && Number.isFinite(status) && status >= 400) {
      return { stored: false, reason: 'host WebFetch failed' };
    }
  }

  const now = opts.now === undefined ? Date.now() : opts.now;
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    return { stored: false, reason: 'invalid clock' };
  }
  const entry = {
    url: normalizedUrl,
    prompt,
    content,
    fetched_at: Math.floor(now / 1000)
  };

  let serialized;
  try {
    serialized = JSON.stringify(entry);
  } catch {
    return { stored: false, reason: 'entry serialization failed' };
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_ENTRY_BYTES) {
    return { stored: false, reason: 'entry too large' };
  }

  const prepared = preparedEntry(normalizedUrl, prompt, env, opts, true);
  if (!prepared || !atomicWriteEntry(prepared, serialized)) {
    return { stored: false, reason: 'write failed' };
  }
  return { stored: true, reason: 'cached host WebFetch result' };
}

function main() {
  const mode = process.argv[2];
  let raw = '';
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', async () => {
    let event;
    try { event = JSON.parse(raw || '{}'); } catch { process.exit(0); }

    if (mode === 'pre') {
      const result = await preCheck(event);
      if (result.hit) {
        process.stderr.write(result.payload + '\n');
        process.exit(2);
      }
      process.exit(0);
    }

    if (mode === 'post') {
      await postStore(event);
      process.exit(0);
    }

    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  CACHE_TTL_MS,
  MAX_CONTENT_BYTES,
  MAX_ENTRY_BYTES,
  normalizeUrl,
  cacheKey,
  cacheDir,
  cacheFile,
  extractContent,
  preCheck,
  postStore
};
