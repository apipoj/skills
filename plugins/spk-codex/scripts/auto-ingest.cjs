// hooks/PostToolUse/auto-ingest.cjs
// Drop-to-ingest: when a file lands in ai_context/sources/, notify the user
// (idempotent via log.md hash check).
// Controlled by SPK_AUTO_INGEST env: "drop" (default) | "manual" | "full".

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  extractWriteOperations, normalizedToolName
} = require('./wiki-secret-scan.cjs');
const { pathWithinRoot } = require('./gitignore-guard.cjs');
const { loadConfig, projectRoot } = require('./runtime-core.cjs');

function computeSourceHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function isInSourcesDir(filePath, root) {
  const info = pathWithinRoot(filePath, root);
  if (!info) return false;
  const validRelative = relative =>
    typeof relative === 'string' &&
    relative.startsWith('ai_context/sources/') &&
    !relative.endsWith('/.gitkeep') &&
    !relative.endsWith('/.gitignore');
  return validRelative(info.relative) && validRelative(info.realRelative);
}

function isRegularSourceFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function isAlreadyIngested(filePath, root) {
  const logFile = path.join(root, 'ai_context/wiki/log.md');
  if (!fs.existsSync(logFile)) return false;
  const log = fs.readFileSync(logFile, 'utf-8');
  const hash = computeSourceHash(filePath);
  return log.includes(`hash=${hash}`);
}

function shouldEnqueue(event, env) {
  env = env || process.env;
  const mode = env.SPK_AUTO_INGEST || 'drop';
  const root = projectRoot(env);
  if (
    mode === 'manual' ||
    mode === 'false' ||
    !loadConfig(root, env).config.features.autoIngest
  ) return { enqueue: false };
  if (!['write', 'edit', 'applypatch'].includes(normalizedToolName(event))) {
    return { enqueue: false };
  }
  const sources = extractWriteOperations(event)
    .map(operation => pathWithinRoot(operation.filePath, root))
    .filter(info =>
      info &&
      isInSourcesDir(info.absolute, root) &&
      isRegularSourceFile(info.absolute)
    );
  if (sources.length === 0) return { enqueue: false };

  const source = sources.find(info => !isAlreadyIngested(info.absolute, root));
  if (!source) {
    return { enqueue: false, reason: 'already ingested (hash match in log.md)' };
  }

  return {
    enqueue: true,
    reason: `new source detected: ${source.absolute}`,
    hash: computeSourceHash(source.absolute)
  };
}

function main() {
  let raw = '';
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let event;
    try { event = JSON.parse(raw || '{}'); } catch { process.exit(0); }
    const result = shouldEnqueue(event);
    if (result.enqueue) {
      // additionalContext is the documented non-blocking way to put a message
      // in front of the model; stderr on exit 0 only shows in verbose mode.
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `[SPK auto-ingest] ${result.reason}. Run the SPK ingest skill (/spk:ingest in Claude Code; $spk:ingest in Codex) to process.`
        }
      }) + '\n');
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  shouldEnqueue, computeSourceHash, isInSourcesDir,
  isRegularSourceFile, isAlreadyIngested
};
