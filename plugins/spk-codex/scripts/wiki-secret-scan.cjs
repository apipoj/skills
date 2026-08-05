// hooks/PreToolUse/wiki-secret-scan.cjs
// Layer 2 of SPK's 5-layer wiki security: blocks Write/Edit to ai_context/wiki/**
// when the content contains secret-shaped strings.

const { scanForSecrets } = require('./secret-scanner.cjs');
const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');
const {
  lexicalPathWithinRoot, pathWithinRoot
} = require('./gitignore-guard.cjs');
const { projectRoot } = require('./runtime-core.cjs');

// Wiki pages are text, and hook execution has a strict timeout. Refuse to read
// an unbounded move source into memory before applying secret patterns.
const MAX_MOVE_SOURCE_BYTES = 1024 * 1024;

function isWikiPath(filePath) {
  if (!filePath) return false;
  const norm = path.posix.normalize(String(filePath).replace(/\\/g, '/'));
  const segments = norm.split('/').filter(Boolean);
  return segments.some((segment, index) =>
    segment === 'ai_context' && segments[index + 1] === 'wiki'
  );
}

function normalizedToolName(event) {
  const raw = event && (event.tool_name || event.toolName || event.name);
  return String(raw || '').split('.').pop().replace(/[^A-Za-z]/g, '').toLowerCase();
}

function patchPayload(toolInput) {
  if (typeof toolInput === 'string') return toolInput;
  if (!toolInput || typeof toolInput !== 'object') return '';
  return toolInput.patch || toolInput.command || toolInput.input ||
    toolInput.patch_text || toolInput.patchText || toolInput.content || '';
}

