#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function runCheck({ cwd, command, args, proofFile, expectedExit = 0, requiredOutput }) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const observed = `${result.stdout || ''}${result.stderr || ''}${result.error ? result.error.message : ''}`;
  fs.writeFileSync(proofFile, `${JSON.stringify({ command, args, expectedExit, requiredOutput })}\n${observed}`);
  const status = result.error ? 'NOT_RUN'
    : result.status === expectedExit && (!requiredOutput || observed.includes(requiredOutput)) ? 'PASS' : 'FAIL';
  return { command, args, expectedExit, requiredOutput, actualExit: result.status, status, proof: proofFile };
}

function verify({ repoRoot = path.resolve(__dirname, '../../../..'), mode = 'quick' } = {}) {
  if (!['quick', 'full'].includes(mode)) throw new Error('mode must be quick or full');
  const proofRoot = path.join(repoRoot, 'ai_context/work/verification');
  fs.mkdirSync(proofRoot, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(proofRoot, `${new Date().toISOString().slice(0, 10)}-`));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  const contractInput = JSON.parse(fs.readFileSync(path.join(repoRoot, 'contracts/workflows.json'), 'utf8'));
  const artifactFiles = ['manifest.json', 'contracts/workflows.json', 'package.json', 'package-lock.json', 'evals/skilllab-scenarios.json',
    '.agents/skills/verify-spk/scripts/verify.cjs',
    ...contractInput.skills.flatMap(skill => [skill.sources.th, skill.sources.en, `plugins/spk/skills/${skill.id}`, `plugins/spk-codex/skills/${skill.id}`].map(dir => `${dir}/SKILL.md`))];
  const receipt = {
    mode, targetHead: head.status === 0 ? head.stdout.trim() : null,
    fingerprints: Object.fromEntries(artifactFiles.map(file =>
      [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, file))).digest('hex')])),
    checks: [], semanticReview: 'NOT_RUN', skillBehavior: 'NOT_RUN', liveInstall: 'NOT_RUN',
  };
  const quick = ['validate-manifest.cjs', 'generate-platform-artifacts.cjs', 'verify-mirror-parity.cjs', 'verify-router-coverage.cjs'];
  const plan = mode === 'quick'
    ? quick.map(file => ({ command: process.execPath, args: [path.join('scripts', file), ...(file === 'generate-platform-artifacts.cjs' ? ['--check'] : [])] }))
    : [process.platform === 'win32'
      ? { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm run verify:release'] }
      : { command: 'npm', args: ['run', 'verify:release'] }];
  for (const [index, check] of plan.entries()) {
    receipt.checks.push(runCheck({ cwd: repoRoot, ...check, proofFile: path.join(runDir, `gate-${index + 1}.log`) }));
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-control-'));
  try {
    const validator = path.join(repoRoot, 'scripts/generate-platform-artifacts.cjs');
    const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
    const contract = JSON.parse(fs.readFileSync(path.join(repoRoot, 'contracts/workflows.json'), 'utf8'));
    const missing = contract.skills[0].id;
    contract.skills = contract.skills.filter(skill => skill.id !== missing);
    const control = path.join(scratch, 'control.cjs');
    fs.writeFileSync(control, `const {validateContract}=require(${JSON.stringify(validator)});\nconst errors=validateContract(${JSON.stringify(contract)},${JSON.stringify(manifest)});\nconsole.log(errors.join('\\n'));process.exit(errors.length ? 1 : 0);\n`);
    receipt.checks.push(runCheck({ cwd: repoRoot, command: process.execPath, args: [control], expectedExit: 1,
      requiredOutput: `contract is missing manifest commands: ${missing}`, proofFile: path.join(runDir, 'failure-control.log') }));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
    receipt.cleanup = { scratchRemoved: !fs.existsSync(scratch), proofRetained: receipt.checks.every(check => fs.existsSync(check.proof)) };
    receipt.status = receipt.checks.every(check => check.status === 'PASS') && receipt.cleanup.scratchRemoved && receipt.cleanup.proofRetained ? 'PASS' : 'FAIL';
    fs.writeFileSync(path.join(runDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  }
  return { runDir, receipt };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !['--quick', '--full'].includes(args[0]))) {
    process.stderr.write('Usage: node verify.cjs [--quick|--full]\n'); process.exitCode = 2;
  } else {
    try {
      const result = verify({ mode: args[0] === '--full' ? 'full' : 'quick' });
      console.log(`${result.receipt.status}: executable gates and failure control. Proof: ${result.runDir}`);
      console.log('Spec review, skill behavior, and live installation need separate evidence.');
      process.exitCode = result.receipt.status === 'PASS' ? 0 : 1;
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
module.exports = { runCheck, verify };
