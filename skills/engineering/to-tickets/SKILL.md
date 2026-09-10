---
name: to-tickets
description: แตกสเปกหรือแผนเป็น vertical slices พร้อม blocking edges ที่ทำต่อได้จริง
---
# แตกงานเป็น ticket

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions และหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## จุดเน้น

แตกสเปกหรือแผนเป็น vertical slices พร้อม blocking edges ที่ทำต่อได้จริง

## Local product tickets

Consume the canonical spec and reviewed plan when supplied. Draft one local file per
vertical slice under `ai_context/work/tickets/<slug>/`, unless repository artifact policy
chooses another local destination. Each ticket links its spec ACs, test cases, selected
design, plan tasks, real blockers, observable done condition, and verification scope.
Check AC coverage, missing blockers, and dependency cycles before marking tickets ready.
Keep a single source of truth; external tracker publication needs separate authorization.

For an explicitly selected product loop, proceed with a consistent local breakdown and
return the first unblocked ticket to `start` for code. Ask only when granularity or ordering
changes a material product/scope decision. Ticket-only requests stop at the ticket files.
These instructions override UPSTREAM.md's blanket quiz/publish step and tracker-setup
prerequisite; the loop can finish locally without creating remote issues.

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
