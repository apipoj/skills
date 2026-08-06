# Apipoj Skills

Thai-first engineering skills แบบพร้อมใช้สำหรับ Claude Code, Codex และ agent ที่รองรับ Agent Skills

Apipoj Skills ใช้ skill ที่เล็กและ composable จาก `mattpocock/skills` เป็นฐาน แล้วเพิ่มสิ่งที่ SPK ทำได้ดีกว่า: approval gates, evidence receipts, project memory, security hooks, Claude/Codex generation และภาษาไทยที่คุยรู้เรื่อง

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

- **Thai-first:** ตอบภาษาไทยธรรมชาติเป็นค่าเริ่มต้น แต่เก็บ technical identifiers ตามจริง
- **พร้อมใช้:** ผู้ใช้ไม่ต้องจำรายชื่อ skill; `/spk:start` route ให้
- **ปลอดภัย:** การสร้างไฟล์ไม่ได้แปลว่าอนุญาต commit, push, deploy หรือ publish
- **มีหลักฐาน:** งานสำคัญคืน test output, diff scope, risk และ next action ที่ตรวจได้
- **ไม่เทอะทะ:** subagents ใช้เฉพาะงานที่ได้ประโยชน์จาก independent pass จริง

## ภาพรวม

<!-- SPK-COUNTS:start -->
**21 subagents** (4 orchestrators + 17 specialists) · **37 skills หลัก** + **20 ชื่อเดิม**
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

Aliases ในตารางเป็นชื่อเดิมชั่วคราวถึงก่อน v6 และจะบอกชื่อ canonical ทุกครั้งที่ใช้

<!-- SPK-COMMANDS:start -->
### ชื่อหลัก

| Skill | ทำงานผ่าน |
|---|---|
| `/spk:start` | direct main-thread workflow |
| `/spk:debug` | debugger |
| `/spk:ask-with-docs` | direct main-thread workflow |
| `/spk:triage` | direct main-thread workflow |
| `/spk:improve-codebase` | direct main-thread workflow |
| `/spk:setup` | direct main-thread workflow |
| `/spk:tdd` | build-orchestrator |
| `/spk:to-spec` | direct main-thread workflow |
| `/spk:to-tickets` | direct main-thread workflow |
| `/spk:to-questionnaire` | direct main-thread workflow |
| `/spk:wayfinder` | direct main-thread workflow |
| `/spk:code` | build-orchestrator |
| `/spk:prototype` | designer |
| `/spk:research` | researcher |
| `/spk:domain-modeling` | direct main-thread workflow |
| `/spk:codebase-design` | direct main-thread workflow |
| `/spk:code-review` | audit-orchestrator |
| `/spk:fix-conflicts` | direct main-thread workflow |
| `/spk:asking` | direct main-thread workflow |
| `/spk:handoff` | direct main-thread workflow |
| `/spk:teach` | direct main-thread workflow |
| `/spk:write-skills` | direct main-thread workflow |
| `/spk:ask-me` | direct main-thread workflow |
| `/spk:plan` | plan-orchestrator |
| `/spk:design-options` | designer |
| `/spk:deploy` | deploy-orchestrator |
| `/spk:wizard` | direct main-thread workflow |
| `/spk:pr` | pr-manager |
| `/spk:task-to-pr` | direct main-thread workflow |
| `/spk:add-knowledge` | direct main-thread workflow |
| `/spk:load-project` | primer |
| `/spk:ask-project` | researcher |
| `/spk:check-wiki` | audit-orchestrator |
| `/spk:doctor` | direct main-thread workflow |
| `/spk:check-release` | verifier |
| `/spk:test-changes` | direct main-thread workflow |
| `/spk:uninstall` | direct main-thread workflow |

### ชื่อเดิมที่ยังใช้ได้

| ชื่อเดิม | ใช้ชื่อหลักนี้ |
|---|---|
| `/spk:ask-matt` | `/spk:start` |
| `/spk:setup-matt-pocock-skills` | `/spk:setup` |
| `/spk:spk` | `/spk:start` |
| `/spk:jumpstart` | `/spk:start` |
| `/spk:review` | `/spk:code-review` |
| `/spk:grill-me` | `/spk:ask-me` |
| `/spk:grilling` | `/spk:asking` |
| `/spk:grill-with-docs` | `/spk:ask-with-docs` |
| `/spk:diagnosing-bugs` | `/spk:debug` |
| `/spk:implement` | `/spk:code` |
| `/spk:design-shotgun` | `/spk:design-options` |
| `/spk:resolving-merge-conflicts` | `/spk:fix-conflicts` |
| `/spk:writing-great-skills` | `/spk:write-skills` |
| `/spk:prime` | `/spk:load-project` |
| `/spk:query` | `/spk:ask-project` |
| `/spk:ingest` | `/spk:add-knowledge` |
| `/spk:wiki-lint` | `/spk:check-wiki` |
| `/spk:improve-codebase-architecture` | `/spk:improve-codebase` |
| `/spk:scoped-tests` | `/spk:test-changes` |
| `/spk:release-check` | `/spk:check-release` |
<!-- SPK-COMMANDS:end -->

`bala` และ `sunzi` อยู่ใน `extras/` จึงไม่ติดตั้งพร้อม default bundle

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

ฐาน upstream คือ `mattpocock/skills@2ab958093e83e0ec752e6c1c5932da465bf23e0c` ภายใต้ MIT License การ sync รอบถัดไปต้อง review และ localize ก่อนเสมอ ดู `NOTICE` และ `docs/upstream/`
