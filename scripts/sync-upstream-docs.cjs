#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const BANNER_NOTICE =
  '> **Upstream reference:** หน้านี้เก็บเนื้อหาจาก `mattpocock/skills` ที่ pin ไว้เพื่อการเทียบ provenance ' +
  'คำสั่งติดตั้งด้านล่างไม่ใช่คำสั่งติดตั้ง Apipoj Skills; ใช้ `README.md` หรือ `INSTALL_FOR_AGENTS.md` ที่ root';

const NO_COUNTERPART = '> **Canonical SPK skill:** ไม่มี — SPK ไม่ได้ ship สกิลนี้';

// Upstream page -> the SPK skill it documents. `null` means SPK ships no
// counterpart. A page missing from this map is a review gate, not a default:
// the next re-pin must decide where it belongs before it can ship.
const CANONICAL_BY_DOC = {
  'docs/engineering/ask-matt.md': 'start',
  'docs/engineering/code-review.md': 'code-review',
  'docs/engineering/codebase-design.md': 'codebase-design',
  'docs/engineering/diagnosing-bugs.md': 'debug',
  'docs/engineering/domain-modeling.md': 'domain-modeling',
  'docs/engineering/grill-with-docs.md': 'ask-with-docs',
  'docs/engineering/implement.md': 'code',
  'docs/engineering/improve-codebase-architecture.md': 'improve-codebase',
  'docs/engineering/prototype.md': 'prototype',
  'docs/engineering/research.md': 'research',
  'docs/engineering/resolving-merge-conflicts.md': 'fix-conflicts',
  'docs/engineering/setup-matt-pocock-skills.md': 'setup',
  'docs/engineering/tdd.md': 'tdd',
  'docs/engineering/to-spec.md': 'to-spec',
  'docs/engineering/to-tickets.md': 'to-tickets',
  'docs/engineering/triage.md': 'triage',
  'docs/engineering/wayfinder.md': 'wayfinder',
  'docs/engineering/wizard.md': 'wizard',
  'docs/productivity/grill-me.md': 'ask-me',
  'docs/productivity/grilling.md': 'asking',
  'docs/productivity/handoff.md': 'handoff',
  'docs/productivity/teach.md': 'teach',
  'docs/productivity/to-questionnaire.md': 'to-questionnaire',
  'docs/productivity/wait-what.md': 'wait-what',
  'docs/productivity/writing-for-agents.md': 'write-skills',
};

function renderCanonicalLine(skill) {
  return skill === null ? NO_COUNTERPART : `> **Canonical SPK skill:** \`/spk:${skill}\``;
}

function canonicalLine(docPath) {
  if (!(docPath in CANONICAL_BY_DOC)) {
    throw new Error(
      `${docPath}: no entry in CANONICAL_BY_DOC — review where this upstream page belongs before shipping it`,
    );
  }
  return renderCanonicalLine(CANONICAL_BY_DOC[docPath]);
}

function renderPage(docPath, upstreamBody) {
  return `${BANNER_NOTICE}\n${canonicalLine(docPath)}\n\n${upstreamBody}`;
}

function bodyOf(pageText) {
  const lines = pageText.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].startsWith('>')) index += 1;
  // renderPage inserts exactly one blank line between the banner and the
  // body. Consume exactly that one line — not every blank line — so a body
  // that itself starts with a blank line round-trips intact.
  if (index < lines.length && lines[index].trim() === '') index += 1;
  return lines.slice(index).join('\n');
}

// Line endings are a property of the checkout, not of upstream's content.
// Windows sets core.autocrlf=true by default, so every mirrored page arrives
// with CRLF there. Hashing or string-comparing those bytes directly would fail
// all 25 pages on Windows while passing on macOS and Linux. Normalise at every
// boundary where we read a page back, so the gate measures content only.
function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildHashIndex(pages, pin, skillMirrors = {}) {
  const entries = Object.keys(pages)
    .sort()
    .map(docPath => [docPath, sha256(pages[docPath])]);
  const index = { pin, algorithm: 'sha256', pages: Object.fromEntries(entries) };
  const mirrorEntries = Object.keys(skillMirrors)
    .sort()
    .map(mirrorPath => [mirrorPath, sha256(skillMirrors[mirrorPath])]);
  if (mirrorEntries.length > 0) index.skillMirrors = Object.fromEntries(mirrorEntries);
  return index;
}

