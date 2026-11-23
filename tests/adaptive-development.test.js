const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('adaptive development workflow', () => {
  test('/poteto-mode stays lightweight while /tdd keeps the strict orchestrated path', () => {
    const manifest = JSON.parse(read('manifest.json'));
    const code = manifest.commands.find(command => command.name === '/poteto-mode');
    const tdd = manifest.commands.find(command => command.name === '/tdd');

    expect(code).toEqual({ name: '/poteto-mode', direct: true });
    expect(tdd).toEqual({ name: '/tdd', orchestrator: 'build-orchestrator' });
  });

  test.each([
    'skills/engineering/poteto-mode/SKILL.md',
    'locales/en/skills/engineering/poteto-mode/SKILL.md',
    'plugins/spk/skills/poteto-mode/SKILL.md',
  ])('%s selects the smallest workflow that fits the task shape', relativePath => {
    const skill = read(relativePath);

    for (const taskShape of ['Quick patch', 'Feature', 'Bug fix', 'Refactor']) {
      expect(skill).toContain(taskShape);
    }

    expect(skill).toMatch(/smallest (?:justified )?change/i);
    expect(skill).toMatch(/data shape|domain shape/i);
    expect(skill).toMatch(/reproduce[\s\S]*(?:bug|failure)[\s\S]*root cause/i);
    expect(skill).toMatch(/real (?:artifact|surface)/i);
    expect(skill).toMatch(/subagents?[\s\S]*(?:optional|deliberate|only when)/i);
    expect(skill).not.toMatch(/For each behavior, record a failing RED test/i);
    expect(skill).not.toMatch(/Return `spk\.evidence\/v1`/i);
  });

  test('router describes code as adaptive and reserves strict orchestration for tdd', () => {
    for (const relativePath of [
      'skills/engineering/start/SKILL.md',
      'locales/en/skills/engineering/start/SKILL.md',
      'plugins/spk/skills/start/SKILL.md',
    ]) {
      const router = read(relativePath);
      const flat = router.replace(/\s+/gu, ' ');
      expect(router).toMatch(/adaptive[\s\S]*`poteto-mode`|`poteto-mode`[\s\S]*adaptive/i);
      expect(router).toMatch(/strict[\s\S]*`tdd`|`tdd`[\s\S]*strict/i);
      // Assert the selection boundary rather than prescribing an exhaustive example list.
      expect(flat).toMatch(/Default development to `poteto-mode`|ค่าเริ่มต้น development ใช้ `poteto-mode`/i);
      expect(flat).toMatch(/explicit test-first|ผู้ใช้ขอ test-first ชัดเจน/i);
      expect(flat).toMatch(/high-risk[\s\S]*reliable test seam|เสี่ยงสูง[\s\S]*test seam ที่ reliable/i);
      expect(flat).toMatch(/repo policy|policy ของ repo/i);
    }
  });

  test('build orchestrator is an escalation path, not the generic implementation default', () => {
    const orchestrator = read('plugins/spk/agents/build-orchestrator.md');

    expect(orchestrator).toMatch(/strict TDD|high-risk|parallel implementation/i);
    expect(orchestrator).not.toMatch(/Use for "implement X"/i);
  });
});
