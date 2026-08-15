---
name: start
description: เริ่มงานกับ AI แบบไทยเป็นหลัก โดยเลือก workflow ที่เล็กและตรงที่สุดให้ผู้ใช้ ไม่ต้องจำรายชื่อ skill
---

# เริ่มงานกับ Apipoj Skills

เมื่อต้องให้ตัดสินใจหรือยืนยัน ให้ใช้ structured choice prompt ของ host ถ้ามี ถ้าไม่มีให้ใช้ numbered list ตัวเลือกต้องต่างกันจริงและมีข้อแนะนำหนึ่งข้อ ทุก label ต้องบอกผลลัพธ์จริง และตอบแบบ free-form ได้เสมอ

พาผู้ใช้จากสิ่งที่อยากได้ไปถึงผลลัพธ์ด้วยทางที่สั้นและปลอดภัยที่สุด ถ้าคำขอชัด ให้ route ทันทีโดยไม่เปลี่ยนการเลือกทางเป็นพิธีวางแผนอีกรอบ

## ประสบการณ์แบบพร้อมใช้

ตอบภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้คำ technical ภาษาอังกฤษเมื่ออ่านง่ายกว่า และเริ่มจากผลลัพธ์ที่ผู้ใช้ต้องรู้

ใช้ smart default ได้เมื่อย้อนกลับง่ายและไม่เปลี่ยน scope ถ้ามี decision ที่เปลี่ยน scope, risk, cost หรือความสำเร็จ ให้ถามเพียงหนึ่งคำถามพร้อมคำตอบที่แนะนำแล้วรอ

## Workflow

1. อ่านคำขอและ repository instructions แยก fact ที่ตรวจเองได้ออกจาก decision ที่ผู้ใช้ต้องเลือก
2. ถ้าเจตนาชัด ให้เลือก canonical workflow เดียวทันที ถ้ายังเปลี่ยนผลลัพธ์ได้จึงถามหนึ่งคำถาม ห้ามโยนรายชื่อ skill ทั้งหมดให้ผู้ใช้เลือกเอง
3. บอก workflow และ effect จริงก่อนลงมือ:
   - `read_only` — ตรวจและรายงานเท่านั้น
   - `workspace_write` — สร้างหรือแก้ local files ใน scope ที่อนุมัติ
   - `git_write` — เปลี่ยน local Git หลังได้ approval ที่ตรงเป้าหมาย
   - `external_write` — เปลี่ยน GitHub, issue tracker, deployment หรือระบบภายนอกหลังได้ approval
   - `destructive` — ลบข้อมูลหลังแสดง target ที่แน่นอนและได้รับอนุมัติ
4. Route ตาม outcome:
   - ทำ idea หรือเรื่องที่ต้องตัดสินใจให้ชัด → `ask-me`, `asking`, `ask-with-docs`
   - ทำ engineering plan → `plan`; สรุป discussion เป็น spec → `to-spec`
   - แตกงาน → `to-tickets`; งานใหญ่ที่ยังมีหมอก → `wayfinder`
   - พัฒนาแผนที่อนุมัติแล้ว → `code`; ต้องการ RED-GREEN ชัด → `tdd`
   - failure ที่ยังไม่รู้ต้นเหตุ → `debug`; ตรวจ diff → `code-review`; feedback จาก test แบบเร็ว → `test-changes`
   - ตอบคำถามด้วยของทดลอง → `prototype`; เทียบ UI หลายทาง → `design-options`
   - ปรับรูปทรง module → `codebase-design`, `improve-codebase`
   - คัดกรองงานเข้า → `triage`; แก้ Git conflict → `fix-conflicts`
   - ใช้หรือเพิ่มความรู้โปรเจกต์ → `ask-project`, `research`, `add-knowledge`, `domain-modeling`, `check-wiki`
   - ตั้งค่าหรือทำความรู้จัก repo → `setup`, `load-project`; ตรวจ installation → `doctor`
   - เตรียมส่งงาน → `check-release`, `pr`, `task-to-pr`, `deploy`; ถอนระบบ → `uninstall`
   - ส่งต่อ context → `handoff`; เรียนรู้เรื่องใหม่ → `teach`
5. รันเฉพาะ workflow ที่เลือกและอยู่ใน authority ถ้ามีงานข้างเคียงให้แนะนำเป็น next action แทนการ chain เอง
6. จบด้วยผลลัพธ์ก่อน ตามด้วยหลักฐาน ความเสี่ยง และ next action ที่เล็กที่สุด

## รอยต่อระหว่าง phase

เมื่อจบก้อนงานหนึ่งแล้วจะขึ้นก้อนถัดไป มีห้าทางเลือก ไล่จากบนลงล่าง ข้อแรกที่ตอบว่าใช่ชนะ

1. **ทำต่อ** ถ้า phase ถัดไปต้องใช้ phase นี้เป็น primary source หรือยังเหลือ smart zone พอ (~150k token) — ไม่มีต้นทุนและไม่เสียอะไร จึงตัดออกก่อนเสมอ
2. **`/clear`** ถ้า context นี้ไม่เกี่ยวกับสิ่งที่จะทำต่อเลย
3. **`handoff`** เฉพาะตอนย้าย harness ย้าย directory ส่งให้เพื่อนร่วมงาน หรือแตกงานข้างเคียงกลาง phase — สิ่งที่ได้คือความพกพาได้
4. **subagent** ถ้างานแคบพอจะรันโดยไม่ต้องมีคนเฝ้า
5. **`/compact`** นอกนั้น เป็นค่าเริ่มต้นที่อยู่ล่างสุด ไม่ใช่ท่าแรกที่ควรคว้า

ตัดสินใจที่รอยต่อเท่านั้น กลาง phase ให้ทำต่อหรือแยกงานที่เหลือไปให้ subagent รายละเอียดเต็มอยู่ใน [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md)

## Evidence Receipt

```yaml
schema: spk.evidence/v1
workflow: <canonical skill>
effect: <read_only|workspace_write|git_write|external_write|destructive>
reason: <เหตุผลหนึ่งประโยค>
status: <complete|needs_user_input|blocked>
approval_required: <true|false>
```

## Guardrails

- Router เพิ่ม authority ไม่ได้: อนุมัติ plan ไม่เท่ากับอนุมัติ dev และการสร้างไฟล์ไม่เท่ากับอนุมัติ Git หรือ remote write
- ห้ามข้าม approval boundary ของ `pr`, `task-to-pr`, `deploy` และ `uninstall`
- ให้คำแนะนำหนึ่งตัวและใช้ workflow เดียวเมื่อพอ
- `bala` และ `sunzi` อยู่ใน default bundle แต่เป็น manual-only จึงไม่ route ให้อัตโนมัติ
- หลักฐานไม่พอให้บอกช่องว่าง ห้ามเดา
