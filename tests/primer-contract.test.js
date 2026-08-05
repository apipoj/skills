// tests/primer-contract.test.js
// Pins the primer agent's context-file template to the hierarchy-upgrade
// contract: every generated AGENTS.md must carry a scoped-commands section,
// a code-navigation section (pointing at SPK's own search MCP with a grep
// fallback), and emit a .claudeignore.
const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'plugins', 'spk', 'agents');
const PLUGIN_SKILLS = path.join(__dirname, '..', 'plugins', 'spk', 'skills');
const CONTRACT = require('../contracts/workflows.json');
const PRIME_SOURCE = CONTRACT.skills.find(skill => skill.id === 'prime').sources.th;

function readNativePrime() {
  return fs.readFileSync(path.join(__dirname, '..', PRIME_SOURCE, 'SKILL.md'), 'utf-8');
}

const primer = fs.readFileSync(path.join(AGENTS_DIR, 'primer.md'), 'utf-8');

describe('primer hierarchy-upgrade contract', () => {
  test('primer template includes scoped commands + code navigation sections', () => {
    expect(primer).toMatch(/## Scoped Commands/);
    expect(primer).toMatch(/## Code Navigation/);
  });

  test('primer instructs emitting a .claudeignore', () => {
    expect(primer).toMatch(/\.claudeignore/);
  });

  test('code-navigation block points at spk-codebase-search with grep fallback', () => {
    expect(primer).toMatch(/spk-codebase-search|codebase-search/i);
    expect(primer).toMatch(/fall ?back|when (?:absent|unavailable)|Grep/i);
  });

  test('prime SKILL dispatch prompts mention the new sections', () => {
    const en = fs.readFileSync(path.join(PLUGIN_SKILLS, 'prime', 'SKILL.md'), 'utf-8');
    const th = readNativePrime();
    expect(en).toMatch(/Scoped Commands|Code Navigation|\.claudeignore/);
    expect(th).toMatch(/Scoped Commands|Code Navigation|\.claudeignore/);
  });

  test('primer grounds claims in source and does not trust existing context files', () => {
    // Regression (the real defect): /spk:prime trusted a pre-existing
    // CLAUDE.md/AGENTS.md instead of reading the source, so it carried stale
    // claims forward as if true. The primer must treat existing context files
    // as unverified hints and re-derive every claim from source.
    expect(primer).toMatch(/ground every claim in code you actually read/i);
    expect(primer).toMatch(/unverified hint|may be stale|the source wins/i);
    const th = readNativePrime();
    expect(th).toMatch(/อ้างทุก claim จาก source|ยังไม่ verify|ยึด source/);
  });

  test('primer reports corrections it made to stale existing claims', () => {
    // The override must be visible, not silent: the report names every claim
    // the source contradicted (or says "none").
    expect(primer).toMatch(/Corrections/);
    expect(primer).toMatch(/corrected <topic>|dropped <claim>|none — existing claims matched source/i);
    const th = readNativePrime();
    expect(th).toMatch(/Corrections/);
  });

  test('primer forbids baking volatile facts (version/counts) into AGENTS.md', () => {
    // Related: even when grounded, do not freeze volatile facts (version,
    // skill/agent counts) into prose — point at the manifest instead.
    expect(primer).toMatch(/do not bake volatile facts|hardcode version/i);
    const th = readNativePrime();
    expect(th).toMatch(/hardcode|manifest\.json/i);
  });
});