function readUpstreamPage(upstreamDir, pin, docPath) {
  return normalizeEol(
    childProcess.execFileSync('git', ['show', `${pin}:${docPath}`], {
      cwd: upstreamDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

function listUpstreamPages(upstreamDir, pin) {
  const output = childProcess.execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', pin, '--', 'docs/engineering', 'docs/productivity'],
    { cwd: upstreamDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return output.trim().split('\n').filter(file => file.endsWith('.md'));
}

function listUpstreamSkillFiles(upstreamDir, pin) {
  const output = childProcess.execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', pin, '--', 'skills/engineering', 'skills/productivity'],
    { cwd: upstreamDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return output.trim().split('\n').filter(Boolean);
}

function indexUpstreamSkillFiles(files) {
  const index = new Map();
  for (const file of [...files].sort()) {
    const match = file.match(/^skills\/(?:engineering|productivity)\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, skillName, relative] = match;
    const entry = index.get(skillName) || { skillPath: null, auxiliaryPaths: [] };
    if (relative === 'SKILL.md') entry.skillPath = file;
    else entry.auxiliaryPaths.push(file);
    index.set(skillName, entry);
  }
  return index;
}

function buildUpstreamSkillArtifactMap(upstreamDir, pin, contract, repoRoot = REPO_ROOT) {
  const upstreamIndex = indexUpstreamSkillFiles(listUpstreamSkillFiles(upstreamDir, pin));
  const artifacts = new Map();
  const promoted = contract.skills.filter(skill =>
    skill.tier === 'core' && skill.origin?.repository === 'mattpocock/skills',
  );

  for (const skill of promoted) {
    const upstream = upstreamIndex.get(skill.origin.skill);
    if (!upstream?.skillPath) {
      throw new Error(
        `${skill.id}: pinned upstream skill ${skill.origin.skill} has no SKILL.md`,
      );
    }
    const skillBody = readUpstreamPage(upstreamDir, pin, upstream.skillPath);
    const upstreamRoot = path.posix.dirname(upstream.skillPath);

    for (const locale of ['th', 'en']) {
      const localRoot = skill.sources[locale];
      artifacts.set(path.posix.join(localRoot, 'UPSTREAM.md'), skillBody);

      for (const upstreamAuxiliary of upstream.auxiliaryPaths) {
        const relative = path.posix.relative(upstreamRoot, upstreamAuxiliary);
        if (relative.startsWith('agents/')) continue;
        const localTarget = path.posix.join(localRoot, relative);
        if (fs.existsSync(path.join(repoRoot, localTarget))) continue;
        artifacts.set(
          localTarget,
          readUpstreamPage(upstreamDir, pin, upstreamAuxiliary),
        );
      }
    }
  }

  return artifacts;
}

function main() {
  const args = process.argv.slice(2);
  const fromIndex = args.indexOf('--from');
  const pinIndex = args.indexOf('--pin');
  if (fromIndex < 0 || !args[fromIndex + 1] || (pinIndex >= 0 && !args[pinIndex + 1])) {
    console.error('usage: sync-upstream-docs.cjs --from <upstream-checkout> [--pin <commit>]');
    process.exit(1);
  }
  const upstreamDir = path.resolve(args[fromIndex + 1]);
  const lock = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'docs', 'upstream', 'upstream-lock.json'), 'utf8'),
  );
  const contract = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'contracts', 'workflows.json'), 'utf8'),
  );
  const pin = pinIndex >= 0 ? args[pinIndex + 1] : lock.commit;

  const docPaths = listUpstreamPages(upstreamDir, pin);
  if (docPaths.length === 0) {
    throw new Error(
      `no reference pages found under docs/engineering or docs/productivity at ${pin} in ${upstreamDir} — refusing to delete the existing reference docs`,
    );
  }

  const unmapped = docPaths.filter(docPath => !(docPath in CANONICAL_BY_DOC));
  if (unmapped.length > 0) {
    throw new Error(
      `${unmapped.join(', ')}: no entry in CANONICAL_BY_DOC — review where these upstream pages belong before shipping them`,
    );
  }

  const bodies = {};
  for (const docPath of docPaths) {
    const body = readUpstreamPage(upstreamDir, pin, docPath);
    fs.mkdirSync(path.join(REPO_ROOT, path.dirname(docPath)), { recursive: true });
    fs.writeFileSync(path.join(REPO_ROOT, docPath), renderPage(docPath, body));
    bodies[docPath] = body;
  }

  const skillArtifacts = buildUpstreamSkillArtifactMap(
    upstreamDir,
    pin,
    contract,
  );
  for (const [relative, content] of skillArtifacts) {
    const target = path.join(REPO_ROOT, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  for (const bucket of ['docs/engineering', 'docs/productivity']) {
    const dir = path.join(REPO_ROOT, bucket);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.md'))) {
      const relative = `${bucket}/${file}`;
      if (!docPaths.includes(relative)) {
        fs.unlinkSync(path.join(REPO_ROOT, relative));
        console.log(`removed (absent upstream): ${relative}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(REPO_ROOT, 'docs', 'upstream', 'reference-hashes.json'),
    `${JSON.stringify(buildHashIndex(
      bodies,
      pin,
      Object.fromEntries(
        [...skillArtifacts].filter(([relative]) => relative.endsWith('/UPSTREAM.md')),
      ),
    ), null, 2)}\n`,
  );
  const mirrorCount = [...skillArtifacts.keys()]
    .filter(relative => relative.endsWith('/UPSTREAM.md')).length;
  console.log(
    `Synced ${docPaths.length} upstream reference pages and ${mirrorCount} skill mirrors at ${pin.slice(0, 7)}`,
  );
}

if (require.main === module) main();

module.exports = {
  BANNER_NOTICE,
  CANONICAL_BY_DOC,
  NO_COUNTERPART,
  bodyOf,
  buildUpstreamSkillArtifactMap,
  buildHashIndex,
  canonicalLine,
  listUpstreamPages,
  listUpstreamSkillFiles,
  indexUpstreamSkillFiles,
  normalizeEol,
  readUpstreamPage,
  renderCanonicalLine,
  renderPage,
  sha256,
};
