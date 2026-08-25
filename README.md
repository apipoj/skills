# Apipoj Skills

Thai-first engineering skills แบบพร้อมใช้สำหรับ Claude Code, Codex และ agent ที่รองรับ Agent Skills

Apipoj Skills ใช้ skill ที่เล็กและ composable จาก `mattpocock/skills` เป็นฐาน แล้วเพิ่มสิ่งที่ SPK ทำได้ดีกว่า: approval gates, evidence receipts, project memory, security hooks, Claude/Codex generation และภาษาไทยที่คุยรู้เรื่อง

เริ่มใช้งานแบบทีละขั้นได้ที่ **[คู่มือผู้ใช้](USER_GUIDE.md)** · [English user guide](USER_GUIDE-EN.md)

ใช้กับ Grok Bot: **[สร้าง Foreman และตั้ง `ask-me` เป็นค่าเริ่มต้น](GROK_BOT.md)** · [English setup payload](GROK_BOT_EN.md)

## เริ่มแบบมาม่า

ติดตั้งแล้วเรียกคำสั่งเดียว:

```text
/spk:start
```

บอกสิ่งที่อยากได้ตามปกติ ระบบจะเลือก workflow ที่เล็กที่สุด ใช้ smart defaults เมื่อปลอดภัย และถามทีละหนึ่ง decision เฉพาะตอนที่คำตอบเปลี่ยน scope หรือความเสี่ยง

## ติดตั้ง

### Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

ใช้ได้เลยหลังติดตั้ง ไม่ต้องตั้งค่าอะไรเพิ่ม ขอแค่มี Node.js 20 ขึ้นไปอยู่ใน `PATH` (เช็กด้วย `node --version`)

### Codex

```bash
codex plugin marketplace add apipoj/skills
codex plugin add spk@spk
```

### skills.sh

```bash
npx skills@latest add apipoj/skills
```

อย่าติดตั้งหลายวิธีใน project เดียว เพราะจะเห็น skill ซ้ำ

## หลักการ

- **Thai-first:** ตอบตามภาษาผู้ใช้ และคงโทนวัฒนธรรมไทย เก็บ technical identifiers ตามจริง และคงศัพท์เฉพาะทางเป็น English แทนการทับศัพท์หรือแปลตรงตัว
- **พร้อมใช้:** ผู้ใช้ไม่ต้องจำรายชื่อ skill; `/spk:start` route ให้
- **ปลอดภัย:** การสร้างไฟล์ไม่ได้แปลว่าอนุญาต commit, push, deploy หรือ publish
- **มีหลักฐาน:** งานสำคัญคืน test output, diff scope, risk และ next action ที่ตรวจได้
- **ไม่เทอะทะ:** subagents ใช้เฉพาะงานที่ได้ประโยชน์จาก independent pass จริง

## ภาพรวม

<!-- SPK-COUNTS:start -->
**21 subagents** (4 orchestrators + 17 specialists) · **40 skills**
<!-- SPK-COUNTS:end -->

### Agents

<!-- SPK-AGENTS:start -->
| Name | Role | Model | Color | Phase |
|---|---|---|---|---|
| `plan-orchestrator` | orchestrator | claude-opus-4-8 | green | planning |
| `build-orchestrator` | orchestrator | claude-opus-4-8 | blue | building |
| `audit-orchestrator` | orchestrator | claude-opus-4-8 | purple | auditing |
| `deploy-orchestrator` | orchestrator | claude-opus-4-8 | orange | shipping |
| `prd-writer` | specialist | claude-opus-4-8 | green | planning |
| `business-analyst` | specialist | claude-opus-4-8 | green | planning |
| `architect` | specialist | claude-opus-4-8 | green | planning |
| `planner` | specialist | claude-opus-4-8 | green | planning |
| `designer` | specialist | claude-sonnet-5 | green | planning |
| `primer` | specialist | claude-sonnet-5 | green | planning |
| `debugger` | specialist | claude-opus-4-8 | purple | auditing |
| `code-auditor` | specialist | claude-opus-4-8 | purple | auditing |
| `implementer` | specialist | claude-sonnet-5 | blue | building |
| `tester` | specialist | claude-sonnet-5 | blue | building |
| `docs` | specialist | claude-sonnet-5 | blue | building |
| `researcher` | specialist | claude-sonnet-5 | blue | building |
| `verifier` | specialist | claude-sonnet-5 | purple | auditing |
| `pr-manager` | specialist | claude-sonnet-5 | orange | shipping |
| `devops` | specialist | claude-sonnet-5 | orange | shipping |
| `deployment-smoke` | specialist | claude-sonnet-5 | orange | shipping |
| `browser-tester` | specialist | claude-sonnet-5 | orange | shipping |
<!-- SPK-AGENTS:end -->

