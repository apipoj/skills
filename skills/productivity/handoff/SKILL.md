---
name: handoff
description: ย่อบริบทที่จำเป็นเป็น handoff ซึ่ง session ใหม่อ่านแล้วทำงานต่อได้โดยไม่เดา
disable-model-invocation: true
---
# ส่งต่องานข้าม session

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## ปลายทางไฟล์

เขียน handoff เป็นไฟล์ `handoff-<ISO-date>-<slug>.md` (เช่น `handoff-2026-08-29-refactor-auth.md`) **ที่ project root ของ workspace ปัจจุบัน** — ไม่ใช่ temp directory ของ OS — เพราะ effect level ของ skill นี้คือ `workspace_write` ถ้าผู้ใช้อยากได้ปลายทางอื่น (เช่น temp directory หรือ path เฉพาะ) ให้เขียนตามที่ผู้ใช้ระบุแทน

## Workflow

1. อ่านบทสนทนาปัจจุบันและหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md) ถ้าผู้ใช้ส่ง argument มา ให้ตีความว่าเป็นสิ่งที่ session ถัดไปจะโฟกัส และปรับเนื้อหาเอกสารให้ตรงกับนั้น
2. เก็บเนื้อหาให้ครบ: เป้าหมาย, สถานะปัจจุบัน, การตัดสินใจสำคัญพร้อมเหตุผล, gotchas/สิ่งที่ต้องระวัง, next steps ที่ทำต่อได้ทันที และ path ของไฟล์ที่แก้ไขหรือเกี่ยวข้อง — ห้ามคัดลอกเนื้อหาที่มี artifact อื่นเก็บไว้แล้ว (spec, plan, ADR, issue, commit, diff) ให้ reference ด้วย path หรือ URL แทน
3. เพิ่มหัวข้อ "Suggested Skills" แนะนำ skill ที่ session ถัดไปควรเรียกใช้
4. Redact ข้อมูลอ่อนไหวทุกจุด เช่น API key, password, token หรือข้อมูลส่วนบุคคล ก่อนเขียนไฟล์จริง
5. เขียนไฟล์ตามปลายทางด้านบน แล้วรายงาน path ที่เขียนจริง

**เสร็จเมื่อ:** ไฟล์ handoff ถูกเขียนจริง มีหัวข้อที่กำหนดครบ และรายงาน path แล้ว

## จุดเน้น

ย่อบริบทที่จำเป็นเป็น handoff ซึ่ง session ใหม่อ่านแล้วทำงานต่อได้โดยไม่เดา

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน path ของไฟล์ handoff ที่เขียนจริง, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- เขียนที่ project root เป็นค่าเริ่มต้น ใช้ temp directory ของ OS หรือปลายทางอื่นเฉพาะเมื่อผู้ใช้ขอ
- Reference artifact ที่มีอยู่แล้ว (spec, plan, ADR, issue, commit, diff) ด้วย path หรือ URL แทนการคัดลอกเนื้อหา
- Redact secret, credential และข้อมูลส่วนบุคคลก่อนเขียนไฟล์เสมอ
- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
