# Engineering — งานพัฒนา software

ภาษาไทยเป็นค่าเริ่มต้น ใช้ smart defaults เมื่อปลอดภัย และรักษา approval boundary ของแต่ละ workflow

- [`start`](./start/SKILL.md) — เริ่มงานกับ AI แบบไทยเป็นหลัก โดยเลือก workflow ที่เล็กและตรงที่สุดให้ผู้ใช้ ไม่ต้องจำรายชื่อ skill
- [`diagnosing-bugs`](./diagnosing-bugs/SKILL.md) — หาต้นเหตุของบั๊กหรือ performance regression ด้วย feedback loop ที่สั้น ชัด และพิสูจน์ซ้ำได้
- [`grill-with-docs`](./grill-with-docs/SKILL.md) — ถามทีละ decision เพื่อทำแผนหรือ design ให้ชัด พร้อมอัปเดตศัพท์และเหตุผลสำคัญของ project _(manual-only)_
- [`triage`](./triage/SKILL.md) — คัดกรอง issue และ pull request ให้พร้อมตัดสินใจหรือพร้อมส่งต่อให้ agent ทำงาน _(manual-only)_
- [`improve-codebase-architecture`](./improve-codebase-architecture/SKILL.md) — หาโอกาสทำ module ให้ลึกขึ้น เข้าใจง่ายขึ้น และทดสอบผ่าน interface ที่เหมาะสม _(manual-only)_
- [`setup`](./setup/SKILL.md) — ตั้งค่า issue tracker, domain docs และ defaults ที่ skill อื่นใช้ร่วมกันใน repository นี้ _(manual-only)_
- [`tdd`](./tdd/SKILL.md) — พัฒนา behavior ทีละ slice ด้วยวงจร RED, GREEN และ refactor พร้อมหลักฐานจาก test จริง
- [`to-spec`](./to-spec/SKILL.md) — สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ _(manual-only)_
- [`to-tickets`](./to-tickets/SKILL.md) — แตกสเปกหรือแผนเป็น vertical slices พร้อม blocking edges ที่ทำต่อได้จริง _(manual-only)_
- [`wayfinder`](./wayfinder/SKILL.md) — ทำแผนที่ decision สำหรับงานใหญ่ที่ยังมีหมอก แล้วคลี่คำถามทีละใบจนเส้นทางชัด _(manual-only)_
- [`implement`](./implement/SKILL.md) — พัฒนาแผนที่อนุมัติแล้วเป็น slice เล็กที่ผ่าน test และ review โดยไม่ commit หรือ push เอง
- [`prototype`](./prototype/SKILL.md) — สร้าง prototype แบบทิ้งได้เพื่อพิสูจน์คำถามด้าน logic, state หรือ UI ก่อนลงทุนทำ production
- [`research`](./research/SKILL.md) — ค้นคว้าคำถามจาก primary sources และเก็บข้อค้นพบพร้อม citation ที่ตรวจย้อนกลับได้
- [`domain-modeling`](./domain-modeling/SKILL.md) — สร้างและปรับภาษากลางของ project พร้อมทดสอบคำศัพท์กับกรณีขอบและบันทึก decision ที่ควรจำ
- [`codebase-design`](./codebase-design/SKILL.md) — ใช้แนวคิด deep module, interface, seam, adapter, leverage และ locality เพื่อออกแบบ code ที่เปลี่ยนง่าย
- [`code-review`](./code-review/SKILL.md) — รีวิว diff แยกด้านมาตรฐาน สเปก ความถูกต้อง security tests และความพร้อมส่งมอบ
- [`resolving-merge-conflicts`](./resolving-merge-conflicts/SKILL.md) — แก้ merge หรือ rebase conflict ทีละ hunk โดยตามเจตนาของทั้งสองฝั่งและตรวจผลก่อนเดินต่อ
- [`plan`](./plan/SKILL.md) — วางแผนการเปลี่ยนแปลงซอฟต์แวร์จากหลักฐานใน repo เป็นความต้องการ สถาปัตยกรรม งานตามลำดับ dependency จุดตรวจสอบ และแผนย้อนกลับ
- [`design-shotgun`](./design-shotgun/SKILL.md) — สำรวจทิศทาง interface ที่แตกต่างกันจริง เปรียบเทียบด้วยเนื้อหาสมจริง และบันทึกแบบที่อนุมัติก่อน implement ใน production
- [`scoped-tests`](./scoped-tests/SKILL.md) — จับคู่ไฟล์ที่เปลี่ยนกับชุดทดสอบที่เล็กที่สุดอย่างมีเหตุผล รันเพื่อ feedback เร็ว เปิดเผย path ที่จับคู่ไม่ได้ และบังคับ full suite ก่อนจบงาน
