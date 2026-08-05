// scripts/install/uninstall.cjs
// Preview and remove legacy SPK project artifacts without following symlinks.

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SPK_HOOKS = [
  '.claude/hooks/PreToolUse/wiki-secret-scan.cjs',
  '.claude/hooks/PreToolUse/gitignore-guard.cjs',
  '.claude/hooks/PostToolUse/auto-ingest.cjs'
];

const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const COMMAND_PATTERN = /^\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_SHARED_FILE_BYTES = 4 * 1024 * 1024;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function stripSpkMarkers(content) {
  return content.replace(/\n?<!-- SPK:start -->[\s\S]*?<!-- SPK:end -->\n?/g, '\n');
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative));
}

function assertSafePath(root, relativePath, label) {
  if (typeof relativePath !== 'string' || relativePath.length === 0 ||
      path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a non-empty relative path`);
  }

  const candidate = path.resolve(root, relativePath);
  if (!isContained(root, candidate)) {
    throw new Error(`${label} escapes the project root`);
  }

  const relative = path.relative(root, candidate);
  let current = root;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') return { exists: false, path: candidate };
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`${label} contains a symbolic link: ${current}`);
    }
    const realCurrent = fs.realpathSync(current);
    if (!isContained(root, realCurrent)) {
      throw new Error(`${label} resolves outside the project root`);
    }
  }

  return { exists: true, path: candidate, stat: fs.lstatSync(candidate) };
}

function readSafeRegularFile(root, relativePath, label, maxBytes) {
  const resolved = assertSafePath(root, relativePath, label);
  if (!resolved.exists) return null;
  if (!resolved.stat.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  if (resolved.stat.size > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte safety limit`);
  }

  const noFollow = fs.constants.O_NOFOLLOW || 0;
  const fd = fs.openSync(resolved.path, fs.constants.O_RDONLY | noFollow);
  try {
    const openedStat = fs.fstatSync(fd);
    if (!openedStat.isFile() ||
        openedStat.dev !== resolved.stat.dev ||
        openedStat.ino !== resolved.stat.ino) {
      throw new Error(`${label} changed while it was being inspected`);
    }
    return {
      path: resolved.path,
      content: fs.readFileSync(fd),
      mode: openedStat.mode,
      device: openedStat.dev,
      inode: openedStat.ino
    };
  } finally {
    fs.closeSync(fd);
  }
}

function readLegacyManifest(root) {
  const file = readSafeRegularFile(
    root,
    '.spk/manifest.json',
    'Legacy SPK manifest',
    MAX_MANIFEST_BYTES
  );
  if (!file) return null;

  let manifest;
  try {
    manifest = JSON.parse(file.content.toString('utf8'));
  } catch {
    throw new Error('Legacy SPK manifest is not valid JSON');
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Legacy SPK manifest must be an object');
  }
  return { ...file, manifest };
}

function validatedManifestNames(manifest) {
  const agents = manifest.agents;
  if (agents !== undefined &&
      (!agents || typeof agents !== 'object' || Array.isArray(agents))) {
    throw new Error('Legacy SPK manifest agents must be an object');
  }

  const agentNames = [];
  for (const group of ['orchestrators', 'specialists']) {
    const entries = agents?.[group] || [];
    if (!Array.isArray(entries)) {
      throw new Error(`Legacy SPK manifest agents.${group} must be an array`);
    }
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || !SLUG_PATTERN.test(entry.name || '')) {
        throw new Error(`Legacy SPK manifest contains an unsafe ${group} name`);
      }
      agentNames.push(entry.name);
    }
  }

  const commands = manifest.commands || [];
  if (!Array.isArray(commands)) {
    throw new Error('Legacy SPK manifest commands must be an array');
  }
  const commandNames = commands.map(entry => {
    if (!entry || typeof entry !== 'object' || !COMMAND_PATTERN.test(entry.name || '')) {
      throw new Error('Legacy SPK manifest contains an unsafe command name');
    }
    return entry.name.slice(1);
  });

  return {
    agentNames: [...new Set(agentNames)].sort(),
    commandNames: [...new Set(commandNames)].sort()
  };
}

