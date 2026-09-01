---
name: to-spec
description: สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ
disable-model-invocation: true
---
# สรุปเป็นสเปก

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions, `docs/agents/artifacts.md` และ
   `docs/agents/issue-tracker.md` ถ้ามี แล้วอ่านหลักปฏิบัติฉบับเต็มใน
   [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## ปลายทาง Artifact

เขียน draft ที่พร้อม review ลง `ai_context/work/specs/YYYY-MM-DD-spec-<slug>.md` เป็น
ค่าเริ่มต้น จากนั้น promote ไป canonical backend เดียวที่ `docs/agents/artifacts.md`
เลือกไว้: issue tracker ที่ตั้งค่าแล้ว หรือ `docs/specs/` สำหรับ project แบบ file-based
ถ้ายังไม่มี authority สำหรับ external publication ให้เก็บ draft ไว้ local ห้ามดูแล issue
และ Markdown file เป็น source of truth ที่แก้ไขได้สองชุด

## จุดเน้น

สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
