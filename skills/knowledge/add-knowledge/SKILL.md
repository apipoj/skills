---
name: add-knowledge
description: เพิ่มข้อมูลที่เลือกเข้า wiki ของโปรเจกต์ พร้อมที่มา การตรวจ secret และบันทึกการเปลี่ยนแปลง
disable-model-invocation: true
---
# เพิ่มความรู้ให้โปรเจกต์

ทำ workflow นี้โดยตรงใน conversation ปัจจุบัน ไม่ส่งไป role วางแผน feature

อ่าน `docs/agents/artifacts.md` ถ้ามี ให้ถือ `ai_context/wiki/` เป็น derived memory ไม่ใช่
canonical document store ชุดที่สอง หน้าเกี่ยวกับ canonical artifact เก็บ summary และ
pointer เท่านั้น ห้ามคัดลอก body

## Workflow

1. **Resolve source เดียวเท่านั้น** รับ local file หรือ URL ที่ user ระบุชัดเจนหนึ่งรายการ ปฏิเสธ directory, glob, credential/env file, device path และ path นอก workspace สำหรับ URL ให้ fetch เฉพาะ URL นั้นและบันทึก final URL
2. **เตรียมอย่างปลอดภัย** ตรวจว่า `ai_context/sources/` และ `ai_context/wiki/` พร้อม ก่อนเก็บ raw content ต้องยืนยัน destination ด้วย `git check-ignore --no-index`; ถ้าไม่ถูก ignore ให้หยุดโดยไม่ copy ถ้า workspace ไม่ใช่ git repo คำสั่งนี้จะ error แทนที่จะตอบ ให้ fail closed แบบเดียวกัน: รายงาน `NOT_A_GIT_REPO` ห้าม copy ใด ๆ และบอกให้ user เพิ่มไฟล์ลง `ai_context/sources/` เอง
3. **Fingerprint + deduplicate** ก่อน arm shell guard ให้คำนวณ SHA-256 จาก bytes ของ source ที่ user อนุญาตชัดเจน ถ้า log มี hash เดิมให้รายงาน pages เดิมและไม่ rewrite
4. **เก็บ raw แบบ immutable** copy ไปชื่อที่ sanitize และ deterministic ใต้ `ai_context/sources/`; ห้าม overwrite file คนละเนื้อหา ห้ามพิมพ์ raw content ในคำตอบหรือ version control
5. **Arm guard** สร้าง `ai_context/.spk-wiki-build` ก่อน extract จาก stored source หรือเขียน wiki ระหว่างที่ guard ทำงานให้ใช้เฉพาะ read/search/write ที่ไม่ผ่าน shell เพราะ shell จะ fail closed ยกเว้น exact marker-cleanup command และลบ marker แบบ finally ทุกกรณีทั้ง success, failure, cancellation หรือ blocked marker นี้หมดอายุเองหลัง 2 ชั่วโมง คำสั่งลบที่ตรงตัวบน POSIX คือ `rm -f ai_context/.spk-wiki-build` ส่วนสะกดที่ตรงตัวของ shell อื่นดูได้ใน `scripts/gitignore-guard.cjs` (`MARKER_CLEANUP_COMMANDS`)
6. **Extract แบบ conservative** อ่าน wiki schema สร้าง/อัพเดตเฉพาะ `concept`, `entity`,
   `decision`, `plan`, `learning` ที่ notable หน้า `decision` และ `plan` เป็น derived
   summary + pointer ไป canonical artifact ทุก claim ที่ไม่ obvious ต้องมี citation
   ค่าเหมือน secret ต้องแทนด้วย `<REDACTED:type origin=sources/file:line>` โดยห้าม copy ค่าจริง
7. **Link + verify** รักษา frontmatter, links/backlinks และ `index.md` ใช้ read/search แบบไม่ผ่าน shell เพื่อตรวจ secret, link, schema และ orphan บน proposed diff ก่อนเขียน ถ้า secret scan error ต้อง fail closed
8. **บันทึก evidence** append log entry ที่มี UTC timestamp, source/URL, content hash ในรูปแบบ `hash=<16 ตัวอักษร hex แรกของ sha256>`, pages ที่สร้าง/แก้, จำนวน redactions และผล verify
9. **Cleanup + report** ลบ guard แล้วคืน typed evidence receipt ที่มี source hash, wiki paths, verification, risks และ claims ที่ข้าม

read-only helper อาจช่วยสรุป source ใหญ่มากได้ แต่ main conversation ต้องเป็นเจ้าของ path validation, writes, verification และ cleanup

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี status, source hash, artifacts ที่สร้าง/แก้, verification commands/results, redaction count, risks และ next action

## ข้อควรระวัง

- `ai_context/sources/` เป็น raw private input; `ai_context/wiki/` ต้อง commit-safe
- ห้าม add-knowledge มากกว่า source ที่ user ระบุ
- ห้าม overwrite เนื้อหาที่คนเขียนโดยไม่ merge และรักษา intent
- Source ใต้ `ai_context/work/` ยังเป็น non-authoritative draft แม้ user เลือก ingest ชัด
  ให้ label สถานะและห้าม promote อัตโนมัติ
- ห้ามคัดลอก canonical artifact body เข้า wiki
- หลังจบ workflow ต้องไม่มี guard file ค้าง
