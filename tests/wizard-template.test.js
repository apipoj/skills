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

  function runLibrary(body, input = '') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wizard-behavior-'));
    try {
      const library = read().split('\nrun_wizard() {')[0];
      return childProcess.spawnSync('bash', ['-c', `${library}\n${body}`, 'wizard-test', dir], {
        encoding: 'utf8', input, cwd: dir,
        env: { ...process.env, ENV_FILE: path.join(dir, '.env') },
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  test('round-trips literal dotenv values and Enter keeps the saved value', () => {
    const result = runLibrary(`
literal="O'Reilly "'$HOME $(touch should-not-exist) # hash'
write_env TEST_VALUE "$literal"
unset TEST_VALUE
ask TEST_VALUE "Keep saved value"
[[ "$TEST_VALUE" == "$literal" ]]
ask_secret TEST_VALUE "Keep saved secret"
[[ "$TEST_VALUE" == "$literal" ]]
. "$ENV_FILE"
[[ "$TEST_VALUE" == "$literal" ]]
[[ ! -e should-not-exist ]]
printf 'literal-roundtrip-ok\\n'
`, '\n\n');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('literal-roundtrip-ok');
    expect(result.stdout).not.toContain("O'Reilly");
  });

  test.each(['ask', 'ask_secret'])('%s stops on empty EOF instead of silently accepting a default', helper => {
    const result = runLibrary(`write_env TEST_VALUE saved\n${helper} TEST_VALUE "Value"\nprintf 'unexpected-continue'`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('unexpected-continue');
  });

  (process.platform === 'win32' ? test.skip : test)('creates private dotenv files and preserves existing modes and symlinks', () => {
    const result = runLibrary(`
write_env TEST_VALUE first
python3 -c 'import os, sys; assert os.stat(sys.argv[1]).st_mode & 0o777 == 0o600' "$ENV_FILE"
chmod 640 "$ENV_FILE"
mv "$ENV_FILE" "$1/target.env"
ln -s "$1/target.env" "$ENV_FILE"
write_env TEST_VALUE second
[[ -L "$ENV_FILE" ]]
python3 -c 'import os, sys; assert os.stat(sys.argv[1]).st_mode & 0o777 == 0o640' "$ENV_FILE"
[[ "$(_existing TEST_VALUE)" == second ]]
[[ "$TEST_VALUE" == second ]]
printf 'permissions-and-symlink-ok\\n'
`);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('permissions-and-symlink-ok');
  });

  test('a malformed later stage fails parsing before any stage executes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spk-wizard-parse-'));
    try {
      const script = read().split('\nrun_wizard() {')[0] + `
run_wizard() {
  printf 'should-not-run' > "$1/started"
  if ; then :; fi
}
run_wizard "$@"; exit
`;
      const result = childProcess.spawnSync('bash', ['-c', script, 'wizard-test', dir], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(fs.existsSync(path.join(dir, 'started'))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
