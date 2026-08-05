#!/usr/bin/env node
'use strict';

// User-local consent for outbound session reflection. Consent records live
// outside the repository and are bound to the repository's canonical realpath.
// Project files and environment variables never select this store.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextDecoder } = require('util');

const CONSENT_VERSION = 1;
const CONSENT_CAPABILITY = 'session-reflection';
const MAX_CONSENT_BYTES = 8 * 1024;

function isContainedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function canonicalProjectRoot(projectRoot) {
  const candidate = path.resolve(projectRoot || process.cwd());
  const real = fs.realpathSync(candidate);
  if (!fs.statSync(real).isDirectory()) {
    throw new Error('project root must be a directory');
  }
  return real;
}

function projectIdentity(realProjectRoot) {
  return process.platform === 'win32'
    ? realProjectRoot.toLowerCase()
    : realProjectRoot;
}

function projectFilesystemIdentity(realProjectRoot) {
  const stat = fs.statSync(realProjectRoot, { bigint: true });
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
  };
}

function consentKey(realProjectRoot) {
  return crypto.createHash('sha256')
    .update(`spk:${CONSENT_CAPABILITY}\0${projectIdentity(realProjectRoot)}`)
    .digest('hex');
}

function defaultConsentRoot() {
  const info = os.userInfo();
  if (!info || typeof info.homedir !== 'string' || !path.isAbsolute(info.homedir)) {
    throw new Error('could not determine the operating-system user home');
  }
  return path.join(info.homedir, '.spk', 'consents');
}

function assertSafeOwnedEntry(stat, label, privateEntry = false) {
  if (process.platform === 'win32') return;
  const info = os.userInfo();
  if (Number.isInteger(info.uid) && stat.uid !== info.uid) {
    throw new Error(`${label} is not owned by the current user`);
  }
  if ((stat.mode & 0o022) !== 0) {
    throw new Error(`${label} is group/world writable`);
  }
  if (privateEntry && (stat.mode & 0o077) !== 0) {
    throw new Error(`${label} must be private to the current user`);
  }
}

function inspectDirectory(directory, create) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch (error) {
    if (error.code !== 'ENOENT' || !create) return null;
    fs.mkdirSync(directory, { mode: 0o700 });
    stat = fs.lstatSync(directory);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`unsafe consent directory: ${directory}`);
  }
  assertSafeOwnedEntry(stat, 'consent directory', true);
  return fs.realpathSync(directory);
}

function prepareDefaultConsentRoot(create) {
  const requested = defaultConsentRoot();
  const home = fs.realpathSync(path.dirname(path.dirname(requested)));
  const spk = path.join(home, '.spk');
  const realSpk = inspectDirectory(spk, create);
  if (!realSpk) return { requested, real: null };
  const consents = path.join(realSpk, 'consents');
  const realConsents = inspectDirectory(consents, create);
  return { requested: consents, real: realConsents };
}

function prepareInjectedConsentRoot(consentRoot, create) {
  const requested = path.resolve(consentRoot);
  if (create) fs.mkdirSync(requested, { recursive: true, mode: 0o700 });
  const real = inspectDirectory(requested, false);
  return { requested, real };
}

function consentContext(projectRoot, options = {}, create = false) {
  const realProjectRoot = canonicalProjectRoot(projectRoot);
  const filesystemIdentity = projectFilesystemIdentity(realProjectRoot);
  const requestedConsentRoot = options.consentRoot
    ? path.resolve(options.consentRoot)
    : path.join(
      fs.realpathSync(path.dirname(path.dirname(defaultConsentRoot()))),
      '.spk',
      'consents'
    );
  if (
    isContainedPath(realProjectRoot, requestedConsentRoot) ||
    isContainedPath(requestedConsentRoot, realProjectRoot)
  ) {
    throw new Error('consent store must be outside the project');
  }
  // consentRoot is deliberately an in-process dependency-injection seam for
  // tests. Production callers and the CLI never populate it from environment.
  const store = options.consentRoot
    ? prepareInjectedConsentRoot(requestedConsentRoot, create)
    : prepareDefaultConsentRoot(create);
  const key = consentKey(realProjectRoot);
  if (!store.real) {
    return {
      realProjectRoot,
      consentRoot: store.requested,
      key,
      filesystemIdentity,
      file: path.join(store.requested, `${key}.json`),
      storeExists: false,
    };
  }
  if (
    isContainedPath(realProjectRoot, store.real) ||
    isContainedPath(store.real, realProjectRoot)
  ) {
    throw new Error('consent store must be outside the project');
  }
  return {
    realProjectRoot,
    consentRoot: store.real,
    key,
    filesystemIdentity,
    file: path.join(store.real, `${key}.json`),
    storeExists: true,
  };
}

