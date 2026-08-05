# Knowledge — ความรู้ประจำ project

ภาษาไทยเป็นค่าเริ่มต้น ใช้ smart defaults เมื่อปลอดภัย และรักษา approval boundary ของแต่ละ workflow

- [`ingest`](./ingest/SKILL.md) — นำเข้าแหล่งข้อมูลที่เลือกอย่างชัดเจนสู่ wiki ภายในโปรเจกต์ พร้อม provenance การตรวจ secrets การเชื่อม entity และบันทึกการเปลี่ยนแปลงแบบ append-only _(manual-only)_
- [`prime`](./prime/SKILL.md) — สร้างบริบท repo สำหรับ agent แบบกระชับและมีขอบเขต จากโครงสร้าง source คำสั่ง convention และเส้นทางค้นหาโค้ดที่ตรวจสอบแล้ว
- [`query`](./query/SKILL.md) — ตอบคำถามเกี่ยวกับโปรเจกต์จาก wiki ภายในก่อน อ้างหลักฐานที่แน่นอน และใช้การค้นคว้าภายนอกเมื่อความรู้ในโปรเจกต์ไม่เพียงพอเท่านั้น
- [`wiki-lint`](./wiki-lint/SKILL.md) — ตรวจ wiki ภายในโปรเจกต์เพื่อหาลิงก์เสีย หน้า orphan ข้อขัดแย้ง ข้อมูลล้าสมัย citation ที่หาย schema drift และ secrets
