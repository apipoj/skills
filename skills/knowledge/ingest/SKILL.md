---
name: ingest
description: นำเข้าแหล่งข้อมูลที่เลือกอย่างชัดเจนสู่ wiki ภายในโปรเจกต์ พร้อม provenance การตรวจ secrets การเชื่อม entity และบันทึกการเปลี่ยนแปลงแบบ append-only
disable-model-invocation: true
---
# Wiki Ingest

ทำ workflow นี้โดยตรงใน conversation ปัจจุบัน ไม่ส่งไป role วางแผน feature

## Workflow

1. **Resolve source เดียวเท่านั้น** รับ local file หรือ URL ที่ user ระบุชัดเจนหนึ่งรายการ ปฏิเสธ directory, glob, credential/env file, device path และ path นอก workspace สำหรับ URL ให้ fetch เฉพาะ URL นั้นและบันทึก final URL
2. **เตรียมอย่างปลอดภัย** ตรวจว่า `ai_context/sources/` และ `ai_context/wiki/` พร้อม ก่อนเก็บ raw content ต้องยืนยัน destination ด้วย `git check-ignore --no-index`; ถ้าไม่ถูก ignore ให้หยุดโดยไม่ copy
3. **Fingerprint + deduplicate** ก่อน arm shell guard ให้คำนวณ SHA-256 จาก bytes ของ source ที่ user อนุญาตชัดเจน ถ้า log มี hash เดิมให้รายงาน pages เดิมและไม่ rewrite
4. **เก็บ raw แบบ immutable** copy ไปชื่อที่ sanitize และ deterministic ใต้ `ai_context/sources/`; ห้าม overwrite file คนละเนื้อหา ห้ามพิมพ์ raw content ในคำตอบหรือ version control
5. **Arm guard** สร้าง `ai_context/.spk-wiki-build` ก่อน extract จาก stored source หรือเขียน wiki ระหว่างที่ guard ทำงานให้ใช้เฉพาะ read/search/write ที่ไม่ผ่าน shell เพราะ shell จะ fail closed ยกเว้น exact marker-cleanup command และลบ marker แบบ finally ทุกกรณีทั้ง success, failure, cancellation หรือ blocked
6. **Extract แบบ conservative** อ่าน wiki schema สร้าง/อัพเดตเฉพาะ `concept`, `entity`, `decision`, `plan`, `learning` ที่ notable ทุก claim ที่ไม่ obvious ต้องมี citation ค่าเหมือน secret ต้องแทนด้วย `<REDACTED:type origin=sources/file:line>` โดยห้าม copy ค่าจริง
7. **Link + verify** รักษา frontmatter, links/backlinks และ `index.md` ใช้ read/search แบบไม่ผ่าน shell เพื่อตรวจ secret, link, schema และ orphan บน proposed diff ก่อนเขียน ถ้า secret scan error ต้อง fail closed
8. **บันทึก evidence** append log entry ที่มี UTC timestamp, source/URL, content hash, pages ที่สร้าง/แก้, จำนวน redactions และผล verify
9. **Cleanup + report** ลบ guard แล้วคืน typed evidence receipt ที่มี source hash, wiki paths, verification, risks และ claims ที่ข้าม

read-only helper อาจช่วยสรุป source ใหญ่มากได้ แต่ main conversation ต้องเป็นเจ้าของ path validation, writes, verification และ cleanup

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี status, source hash, artifacts ที่สร้าง/แก้, verification commands/results, redaction count, risks และ next action

## ข้อควรระวัง

- `ai_context/sources/` เป็น raw private input; `ai_context/wiki/` ต้อง commit-safe
- ห้าม ingest มากกว่า source ที่ user ระบุ
- ห้าม overwrite เนื้อหาที่คนเขียนโดยไม่ merge และรักษา intent
- หลังจบ workflow ต้องไม่มี guard file ค้าง