function inspectConsentFile(context) {
  let stat;
  try {
    stat = fs.lstatSync(context.file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('consent record must be a regular non-symlink file');
  }
  assertSafeOwnedEntry(stat, 'consent record', true);
  if (stat.nlink !== 1) throw new Error('consent record must not be hard-linked');
  if (stat.size > MAX_CONSENT_BYTES) {
    throw new Error('consent record exceeds its size limit');
  }
  const realFile = fs.realpathSync(context.file);
  if (!isContainedPath(context.consentRoot, realFile)) {
    throw new Error('consent record escapes the consent store');
  }
  return { stat, realFile };
}

function readConsentRecord(context) {
  const inspected = inspectConsentFile(context);
  if (!inspected) return null;
  let descriptor;
  try {
    descriptor = fs.openSync(
      context.file,
      fs.constants.O_RDONLY |
        (fs.constants.O_NOFOLLOW || 0) |
        (fs.constants.O_NONBLOCK || 0)
    );
    const stat = fs.fstatSync(descriptor);
    if (
      !stat.isFile() ||
      stat.size > MAX_CONSENT_BYTES ||
      stat.dev !== inspected.stat.dev ||
      stat.ino !== inspected.stat.ino
    ) throw new Error('consent record changed during validation');
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = fs.readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const content = buffer.subarray(0, offset);
    for (const byte of content) {
      if ((byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) ||
          byte === 0x7f) {
        throw new Error('consent record is not text');
      }
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* already closed */ }
    }
  }
}

function expectedRecord(context, consentedAt = new Date().toISOString()) {
  return {
    version: CONSENT_VERSION,
    capability: CONSENT_CAPABILITY,
    enabled: true,
    projectRoot: context.realProjectRoot,
    projectKey: context.key,
    projectIdentity: context.filesystemIdentity,
    consentedAt,
    grantedBy: 'spk-session-reflect-consent-cli',
  };
}

function consentStatus(projectRoot, options = {}) {
  let context;
  try {
    context = consentContext(projectRoot, options, false);
    if (!context.storeExists) {
      return { enabled: false, reason: 'missing', ...context };
    }
    const parsed = readConsentRecord(context);
    if (!parsed) return { enabled: false, reason: 'missing', ...context };
    const enabled =
      parsed &&
      parsed.version === CONSENT_VERSION &&
      parsed.capability === CONSENT_CAPABILITY &&
      parsed.enabled === true &&
      parsed.projectRoot === context.realProjectRoot &&
      parsed.projectKey === context.key &&
      parsed.projectIdentity &&
      parsed.projectIdentity.dev === context.filesystemIdentity.dev &&
      parsed.projectIdentity.ino === context.filesystemIdentity.ino &&
      parsed.projectIdentity.birthtimeNs === context.filesystemIdentity.birthtimeNs &&
      typeof parsed.consentedAt === 'string';
    return {
      enabled,
      reason: enabled ? 'enabled' : 'invalid-record',
      ...context,
      record: enabled ? parsed : undefined,
    };
  } catch (error) {
    return {
      enabled: false,
      reason: 'unsafe-store',
      error: error && error.message ? error.message : String(error),
    };
  }
}

function atomicWriteConsent(context, record) {
  if (inspectConsentFile(context)) {
    // Existing records are safe to replace after the inspection above.
  }
  const suffix = crypto.randomBytes(8).toString('hex');
  const temp = path.join(
    context.consentRoot,
    `.${path.basename(context.file)}.${process.pid}.${suffix}.tmp`
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    try { fs.fsyncSync(descriptor); } catch { /* best effort on some filesystems */ }
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temp, context.file);
    if (process.platform !== 'win32') fs.chmodSync(context.file, 0o600);
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* already closed */ }
    }
    try { fs.unlinkSync(temp); } catch { /* renamed or absent */ }
  }
}

function enableConsent(projectRoot, options = {}) {
  const context = consentContext(projectRoot, options, true);
  const record = expectedRecord(context);
  atomicWriteConsent(context, record);
  return { enabled: true, reason: 'enabled', ...context, record };
}

function disableConsent(projectRoot, options = {}) {
  const context = consentContext(projectRoot, options, false);
  if (!context.storeExists || !inspectConsentFile(context)) {
    return { enabled: false, removed: false, reason: 'missing', ...context };
  }
  fs.unlinkSync(context.file);
  return { enabled: false, removed: true, reason: 'disabled', ...context };
}

function hasConsent(projectRoot, options = {}) {
  return consentStatus(projectRoot, options).enabled;
}

function usage() {
  return 'Usage: session-reflect-consent.cjs <enable|status|disable> [project-root]';
}

function runCli(argv = process.argv.slice(2), options = {}) {
  const out = options.stdout || process.stdout;
  const err = options.stderr || process.stderr;
  const cwd = options.cwd || process.cwd();
  const [command, projectArg, ...extra] = argv;
  if (!['enable', 'status', 'disable'].includes(command) || extra.length > 0) {
    err.write(`${usage()}\n`);
    return 2;
  }
  const project = projectArg ? path.resolve(cwd, projectArg) : cwd;
  try {
    if (command === 'enable') {
      const result = enableConsent(project, options);
      out.write(`enabled\t${result.realProjectRoot}\n`);
      return 0;
    }
    if (command === 'disable') {
      const result = disableConsent(project, options);
      out.write(`${result.removed ? 'disabled' : 'already-disabled'}\t${result.realProjectRoot}\n`);
      return 0;
    }
    const result = consentStatus(project, options);
    out.write(`${result.enabled ? 'enabled' : 'disabled'}\t${result.realProjectRoot || project}\n`);
    return result.enabled ? 0 : 1;
  } catch (error) {
    err.write(`session-reflect-consent: ${error.message || error}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  CONSENT_VERSION,
  CONSENT_CAPABILITY,
  MAX_CONSENT_BYTES,
  canonicalProjectRoot,
  projectFilesystemIdentity,
  consentKey,
  defaultConsentRoot,
  consentContext,
  consentStatus,
  enableConsent,
  disableConsent,
  hasConsent,
  runCli,
  usage,
  isContainedPath,
};
