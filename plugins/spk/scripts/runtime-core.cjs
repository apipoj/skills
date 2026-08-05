// Shared, dependency-free runtime helpers for SPK hooks and diagnostics.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_VERSION = 1;
const CONFIG_PATH = path.join('ai_context', 'spk.config.json');
const DEFAULT_CONFIG = Object.freeze({
  version: CONFIG_VERSION,
  features: Object.freeze({
    sessionReflection: false,
    webfetchCache: true,
    autoIngest: true,
  }),
  limits: Object.freeze({
    maxReflectionChars: 12000,
    hookTimeoutMs: 30000,
  }),
});

function parseBooleanFlag(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
}

function projectRoot(env = process.env, cwd = process.cwd()) {
  // Host-provided roots take precedence over SPK compatibility variables.
  // Project settings can define SPK_* values, so they must not be able to
  // redirect a hook away from the checkout selected by Claude Code or Codex.
  const candidate = env.CLAUDE_PROJECT_DIR || env.CODEX_PROJECT_DIR ||
    env.REPO_ROOT || env.SPK_PROJECT_ROOT || cwd;
  return path.resolve(candidate);
}

function pluginRoot(env = process.env, fallback = path.join(__dirname, '..')) {
  // CLAUDE_PLUGIN_ROOT is supplied by the host. Keep legacy variables as
  // fallbacks for direct execution and tests only.
  const candidate = env.CLAUDE_PLUGIN_ROOT || env.PLUGIN_ROOT ||
    env.SPK_PLUGIN_ROOT || fallback;
  return path.resolve(candidate);
}

function boundedText(value, maxChars) {
  const text = value === undefined || value === null ? '' : String(value);
  const limit = Number.isInteger(maxChars) && maxChars >= 0 ? maxChars : 0;
  if (text.length <= limit) return { text, truncated: false, originalLength: text.length };
  return {
    text: text.slice(0, limit) + '\n... (truncated by SPK)',
    truncated: true,
    originalLength: text.length,
  };
}

function normalizeRepoPath(filePath, root) {
  if (!filePath) return null;
  const base = path.resolve(root || process.cwd());
  const absolute = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(base, filePath);
  const relative = path.relative(base, absolute).replace(/\\/g, '/');
  return {
    absolute,
    relative,
    insideRoot: relative === '' || (!relative.startsWith('../') && relative !== '..' && !path.isAbsolute(relative)),
  };
}