function markerEdits(content) {
  const edits = [];
  const pattern = /\n?<!-- SPK:start -->[\s\S]*?<!-- SPK:end -->\n?/g;
  for (const match of content.matchAll(pattern)) {
    edits.push({
      start: match.index,
      end: match.index + match[0].length,
      expected_sha256: sha256(match[0]),
      replacement_sha256: sha256('\n')
    });
  }
  return edits;
}

function buildUninstallPlan(projectRoot) {
  if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
    throw new Error('projectRoot must be a non-empty path');
  }

  const root = fs.realpathSync(path.resolve(projectRoot));
  const rootStat = fs.statSync(root);
  if (!rootStat.isDirectory()) throw new Error('projectRoot must be a directory');

  const legacy = readLegacyManifest(root);
  if (!legacy) {
    return {
      schema: 'spk.approval/v1',
      status: 'NOT_INSTALLED',
      operation: 'uninstall',
      project_root: root,
      removed: 0,
      reason: 'No .spk/manifest.json — nothing to uninstall'
    };
  }

  const { agentNames, commandNames } = validatedManifestNames(legacy.manifest);
  const relativeTargets = [
    ...agentNames.map(name => `.claude/agents/${name}.md`),
    ...commandNames.map(name => `.claude/commands/${name}.md`),
    ...SPK_HOOKS,
    '.spk/manifest.json'
  ];

  const targets = [];
  for (const relativePath of [...new Set(relativeTargets)].sort()) {
    const file = readSafeRegularFile(
      root,
      relativePath,
      `Uninstall target ${relativePath}`,
      relativePath === '.spk/manifest.json' ? MAX_MANIFEST_BYTES : MAX_SHARED_FILE_BYTES
    );
    if (!file) continue;
    targets.push({
      path: file.path,
      relative_path: relativePath,
      expected_sha256: sha256(file.content)
    });
  }

  const textEdits = [];
  const claudeMd = readSafeRegularFile(
    root,
    'CLAUDE.md',
    'Shared CLAUDE.md',
    MAX_SHARED_FILE_BYTES
  );
  if (claudeMd) {
    const content = claudeMd.content.toString('utf8');
    const edits = markerEdits(content);
    if (edits.length > 0) {
      textEdits.push({
        path: claudeMd.path,
        relative_path: 'CLAUDE.md',
        expected_sha256: sha256(claudeMd.content),
        result_sha256: sha256(stripSpkMarkers(content)),
        ranges: edits
      });
    }
  }

  const emptyDirectories = [];
  const spkDirectory = assertSafePath(root, '.spk', 'Legacy SPK directory');
  if (!spkDirectory.exists || !spkDirectory.stat.isDirectory()) {
    throw new Error('Legacy SPK directory must be a real directory');
  }
  const manifestBasename = path.basename(legacy.path);
  const otherEntries = fs.readdirSync(spkDirectory.path)
    .filter(name => name !== manifestBasename)
    .sort();
  if (otherEntries.length === 0) {
    emptyDirectories.push({
      path: spkDirectory.path,
      relative_path: '.spk',
      after_removing: ['.spk/manifest.json']
    });
  }

  const preserve = [
    path.join(root, 'ai_context/wiki'),
    path.join(root, 'ai_context/sources')
  ];
  const intent = {
    operation: 'uninstall',
    project_root: root,
    targets,
    text_edits: textEdits,
    empty_directories: emptyDirectories,
    preserve
  };
  const intentDigest = sha256(canonicalJson(intent));

  return {
    schema: 'spk.approval/v1',
    status: 'NEEDS_USER_INPUT',
    operation: 'uninstall',
    project_root: root,
    intent_digest: intentDigest,
    approval_token: `spk-approve:${intentDigest}`,
    paths: targets.map(target => target.path),
    targets,
    text_edits: textEdits.map(edit => ({
      path: edit.path,
      ranges: edit.ranges.map(range => `${range.start}:${range.end}`)
    })),
    empty_directories: emptyDirectories.map(directory => directory.path),
    preserve,
    resume_instruction: `Run again with the exact token: spk-approve:${intentDigest}`,
    _intent: intent
  };
}

