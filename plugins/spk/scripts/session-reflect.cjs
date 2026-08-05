// scripts/session-reflect.cjs
// Stop hook — the TRIGGER half of the self-improving session-reflect, modeled on
// coleam00/helpline's propose_claude_md.py.
//
// The expensive part (reflecting on the session with an LLM) is too slow to
// block the end of every turn on, so the work is split:
//   * THIS file (the hook) does the cheap, deterministic part — notice which
//     AGENTS.md-governed areas changed and decide whether a reflection is worth
//     it — then spawn session-reflect-run.cjs in the BACKGROUND and return
//     immediately.
//   * session-reflect-run.cjs (the reflector) makes the headless `claude -p`
//     call and writes ai_context/session-reflect-review.md a little after the
//     turn ends.
//
// Loop-proof by construction: this hook writes NOTHING to stdout — no
// `decision`, no `hookSpecificOutput`/`additionalContext`. A Stop hook only
// re-feeds the model (and thus risks the "blocked the turn from ending N times"
// loop) when it blocks or returns additionalContext. We do neither. The
// reflection happens out-of-band; the live session just ends.
//
// Three guards keep it well-behaved:
//   * Recursion — the reflector spawns a headless `claude` whose own Stop hook
//     lands right back here; SPK_REFLECT_LOCK makes that a no-op.
//   * Dedup — the Stop hook fires every turn, but the diff is usually unchanged
//     turn to turn; a fingerprint of the touched-area diff skips re-reflecting.
//   * Consent — only a user-owned, per-project record under ~/.spk/consents
//     enables outbound reflection. SPK_SESSION_REFLECT can disable it; tracked
//     project configuration may tune or disable it, but neither can grant it.
//
// Runnable standalone for testing: node plugins/spk/scripts/session-reflect.cjs

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const reflector = require('./session-reflect-run.cjs');

const LOCK_ENV = reflector.LOCK_ENV; // 'SPK_REFLECT_LOCK'
const STATE_FILE = reflector.STATE_FILE; // ai_context/.session-reflect-state
const FINGERPRINT_ENV = reflector.FINGERPRINT_ENV;
const BOUND_ROOT_ENV = reflector.BOUND_ROOT_ENV;
const RUNNER = path.join(__dirname, 'session-reflect-run.cjs');

// Hash the SAME scoped diff the reflector will reflect on (tracked + untracked),
// so adding a new file changes the fingerprint and a turn that only added files
// is not wrongly deduped against an "empty diff" state.
function diffFingerprint(root, areas) {
  let raw = '';
  try { raw = reflector.scopedDiff(root, areas); } catch { /* empty -> stable */ }
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function runnerEnvironment(root, env, fingerprint) {
  const additions = {
    [BOUND_ROOT_ENV]: root,
    [FINGERPRINT_ENV]: fingerprint,
  };
  return reflector.allowlistedChildEnvironment(env, additions, {
    projectRoot: root,
  });
}

// Fire-and-forget the reflector, fully detached so it outlives this hook process.
function spawnReflector(root, env, fingerprint) {
  try {
    const childEnv = runnerEnvironment(root, env, fingerprint);
    if (!childEnv) return false;
    const child = spawn(process.execPath, [RUNNER], {
      cwd: os.tmpdir(),
      env: childEnv,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return true;
  } catch (exc) {
    process.stderr.write(`[session-reflect] could not start reflector: ${exc}\n`);
    return false;
  }
}

// Pure decision: should we reflect this turn, and with what fingerprint? No
// spawning, no writes — so the guard logic (kill switch, recursion lock, no-op
// when nothing changed, dedup) is deterministically testable. `act` is true only
// when a reflection should be spawned.
function reflectDecision(env, options = {}) {
  env = env || process.env;
  // Guard 1 — recursion. A reflection spawns a headless `claude` whose own Stop
  // hook runs this file again. If the lock is set, do nothing.
  if (env[LOCK_ENV]) return { act: false, reason: 'lock' };

  const authorization = reflector.reflectionAuthorization(env, options);
  if (!authorization.enabled) {
    return { act: false, reason: authorization.reason };
  }
  const root = authorization.realProjectRoot;
  const areas = reflector.touchedAreas(root);
  if (Object.keys(areas).length === 0) return { act: false, reason: 'no-areas', root, areas };

  // Guard 2 — dedup. Only reflect when the touched-area diff is new since the
  // last reflection this session.
  const fingerprint = diffFingerprint(root, areas);
  const state = reflector.safeAiContextTarget(root, STATE_FILE);
  if (!state) {
    return { act: false, reason: 'unsafe-ai-context', root, areas, fingerprint };
  }
  try {
    if (fs.readFileSync(state, 'utf-8').trim() === fingerprint) {
      return { act: false, reason: 'dedup', root, areas, fingerprint, state };
    }
  } catch { /* no prior state — first reflection for this diff */ }
  return { act: true, reason: 'reflect', root, areas, fingerprint, state };
}

// Decide-and-act. Returns an exit code. Pure of stdout — never prints to stdout.
function propose(env, options = {}) {
  env = env || process.env;
  const d = reflectDecision(env, options);
  if (!d.act) return 0;

  if (!fs.existsSync(RUNNER)) {
    process.stderr.write('[session-reflect] reflector missing — skipped\n');
    return 0;
  }
  const start = options.spawnReflector || spawnReflector;
  if (!start(d.root, env, d.fingerprint)) return 0;

  process.stderr.write(
    `[session-reflect] ${Object.keys(d.areas).length} area(s) changed ` +
    `(${Object.keys(d.areas).sort().join(', ')}) — reflecting in the background ` +
    `→ ${reflector.REVIEW_FILE}\n`
  );
  return 0;
}

function main() {
  let raw = '';
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let code = 0;
    try { code = propose(process.env); } catch { code = 0; }
    process.exit(code);
  });
  // If stdin never ends (no payload piped), still run.
  process.stdin.on('error', () => { try { process.exit(propose(process.env)); } catch { process.exit(0); } });
}

if (require.main === module) main();

module.exports = {
  propose, reflectDecision, diffFingerprint, spawnReflector,
  runnerEnvironment, LOCK_ENV, STATE_FILE, FINGERPRINT_ENV, BOUND_ROOT_ENV
};
