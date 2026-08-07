const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TEMPLATE = path.join(__dirname, '..', 'plugins', 'spk', 'templates', 'wizard', 'template.sh');

// Windows runners check the repo out with CRLF, which breaks the LF-anchored
// slices below. Normalize at the read, the way the other suites here do.
const read = () => fs.readFileSync(TEMPLATE, 'utf8').replace(/\r\n/g, '\n');

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
    // Syntax-check the normalized content, not the checked-out bytes: a CRLF
    // checkout is a property of the host, and bash rejects CRLF scripts.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wizard-template-'));
    const copy = path.join(dir, 'template.sh');
    try {
      fs.writeFileSync(copy, read());
      expect(() =>
        childProcess.execFileSync('bash', ['-n', copy], { stdio: 'pipe' }),
      ).not.toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('defines every helper the wizard skill tells agents to call', () => {
    const source = read();
    for (const helper of REQUIRED_HELPERS) {
      expect(source).toMatch(new RegExp(`^${helper}\\s*\\(\\)`, 'm'));
    }
  });

  test('keeps the STAGES marker that separates the library from authored stages', () => {
    const source = read();
    const markers = source.split('\n').filter(line => line.includes('=== STAGES ==='));
    expect(markers).toHaveLength(1);
  });

  test('sets strict mode and a stage counter', () => {
    const source = read();
    expect(source).toMatch(/^set -euo pipefail$/m);
    expect(source).toMatch(/^TOTAL_STAGES=/m);
  });

  test('reads secrets without echoing them back', () => {
    const source = read();
    const askSecret = source.slice(source.indexOf('\nask_secret()'));
    const body = askSecret.slice(0, askSecret.indexOf('\n}\n') + 1);
    expect(body).toMatch(/read -rs/);
    expect(body).not.toMatch(/echo\s+"?\$\{?(value|VALUE)/);
  });
});
