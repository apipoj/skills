const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHARED_SKILLS = path.join(ROOT, 'plugins', 'spk', 'skills');
const CODEX_SKILLS = path.join(ROOT, 'plugins', 'spk-codex', 'skills');
const AGENTS = path.join(ROOT, 'plugins', 'spk', 'agents');
const CONTRACT = require('../contracts/workflows.json');
const CONTRACT_BY_ID = new Map(CONTRACT.skills.map(skill => [skill.id, skill]));
const MANUAL_ONLY = new Set(
  CONTRACT.skills
    .filter(skill => !skill.activation.allowImplicitInvocation)
    .map(skill => skill.id)
);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// SKILL.md prose is hard-wrapped, so phrase assertions match against collapsed whitespace
function flat(text) {
  return text.replace(/\s+/g, ' ');
}

function nativeSkillFile(id) {
  const skill = CONTRACT_BY_ID.get(id);
  if (!skill) throw new Error(`Unknown contract skill: ${id}`);
  return path.join(ROOT, skill.sources.th, 'SKILL.md');
}

function frontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(match[1].split('\n').flatMap(line => {
    const hit = line.match(/^([A-Za-z][A-Za-z-]*):\s*(.+)$/);
    return hit ? [[hit[1], hit[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
  }));
}

describe('provider-neutral workflow and authority contracts', () => {
  const skillDirs = fs.readdirSync(SHARED_SKILLS, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  test('shared skills have standard names, portable bodies, and evidence contracts', () => {
    expect(skillDirs).toHaveLength(CONTRACT.skills.length);
    for (const name of skillDirs) {
      const text = read(path.join(SHARED_SKILLS, name, 'SKILL.md'));
      const meta = frontmatter(text);
      expect(meta.name).toBe(name);
      expect(Object.keys(meta).sort()).toEqual(
        MANUAL_ONLY.has(name)
          ? ['description', 'disable-model-invocation', 'name']
          : ['description', 'name']
      );
      expect(text).toContain('## Workflow');
      expect(text).toContain('## Evidence Receipt');
      expect(text).toContain('## Guardrails');
      expect(text).not.toMatch(/Task\(|\$ARGUMENTS|^!`|\/spk:|claude-(?:opus|sonnet)/m);
    }
  });

  test('direct practical workflows do not route work to conflicting roles', () => {
    for (const name of ['ask-me', 'add-knowledge', 'test-changes']) {
      const text = read(path.join(SHARED_SKILLS, name, 'SKILL.md'));
      expect(text).toMatch(/\bdirect(?:ly)?\b|current conversation|current thread/i);
      expect(text).not.toMatch(/spk:(?:verifier|planner|plan-orchestrator)/);
    }
    expect(read(path.join(SHARED_SKILLS, 'add-knowledge', 'SKILL.md')))
      .toMatch(/knowledge-maintenance[\s\S]*not feature planning/i);
  });

  test('manual-only invocation policy is equivalent across Claude and Codex payloads', () => {
    expect([...MANUAL_ONLY].sort()).toEqual([
      'add-knowledge',
      'ask-me',
      'ask-with-docs',
      'bala',
      'check-release',
      'deploy',
      'handoff',
      'improve-codebase',
      'pr',
      'setup',
      'sunzi',
      'task-to-pr',
      'teach',
      'to-questionnaire',
      'to-spec',
      'to-tickets',
      'triage',
      'uninstall',
      'wait-what',
      'wayfinder',
      'write-skills',
    ]);
    for (const name of MANUAL_ONLY) {
      const text = read(path.join(SHARED_SKILLS, name, 'SKILL.md'));
      const meta = frontmatter(text);
      expect(meta['user-invocable']).toBeUndefined();
      expect(meta['disable-model-invocation']).toBe('true');
      const codexText = read(path.join(CODEX_SKILLS, name, 'SKILL.md'));
      expect(frontmatter(codexText)['disable-model-invocation']).toBeUndefined();
      expect(read(path.join(CODEX_SKILLS, name, 'agents', 'openai.yaml')))
        .toContain('allow_implicit_invocation: false');
    }
  });

  test('ask-me is Thai-first and recommends one context-fit deliverable before a gated handoff', () => {
    const english = read(path.join(SHARED_SKILLS, 'ask-me', 'SKILL.md'));
    const thai = read(nativeSkillFile('ask-me'));

    expect(english).toMatch(/Reply in the user's language/i);
    expect(english).toMatch(/Ask exactly one material decision question\s+per message/i);
    expect(english).toMatch(/recommended\s+answer/i);
    expect(english).toMatch(/After confirmation/i);
    expect(english).toMatch(/does not authorize\s+planning or development/i);
    expect(english).toMatch(/native, semi-formal Thai/i);
    expect(english).toMatch(/paragraphs to 2–4 sentences/i);
    expect(english).toMatch(/familiar technical English over literal translation/i);
    expect(english).toMatch(/Bold only 1–3 decision keywords/i);
    expect(english).toMatch(/familiar work analogy only when they reduce reading time/i);
    expect(english).toMatch(/💡 ในความเห็นของผม[\s\S]*use no other emoji/i);
    expect(english).toMatch(/Do not repeat settled\s+context/i);
    expect(english).toMatch(/Context-Aware Handoff/i);
    expect(english).toMatch(
      /\*\*PRD\*\*[\s\S]*\*\*Proposal\*\*[\s\S]*\*\*Presentation \/ Pitch deck\*\*[\s\S]*\*\*Sales asset\*\*/i,
    );
    expect(english).toMatch(/Show at most three deliverables[\s\S]*exactly one\s+recommendation/i);
    expect(english).toMatch(/reviewed plan and\s+a new,\s+explicit post-plan confirmation/i);
    expect(english).toMatch(/Never invent\s+`\/prd`[\s\S]*`\/proposal`[\s\S]*`\/presentation`[\s\S]*`\/sales`/i);
    expect(english).toMatch(/exact artifact,\s+recipients, and channel[\s\S]*separate\s+delivery approval/i);
    expect(english).toMatch(/Do not modify files, code, Git state, configuration, or external systems/i);
    // 6.4.0 moved this from 1050. The shared response block grew by the
    // 50-word Terminology rule and ask-me only had 13 words of its own to give
    // back, so the ceiling moves rather than the skill losing guidance the
    // block does not state.
    expect(english.trim().split(/\s+/u).length).toBeLessThan(1100);
    expect(english.split('\n').length).toBeLessThan(180);
    expect(thai).toMatch(/ถามเพียงหนึ่ง decision สำคัญต่อหนึ่งข้อความ/);
    expect(thai).toMatch(/คำตอบที่แนะนำ/);
    expect(thai).toMatch(/ยังไม่อนุญาต\s*ให้ทำ plan หรือเริ่ม dev/);
    expect(thai).toMatch(/PRD[\s\S]*Proposal[\s\S]*Presentation \/ Pitch deck[\s\S]*Sales asset/);
    expect(thai).toMatch(/แสดง deliverable ไม่เกินสามตัว[\s\S]*คำแนะนำหนึ่งตัว/);
    expect(thai).toMatch(/reviewed plan\s+และคำยืนยันใหม่หลังเห็น plan/);
    expect(thai).toMatch(/ห้ามสร้างชื่อ workflow `\/prd`[\s\S]*`\/proposal`[\s\S]*`\/presentation`[\s\S]*`\/sales`/);
    expect(thai).toMatch(/แสดง artifact จริง ผู้รับ และ channel[\s\S]*ขออนุมัติการส่งแยกอีกครั้ง/);
    expect(thai).toMatch(/ห้ามแก้ไฟล์ code, Git state, configuration หรือระบบภายนอก/);
    expect(thai).toMatch(/ภาษาไทยกึ่งทางการเหมือนคุยกับเพื่อนร่วมงาน/);
    expect(thai).toMatch(/ย่อหน้าละ 2–4 ประโยค/);
    expect(thai).toMatch(/ห้ามแปลโครงประโยคอังกฤษตรง ๆ/);
    expect(thai).toMatch(/ใช้ \*\*ตัวหนา\*\*[\s\S]*1–3 จุด/);
    expect(thai).toMatch(/💡 ในความเห็นของผม[\s\S]*ห้ามใช้ emoji อื่น/);
    expect(thai).toMatch(/ห้ามทวน\s+context ที่ตกลงแล้วทุกข้อความ/);
    expect(Buffer.byteLength(thai, 'utf8')).toBeLessThan(16500);
    expect(thai.split('\n').length).toBeLessThan(185);
  });

  test('plan and code preserve separate post-plan implementation authority', () => {
    const plan = read(path.join(SHARED_SKILLS, 'plan', 'SKILL.md'));
    const implement = read(path.join(SHARED_SKILLS, 'code', 'SKILL.md'));
    const planAgent = read(path.join(AGENTS, 'plan-orchestrator.md'));
    const buildAgent = read(path.join(AGENTS, 'build-orchestrator.md'));

    expect(plan).toMatch(/pre-plan .plan then develop. choice as\s+approval of an unseen plan/i);
    expect(plan).toMatch(/Do not begin implementation\s+in the same turn as the plan/i);
    expect(implement).toMatch(/latest user answer unambiguously approves the\s+exact plan that was just presented/i);
    expect(implement).toMatch(/return `NEEDS_USER_INPUT`[\s\S]*make no changes/i);
    expect(planAgent).toMatch(/implementation_authorized:false/);
    expect(buildAgent).toMatch(/ask-me summary confirmation[\s\S]*is insufficient/i);
  });

  test('external and destructive workflows require a bound approval envelope', () => {
    for (const name of ['deploy', 'pr', 'task-to-pr', 'uninstall']) {
      const text = read(path.join(SHARED_SKILLS, name, 'SKILL.md'));
      const mode = CONTRACT_BY_ID.get(name).approvalMode;
      expect(text).toContain('"schema": "spk.approval/v1"');
      expect(text).toContain('"status": "NEEDS_USER_INPUT"');
      expect(text).toContain(`"approval_mode": "${mode}"`);
      expect(text).toContain('"intent_digest"');
      expect(text).toMatch(/recomput|revalidat/i);
      expect(flat(text)).toMatch(/structured choice prompt.*numbered list/i);
      expect(flat(text)).toMatch(/never label it only `Approve`|"choices"/i);
    }
  });

  test('only deploy still binds approval to a typed digest', () => {
    const deploy = read(path.join(SHARED_SKILLS, 'deploy', 'SKILL.md'));
    expect(CONTRACT_BY_ID.get('deploy').approvalMode).toBe('bound_token');
    expect(deploy).toMatch(/spk-approve:<intent_digest>/);
    expect(flat(deploy)).toMatch(/a plain affirmative is never sufficient/i);
    expect(flat(deploy)).toMatch(/prefix of at least 12 hex characters/i);

    for (const name of ['pr', 'task-to-pr', 'uninstall']) {
      const text = read(path.join(SHARED_SKILLS, name, 'SKILL.md'));
      expect(CONTRACT_BY_ID.get(name).approvalMode).toBe('confirm');
      expect(text).not.toMatch(/spk-approve:<intent_digest>/);
      expect(flat(text)).toMatch(/plain affirmative/i);
      expect(flat(text)).toMatch(/drift invalidates|Any state drift/i);
    }
  });

  test('the contract defines both approval modes and a button-first interaction policy', () => {
    expect(Object.keys(CONTRACT.approvalModes).sort()).toEqual(['bound_token', 'confirm']);
    expect(CONTRACT.approvalModes.confirm).toMatch(/immediately preceding message/i);
    expect(CONTRACT.approvalModes.bound_token).toMatch(/at least 12 hex characters/i);
    expect(CONTRACT.approvalModes.bound_token).toMatch(/never sufficient/i);

    const policy = CONTRACT.interactionPolicy;
    expect(policy.choicePrompt).toMatch(/structured choice prompt[\s\S]*numbered list/i);
    expect(policy.options).toMatch(/exactly one is marked as recommended/i);
    expect(policy.labels).toMatch(/bare 'Approve' label is invalid/i);
    expect(policy.freeForm).toMatch(/free-form answer/i);
    expect(policy.revalidation).toMatch(/One approval authorizes one intent/i);

    for (const name of [
      'ask-me', 'asking', 'start', 'wizard', 'design-options', 'to-questionnaire', 'setup',
    ]) {
      const text = flat(read(path.join(SHARED_SKILLS, name, 'SKILL.md')));
      expect(text).toMatch(/structured choice prompt if one is available; otherwise present a numbered list/i);
      expect(text).toMatch(/free-form answer stays possible/i);
    }
  });

  test('task-to-pr is bounded, independently reviewed, and never merges', () => {
    const text = read(path.join(SHARED_SKILLS, 'task-to-pr', 'SKILL.md'));
    expect(text).toMatch(/at most two post-publication repair\s+rounds/i);
    expect(text).toMatch(/fresh reviewer|fresh independent review/i);
    expect(text).toContain('--no-ext-diff');
    expect(text).toMatch(/Unicode NFC/);
    expect(text).toMatch(/resulting commit's parent, tree/);
    expect(text).toContain('"payload_digest"');
    expect(text).toMatch(/complete semantic tool\/API argument/);
    expect(text).toMatch(/Immediately before each\s+ticket write/);
    expect(text).toContain('If-Match');
    expect(text).toMatch(/every task-relevant check\s+passes/i);
    expect(text).toContain('READY_FOR_HUMAN_MERGE');
    expect(text).toMatch(/Never merge/i);
  });

  test('English and Thai implementation workflows never imply automatic commits', () => {
    for (const file of [
      path.join(SHARED_SKILLS, 'code', 'SKILL.md'),
      path.join(SHARED_SKILLS, 'tdd', 'SKILL.md'),
      nativeSkillFile('code'),
      nativeSkillFile('tdd'),
    ]) {
      const text = read(file);
      expect(text).toMatch(/separate explicit authorization|separately authorized|แยกต่างหาก/);
      expect(text).not.toMatch(/Commit per coherent cycle|Commit ตาม commit message|ผลิต code ที่ commit แล้ว/);
    }
  });

  test('mutation workers consume approval but never solicit it', () => {
    for (const name of ['deploy-orchestrator', 'devops', 'pr-manager']) {
      const text = read(path.join(AGENTS, `${name}.md`));
      expect(text).toContain('spk.approval/v1');
      expect(text).toMatch(/main skill owns approval|main skill owns the user-facing gate|do not ask the user|never solicit confirmation/i);
      expect(text).not.toMatch(/pause for (?:explicit )?(?:user|operator) confirmation/i);
    }

    // deploy is the only bound_token gate, so only its workers consume a typed digest
    for (const name of ['deploy-orchestrator', 'devops']) {
      expect(read(path.join(AGENTS, `${name}.md`))).toMatch(/spk-approve:<intent_digest>/);
    }
    expect(read(path.join(AGENTS, 'pr-manager.md'))).toMatch(/"approval_mode": "confirm"/);
  });

  test('every agent declares least-privilege controls and a typed receipt', () => {
    const files = fs.readdirSync(AGENTS).filter(file => file.endsWith('.md'));
    expect(files).toHaveLength(21);
    for (const file of files) {
      const text = read(path.join(AGENTS, file));
      const meta = frontmatter(text);
      expect(meta.tools).toBeTruthy();
      expect(meta.permissionMode).toBe('default');
      expect(Number(meta.maxTurns)).toBeGreaterThan(0);
      expect(Number(meta.maxTurns)).toBeLessThanOrEqual(18);
      expect(text).toContain('## Evidence Receipt');
      expect(text).toContain('"schema":"spk.evidence/v1"');
      expect(text).toContain('## Completion Status Protocol');
    }
  });

  test('orchestrators publish bounded fan-out and explicit verifier nodes', () => {
    for (const name of [
      'plan-orchestrator',
      'build-orchestrator',
      'audit-orchestrator',
      'deploy-orchestrator',
    ]) {
      const text = read(path.join(AGENTS, `${name}.md`));
      expect(text).toMatch(/\*\*Budget:\*\*/);
      expect(text).toMatch(/verifier/i);
      expect(text).toMatch(/concurrent|sequential/i);
    }
  });
});