function verifyCurrentFile(root, target) {
  const current = readSafeRegularFile(
    root,
    target.relative_path,
    `Approved uninstall target ${target.relative_path}`,
    target.relative_path === '.spk/manifest.json' ? MAX_MANIFEST_BYTES : MAX_SHARED_FILE_BYTES
  );
  if (!current || sha256(current.content) !== target.expected_sha256) {
    throw new Error(`Approved uninstall target changed: ${target.relative_path}`);
  }
  return current;
}

function sameFileIdentity(left, right) {
  return left.device === right.device && left.inode === right.inode;
}

function atomicWrite(file, content, revalidate) {
  const directory = path.dirname(file.path);
  const temporary = path.join(
    directory,
    `.spk-uninstall-${process.pid}-${crypto.randomBytes(12).toString('hex')}.tmp`
  );
  const fd = fs.openSync(temporary, 'wx', file.mode & 0o777);
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    revalidate();
    fs.renameSync(temporary, file.path);
  } catch (error) {
    try {
      fs.unlinkSync(temporary);
    } catch {
      // Best effort cleanup of a private temporary file.
    }
    throw error;
  }
}

function uninstall(projectRoot, options = {}) {
  const plan = buildUninstallPlan(projectRoot);
  if (plan.status === 'NOT_INSTALLED') return plan;

  const approvalToken = options && typeof options === 'object'
    ? options.approvalToken
    : undefined;
  if (approvalToken !== plan.approval_token) return plan;

  const root = plan.project_root;

  // Preflight every approved target before making the first change.
  const verifiedTargets = plan.targets.map(target => ({
    target,
    file: verifyCurrentFile(root, target)
  }));
  const verifiedEdits = plan._intent.text_edits.map(edit => {
    const file = readSafeRegularFile(
      root,
      edit.relative_path,
      `Approved shared file ${edit.relative_path}`,
      MAX_SHARED_FILE_BYTES
    );
    if (!file || sha256(file.content) !== edit.expected_sha256) {
      throw new Error(`Approved shared file changed: ${edit.relative_path}`);
    }
    return { edit, file };
  });

  const edited = [];
  for (const { edit, file } of verifiedEdits) {
    const result = stripSpkMarkers(file.content.toString('utf8'));
    if (sha256(result) !== edit.result_sha256) {
      throw new Error(`Approved text edit no longer matches: ${edit.relative_path}`);
    }
    atomicWrite(file, result, () => {
      const current = readSafeRegularFile(
        root,
        edit.relative_path,
        `Approved shared file ${edit.relative_path}`,
        MAX_SHARED_FILE_BYTES
      );
      if (!current ||
          !sameFileIdentity(current, file) ||
          sha256(current.content) !== edit.expected_sha256) {
        throw new Error(`Approved shared file changed before replacement: ${edit.relative_path}`);
      }
    });
    edited.push(edit.path);
  }

  const removed = [];
  for (const { target, file } of verifiedTargets) {
    // Re-open and hash the exact regular file immediately before unlinking.
    // unlinkSync removes a symlink itself if one appears; it never recursively
    // follows its target.
    const current = verifyCurrentFile(root, target);
    if (!sameFileIdentity(current, file)) {
      throw new Error(`Approved uninstall target identity changed: ${target.relative_path}`);
    }
    fs.unlinkSync(target.path);
    removed.push(target.path);
  }

  const removedDirectories = [];
  for (const directory of plan._intent.empty_directories) {
    const current = assertSafePath(
      root,
      directory.relative_path,
      `Approved empty directory ${directory.relative_path}`
    );
    if (current.exists && current.stat.isDirectory() &&
        fs.readdirSync(current.path).length === 0) {
      fs.rmdirSync(current.path);
      removedDirectories.push(current.path);
    }
  }

  return {
    schema: 'spk.evidence/v1',
    status: 'APPLIED',
    operation: 'uninstall',
    approval_digest: plan.intent_digest,
    removed,
    removed_directories: removedDirectories,
    edited,
    preserved: plan.preserve,
    recovery: 'Files were unlinked directly; recover them from version control or backup.'
  };
}

function main() {
  const root = process.argv[2] || process.cwd();
  const approvalToken = process.argv[3];
  try {
    const result = uninstall(root, { approvalToken });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Uninstall blocked: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  buildUninstallPlan,
  canonicalJson,
  markerEdits,
  stripSpkMarkers,
  uninstall
};
