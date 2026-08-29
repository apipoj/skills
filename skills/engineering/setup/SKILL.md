---
name: setup
description: ตั้งค่า issue tracker, domain docs และ defaults ที่ skill อื่นใช้ร่วมกันใน repository นี้
disable-model-invocation: true
---
# ตั้งค่า Apipoj Skills

เมื่อต้องให้ตัดสินใจหรือยืนยัน ให้ใช้ structured choice prompt ของ host ถ้ามี ถ้าไม่มีให้ใช้ numbered list ตัวเลือกต้องต่างกันจริงและมีข้อแนะนำหนึ่งข้อ ทุก label ต้องบอกผลลัพธ์จริง และตอบแบบ free-form ได้เสมอ

Scaffold ค่า config ระดับ repo ที่ engineering skills อื่นคาดหวังไว้:

- **Issue tracker** — ที่ที่ issue ของ repo นี้อยู่ (default เป็น GitHub; local markdown ก็รองรับตั้งแต่แรก)
- **Triage labels** — string ที่ใช้แทนบทบาท triage มาตรฐาน 5 แบบ
- **Domain docs** — `CONTEXT.md` และ ADR อยู่ที่ไหน และกฎการอ่านสำหรับ consumer

skill นี้เป็นแบบ prompt-driven ไม่ใช่ script ที่ทำงานตายตัว ให้ explore ก่อน แสดงสิ่งที่เจอ ยืนยันกับ user แล้วค่อยเขียน

## Process

### 1. Explore

ดู repo ปัจจุบันเพื่อเข้าใจสถานะเริ่มต้น อ่านของจริงที่มีอยู่ อย่าเดาเอาเอง:

- `git remote -v` และ `.git/config` — repo นี้เป็น GitHub repo ไหม ของอะไร
- `AGENTS.md` และ `CLAUDE.md` ที่ root — มีไฟล์ไหนอยู่แล้วบ้าง มี section `## Agent skills` อยู่แล้วหรือยัง
- `CONTEXT.md` และ `CONTEXT-MAP.md` ที่ root
- `docs/adr/` และ `src/*/docs/adr/` ที่มีอยู่
- `docs/agents/` — output เดิมของ skill นี้มีอยู่แล้วหรือยัง
- `.scratch/` — สัญญาณว่ามี convention local-markdown issue tracker อยู่แล้ว
- skill `triage` ติดตั้งอยู่ไหม (มีโฟลเดอร์ skill `triage` อยู่ข้าง ๆ skill นี้ หรือ `triage` อยู่ใน skill ที่ใช้ได้) ข้อนี้เป็นตัวตัดสินว่า Section B จะรันหรือไม่
- สัญญาณ monorepo — `pnpm-workspace.yaml`, field `workspaces` ใน `package.json`, หรือ `packages/*` ที่มี `src/` ของตัวเองและมีของจริงอยู่ข้างใน ให้เสนอเฉพาะตอนที่เป็น multi-package repo ขนาดใหญ่จริง ๆ ถ้าไม่เจอสัญญาณเหล่านี้แปลว่า single-context ซึ่งเป็นกรณีส่วนใหญ่ของ repo ทั่วไป

### 2. แสดงสิ่งที่เจอแล้วถาม

สรุปว่ามีอะไรอยู่แล้วและอะไรยังขาด จากนั้นไล่ทีละ section — ถามหนึ่ง section ตอบหนึ่งคำตอบ ค่อยไป section ถัดไป

นำแต่ละ section ด้วยคำตอบที่แนะนำ เพื่อให้ user ตอบรับได้ในคำเดียว ให้คำอธิบายสั้น ๆ เฉพาะตอนที่ตัวเลือกแตกต่างกันจริง ๆ และข้าม section ไปเลยถ้า exploration ตัดสินให้แล้ว (ข้าม Section B ถ้าไม่มี `triage` ติดตั้ง, ข้าม Section C ถ้าไม่มี monorepo)

**Section A — Issue tracker**

> คำอธิบาย: "issue tracker" คือที่ที่ issue ของ repo นี้ถูกเก็บ skill อย่าง `to-tickets`, `triage`, `to-spec` และ `check-release` อ่านและเขียนไปที่นี่ — พวกเขาต้องรู้ว่าควรเรียก `gh issue create`, เขียนไฟล์ markdown ใต้ `.scratch/`, หรือทำตาม workflow อื่นที่ user อธิบายไว้ ให้เลือกที่ที่ track งานของ repo นี้จริง ๆ

ท่าทีเริ่มต้น: skill พวกนี้ถูกออกแบบมาสำหรับ GitHub ถ้า `git remote` ชี้ไปที่ GitHub ให้เสนอ GitHub ถ้าชี้ไปที่ GitLab (`gitlab.com` หรือ self-hosted) ให้เสนอ GitLab นอกจากนั้น (หรือถ้า user อยากเลือกเอง) ให้เสนอ:

- **GitHub** — issue อยู่ใน GitHub Issues ของ repo นี้ (ใช้ `gh` CLI)
- **GitLab** — issue อยู่ใน GitLab Issues ของ repo นี้ (ใช้ [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown** — issue เป็นไฟล์ใต้ `.scratch/<feature>/` ใน repo นี้ (เหมาะกับโปรเจกต์เดี่ยวหรือ repo ที่ไม่มี remote)
- **อื่น ๆ** (Jira, Linear ฯลฯ) — ให้ user อธิบาย workflow เป็นย่อหน้าเดียว skill จะบันทึกไว้เป็น freeform prose

บันทึกตัวเลือกลง `docs/agents/issue-tracker.md` template ของ GitHub และ GitLab มี flag "PRs as a request surface" ซึ่ง default เป็น **off** — ให้ปล่อยไว้ off และไม่ต้องยกขึ้นมาถาม user ที่อยากให้ external PR เข้า triage queue ปรับ flag ในไฟล์นี้เองทีหลังได้

**Section B — Triage label vocabulary** ข้าม section นี้ทั้งหมดถ้า skill `triage` ไม่ได้ติดตั้ง (exploration บอกไว้แล้ว) — skill ที่ไม่ได้ติดตั้งไม่ต้องมี label

ถ้าติดตั้งอยู่ ให้ถามคำถามเดียวเท่านั้น:

> อยากใช้ triage labels ค่า default ไหม (แนะนำ: **ใช่**)

ค่า default คือ 5 บทบาทมาตรฐาน โดยแต่ละ label string เท่ากับชื่อของมัน: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` ถ้าตอบ **ใช่** ให้เขียนตามนี้เลย เฉพาะตอนที่ user ตอบไม่ใช่เท่านั้น — ปกติเพราะ tracker เดิมใช้ชื่ออื่นอยู่แล้ว (เช่น `bug:triage` แทน `needs-triage`) — ให้เก็บ override เพื่อให้ `triage` ใช้ label ที่มีอยู่แทนการสร้างซ้ำ

**Section C — Domain docs** default เป็น **single-context** — มี `CONTEXT.md` + `docs/adr/` เดียวที่ root เหมาะกับ repo ส่วนใหญ่ ให้เขียนได้เลยโดยไม่ต้องถาม

เสนอ **multi-context** — `CONTEXT-MAP.md` ที่ root ชี้ไปหา `CONTEXT.md` ของแต่ละ context — เฉพาะตอนที่ exploration เจอสัญญาณ monorepo แล้วค่อยยืนยันว่าจะใช้ layout แบบไหน

### 3. ยืนยันและแก้ไข

แสดง draft ให้ user ดู:

- block `## Agent skills` ที่จะเพิ่มเข้าไปในไฟล์ `CLAUDE.md` หรือ `AGENTS.md` (ดูกฎการเลือกไฟล์ในขั้นตอนที่ 4)
- เนื้อหาของ `docs/agents/issue-tracker.md`, `docs/agents/domain.md` และ `docs/agents/triage-labels.md` (ไฟล์หลังเฉพาะตอนที่ `triage` ติดตั้งอยู่)

ให้ user แก้ก่อนเขียนจริงได้

### 4. เขียน

**เลือกไฟล์ที่จะแก้:**

- ถ้ามี `CLAUDE.md` อยู่แล้ว ให้แก้ไฟล์นั้น
- ถ้าไม่มีแต่มี `AGENTS.md` ให้แก้ไฟล์นั้นแทน
- ถ้าไม่มีทั้งคู่ ให้ถาม user ว่าจะสร้างไฟล์ไหน อย่าเลือกเอง

ห้ามสร้าง `AGENTS.md` ถ้ามี `CLAUDE.md` อยู่แล้ว (หรือกลับกัน) — แก้ไฟล์ที่มีอยู่แล้วเสมอ

ถ้ามี block `## Agent skills` อยู่แล้วในไฟล์ที่เลือก ให้อัพเดตเนื้อหาในที่เดิมแทนการเพิ่มซ้ำ อย่าเขียนทับ section รอบข้างที่ user แก้ไว้เอง

Block นี้:

```markdown
## Agent skills

### Issue tracker

[สรุปหนึ่งบรรทัดว่า issue อยู่ที่ไหน] ดู `docs/agents/issue-tracker.md`

### Triage labels

[สรุปหนึ่งบรรทัดของ label vocabulary] ดู `docs/agents/triage-labels.md`

### Domain docs

[สรุปหนึ่งบรรทัดของ layout — "single-context" หรือ "multi-context"] ดู `docs/agents/domain.md`
```

ใส่ sub-block `### Triage labels` และเขียน `docs/agents/triage-labels.md` เฉพาะตอนที่ `triage` ติดตั้งอยู่และ Section B รันจริง ถ้าไม่ใช่ ให้ข้ามทั้งสองอย่าง

จากนั้นเขียนไฟล์ docs โดยใช้ seed template ในโฟลเดอร์ skill นี้เป็นจุดตั้งต้น:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (เฉพาะตอนที่ `triage` ติดตั้งอยู่)
- [domain.md](./domain.md) — กฎ consumer ของ domain docs + layout

สำหรับ issue tracker แบบ "อื่น ๆ" ให้เขียน `docs/agents/issue-tracker.md` จากศูนย์โดยใช้คำอธิบายของ user

### 5. เสร็จสิ้น

บอก user ว่า setup เสร็จแล้ว และ engineering skill ไหนบ้างที่จะอ่านจากไฟล์พวกนี้ต่อไป บอกด้วยว่าแก้ `docs/agents/*.md` เองภายหลังได้เลย รัน skill นี้ซ้ำจำเป็นเฉพาะตอนอยากเปลี่ยน issue tracker หรือเริ่มใหม่ทั้งหมด

## Autonomy Profile

`decision_aware` — ตรวจ fact และทำ draft ได้ถึง effect level ที่ skill ประกาศ โดย read-only ยังต้อง read-only แล้วถามได้สูงสุดหนึ่ง decision สำคัญ; prompt budget 1, repair budget 3 รอบ ก่อนหยุดต้องบันทึก decision ledger, evidence และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
