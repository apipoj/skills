---
name: plan
description: วางแผนการเปลี่ยนแปลงซอฟต์แวร์จากหลักฐานใน repo เป็นความต้องการ สถาปัตยกรรม งานตามลำดับ dependency จุดตรวจสอบ และแผนย้อนกลับ
---
# plan

ผลิต plan สำหรับ developer พร้อม goal, non-goals, architecture, tasks แบบ TDD เล็ก ๆ, verification gates และ rollout notes

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- ดู project structure (CLAUDE.md, AGENTS.md, package.json, tsconfig, pyproject.toml, go.mod, Cargo.toml ฯลฯ)
- ดู plans ที่มีอยู่ใน `ai_context/wiki/plans/` ถ้ามี
- อ่าน handoff receipt ถ้ามี และบันทึกว่า user ต้องการ plan อย่างเดียวหรือต้องการให้ถาม
  เพื่อเริ่ม dev หลังเห็น plan

## Workflow

### 1. ชี้ชัด
- แปล feature description จาก request ของ user
- ระบุ goal, non-goals, assumptions และคำถามที่ยังเปิดอยู่
- ถ้าข้อมูลสำคัญขาด ให้ถามคำถามเดียวที่เจาะจงแทนที่จะเดา

### 2. Architecture
- เสนอ architecture approach พร้อม source areas ที่ชัด
- ระบุ files, modules และ interfaces ที่ได้รับผลกระทบ
- บันทึก dependencies, risks และ migration concerns

### 3. แตก Task
- แยก feature เป็น tasks เล็ก ๆ (action 2-5 นาทีที่ทำได้)
- แต่ละ task ต้องมี: files ที่จะแตะ, expected change, TDD steps (RED/GREEN), verification commands และ commit message
- Tasks ต้องตรวจสอบได้แบบอิสระ

### 4. Verification Gates
- กำหนด verification gates ระหว่าง task groups
- รวม regression test commands
- รวม docs update tasks

### 5. Rollout และ Rollback
- บันทึก rollout steps และลำดับ
- บันทึก rollback plan
- บันทึก risks และ mitigations

### 6. บันทึก Plan
- บันทึกที่ `ai_context/wiki/plans/YYYY-MM-DD-<slug>.md`
- อัพเดต wiki index และ log

### 7. Handoff ไป Dev เมื่อมีการขอไว้

ใช้ขั้นนี้เฉพาะเมื่อ request ปัจจุบันหรือ handoff จาก `ask-me` ขอ flow แบบ plan-to-dev
หลัง verifier รับ plan แล้ว ให้แสดง scope ของ reviewed plan และถาม:

```markdown
## แผนพร้อมแล้ว

การเริ่ม dev จะเขียนหรือแก้ code, tests และ docs ใน workspace ตาม plan ที่แสดงนี้

เริ่ม dev ตาม plan นี้ไหม?

คำแนะนำ: ถ้า plan ถูกต้อง ให้ตอบ "เริ่มพัฒนาตาม plan"; ถ้าต้องแก้ ให้บอกจุดที่ต้องแก้ก่อน
```

ข้อความก่อนเห็น plan เช่น “ทำ plan แล้วเริ่ม dev” อนุญาตเฉพาะ planning เพราะตอนนั้นยังไม่มี
plan ให้ตรวจ เริ่ม workflow `code` ได้หลัง user อนุมัติ plan ฉบับที่เพิ่งแสดงอย่างชัดเจน
เท่านั้น ถ้า plan ยัง blocked, verify ไม่ผ่าน หรือมี decision สำคัญค้างอยู่ ห้ามถามเพื่อเริ่ม dev

## Output Format

```markdown
## Plan: <feature name>
- Goal: <หนึ่งประโยค>
- Non-goals: <list>
- Assumptions: <list>
- Architecture: <approach>
- Tasks: <numbered list พร้อม file paths, TDD steps, verification>
- Gates: <verification checkpoints>
- Rollout: <steps>
- Rollback: <plan>
- Risks: <list>
- Open questions: <list>
```

## มาตรฐาน Plan

- Tasks เป็น action 2-5 นาทีที่ตรวจสอบได้แบบอิสระ
- ทุก task มี file path ที่ชัดหรือขั้นตอน discovery ที่ชัด
- ทุกการเปลี่ยน behavior มีขั้นตอน TDD
- Plan บอกว่าจะไม่ build อะไร
- Acceptance criteria สังเกตได้และ test ได้
- ถ้าความไม่แน่นอนเปลี่ยน architecture ให้ถามคำถามเดียวที่เจาะจงแทนที่จะเดา

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี plan artifact, repository evidence, acceptance criteria,
verifier result, assumptions, risks, handoff intent และ
`implementation_authorized: false` จนกว่าจะได้คำตอบใหม่หลังแสดง plan

## ข้อควรระวัง

- ห้าม implement, commit, push หรือ deploy ระหว่าง planning
- ห้ามนับคำยืนยันสรุปหรือคำขอ “plan แล้ว dev” ก่อนเห็น plan เป็น approval ของ plan
- ถ้า scope สำคัญเปลี่ยน ให้กลับไปถาม user แทนการส่งต่อไป dev
