---
name: start
description: เริ่มงานกับ AI แบบไทยเป็นหลัก โดยเลือก workflow ที่เล็กและตรงที่สุดให้ผู้ใช้ ไม่ต้องจำรายชื่อ skill
---

# เริ่มงานกับ Apipoj Skills

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
   - ทำ idea หรือ decision ให้ชัด → `ask-me`, `grill-me`, `grill-with-docs`
   - ทำ engineering plan → `plan`; สรุป discussion เป็น spec → `to-spec`
   - แตกงาน → `to-tickets`; งานใหญ่ที่ยังมีหมอก → `wayfinder`
   - พัฒนา approved plan → `implement`; ต้องการ RED-GREEN ชัด → `tdd`
   - failure ที่ยังไม่รู้ต้นเหตุ → `diagnosing-bugs`; ตรวจ diff → `code-review`; feedback จาก test แบบเร็ว → `scoped-tests`
   - ตอบคำถามด้วยของทดลอง → `prototype`; เทียบ UI หลายทาง → `design-shotgun`
   - ปรับรูปทรง module → `codebase-design`, `improve-codebase-architecture`
   - คัดกรองงานเข้า → `triage`; แก้ Git conflict → `resolving-merge-conflicts`
   - ใช้หรือเพิ่ม project knowledge → `query`, `research`, `ingest`, `domain-modeling`, `wiki-lint`
   - ตั้งค่าหรือทำความรู้จัก repo → `setup`, `prime`; ตรวจ installation → `doctor`
   - เตรียมส่งงาน → `release-check`, `pr`, `task-to-pr`, `deploy`; ถอนระบบ → `uninstall`
   - ส่งต่อ context → `handoff`; เรียนรู้เรื่องใหม่ → `teach`
5. รันเฉพาะ workflow ที่เลือกและอยู่ใน authority ถ้ามีงานข้างเคียงให้แนะนำเป็น next action แทนการ chain เอง
6. จบด้วยผลลัพธ์ก่อน ตามด้วยหลักฐาน ความเสี่ยง และ next action ที่เล็กที่สุด

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
- Strategy extras ไม่อยู่ใน default routing
- หลักฐานไม่พอให้บอกช่องว่าง ห้ามเดา
