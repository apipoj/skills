const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const contract = require('../contracts/workflows.json');
const {
  PINNED_UPSTREAM_COMMIT,
  collectUpstreamProvenanceErrors,
} = require('../scripts/check-upstream-drift.cjs');

describe('reviewed upstream provenance', () => {
  test('pins the approved Matt Pocock commit', () => {
    expect(PINNED_UPSTREAM_COMMIT).toBe('6acc160e4e0cd062dbbbd7a1b26ae92855edf07e');
    expect(collectUpstreamProvenanceErrors(ROOT)).toEqual([]);
  });

  test('every upstream-derived canonical skill has a readable English mirror', () => {
    for (const skill of contract.skills.filter(skill => skill.tier === 'core' && skill.origin.repository === 'mattpocock/skills')) {
      expect(fs.existsSync(path.join(ROOT, skill.sources.en, 'SKILL.md'))).toBe(true);
    }
  });

  test('rejects a malformed or incomplete lock', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'apipoj-upstream-lock-'));
    fs.mkdirSync(path.join(fixture, 'docs', 'upstream'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'contracts'), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, 'docs', 'upstream', 'upstream-lock.json'),
      JSON.stringify({ repository: 'wrong', commit: 'main' }),
    );
    fs.writeFileSync(path.join(fixture, 'contracts', 'workflows.json'), JSON.stringify({ skills: [] }));
    expect(collectUpstreamProvenanceErrors(fixture).join('\n')).toMatch(/repository|commit|promoted/i);
  });
});
