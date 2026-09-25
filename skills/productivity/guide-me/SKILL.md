---
name: guide-me
description: แนะนำก้าวถัดไปเมื่อผู้ใช้ยังไม่แน่ใจว่าจะทำอะไร โดยดูบริบทงาน ข้อมูลล่าสุดที่เกี่ยวข้อง และ skill ที่มีอยู่ก่อนเริ่มลงมือ
---

# ช่วยเลือกก้าวถัดไป

ช่วยผู้ใช้ที่รู้สถานการณ์ของตน แต่ยังไม่แน่ใจว่าควรทำอะไรต่อ ให้คำแนะนำหนึ่งอย่างที่ลงมือได้และมีหลักฐานรองรับ skill นี้เป็น read-only; ถ้าผู้ใช้เลือกงานที่จะ implement ชัดแล้วให้ใช้ `code` หรือ `start`

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.
- **Terminology** — reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`). Gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example.

Keep working without user input while the requested outcome remains inside current authority. Use a reversible smart default and record assumptions. Ask only when one material user-owned decision changes scope, risk, cost, or success, or when a required effect crosses an unapproved boundary.

When a decision or confirmation is needed, use the host's structured choice prompt if one is available; otherwise present a numbered list. Options must be genuinely distinct with exactly one recommended, every label names the real outcome, and a free-form answer stays possible.

## Workflow

1. จับเป้าหมาย สถานะปัจจุบัน ข้อจำกัด และเรื่องที่ผู้ใช้กำลังตัดสินใจ อ่านบทสนทนาและหลักฐานจาก project หรือ connected context ก่อนถามข้อเท็จจริงที่ตรวจเองได้ แยก fact, assumption และ decision ที่เป็นของผู้ใช้
2. เช็ก available skills ของ host หรือคำอธิบาย skill ใน plugin ที่ติดตั้งก่อนแนะนำ workflow ใช้ roster ใน repo นี้เฉพาะเมื่อทำงานกับ source repo ใช้ skill เดิมเมื่อเข้ากับงาน อย่าสร้างชื่อ command ขึ้นเอง `start` เหมาะกับงานที่เลือกแล้ว ส่วน `asking` เหมาะเมื่อมี decision หลายชั้นที่ต้องคลี่ `ask-me` เป็น manual-only: แนะนำให้ผู้ใช้พิมพ์เองได้ถ้าต้องการสัมภาษณ์ทีละ decision แต่ห้ามเรียกแทน
3. ใช้ web search เมื่อข้อมูลภายนอกที่เปลี่ยนได้อาจเปลี่ยนคำแนะนำ เช่น API, กฎ, ราคา, product options หรือข่าวล่าสุด เลือก primary source ตรวจวันที่ ใส่ link ใกล้ claim ที่ใช้ และแยก inference ให้ชัด ถ้าค้นเว็บไม่ได้ให้บอก freshness gap ไม่ต้องค้นเว็บเพื่อเติมความยาวถ้าหลักฐานในงานพอแล้ว
4. ถ้ายังมี decision สำคัญหนึ่งเรื่องที่ทำให้แนะนำต่อไม่ได้ ให้ถามคำถามที่เล็กที่สุดพร้อม default ที่แนะนำ แล้วรอคำตอบ ถ้ามี decision หลายชั้นที่ขวางคำแนะนำ ใช้แนวทาง `asking` ถามเฉพาะ frontier ที่พร้อมตอบเป็นรอบ อย่าทำ interview ยาวเมื่อมี next action ที่ปลอดภัยและย้อนกลับได้ชัดอยู่แล้ว
5. แนะนำ next action เพียงหนึ่งอย่าง ระบุว่าต้องเริ่มตรงไหน เหตุผลที่ควรทำตอนนี้ ผลที่สังเกตได้ว่าคืบหน้า และ skill เดิมที่เข้ากันถ้ามี กล่าวถึงทางเลือกอื่นเฉพาะเมื่อ tradeoff อาจเปลี่ยนการตัดสินใจ หากหลักฐานยังไม่พอ ให้ next action เป็นขั้นตรวจ fact ที่เจาะจง

## Autonomy Profile

`decision_aware` — ตรวจ fact และทำ draft ได้ถึง effect level ที่ skill ประกาศ โดย read-only ยังต้อง read-only แล้วถามได้สูงสุดหนึ่ง decision สำคัญ; prompt budget 1, repair budget 3 รอบ ก่อนหยุดต้องบันทึก decision ledger, evidence และ next action ที่ทำต่อได้

## Evidence Receipt

ตอบด้วยคำแนะนำภาษาปกติ พร้อมหลักฐานจาก project หรือ web ขั้นแรกที่ตรวจผลได้ skill เดิมที่ใช้ต่อได้เมื่อเกี่ยวข้อง และ assumption หรือ gap ที่มีนัยสำคัญ ไม่ต้องแสดง schema ภายใน

## Guardrails

- ห้าม implement, เขียนไฟล์, เปลี่ยน Git state หรือเปลี่ยนระบบภายนอกใน workflow นี้ คำแนะนำไม่ใช่การอนุญาตให้ทำ workflow ถัดไป
- รักษาเป้าหมายและข้อจำกัดที่ผู้ใช้บอก ไม่บังคับให้เป็นงาน software ถ้ามีขั้นที่ไม่ต้องเขียน code เหมาะกว่า
- อย่าอ้างว่ามี skill โดยไม่ตรวจ roster ที่ใช้ได้จริง