function atomicWrite(file, content) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const suffix = crypto.randomBytes(6).toString('hex');
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${suffix}.tmp`);
  try {
    fs.writeFileSync(temp, content);
    fs.renameSync(temp, file);
  } finally {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch { /* best-effort cleanup */ }
  }
}

function acquireLock(file, options = {}) {
  const staleMs = Number.isInteger(options.staleMs) ? options.staleMs : 10 * 60 * 1000;
  const token = crypto.randomBytes(16).toString('hex');
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    token,
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });

  function readOwner() {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const stat = fs.statSync(file);
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { /* invalid/legacy lock */ }
      return { raw, stat, parsed };
    } catch {
      return null;
    }
  }

  function localPidAlive(candidate) {
    if (
      !candidate ||
      !Number.isInteger(candidate.pid) ||
      candidate.pid <= 0 ||
      (candidate.hostname && candidate.hostname !== os.hostname())
    ) return false;
    try {
      process.kill(candidate.pid, 0);
      return true;
    } catch (error) {
      // EPERM means the process exists but this user cannot signal it.
      return Boolean(error && error.code === 'EPERM');
    }
  }

  function createOwnedLock() {
    let fd;
    try {
      fd = fs.openSync(file, 'wx');
      fs.writeFileSync(fd, JSON.stringify(owner));
      return true;
    } catch (error) {
      if (error && error.code === 'EEXIST') return false;
      throw error;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  if (!createOwnedLock()) {
    const observed = readOwner();
    if (!observed) {
      if (!createOwnedLock()) return { acquired: false, token: null, release() {} };
    } else {
      const stale = Date.now() - observed.stat.mtimeMs > staleMs;
      if (!stale || localPidAlive(observed.parsed)) {
        return { acquired: false, token: null, release() {} };
      }

      // Re-read immediately before reclaiming. This prevents a stale snapshot
      // from deleting a replacement owner in the common interleaving case.
      const current = readOwner();
      if (
        !current ||
        current.raw !== observed.raw ||
        current.stat.mtimeMs !== observed.stat.mtimeMs
      ) {
        return { acquired: false, token: null, release() {} };
      }
      try { fs.unlinkSync(file); } catch {
        return { acquired: false, token: null, release() {} };
      }
      if (!createOwnedLock()) return { acquired: false, token: null, release() {} };
    }
  }

  let released = false;
  return {
    acquired: true,
    token,
    release() {
      if (released) return;
      released = true;
      try {
        const current = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (current && current.token === token) fs.unlinkSync(file);
      } catch { /* missing, malformed, or replaced — never remove it */ }
    },
  };
}

function cloneDefaults() {
  return {
    version: DEFAULT_CONFIG.version,
    features: { ...DEFAULT_CONFIG.features },
    limits: { ...DEFAULT_CONFIG.limits },
  };
}

function validateConfig(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['configuration must be an object'] };
  }
  const topAllowed = new Set(['version', 'features', 'limits']);
  for (const key of Object.keys(raw)) {
    if (!topAllowed.has(key)) errors.push(`unknown top-level key "${key}"`);
  }
  if (raw.version !== undefined && raw.version !== CONFIG_VERSION) {
    errors.push(`version must be ${CONFIG_VERSION}`);
  }

  const boolFields = ['sessionReflection', 'webfetchCache', 'autoIngest'];
  if (raw.features !== undefined) {
    if (!raw.features || typeof raw.features !== 'object' || Array.isArray(raw.features)) {
      errors.push('features must be an object');
    } else {
      for (const key of Object.keys(raw.features)) {
        if (!boolFields.includes(key)) errors.push(`unknown features key "${key}"`);
        else if (typeof raw.features[key] !== 'boolean') errors.push(`features.${key} must be boolean`);
      }
    }
  }

  const limitRanges = {
    maxReflectionChars: [1000, 50000],
    hookTimeoutMs: [1000, 120000],
  };
  if (raw.limits !== undefined) {
    if (!raw.limits || typeof raw.limits !== 'object' || Array.isArray(raw.limits)) {
      errors.push('limits must be an object');
    } else {
      for (const [key, value] of Object.entries(raw.limits)) {
        if (!limitRanges[key]) {
          errors.push(`unknown limits key "${key}"`);
          continue;
        }
        const [min, max] = limitRanges[key];
        if (!Number.isInteger(value) || value < min || value > max) {
          errors.push(`limits.${key} must be an integer from ${min} to ${max}`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function loadConfig(root, env = process.env) {
  const resolvedRoot = projectRoot(env, root || process.cwd());
  const file = path.join(resolvedRoot, CONFIG_PATH);
  const config = cloneDefaults();
  let source = 'defaults';
  let errors = [];

  if (fs.existsSync(file)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const result = validateConfig(raw);
      if (!result.valid) {
        errors = result.errors;
      } else {
        config.version = raw.version || CONFIG_VERSION;
        Object.assign(config.features, raw.features || {});
        Object.assign(config.limits, raw.limits || {});
        source = CONFIG_PATH;
      }
    } catch (error) {
      errors = [`invalid JSON: ${error.message}`];
    }
  }

  // The merged hook environment has no trustworthy provenance: a checked-in
  // project setting can supply SPK_SESSION_REFLECT. It may therefore veto
  // reflection, but it can never grant consent or turn the project feature on.
  if (
    env.SPK_SESSION_REFLECT !== undefined &&
    !parseBooleanFlag(env.SPK_SESSION_REFLECT, true)
  ) {
    config.features.sessionReflection = false;
  }
  config.features.webfetchCache = parseBooleanFlag(
    env.SPK_WEBFETCH_CACHE,
    config.features.webfetchCache
  );
  config.features.autoIngest = parseBooleanFlag(
    env.SPK_AUTO_INGEST,
    config.features.autoIngest
  );
  return { config, file, source, errors };
}

function normalizeHookEvent(event) {
  const raw = event && typeof event === 'object' ? event : {};
  const input = raw.tool_input && typeof raw.tool_input === 'object' ? raw.tool_input : {};
  const rawName = String(raw.tool_name || raw.toolName || '');
  const aliases = {
    Write: 'write',
    Edit: 'edit',
    apply_patch: 'apply_patch',
    Bash: 'shell',
    shell: 'shell',
    exec_command: 'shell',
  };
  return {
    host: raw.host || (rawName === 'apply_patch' || rawName === 'exec_command' ? 'codex' : 'claude'),
    tool: aliases[rawName] || rawName.toLowerCase(),
    rawTool: rawName,
    input,
    cwd: raw.cwd || input.cwd || null,
    sessionId: raw.session_id || raw.sessionId || null,
  };
}

module.exports = {
  CONFIG_PATH,
  CONFIG_VERSION,
  DEFAULT_CONFIG,
  acquireLock,
  atomicWrite,
  boundedText,
  loadConfig,
  normalizeHookEvent,
  normalizeRepoPath,
  parseBooleanFlag,
  pluginRoot,
  projectRoot,
  validateConfig,
};
