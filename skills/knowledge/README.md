# Knowledge — ความรู้ประจำ project

ภาษาไทยเป็นค่าเริ่มต้น ใช้ smart defaults เมื่อปลอดภัย และรักษา approval boundary ของแต่ละ workflow

- [`add-knowledge`](./add-knowledge/SKILL.md) — เพิ่มข้อมูลที่เลือกเข้า wiki ของโปรเจกต์ พร้อมที่มา การตรวจ secret และบันทึกการเปลี่ยนแปลง _(manual-only)_
- [`load-project`](./load-project/SKILL.md) — อ่านโครงสร้าง คำสั่ง และข้อตกลงของ repo แล้วสร้างบริบทสั้น ๆ ให้ agent เริ่มงานได้ถูกทาง
- [`ask-project`](./ask-project/SKILL.md) — ตอบคำถามเกี่ยวกับโปรเจกต์จาก wiki ภายในพร้อมอ้างหลักฐาน และค้นภายนอกเมื่อข้อมูลในโปรเจกต์ไม่พอ
- [`check-wiki`](./check-wiki/SKILL.md) — ตรวจ wiki ของโปรเจกต์เพื่อหาลิงก์เสีย ข้อมูลขัดกัน เนื้อหาล้าสมัย หลักฐานที่หาย และ secret
