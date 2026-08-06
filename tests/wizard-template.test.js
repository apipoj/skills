const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, '..', 'plugins', 'spk', 'templates', 'wizard', 'template.sh');

const REQUIRED_HELPERS = [
  'stage',
  'say',
  'step',
  'open_url',
  'ask',
  'ask_secret',
  'write_env',
  'set_secret',
  'set_var',
  'pause',
  'confirm',
];

describe('wizard template', () => {
  test('exists and is valid bash', () => {
    expect(fs.existsSync(TEMPLATE)).toBe(true);
    expect(() =>
      childProcess.execFileSync('bash', ['-n', TEMPLATE], { stdio: 'pipe' }),
    ).not.toThrow();
  });

  test('defines every helper the wizard skill tells agents to call', () => {
    const source = fs.readFileSync(TEMPLATE, 'utf8');
    for (const helper of REQUIRED_HELPERS) {
      expect(source).toMatch(new RegExp(`^${helper}\\s*\\(\\)`, 'm'));
    }
  });

  test('keeps the STAGES marker that separates the library from authored stages', () => {
    const source = fs.readFileSync(TEMPLATE, 'utf8');
    const markers = source.split('\n').filter(line => line.includes('=== STAGES ==='));
    expect(markers).toHaveLength(1);
  });

  test('sets strict mode and a stage counter', () => {
    const source = fs.readFileSync(TEMPLATE, 'utf8');
    expect(source).toMatch(/^set -euo pipefail$/m);
    expect(source).toMatch(/^TOTAL_STAGES=/m);
  });

  test('reads secrets without echoing them back', () => {
    const source = fs.readFileSync(TEMPLATE, 'utf8');
    const askSecret = source.slice(source.indexOf('\nask_secret()'));
    const body = askSecret.slice(0, askSecret.indexOf('\n}\n') + 1);
    expect(body).toMatch(/read -rs/);
    expect(body).not.toMatch(/echo\s+"?\$\{?(value|VALUE)/);
  });
});
