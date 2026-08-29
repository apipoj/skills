# Operations — ตรวจและส่งมอบอย่างปลอดภัย

ภาษาไทยเป็นค่าเริ่มต้น ใช้ smart defaults เมื่อปลอดภัย และรักษา approval boundary ของแต่ละ workflow

- [`deploy`](./deploy/SKILL.md) — Deploy revision ที่อนุมัติอย่างชัดเจนไปยัง environment ที่ระบุ ตรวจ smoke test และพฤติกรรมที่ผู้ใช้เห็น พร้อมรักษาทาง rollback ที่ทดสอบแล้ว _(manual-only)_
- [`pr`](./pr/SKILL.md) — เตรียม pull request ที่มีขอบเขตจากงานที่ตรวจทานแล้ว ตรวจ diff และ checks ที่แน่นอน และขออนุมัติก่อน push หรือเขียนข้อมูลระยะไกล _(manual-only)_
- [`task-to-pr`](./task-to-pr/SKILL.md) — นำงาน ticket หรือ pull request หนึ่งรายการจากต้นทางไปสู่ PR ที่ผ่านการทดสอบและ review อิสระ พร้อมให้มนุษย์ merge โดยทำต่อจากงานเดิมที่ตรงกันและขอ approval ที่ bind ก่อน Git หรือ remote write _(manual-only)_
- [`doctor`](./doctor/SKILL.md) — วินิจฉัยสุขภาพการติดตั้งและ runtime ของ SPK บน host ที่รองรับด้วยการตรวจแบบ read-only แล้วรายงาน failure และคำสั่งแก้ไขที่แน่นอน
- [`check-release`](./check-release/SKILL.md) — รันทุก gate ที่ต้องผ่านก่อนออก release ตรวจ version และ generated files แล้วรายงานสิ่งที่ยังติดโดยไม่ publish _(manual-only)_
- [`wizard`](./wizard/SKILL.md) — เขียน bash wizard แบบโต้ตอบสำหรับขั้นตอนที่มีแต่คนทำได้ เช่น ตั้งค่า infrastructure, credential, CI secret หรือ migration ครั้งเดียว แล้วตรวจสอบให้เรียบร้อยและส่งให้ผู้ใช้รันเอง
- [`uninstall`](./uninstall/SKILL.md) — ลบเฉพาะ artifact ในโปรเจกต์ที่ยืนยันว่า SPK เป็นเจ้าของ หลังแสดงเป้าหมายที่แน่นอน พร้อมรักษาความรู้โปรเจกต์และไฟล์ผู้ใช้ที่ไม่เกี่ยวข้อง _(manual-only)_