// Codex apply_patch can write several files in one call. Only added/replacement
// lines for each file are scanned; removed lines are not being persisted.
function extractPatchOperations(toolInput) {
  const operations = [];
  let current = null;
  const finish = () => {
    if (!current) return;
    operations.push({
      kind: current.kind,
      filePath: current.paths[current.paths.length - 1],
      sourcePath: current.paths[0],
      content: current.added.join('\n'),
      isMove: current.paths.length > 1,
      moveOnly: current.paths.length > 1 &&
        current.added.length === 0 &&
        current.removed.length === 0
    });
    current = null;
  };

  for (const line of String(patchPayload(toolInput)).split(/\r?\n/)) {
    const header = line.match(/^\*\*\* (Add|Update|Delete) File:\s*(.+?)\s*$/);
    if (header) {
      finish();
      current = {
        kind: header[1],
        paths: [header[2].replace(/^(['"])(.*)\1$/, '$2')],
        added: [],
        removed: []
      };
      continue;
    }
    const move = line.match(/^\*\*\* Move to:\s*(.+?)\s*$/);
    if (move && current) {
      current.paths.push(move[1].replace(/^(['"])(.*)\1$/, '$2'));
      continue;
    }
    if (current && line.startsWith('+') && !line.startsWith('+++')) {
      current.added.push(line.slice(1));
    } else if (current && line.startsWith('-') && !line.startsWith('---')) {
      current.removed.push(line.slice(1));
    }
  }
  finish();
  return operations;
}

function extractWriteOperations(event) {
  const toolInput = event && (event.tool_input || event.toolInput || event.arguments);
  const toolName = normalizedToolName(event);
  if (toolName === 'write') {
    const filePath = toolInput && (toolInput.file_path || toolInput.filePath || toolInput.path);
    return [{ filePath, sourcePath: filePath, content: toolInput && toolInput.content }];
  }
  if (toolName === 'edit') {
    const filePath = toolInput && (toolInput.file_path || toolInput.filePath || toolInput.path);
    return [{
      filePath,
      sourcePath: filePath,
      content: toolInput && (
        toolInput.new_string !== undefined ? toolInput.new_string : toolInput.newString
      )
    }];
  }
  if (toolName === 'applypatch') return extractPatchOperations(toolInput);
  return [];
}

function readValidatedMoveSource(operation, root) {
  const lexical = lexicalPathWithinRoot(operation.sourcePath, root);
  const contained = pathWithinRoot(operation.sourcePath, root);
  if (!lexical || !contained) {
    return { ok: false, reason: 'move source is outside the project root' };
  }
  let stat;
  try {
    stat = fs.lstatSync(contained.absolute);
  } catch {
    return { ok: false, reason: 'move source is unreadable or missing' };
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return { ok: false, reason: 'move source must be a regular non-symlink file' };
  }
  if (stat.size > MAX_MOVE_SOURCE_BYTES) {
    return {
      ok: false,
      reason: `move source exceeds the ${MAX_MOVE_SOURCE_BYTES}-byte scan limit`
    };
  }
  let descriptor;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    const nonBlock = fs.constants.O_NONBLOCK || 0;
    descriptor = fs.openSync(
      contained.absolute,
      fs.constants.O_RDONLY | noFollow | nonBlock
    );
    const openedStat = fs.fstatSync(descriptor);
    if (!openedStat.isFile()) {
      return { ok: false, reason: 'move source must be a regular file' };
    }
    if (openedStat.size > MAX_MOVE_SOURCE_BYTES) {
      return {
        ok: false,
        reason: `move source exceeds the ${MAX_MOVE_SOURCE_BYTES}-byte scan limit`
      };
    }
    const buffer = Buffer.alloc(openedStat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const bytesRead = fs.readSync(
        descriptor,
        buffer,
        offset,
        buffer.length - offset,
        offset
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const contentBytes = buffer.subarray(0, offset);
    const hasBinaryControl = contentBytes.some(byte =>
      byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d
    );
    if (hasBinaryControl) {
      return { ok: false, reason: 'move source is not a text file' };
    }
    const content = new TextDecoder('utf-8', { fatal: true }).decode(contentBytes);
    return { ok: true, content };
  } catch {
    return { ok: false, reason: 'move source is unreadable or missing' };
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* already closed */ }
    }
  }
}

function shouldBlock(event, env) {
  const toolName = normalizedToolName(event);
  const displayName = event && (event.tool_name || event.toolName || event.name) || 'write';
  for (const operation of extractWriteOperations(event)) {
    const rawWikiPath = isWikiPath(operation.filePath);
    const root = projectRoot(env || process.env);
    const lexical = lexicalPathWithinRoot(operation.filePath, root);
    const contained = pathWithinRoot(operation.filePath, root);
    if (rawWikiPath && lexical && !contained) {
      return {
        block: true,
        reason: `wiki-secret-scan: blocked ${displayName} to ${operation.filePath} — wiki path resolves through a symlink outside the project root`
      };
    }
    const resolvedWikiPath = contained && isWikiPath(contained.realRelative);
    if (!rawWikiPath && !resolvedWikiPath) continue;

    let content = operation.content;
    // A move carries every unchanged source line into the destination, not
    // only the additions represented in the patch. Always scan the validated
    // full source as well as added content; a harmless edit must not turn a
    // secret-bearing move into a scanner bypass.
    if (
      operation.isMove ||
      (operation.sourcePath && operation.sourcePath !== operation.filePath)
    ) {
      const source = readValidatedMoveSource(operation, root);
      if (!source.ok) {
        return {
          block: true,
          reason: `wiki-secret-scan: blocked ${displayName} move to ${operation.filePath} — ${source.reason}`
        };
      }
      content = [source.content, typeof content === 'string' ? content : ''].join('\n');
    }
    if (typeof content !== 'string') continue;
    const findings = scanForSecrets(content);
    if (findings.length === 0) continue;

    const summary = findings.map(f => `${f.type} at line ${f.line}`).join('; ');
    return {
      block: true,
      reason: `wiki-secret-scan: blocked ${displayName} to ${operation.filePath} — detected ${findings.length} secret pattern(s): ${summary}`
    };
  }
  return { block: false, tool: toolName };
}

function main() {
  let raw = '';
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let event;
    try {
      event = JSON.parse(raw || '{}');
    } catch {
      process.exit(0);
    }
    const result = shouldBlock(event, process.env);
    if (result.block) {
      // Exit 2 blocks the tool call; Claude Code feeds STDERR (not stdout)
      // back to the model, so the reason must go there to be seen.
      process.stderr.write(result.reason + '\n');
      process.exit(2);
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  shouldBlock, isWikiPath, extractPatchOperations, extractWriteOperations,
  normalizedToolName, readValidatedMoveSource, MAX_MOVE_SOURCE_BYTES
};
