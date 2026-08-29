#!/usr/bin/env node
'use strict';

// A user-invoked skill is one the user runs deliberately; nothing else may
// reach it. `disable-model-invocation: true` stops a host from auto-firing it,
// but it cannot stop a sibling skill's prose from telling the agent to go run
// it anyway. This gate reads those bodies and catches that instruction.
//
// The check is a lint on phrasing, not a proof. It fires on an invocation verb
// governing a code-span or slash reference to a user-invoked skill — the shape
// SPK writes real references in. Prose that names a skill without either marker
// is left alone, because `setup`, `triage`, `handoff`, and `pr` are ordinary
// English words long before they are skill ids.
//
// A second, independent check runs the same verb-governed shape against every
// id it finds rather than a fixed list, and flags any that is not in the
// roster at all — a renamed or invented upstream skill id (`/grilling`,
// `/setup-matt-pocock-skills`) that would otherwise silently tell the agent to
// invoke something that does not exist. It requires the leading slash so an
// ordinary object of the verb ("run the tests") never counts as a reference.
//
// Both checks read every shipped `.md` file in a skill's folder, not only
// SKILL.md — the class of bug this gate exists for (an invocation instruction
// or a stale id) lives just as often in an UPSTREAM.md or an auxiliary
// reference file the skill points its own workflow step at.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = require(path.join(REPO_ROOT, 'contracts', 'workflows.json'));

const VERB =
  '(?:run|runs|invoke|invokes|call|calls|launch|launches|trigger|triggers' +
  '|hands?\\s+off\\s+to|handed\\s+off\\s+to|routes?\\s+to|delegates?\\s+to' +
  '|เรียกใช้|เรียก|ให้ใช้)';
// "run the `/x` skill", "hand off to a `/x` session"
const FILLER = '(?:\\s+(?:the|a|an))*\\s+';
// The negation has to sit against the verb — "Never auto-run `pr`" is a rule,
// while "(no good test seam) hand off to `/x`" is an instruction that merely
// contains the word "no" earlier in the sentence.
const NEGATED_BEFORE =
  /(?:\b(?:never|do not|don't|cannot|can't|avoid|without)\b|ห้าม|อย่า)(?:\s*(?:auto|automatically))?[\s-]*$/i;
// The invariant bans the agent from invoking, not the skill from naming the
// step. "Tell the user to run `/setup`" is the correct rewrite of a violation,
// so it has to read as clean or the gate would reject its own fix.
const USER_DIRECTED_BEFORE = /(?:\bthe user\b|ผู้ใช้)\s*(?:to|should|can|must)?[\s,]*$/i;

// A leading slash, optionally in a code span, is what separates a reference
// to *some* skill from the same shape used for a path or a plain object of
// the verb — the unknown-id check below relies on this the same way the
// fixed-id check above does.
const GENERIC_REF = new RegExp(`${VERB}${FILLER}\`?/([a-z][a-z0-9-]+)\\b`, 'gi');

// Reported paths stay POSIX-style on every platform, matching the other gates.
// Every shipped `.md` file in the skill's folder is a target, not only
// SKILL.md — an UPSTREAM.md or an auxiliary reference file carries the same
// authority as the skill body it supports. SKILL.md is always listed even
// when absent, so a missing required file still reports as MISSING; the rest
// are only ever files that actually exist on disk.
function targetsFor(rootDir, skill) {
  const dirs = [path.posix.join('plugins', 'spk', 'skills', skill.id), skill.sources.en];
  const targets = [];
  for (const relativeDir of dirs) {
    targets.push(path.posix.join(relativeDir, 'SKILL.md'));
    const absoluteDir = path.join(rootDir, ...relativeDir.split('/'));
    if (!fs.existsSync(absoluteDir)) continue;
    const auxiliary = fs
      .readdirSync(absoluteDir)
      .filter(name => name.endsWith('.md') && name !== 'SKILL.md')
      .sort();
    for (const name of auxiliary) targets.push(path.posix.join(relativeDir, name));
  }
  return targets;
}

function userInvokedIds(contract) {
  return contract.skills
    .filter(skill => skill.activation && skill.activation.allowImplicitInvocation === false)
    .map(skill => skill.id);
}

function collectInvocationAuthorityErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const manual = userInvokedIds(contract);
  const roster = new Set(contract.skills.map(skill => skill.id));
  // a backtick or a leading slash is what separates a reference to the skill
  // from the same word used as prose
  const patterns = manual.map(id => ({
    id,
    re: new RegExp(`${VERB}${FILLER}\`?/?${id}\\b`, 'i'),
  }));
  const errors = [];

  for (const skill of contract.skills) {
    for (const relative of targetsFor(rootDir, skill)) {
      const file = path.join(rootDir, ...relative.split('/'));
      if (!fs.existsSync(file)) {
        if (relative.endsWith('/SKILL.md')) errors.push(`MISSING skill file: ${relative}`);
        continue;
      }

      const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
      lines.forEach((line, index) => {
        for (const { id, re } of patterns) {
          if (id === skill.id) continue;
          const hit = re.exec(line);
          if (!hit) continue;
          const before = line.slice(0, hit.index);
          if (NEGATED_BEFORE.test(before) || USER_DIRECTED_BEFORE.test(before)) continue;
          errors.push(
            `${relative}:${index + 1}: instructs the agent to invoke \`${id}\`, which is user-invoked`,
          );
          break;
        }

        GENERIC_REF.lastIndex = 0;
        let genericHit = GENERIC_REF.exec(line);
        while (genericHit) {
          const id = genericHit[1];
          if (!roster.has(id)) {
            errors.push(`${relative}:${index + 1}: references unknown skill id \`${id}\``);
          }
          genericHit = GENERIC_REF.exec(line);
        }
      });
    }
  }

  return errors;
}

function main() {
  const errors = collectInvocationAuthorityErrors();
  if (errors.length > 0) {
    console.error('Invocation authority FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    console.error(
      '  Phrase a user-invoked step for the user to act on instead of invoking the skill; ' +
        'fix an unknown id to the current roster id it was renamed to.',
    );
    process.exit(1);
  }
  const count = userInvokedIds(CONTRACT).length;
  const rosterSize = CONTRACT.skills.length;
  console.log(
    `Invocation authority OK (no skill body invokes any of the ${count} user-invoked skills, ` +
      `and no skill body references an id outside the ${rosterSize}-skill roster)`,
  );
}

if (require.main === module) main();

module.exports = { collectInvocationAuthorityErrors, userInvokedIds };
