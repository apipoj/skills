# Engineering — งานพัฒนา software

ภาษาไทยเป็นค่าเริ่มต้น ใช้ smart defaults เมื่อปลอดภัย และรักษา approval boundary ของแต่ละ workflow

- [`start`](./start/SKILL.md) — เริ่มงานกับ AI แบบไทยเป็นหลัก โดยเลือก workflow ที่เล็กและตรงที่สุดให้ผู้ใช้ ไม่ต้องจำรายชื่อ skill
- [`debug`](./debug/SKILL.md) — หาต้นเหตุของบั๊กหรือปัญหาความเร็วทีละสมมติฐาน และพิสูจน์สาเหตุก่อนเสนอวิธีแก้
- [`ask-with-docs`](./ask-with-docs/SKILL.md) — ถามทีละเรื่องให้แผนหรือ design ชัด พร้อมอัปเดตคำศัพท์และเหตุผลสำคัญของโปรเจกต์ _(manual-only)_
- [`triage`](./triage/SKILL.md) — คัดกรอง issue และ pull request ให้พร้อมตัดสินใจหรือพร้อมส่งต่อให้ agent ทำงาน _(manual-only)_
- [`improve-codebase`](./improve-codebase/SKILL.md) — หาและปรับส่วนของ codebase ที่ซับซ้อนเกินไป ให้เข้าใจง่าย เปลี่ยนง่าย และทดสอบผ่าน interface ที่เหมาะสม _(manual-only)_
- [`setup`](./setup/SKILL.md) — ตั้งค่า issue tracker, domain docs และ defaults ที่ skill อื่นใช้ร่วมกันใน repository นี้ _(manual-only)_
- [`tdd`](./tdd/SKILL.md) — พัฒนา behavior ทีละ slice ด้วยวงจร RED, GREEN และ refactor พร้อมหลักฐานจาก test จริง
- [`to-spec`](./to-spec/SKILL.md) — สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ _(manual-only)_
- [`to-tickets`](./to-tickets/SKILL.md) — แตกสเปกหรือแผนเป็น vertical slices พร้อม blocking edges ที่ทำต่อได้จริง _(manual-only)_
- [`wayfinder`](./wayfinder/SKILL.md) — ทำแผนที่ decision สำหรับงานใหญ่ที่ยังมีหมอก แล้วคลี่คำถามทีละใบจนเส้นทางชัด _(manual-only)_
- [`code`](./code/SKILL.md) — ลงมือพัฒนาตามแผนที่อนุมัติแล้วทีละส่วน พร้อม test และ review โดยไม่ commit หรือ push เอง
- [`prototype`](./prototype/SKILL.md) — สร้าง prototype แบบทิ้งได้เพื่อพิสูจน์คำถามด้าน logic, state หรือ UI ก่อนลงทุนทำ production
- [`research`](./research/SKILL.md) — ค้นคว้าคำถามจาก primary sources และเก็บข้อค้นพบพร้อม citation ที่ตรวจย้อนกลับได้
- [`domain-modeling`](./domain-modeling/SKILL.md) — สร้างและปรับภาษากลางของ project พร้อมทดสอบคำศัพท์กับกรณีขอบและบันทึก decision ที่ควรจำ
- [`codebase-design`](./codebase-design/SKILL.md) — ใช้แนวคิด deep module, interface, seam, adapter, leverage และ locality เพื่อออกแบบ code ที่เปลี่ยนง่าย
- [`code-review`](./code-review/SKILL.md) — รีวิว diff แยกด้านมาตรฐาน สเปก ความถูกต้อง security tests และความพร้อมส่งมอบ
- [`fix-conflicts`](./fix-conflicts/SKILL.md) — แก้ merge หรือ rebase conflict ทีละจุด โดยรักษาเจตนาของทั้งสองฝั่งและตรวจผลก่อนทำต่อ
- [`plan`](./plan/SKILL.md) — วางแผนการเปลี่ยนแปลงซอฟต์แวร์จากหลักฐานใน repo เป็นความต้องการ สถาปัตยกรรม งานตามลำดับ dependency จุดตรวจสอบ และแผนย้อนกลับ
- [`design-options`](./design-options/SKILL.md) — ลอง UI หลายแนวที่ต่างกันจริง เปรียบเทียบด้วยเนื้อหาสมจริง แล้วให้ผู้ใช้เลือกก่อนเขียน production code
- [`test-changes`](./test-changes/SKILL.md) — เลือกและรัน test ที่เกี่ยวกับไฟล์ที่เปลี่ยนเพื่อได้ผลเร็ว พร้อมบอกส่วนที่จับคู่ไม่ได้และรัน full suite ก่อนจบ
