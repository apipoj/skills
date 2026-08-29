---
name: triage
description: คัดกรอง issue และ pull request ให้พร้อมตัดสินใจหรือพร้อมส่งต่อให้ agent ทำงาน
disable-model-invocation: true
---
# คัดกรองงาน

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions และหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## จุดเน้น

คัดกรอง issue และ pull request ให้พร้อมตัดสินใจหรือพร้อมส่งต่อให้ agent ทำงาน

## Approval ก่อนเขียน Tracker

การอ่าน (search, list, view issue/PR) ทำได้อิสระ ไม่ต้องขอ approval

ก่อนเขียนอะไรลง tracker หรือระบบภายนอก — ใส่ label, comment, assign หรือเปลี่ยน state — ต้องแสดง target และ payload ที่แน่นอน แล้วขอคำตอบรับแบบตรงไปตรงมา (plain affirmative) สำหรับชุดนั้นเป๊ะ ๆ gate นี้เป็น `confirm`: กดตัวเลือกที่อนุมัติหรือตอบรับธรรมดานับทั้งคู่ ส่วนคำถาม การขอแก้ คำตอบรับที่อยู่ใน quote หรือ code block และคำตอบที่มาก่อนแสดง payload ไม่นับ

การอนุมัติแบบ batch ครอบคลุมเฉพาะ batch ที่แสดงตอนนั้น เพิ่ม ลบ หรือเปลี่ยนรายการใดก็ทำให้ approval เดิมเป็นโมฆะ ต้องขอใหม่ ต้องระบุ repository/tracker selector ให้ชัดเจนเสมอ เช่น `GH_REPO=<owner/repo>` หรือ `--repo <owner/repo>` ห้ามปล่อยให้ CLI เดาเอง

## Autonomy Profile

`decision_aware` — ตรวจ fact และทำ draft ได้ถึง effect level ที่ skill ประกาศ โดย read-only ยังต้อง read-only แล้วถามได้สูงสุดหนึ่ง decision สำคัญ; prompt budget 1, repair budget 3 รอบ ก่อนหยุดต้องบันทึก decision ledger, evidence และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
