const fs = require('fs');
const os = require('os');
const path = require('path');

const consent = require('../plugins/spk/scripts/session-reflect-consent.cjs');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sink() {
  let value = '';
  return {
    write(chunk) { value += String(chunk); },
    text() { return value; },
  };
}

describe('session-reflect-consent.cjs', () => {
  const cleanup = [];
  afterEach(() => {
    while (cleanup.length) {
      fs.rmSync(cleanup.pop(), { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  function fixture() {
    const project = tempDir('spk-consent-project-');
    const consentRoot = tempDir('spk-consent-store-');
    cleanup.push(project, consentRoot);
    return { project, consentRoot };
  }

  test('default store derives from os.userInfo homedir, never HOME', () => {
    const original = process.env.HOME;
    process.env.HOME = path.join(os.tmpdir(), 'project-controlled-home');
    jest.spyOn(os, 'userInfo').mockReturnValue({
      uid: 1000,
      gid: 1000,
      username: 'test-user',
      homedir: path.join(path.sep, 'trusted', 'home'),
      shell: '/bin/sh',
    });
    try {
      expect(consent.defaultConsentRoot()).toBe(
        path.join(path.sep, 'trusted', 'home', '.spk', 'consents')
      );
    } finally {
      if (original === undefined) delete process.env.HOME;
      else process.env.HOME = original;
    }
  });

  test('enable, status, and disable are bound to the canonical project root', () => {
    const { project, consentRoot } = fixture();
    const enabled = consent.enableConsent(project, { consentRoot });
    expect(enabled.enabled).toBe(true);
    expect(enabled.record.projectRoot).toBe(fs.realpathSync(project));
    expect(path.dirname(enabled.file)).toBe(fs.realpathSync(consentRoot));
    if (process.platform !== 'win32') {
      expect(fs.statSync(enabled.file).mode & 0o777).toBe(0o600);
      expect(fs.statSync(consentRoot).mode & 0o777).toBe(0o700);
    }
    expect(consent.hasConsent(project, { consentRoot })).toBe(true);

    const disabled = consent.disableConsent(project, { consentRoot });
    expect(disabled.removed).toBe(true);
    expect(consent.hasConsent(project, { consentRoot })).toBe(false);
  });

  test('a consent record for one project cannot enable another', () => {
    const first = fixture();
    const second = tempDir('spk-consent-other-project-');
    cleanup.push(second);
    consent.enableConsent(first.project, { consentRoot: first.consentRoot });
    expect(consent.hasConsent(second, { consentRoot: first.consentRoot })).toBe(false);
  });

  test('status is read-only and a store inside the project is rejected', () => {
    const project = tempDir('spk-consent-project-');
    const holder = tempDir('spk-consent-holder-');
    cleanup.push(project, holder);
    const missing = path.join(holder, 'missing-consents');
    expect(consent.consentStatus(project, { consentRoot: missing }))
      .toMatchObject({ enabled: false, reason: 'missing' });
    expect(fs.existsSync(missing)).toBe(false);
    expect(() => consent.enableConsent(project, {
      consentRoot: path.join(project, '.spk', 'consents'),
    })).toThrow(/outside the project/);
  });

  (process.platform === 'win32' ? test.skip : test)(
    'project symlink aliases map to the same realpath-bound record',
    () => {
      const { project, consentRoot } = fixture();
      const aliasParent = tempDir('spk-consent-alias-');
      cleanup.push(aliasParent);
      const alias = path.join(aliasParent, 'project-link');
      fs.symlinkSync(project, alias);
      consent.enableConsent(alias, { consentRoot });
      expect(consent.hasConsent(project, { consentRoot })).toBe(true);
      expect(consent.consentKey(fs.realpathSync(alias)))
        .toBe(consent.consentKey(fs.realpathSync(project)));
    }
  );

  (process.platform === 'win32' ? test.skip : test)(
    'rejects a symlinked consent store',
    () => {
      const project = tempDir('spk-consent-project-');
      const holder = tempDir('spk-consent-holder-');
      const outside = tempDir('spk-consent-outside-');
      cleanup.push(project, holder, outside);
      const linkedStore = path.join(holder, 'consents');
      fs.symlinkSync(outside, linkedStore);
      expect(() => consent.enableConsent(project, { consentRoot: linkedStore }))
        .toThrow(/unsafe consent directory/);
      expect(consent.hasConsent(project, { consentRoot: linkedStore })).toBe(false);
    }
  );

  test('tampered records fail closed', () => {
    const { project, consentRoot } = fixture();
    const enabled = consent.enableConsent(project, { consentRoot });
    const record = JSON.parse(fs.readFileSync(enabled.file, 'utf8'));
    record.projectRoot = `${record.projectRoot}-other`;
    fs.writeFileSync(enabled.file, JSON.stringify(record));
    expect(consent.consentStatus(project, { consentRoot }))
      .toMatchObject({ enabled: false, reason: 'invalid-record' });
  });

  test('a replacement repository at the same path does not inherit consent', () => {
    const { project, consentRoot } = fixture();
    consent.enableConsent(project, { consentRoot });
    fs.rmSync(project, { recursive: true, force: true });
    fs.mkdirSync(project);
    expect(consent.consentStatus(project, { consentRoot }))
      .toMatchObject({ enabled: false, reason: 'invalid-record' });
  });

  test('CLI logic enables, reports, and disables without environment paths', () => {
    const { project, consentRoot } = fixture();
    const output = sink();
    const errors = sink();
    const options = { cwd: project, consentRoot, stdout: output, stderr: errors };

    expect(consent.runCli(['enable'], options)).toBe(0);
    expect(consent.runCli(['status'], options)).toBe(0);
    expect(consent.runCli(['disable'], options)).toBe(0);
    expect(consent.runCli(['status'], options)).toBe(1);
    expect(output.text()).toMatch(/enabled/);
    expect(output.text()).toMatch(/disabled/);
    expect(errors.text()).toBe('');
    expect(consent.runCli(['enable', '.', '--store'], options)).toBe(2);
  });
});
