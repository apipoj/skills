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
   - `git_write` — เปลี่ยน local Git แบบย้อนกลับได้เมื่อคำขอของ workflow ระบุ authority นี้ชัด
   - `external_write` — เปลี่ยน remote ตาม approval mode ที่ workflow นั้นประกาศ
   - `destructive` — ลบข้อมูลหลังแสดง target ที่แน่นอนและได้รับอนุมัติ
4. Route ตาม outcome:
   - ทำ idea หรือเรื่องที่ต้องตัดสินใจให้ชัด → `ask-me`, `asking`, `ask-with-docs`; เรื่องที่ตอบเองไม่ได้ต้องส่งให้ผู้เชี่ยวชาญที่ไม่อยู่ตรงหน้าตอบ → `to-questionnaire`
   - คำตอบก่อนหน้ายังไม่โดน หรือผู้ใช้บอกว่า "งง" → `wait-what`
   - ทำ engineering plan → `plan`; สรุป discussion เป็น spec → `to-spec`
   - แตกงาน → `to-tickets`; งานใหญ่ที่ยังมีหมอก → `wayfinder`
   - implement, fix, refactor หรือ plan-and-implement → adaptive `code`; ต้องการ strict RED-GREEN หรือ orchestration ตามความเสี่ยง → `tdd`
   - failure ที่ยังไม่รู้ต้นเหตุ → `debug`; ตรวจ diff → `code-review`; feedback จาก test แบบเร็ว → `test-changes`
   - ตอบคำถามด้วยของทดลอง → `prototype`; เทียบ UI หลายทาง → `design-options`
   - ปรับรูปทรง module → `codebase-design`, `improve-codebase`
   - คัดกรองงานเข้า → `triage`; แก้ Git conflict → `fix-conflicts`
   - ใช้หรือเพิ่มความรู้โปรเจกต์ → `ask-project`, `research`, `add-knowledge`, `domain-modeling`, `check-wiki`
   - ตั้งค่าหรือทำความรู้จัก repo → `setup`, `load-project`; เขียน bash setup wizard สำหรับขั้นตอนที่ต้องทำเองเท่านั้น → `wizard`; ตรวจ installation → `doctor`
   - เตรียมส่งงาน → `check-release`, `pr`, `task-to-pr`, `deploy`; ถอนระบบ → `uninstall`
   - ส่งต่อ context → `handoff`; เรียนรู้เรื่องใหม่ → `teach`; เขียน agent docs หรือ skill → `write-skills`

   ตัวอย่างเลือก development mode — default ใช้ `code`; เลือก `tdd` เมื่อผู้ใช้ขอ
   test-first ชัดเจน หรือ behavior เสี่ยงสูงมี test seam ที่ reliable และคุ้มต้นทุน:
   - แก้ copy, CSS, config, simple wiring หรือ internal refactor → `code`
   - สำรวจ feature ที่ behavior ยังไม่นิ่ง → `code` จน data shape และ contract นิ่ง
   - payment calculation, permission logic, migration หรือ concurrency ที่มี stable seam → `tdd`
   - bug ที่ reproduce ได้และเขียน regression test ที่ reliable ได้ → `tdd`; ถ้า seam ยังไม่ดี
     ให้ `code` เก็บ runtime reproduction เป็นหลักฐานก่อน

   ถ้า outcome ตรงกับ skill แบบ manual-only (`disable-model-invocation`) ให้บอกคำสั่ง `/<name>` ให้ผู้ใช้แล้วหยุด ไม่ต้องเรียกใช้เอง
5. รัน workflow ที่เลือกไปจนถึงผลลัพธ์ที่ตรวจได้ คำขอแบบ end-to-end ที่ชัดให้ bounded
   workspace authority ต่อเนื่องผ่าน plan, implementation, test และ local QA โดยไม่ถาม
   อนุมัติ local ซ้ำ
6. จบด้วยผลลัพธ์ก่อน ตามด้วยหลักฐาน ความเสี่ยง และ next action ที่เล็กที่สุด

## รอยต่อระหว่าง phase

เมื่อจบก้อนงานหนึ่งแล้วจะขึ้นก้อนถัดไป มีห้าทางเลือก ไล่จากบนลงล่าง ข้อแรกที่ตอบว่าใช่ชนะ

1. **ทำต่อ** ถ้า phase ถัดไปต้องใช้ phase นี้เป็น primary source หรือยังเหลือ smart zone พอ (~150k token) — ไม่มีต้นทุนและไม่เสียอะไร จึงตัดออกก่อนเสมอ
2. **`/clear`** ถ้า context นี้ไม่เกี่ยวกับสิ่งที่จะทำต่อเลย
3. **`handoff`** เฉพาะตอนย้าย harness ย้าย directory ส่งให้เพื่อนร่วมงาน หรือแตกงานข้างเคียงกลาง phase — สิ่งที่ได้คือความพกพาได้
4. **subagent** ถ้างานแคบพอจะรันโดยไม่ต้องมีคนเฝ้า
5. **`/compact`** นอกนั้น เป็นค่าเริ่มต้นที่อยู่ล่างสุด ไม่ใช่ท่าแรกที่ควรคว้า

ตัดสินใจที่รอยต่อเท่านั้น กลาง phase ให้ทำต่อหรือแยกงานที่เหลือไปให้ subagent รายละเอียดเต็มอยู่ใน [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md)

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

สรุปหลักฐานท้ายคำตอบด้วยภาษาที่ผู้ใช้อ่านเข้าใจง่ายและกระชับ ใส่เฉพาะสิ่งที่ช่วยให้
ตัดสินใจหรือทำต่อได้: ผลลัพธ์ หลักฐานสำคัญ ความเสี่ยงหรือ approval ที่ยังต้องใช้ และ
next action เมื่อมี ห้ามแสดง YAML, JSON, schema name, ชื่อ field ภายใน, enum หรือ field
ว่าง เว้นแต่ผู้ใช้ขอ machine-readable output โดยตรง

## Guardrails

- Router สร้าง authority เองไม่ได้: plan-only ต้องหยุดที่ plan แต่คำขอ end-to-end ที่ชัดให้ทำ local implementation ต่อได้
- `task-to-pr` ทำอัตโนมัติได้เฉพาะ task ที่ระบุหนึ่งรายการ และห้าม merge หรือ deploy
- ห้ามข้าม approval boundary ของ standalone `pr`, `deploy` และ `uninstall`
- ให้คำแนะนำหนึ่งตัวและใช้ workflow เดียวเมื่อพอ
- `bala` และ `sunzi` อยู่ใน default bundle แต่เป็น manual-only จึงไม่ route ให้อัตโนมัติ
- หลักฐานไม่พอให้บอกช่องว่าง ห้ามเดา
