---
name: prototype
description: สร้าง prototype แบบทิ้งได้เพื่อพิสูจน์คำถามด้าน logic, state หรือ UI ก่อนลงทุนทำ production
---
# ทำ prototype เพื่อตอบคำถาม

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions และหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## เลือกสาขาให้ถูกก่อน

ระบุก่อนว่ากำลังตอบคำถามไหน เลือกผิดคือเสีย prototype ทั้งอัน

- **"logic หรือ state model นี้ใช่หรือยัง"** → [LOGIC.md](LOGIC.md) สร้าง **ไฟล์ HTML ไฟล์เดียวที่ส่งต่อได้** มีปุ่มให้กดเล่นอิสระ บวกกับ walkthrough แบบแท็บที่พาไล่ทีละสถานการณ์ คนที่ไม่ใช่ developer ก็กดเองได้ ไม่ใช่ terminal app
- **"หน้าตาควรเป็นอย่างไร"** → [UI.md](UI.md) สร้าง UI หลายแบบที่ต่างกันชัดบน route เดียว สลับด้วย URL search param และแถบลอยด้านล่าง

ถ้าคำถามกำกวมจริงและถามผู้ใช้ไม่ได้ ให้เลือกตามบริบทรอบข้าง (backend module → logic, page หรือ component → UI) แล้วเขียนสมมติฐานที่ใช้ไว้บนหัว prototype

## รันได้ง่าย ๆ

UI prototype เริ่มด้วยคำสั่งเดียวจาก task runner ของโปรเจกต์ (`pnpm <name>`, `python <path>`, `bun <path>`) ส่วน logic demo คือไฟล์ HTML ไฟล์เดียวที่ดับเบิลคลิกเปิดได้เลย ทั้งสองทางต้องเริ่มได้โดยไม่ต้องคิด

## จุดเน้น

สร้าง prototype แบบทิ้งได้เพื่อพิสูจน์คำถามด้าน logic, state หรือ UI ก่อนลงทุนทำ production

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
