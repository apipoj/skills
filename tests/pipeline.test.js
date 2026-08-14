// spk/tests/pipeline.test.js
const fs = require('fs');
const path = require('path');
const { validateManifest } = require('../scripts/validate-manifest.cjs');
const { regenerateContent, listTargetFiles } = require('../scripts/regenerate-docs.cjs');
const { runGate, GATES } = require('../scripts/verify-grep-gates.cjs');

const REPO_ROOT = path.join(__dirname, '..');

describe('pipeline smoke', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifest.json'), 'utf-8'));
  const contract = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'contracts/workflows.json'), 'utf-8'));

  test('manifest.json validates against schema', () => {
    const result = validateManifest(manifest);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('all target docs are in sync with manifest', () => {
    const files = listTargetFiles(REPO_ROOT);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const original = fs.readFileSync(file, 'utf-8');
      const relative = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const regenerated = regenerateContent(original, manifest, contract, relative);
      expect(regenerated).toBe(original);
    }
  });

  test('all grep gates pass against repo', () => {
    for (const gate of GATES) {
      const result = runGate(REPO_ROOT, gate);
      expect(result.hits).toEqual([]);
      expect(result.passed).toBe(true);
    }
  });

  test('README has SPK-COUNTS filled from manifest', () => {
    const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf-8')
      .replace(/\r\n/g, '\n');
    const match = readme.match(/<!-- SPK-COUNTS:start -->\n(.+?)\n<!-- SPK-COUNTS:end -->/s);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/\*\*\d+ subagents\*\*/);
    expect(match[1]).toMatch(/\*\*40 skills\*\*/);
  });

  test('ships linked Thai and English user guides with strategy-lens onboarding', () => {
    const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf-8');
    const readmeEn = fs.readFileSync(path.join(REPO_ROOT, 'README-EN.md'), 'utf-8');
    const guide = fs.readFileSync(path.join(REPO_ROOT, 'USER_GUIDE.md'), 'utf-8');
    const guideEn = fs.readFileSync(path.join(REPO_ROOT, 'USER_GUIDE-EN.md'), 'utf-8');

    expect(readme).toContain('[คู่มือผู้ใช้](USER_GUIDE.md)');
    expect(readmeEn).toContain('[English user guide](USER_GUIDE-EN.md)');
    for (const text of [guide, guideEn]) {
      expect(text).toContain('/spk:start');
      expect(text).toContain('/spk:bala');
      expect(text).toContain('/spk:sunzi');
      expect(text).toMatch(/read.only/i);
      expect(text).toMatch(/typed.only/i);
    }
  });

  test('every agent in manifest has unique name', () => {
    const names = [
      ...manifest.agents.orchestrators.map(a => a.name),
      ...manifest.agents.specialists.map(a => a.name)
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  test('every command references a valid orchestrator or agent', () => {
    const orchestratorNames = new Set(manifest.agents.orchestrators.map(a => a.name));
    const specialistNames = new Set(manifest.agents.specialists.map(a => a.name));
    for (const cmd of manifest.commands) {
      if (cmd.orchestrator) {
        expect(orchestratorNames.has(cmd.orchestrator)).toBe(true);
      } else if (cmd.agent) {
        expect(specialistNames.has(cmd.agent)).toBe(true);
      } else {
        expect(cmd.direct).toBe(true);
      }
    }
  });
});
