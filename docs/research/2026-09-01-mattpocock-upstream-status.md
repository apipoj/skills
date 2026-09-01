# สถานะ upstream `mattpocock/skills`

ตรวจเมื่อ 2026-09-01 โดยเริ่มจากเทียบ reviewed pin ของ SPK กับ default branch ผ่าน GitHub repository, commit และ compare API จากนั้น fetch `upstream/main` ที่ commit เดิมเพื่อ review, regenerate provenance references และตรวจ release gate ไม่มีการ merge, commit, push หรือรับ canonical source แบบอัตโนมัติ

## ข้อสรุป

**ตอนเริ่ม review pin ของ SPK ล้าหลัง source branch แต่ upstream ยังไม่ออก package version ใหม่; หลัง review จึง re-pin ไปยัง commit เดิมแบบ selective**

- ก่อน review SPK pin อยู่ที่ [`84fdeffd12f2ee307994d1eb6feb48173b6e0502`](https://github.com/mattpocock/skills/commit/84fdeffd12f2ee307994d1eb6feb48173b6e0502), commit วันที่ 2026-08-06 19:49:51 UTC และบันทึกว่า import วันที่ 2026-08-13
- default branch คือ `main`; HEAD ปัจจุบันคือ [`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`](https://github.com/mattpocock/skills/commit/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76), commit วันที่ 2026-08-24 14:19:57 UTC ([repository API](https://api.github.com/repos/mattpocock/skills), [HEAD API](https://api.github.com/repos/mattpocock/skills/commits/main))
- GitHub compare รายงาน `ahead_by: 37`, `behind_by: 0`, รวม 37 commits และ 114 changed files ([compare page](https://github.com/mattpocock/skills/compare/84fdeffd12f2ee307994d1eb6feb48173b6e0502...6654f6b60cd9d5be8b54c6fafe44346dabeb3b76), [compare API](https://api.github.com/repos/mattpocock/skills/compare/84fdeffd12f2ee307994d1eb6feb48173b6e0502...6654f6b60cd9d5be8b54c6fafe44346dabeb3b76))
- `package.json` ยังเป็น `1.2.3` ทั้งที่ [pin](https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/package.json) และ [HEAD](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/package.json) ดังนั้น delta นี้เป็น **unreleased upstream changes** ไม่ใช่ release ใหม่ที่ควรรับอัตโนมัติ

## ผลหลัง review

- re-pin provenance ไปที่ `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76` และ regenerate reference pages กับ retained `UPSTREAM.md` mirrors จาก commit นี้
- backport เข้า canonical behavior เฉพาะ `wait-what` ที่ตาม `CONTEXT-MAP.md` และ `asking` ที่คั่น Q1/Q2 ด้วย horizontal rule
- ไม่รับ punctuation sweep เข้า canonical behavior, ไม่เพิ่ม `implement-spec` หรือ `retro`, และไม่ copy upstream skill ทับ SPK approval/evidence/localization overlays
- invocation authority และ YAML front-matter parsing มี regression gates ใน SPK อยู่แล้ว จึงตรวจผ่าน gate เดิมแทนการเพิ่ม prose ซ้ำ
- generator ของ retained `UPSTREAM.md` rewrite explicit command/Skill-tool ids เป็น canonical SPK roster และ invocation gate ตรวจ quoted Skill-tool names กับ `Use /command` เพิ่ม เพื่อกัน alias ที่ถูกถอดแล้วกลับเข้ามาทาง reference

## ขอบเขตไฟล์ที่เปลี่ยน

จาก 114 paths:

| ขอบเขต | จำนวน | สถานะ |
|---|---:|---|
| promoted `docs/engineering` + `docs/productivity` | 25 | ต้อง review และ regenerate reference hashes หากขยับ pin |
| promoted `skills/engineering` + `skills/productivity` | 48 | ต้อง review behavior, แปลงชื่อ/namespace และ localize; ห้าม copy ทับตรง ๆ |
| excluded `skills/{misc,personal,in-progress,deprecated}` | 16 | คง exclude; ไม่มีเหตุให้เพิ่ม default roster |
| repo metadata, changesets, scripts และ agent guidance | 25 | ใช้เป็นบริบทการเปลี่ยน upstream ไม่ใช่ payload ที่ SPK ต้องนำเข้าทั้งหมด |

### Promoted paths: 73 files

- `docs/engineering/` ทั้ง 18 หน้า: `ask-matt`, `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `grill-with-docs`, `implement`, `improve-codebase-architecture`, `prototype`, `research`, `resolving-merge-conflicts`, `setup-matt-pocock-skills`, `tdd`, `to-spec`, `to-tickets`, `triage`, `wayfinder`, `wizard`
- `docs/productivity/` ทั้ง 7 หน้า: `grill-me`, `grilling`, `handoff`, `teach`, `to-questionnaire`, `wait-what`, `writing-for-agents`
- `skills/engineering/` 34 files: `README.md`; `ask-matt/{PHASE-BOUNDARIES,SKILL}.md`; `code-review/SKILL.md`; `codebase-design/{DEEPENING,DESIGN-IT-TWICE,SKILL}.md`; `diagnosing-bugs/SKILL.md` และ `scripts/hitl-loop.template.sh`; `domain-modeling/{ADR-FORMAT,CONTEXT-FORMAT,SKILL}.md`; `grill-with-docs/SKILL.md`; `improve-codebase-architecture/{HTML-REPORT,SKILL}.md`; `prototype/{LOGIC,SKILL,UI}.md`; `research/SKILL.md`; `resolving-merge-conflicts/SKILL.md`; `setup-matt-pocock-skills/{SKILL,domain,issue-tracker-github,issue-tracker-gitlab,issue-tracker-local}.md`; `tdd/SKILL.md`; `to-spec/SKILL.md`; `to-tickets/SKILL.md`; `triage/{AGENT-BRIEF,OUT-OF-SCOPE,SKILL}.md`; `wayfinder/SKILL.md`; `wizard/SKILL.md` และ `template.sh`
- `skills/productivity/` 14 files: `README.md`; `grill-me/SKILL.md`; `grilling/SKILL.md`; `handoff/SKILL.md`; `teach/{GLOSSARY-FORMAT,LEARNING-RECORD-FORMAT,MISSION-FORMAT,RESOURCES-FORMAT,SKILL}.md`; `to-questionnaire/SKILL.md`; `wait-what/SKILL.md` และ `agents/openai.yaml`; `writing-for-agents/{SKILL-MECHANICS,SKILL}.md`

รายการและสถานะรายไฟล์อยู่ใน [GitHub compare](https://github.com/mattpocock/skills/compare/84fdeffd12f2ee307994d1eb6feb48173b6e0502...6654f6b60cd9d5be8b54c6fafe44346dabeb3b76)

### Excluded paths: 16 files

- `skills/in-progress/` 12 files: `README.md`, `claude-handoff/SKILL.md`, `loop-me/SKILL.md`, `setup-ts-deep-modules/{SKILL.md,dependency-cruiser.config.cjs}`, `writing-{beats,fragments,shape}/SKILL.md` และ skill ใหม่ `implement-spec/{SKILL.md,agents/openai.yaml}`, `retro/{SKILL.md,agents/openai.yaml}`
- `skills/misc/` 3 files: `README.md`, `git-guardrails-claude-code/SKILL.md`, `setup-pre-commit/SKILL.md`
- `skills/deprecated/README.md` 1 file; `skills/personal/` ไม่มี path เปลี่ยน

`implement-spec` ทำงานแบบ task graph, parallel worktrees และ draft PR ([source commit](https://github.com/mattpocock/skills/commit/84b5ee5afd738b6a3484e62509b84b3b573c5be3)); `retro` ประเมิน environment ของ coding agent และ README ยังระบุว่าเป็น stub ([HEAD source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/in-progress/retro/SKILL.md), [bucket README](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/in-progress/README.md)) ทั้งคู่ยังอยู่ `in-progress` จึงควรคง exclude ตาม policy เดิม

## Behavior changes ที่ควร review จริง

1. **Domain-modeling trigger ชัดขึ้น**: เพิ่ม trigger สำหรับการเขียน/แก้ `CONTEXT.md` และ ADR โดยตรง แล้วปรับถ้อยคำ description ให้อ่านง่ายขึ้น ([commit](https://github.com/mattpocock/skills/commit/bd8e81baafe43e3e4a3e06f0d256da595edcdeca), [HEAD source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/domain-modeling/SKILL.md)) SPK Thai canonical source มี trigger นี้อยู่แล้ว จึงเป็น **already incorporated behavior** มากกว่างานใหม่

2. **Cross-skill invocation เปลี่ยนเป็น explicit Skill tool calls**: upstream แทน `/skill` prose ด้วยคำสั่งเรียก Skill tool และระบุว่าหากเรียกสอง skills ต้องเป็นสอง calls เพื่อเพิ่ม invocation reliability ([initial change](https://github.com/mattpocock/skills/commit/d28dfdc39beadc3142a33359b5cfa4765dcbd0bc), [two-call clarification](https://github.com/mattpocock/skills/commit/447ca70872026d5b79d6073a546dac082117fed7)) ต่อมาพบว่า `setup-matt-pocock-skills` เป็น user-invoked จึงแก้ `code-review`, `to-spec`, `to-tickets`, `triage`, `wayfinder` ให้บอกผู้ใช้รันแทน และตัด post-mortem handoff ออกจาก `diagnosing-bugs` ([fix commit](https://github.com/mattpocock/skills/commit/1dab98299c3b81f560026c01b7ebf55ed5d91373)) จุดนี้ต้อง port ตาม semantics ของ `spk:*` และแต่ละ host ไม่ควรคัด literal invocation มาทับ

3. **`wait-what` รองรับ monorepo context**: ถ้ามี `CONTEXT-MAP.md` ให้ตามไปยัง `CONTEXT.md` ที่ถูกต้อง ([commit](https://github.com/mattpocock/skills/commit/d6cd26f7f245e67ea7d0554a2fe468cd9def6e6f), [HEAD source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/productivity/wait-what/SKILL.md)) SPK backport behavior นี้แล้วใน canonical Thai/English/runtime source

4. **`grilling` แยกหลายคำถามด้วย horizontal rule**: round template เพิ่ม `---` ระหว่าง Q1/Q2 เพื่อไม่ให้ข้อความติดกัน ([commit](https://github.com/mattpocock/skills/commit/85f83d3fde1d3a90d5c9a657f6998c79a6c37308), [HEAD source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/productivity/grilling/SKILL.md)) SPK backport behavior นี้ไปยัง `asking` แล้ว

5. **YAML discovery fix**: หลังเปลี่ยน em dash เป็น colon มี description 6 ไฟล์กลายเป็น YAML ที่ parse ไม่ได้ จึง quote scalar; ใน promoted buckets เกี่ยวกับ `code-review`, `setup-matt-pocock-skills`, `to-spec`, `wait-what` ([commit](https://github.com/mattpocock/skills/commit/5c89081d4bbeb3d039a42093653f90bb698d780e)) ควรรับเป็น test lesson มากกว่าคัดรูปแบบ เพราะ SPK มี source/generator ของตัวเอง

6. **Docs และ punctuation churn**: ลบ section “It assumes one writer” จากหน้า `grill-with-docs` เพราะไม่ตรงการใช้งานแบบทีม ([commit](https://github.com/mattpocock/skills/commit/0505536390d6518e439c0ea90ba1dd3d5b254aba)); อีก commit เปลี่ยน em dash ทั้ง repo 99 files โดยแตะ promoted paths 68 files ([commit](https://github.com/mattpocock/skills/commit/321658273cb1d20b76026717d027d505790106d4)) ส่วนใหญ่เป็น editorial churn และจะทำให้ provenance diff ใหญ่มาก

## ความสัมพันธ์กับงาน centralize artifact

upstream HEAD **ยังไม่มี artifact routing policy กลาง** และไม่ได้แก้ปัญหาที่กำลังออกแบบ:

- `handoff` ยังเขียน OS temp directory ([source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/productivity/handoff/SKILL.md))
- `to-questionnaire` ยังเขียน current directory ([source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/productivity/to-questionnaire/SKILL.md))
- `research` ยังให้เลือกที่เก็บตาม convention ของแต่ละ repo ([source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/research/SKILL.md))
- `domain-modeling` ยังใช้ `CONTEXT.md` และ `docs/adr/` เป็น canonical team docs ([source](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/domain-modeling/SKILL.md))

ดังนั้น split-zone proposal ของ SPK (`ai_context/` local work, `docs/`/tracker canonical, policy กลางที่ `docs/agents/artifacts.md`) เป็น SPK-specific extension และไม่ควรรอ upstream

## ความเสี่ยงหากรับ HEAD ทั้งก้อน

- **Review noise สูง**: 68 promoted paths ถูกแตะด้วย punctuation-only sweep ทำให้ semantic diff ถูกกลบ
- **Invocation mismatch**: literal `Skill tool` instructions ของ upstream อาจไม่ตรง Claude plugin namespace `spk` และ Codex generated payload; ต้องแปลงผ่าน workflow contract/generator
- **Behavior divergence ที่ตั้งใจไว้**: SPK เพิ่ม Thai-first behavior, effect levels, approval envelopes, evidence และ artifact paths ของตัวเอง การ copy ทับ source อาจลด guardrails
- **Excluded workflow risk**: `implement-spec` สร้าง branch, draft PR, worktrees และ merge ผ่าน subagents ซึ่งชนกับ approval model ของ SPK; `retro` ยังถูกประกาศเป็น stub ใน bucket README
- **Unreleased target**: package version ยังไม่เปลี่ยน การเลื่อน lock ไป HEAD เท่ากับรับ snapshot ของ `main` ไม่ใช่ release boundary

## คำแนะนำ

1. **ทำ artifact centralization ต่อได้เลย** โดยถือว่าเป็น SPK design ไม่ผูกกับ upstream refresh
2. **เปิด upstream review เป็นงานแยก** ที่ pin `6654f6b…` เพื่อให้ diff คงที่ แล้วใช้ `node scripts/check-upstream-drift.cjs --compare <reviewed-upstream-checkout>`; ยังไม่แก้ lock จน review behavior ครบ
3. **Backport ก่อนเฉพาะ behavior ที่ชัดและเข้ากับ SPK**: `wait-what` ตาม `CONTEXT-MAP.md`, separator ใน `asking`, และตรวจว่า user-invoked setup semantics ครบทุก caller; domain-modeling trigger มีแล้ว
4. **แยก editorial sweep ออกจาก behavior port**; ไม่จำเป็นต้องเอากฎ no-em-dash มาบังคับ Thai source แต่ควรเพิ่ม/คง front-matter parse test
5. **คง excluded buckets เหมือนเดิม**; ประเมิน `implement-spec`/`retro` เป็น design inspiration เท่านั้น ไม่เพิ่ม roster ในรอบนี้
6. หลัง review จึงอัปเดต `upstream-lock.json`, regenerate reference docs/mirrors ด้วย `npm run sync:upstream-docs -- --from <checkout> --pin 6654f6b…`, regenerate platform/docs และรัน `npm run verify:release` ตาม guardrail ของ repo

## Evidence gaps

- ไม่ได้ review unmerged PRs หรือ branches อื่น; ข้อสรุปนี้ครอบคลุม default branch `main` ณ HEAD ที่ระบุเท่านั้น
- review ครอบคลุม `upstream/main` ณ `6654f6b…` เท่านั้น; commit หลังจากนี้ต้องเข้ารอบ review ใหม่
- ไม่ได้รัน upstream skills ตรง ๆ บน Claude/Codex เพราะ canonical SPK source มี approval/evidence/localization overlays ของตัวเอง; behavior ที่รับถูกตรวจผ่าน SPK Thai/English/runtime payload และ release gates
