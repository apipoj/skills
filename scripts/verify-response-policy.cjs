#!/usr/bin/env node
'use strict';

// Holds the shared response block identical across every runtime skill and
// English mirror. The block used to be hand-copied and had drifted into three
// variants by 6.2.0; this gate is what keeps one canonical text.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CONTRACT = require(path.join(REPO_ROOT, 'contracts', 'workflows.json'));

function targetsFor(skill) {
  return [
    path.join('plugins', 'spk', 'skills', skill.id, 'SKILL.md'),
    path.join(skill.sources.en, 'SKILL.md'),
  ];
}

function collectResponsePolicyErrors(rootDir = REPO_ROOT, contract = CONTRACT) {
  const policy = contract.responsePolicy;
  const errors = [];

  if (!policy || !policy.heading || !policy.block || !policy.choicePromptAddendum) {
    return ['contracts/workflows.json: responsePolicy must define heading, block, and choicePromptAddendum'];
  }

  const section = `${policy.heading}\n\n${policy.block}`;
  const withAddendum = `${section}\n\n${policy.choicePromptAddendum}`;

  for (const skill of contract.skills) {
    for (const relative of targetsFor(skill)) {
      const file = path.join(rootDir, relative);
      if (!fs.existsSync(file)) {
        errors.push(`MISSING skill file: ${relative}`);
        continue;
      }
      const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

      if (!text.includes(section)) {
        errors.push(`${relative}: missing the canonical "${policy.heading}" block verbatim`);
        continue;
      }
      // the addendum is optional, but when present it must be verbatim and sit
      // directly after the block rather than floating elsewhere in the file
      if (text.includes(policy.choicePromptAddendum) && !text.includes(withAddendum)) {
        errors.push(`${relative}: choicePromptAddendum must directly follow the block`);
      }
      if (text.includes('## Thai-first Experience')) {
        errors.push(`${relative}: still carries the retired "## Thai-first Experience" heading`);
      }
    }
  }

  return errors;
}

function main() {
  const errors = collectResponsePolicyErrors();
  if (errors.length > 0) {
    console.error('Response policy FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const count = CONTRACT.skills.length;
  console.log(`Response policy OK (${count} skills × 2 locales carry the canonical block)`);
}

if (require.main === module) main();

module.exports = { collectResponsePolicyErrors };
