const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'plugins/spk/skills/start/SKILL.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const thai = fs.readFileSync(path.join(ROOT, 'skills/engineering/start/SKILL.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const contract = require('../contracts/workflows.json');

describe('Thai-first instant-start router', () => {
  test('is a canonical router, never a compatibility alias', () => {
    expect(runtime).toMatch(/^---\nname: start\n/m);
    expect(runtime).not.toMatch(/Deprecated alias|compat_alias/);
    expect(thai).not.toMatch(/ชื่อเดิม|compat_alias/);
  });

  test('routes clear intent immediately and asks at most one material question', () => {
    for (const text of [runtime, thai]) {
      expect(text).toMatch(/smart default|ค่าเริ่มต้น|default/i);
      expect(text).toMatch(/one material question|หนึ่งคำถาม|ถามเพียงหนึ่ง/i);
      expect(text).toMatch(/intent.*clear|เจตนา.*ชัด|คำขอ.*ชัด/i);
    }
  });

  test('uses canonical workflow names and omits optional strategy skills', () => {
    for (const text of [runtime, thai]) {
      expect(text).toContain('code');
      expect(text).toContain('debug');
      expect(text).toContain('code-review');
      expect(text).toContain('load-project');
      expect(text).not.toMatch(/`implement`|`diagnosing-bugs`|`prime`/);
      expect(text).not.toMatch(/\bjumpstart\b|\bBala\b|\bSunzi\b/);
    }
  });

  test('preserves approval boundaries and user-facing evidence', () => {
    expect(runtime).toMatch(/read_only/);
    expect(runtime).toMatch(/workspace_write/);
    expect(runtime).toMatch(/git_write/);
    expect(runtime).toMatch(/external_write/);
    expect(runtime).toMatch(/concise user-facing language/i);
    expect(runtime).not.toMatch(/```ya?ml|spk\.evidence\/v1/i);
    expect(runtime).toMatch(/approval/i);
  });

  test('contract exposes the approved Thai entry experience', () => {
    const start = contract.skills.find(skill => skill.id === 'start');
    expect(start.locales.th.defaultPrompt).toMatch(/เริ่ม|พร้อมใช้/);
    expect(start.locales.en.defaultPrompt).toMatch(/start|ready/i);
    expect(start.origin).toEqual({ repository: 'mattpocock/skills', skill: 'ask-matt' });
  });
});