### Skills

<!-- SPK-COMMANDS:start -->
`พิมพ์เอง` = agent มองไม่เห็น ต้องพิมพ์คำสั่งเองเท่านั้น

| Skill | ทำงานผ่าน | การเรียก |
|---|---|---|
| `/spk:start` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:debug` | debugger | agent เรียกเองได้ |
| `/spk:ask-with-docs` | direct main-thread workflow | พิมพ์เอง |
| `/spk:triage` | direct main-thread workflow | พิมพ์เอง |
| `/spk:improve-codebase` | direct main-thread workflow | พิมพ์เอง |
| `/spk:setup` | direct main-thread workflow | พิมพ์เอง |
| `/spk:tdd` | build-orchestrator | agent เรียกเองได้ |
| `/spk:to-spec` | direct main-thread workflow | พิมพ์เอง |
| `/spk:to-tickets` | direct main-thread workflow | พิมพ์เอง |
| `/spk:to-questionnaire` | direct main-thread workflow | พิมพ์เอง |
| `/spk:wayfinder` | direct main-thread workflow | พิมพ์เอง |
| `/spk:code` | build-orchestrator | agent เรียกเองได้ |
| `/spk:prototype` | designer | agent เรียกเองได้ |
| `/spk:research` | researcher | agent เรียกเองได้ |
| `/spk:domain-modeling` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:codebase-design` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:code-review` | audit-orchestrator | agent เรียกเองได้ |
| `/spk:fix-conflicts` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:asking` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:handoff` | direct main-thread workflow | พิมพ์เอง |
| `/spk:teach` | direct main-thread workflow | พิมพ์เอง |
| `/spk:write-skills` | direct main-thread workflow | พิมพ์เอง |
| `/spk:ask-me` | direct main-thread workflow | พิมพ์เอง |
| `/spk:wait-what` | direct main-thread workflow | พิมพ์เอง |
| `/spk:plan` | plan-orchestrator | agent เรียกเองได้ |
| `/spk:design-options` | designer | agent เรียกเองได้ |
| `/spk:deploy` | deploy-orchestrator | พิมพ์เอง |
| `/spk:wizard` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:pr` | pr-manager | พิมพ์เอง |
| `/spk:task-to-pr` | direct main-thread workflow | พิมพ์เอง |
| `/spk:add-knowledge` | direct main-thread workflow | พิมพ์เอง |
| `/spk:load-project` | primer | agent เรียกเองได้ |
| `/spk:ask-project` | researcher | agent เรียกเองได้ |
| `/spk:check-wiki` | audit-orchestrator | agent เรียกเองได้ |
| `/spk:doctor` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:check-release` | verifier | พิมพ์เอง |
| `/spk:test-changes` | direct main-thread workflow | agent เรียกเองได้ |
| `/spk:uninstall` | direct main-thread workflow | พิมพ์เอง |
| `/spk:bala` | direct main-thread workflow | พิมพ์เอง |
| `/spk:sunzi` | direct main-thread workflow | พิมพ์เอง |
<!-- SPK-COMMANDS:end -->

## โครงสร้าง source

- `skills/` — Thai canonical experience แบบ bucketed
- `locales/en/skills/` — English mirror และฐานเทียบ upstream
- `plugins/spk/` — Claude payload
- `plugins/spk-codex/` — generated Codex payload; ห้ามแก้ด้วยมือ
- `contracts/workflows.json` — activation, effects, evidence, origin และ locale mapping
- `docs/upstream/` — upstream commit และ reviewed-sync policy

## พัฒนาและตรวจสอบ

```bash
npm test
npm run verify:release
```

Version และ roster ใช้ `manifest.json` เป็น source of truth ส่วน generated artifacts สร้างด้วย `npm run generate:platforms`

## Upstream และ license

ฐาน upstream คือ `mattpocock/skills@84fdeffd12f2ee307994d1eb6feb48173b6e0502` ภายใต้ MIT License การ sync รอบถัดไปต้อง review และ localize ก่อนเสมอ ดู `NOTICE` และ `docs/upstream/`
