---
name: wayfinder
description: ทำแผนที่ decision สำหรับงานใหญ่ที่ยังมีหมอก แล้วคลี่คำถามทีละใบจนเส้นทางชัด
disable-model-invocation: true
---
# หาทางให้งานใหญ่

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Decision tickets

Maps and their child tickets carry only `wayfinder:` labels, never implementation
triage labels such as `ready-for-agent`. Read the ticket's type label before choosing
its workflow. Create tickets first; wire cross-references and blocking edges in a
second pass using real identifiers, because placeholders such as `#<n>` can link to
unrelated issues. Research branches remain references and are never merged; push only
with exact approval, and open no research PR unless the user explicitly requests one.

## Workflow

1. อ่านคำขอ repository instructions และหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## จุดเน้น

ทำแผนที่ decision สำหรับงานใหญ่ที่ยังมีหมอก แล้วคลี่คำถามทีละใบจนเส้นทางชัด

## Autonomy Profile

`decision_aware` — ตรวจ fact และทำ draft ได้ถึง effect level ที่ skill ประกาศ โดย read-only ยังต้อง read-only แล้วถามได้สูงสุดหนึ่ง decision สำคัญ; prompt budget 1, repair budget 3 รอบ ก่อนหยุดต้องบันทึก decision ledger, evidence และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
