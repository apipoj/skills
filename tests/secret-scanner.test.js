// tests/secret-scanner.test.js
const { scanForSecrets, SECRET_PATTERNS } = require('../plugins/spk/scripts/secret-scanner.cjs');

describe('scanForSecrets', () => {
  test('clean text returns no findings', () => {
    expect(scanForSecrets('hello world')).toEqual([]);
    expect(scanForSecrets('const x = 42;')).toEqual([]);
  });

  test('detects OpenAI-style key', () => {
    const findings = scanForSecrets('api: sk-abc123xyz789verylongsecretkey1234');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('openai_api_key');
  });

  test('detects GitHub PAT', () => {
    const findings = scanForSecrets('token: ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('github_pat');
  });

  test('detects AWS access key', () => {
    const findings = scanForSecrets('key=AKIAIOSFODNN7EXAMPLE');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('aws_access_key');
  });

  test('detects private key block', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----';
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('private_key');
  });

  test('detects generic env secret line', () => {
    const findings = scanForSecrets('DATABASE_PASSWORD=s3cr3t-v4lue-here');
    expect(findings.length).toBeGreaterThan(0);
  });

  test('returns file:line when content has lines', () => {
    const content = 'line1\nline2: sk-abc123xyz789verylongsecretkey1234\nline3';
    const findings = scanForSecrets(content);
    expect(findings[0].line).toBe(2);
  });

  test('finds multiple secrets', () => {
    const content = 'sk-abc123xyz789verylongsecretkey1234\nghp_abcdefghijklmnopqrstuvwxyz0123456789';
    const findings = scanForSecrets(content);
    expect(findings.length).toBe(2);
  });

  test('SECRET_PATTERNS is exposed', () => {
    expect(Array.isArray(SECRET_PATTERNS)).toBe(true);
    expect(SECRET_PATTERNS.length).toBeGreaterThan(5);
  });
});
