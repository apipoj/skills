---
name: debug
description: หาต้นเหตุของบั๊กหรือปัญหาความเร็วทีละสมมติฐาน และพิสูจน์สาเหตุก่อนเสนอวิธีแก้
---
# หาต้นเหตุของบั๊ก

วิเคราะห์ root cause อย่างเป็นระบบก่อนที่จะลองแก้ไข

ใช้ตอน test fail, production bug, build error, regression, behavior ไม่ตามที่คาด หรือทุกสถานการณ์ที่การเดาจะเสียเวลา skill นี้ทำหน้าที่วินิจฉัยอย่างเดียว เสนอ fix และ instrumentation เป็นคำแนะนำให้ implementer เท่านั้น ไม่แก้ไฟล์เอง

## ปกปิดความลับก่อนแสดง

skill นี้บังคับให้แสดง command, output และ artifact ที่เก็บมา **ปกปิดความลับทุกตัวก่อนเสมอ** โดยเขียน `<REDACTED>` แทนที่ค่าจริง สร้าง feedback loop โดยอ้างผ่าน env var เพื่อให้ credential อยู่ใน environment ไม่ใช่อยู่ในสิ่งที่แสดง artifact ที่เก็บมามักมี auth header ติดมาด้วย ให้ยกมาเฉพาะบรรทัดที่เป็นสัญญาณจริง

ถ้า output ที่ปกปิดแล้วไม่พอสำหรับวินิจฉัย ให้บอกตรง ๆ แล้วถามผู้ใช้

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short`, `git log -5 --oneline` และ `git diff --stat`; ถ้าไม่ใช่ git repo ให้ข้าม git context และใช้ข้อมูลที่มีแทน
- เก็บ error output, test failure หรือ behavior ที่ไม่คาดคิดให้ครบ

## Process RCA 4 ขั้น

### ขั้นที่ 1: อ่าน Error และ Reproduce
- เก็บ error message, stack trace หรือ failing assertion ที่แน่นอน
- ระบุ reproduction steps ขั้นต่ำ
- ถ้า reproduce ไม่ได้ ให้ return `NEEDS_REPRO` พร้อมระบุข้อมูลที่ขาด

### ขั้นที่ 2: เปรียบเทียบ Pattern ที่ทำงาน
- หา code path หรือ test ที่ใกล้เคียงกันที่ทำงานปกติ
- Diff working vs. failing path เพื่อแยกจุดที่ต่าง
- เช็ค commits ล่าสุดที่น่าจะเป็นต้นเหตุ

### ขั้นที่ 3: สร้างและทดสอบ Hypothesis
- เขียน hypothesis ทีละข้อ
- ทดสอบแต่ละ hypothesis ด้วย experiment ที่มุ่งเป้า (log, breakpoint, unit test)
- ทิ้ง hypothesis ที่ผิดก่อนสร้างข้อใหม่
- ถ้า 3 hypotheses ผิดแล้ว ให้ flag `POSSIBLE_ARCHITECTURE_ISSUE`

### ขั้นที่ 4: แนะนำ Fix
- ระบุ root cause พร้อมหลักฐาน
- ระบุ file:line ที่ได้รับผลกระทบ
- แนะนำ fix ที่เล็กที่สุด
- แนะนำ regression test ที่จะจับปัญหานี้ได้

Delegate การ reproduce หรือ trace แยกอิสระได้เฉพาะตอนที่ไม่ทับ scope กับงานอื่นที่กำลังทำอยู่ skill นี้มีหน้าที่วินิจฉัยอย่างเดียว ไม่แตะ source code

## Output Format

```markdown
## Debug Report
- Error: <error หรือ behavior ที่แน่นอน>
- Root cause: <คำอธิบายที่มีหลักฐาน>
- ตำแหน่งที่ได้รับผล: <file:line list>
- Fix ที่แนะนำ: <การเปลี่ยนแปลงที่เล็กที่สุด>
- Regression test: <test ที่จะจับปัญหานี้>
- Status: <FIX_READY | NEEDS_REPRO | POSSIBLE_ARCHITECTURE_ISSUE>
```

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- ห้ามแก้ไขก่อนมีหลักฐาน root cause
- ถ้า reproduce ไม่ได้ ให้ return `NEEDS_REPRO` พร้อมระบุข้อมูลที่ขาด
- ถ้า implementer ลองแก้แล้ว 3 ครั้งแล้วยังไม่ได้ ให้ flag `POSSIBLE_ARCHITECTURE_ISSUE` แทนที่จะเสนอ patch ที่ 4
- อย่าแก้ source code เอง คืนแค่ diagnosis และเสนอ fix/instrumentation เป็นคำแนะนำให้ implementer ไปทำต่อ
- สำหรับ production data, credentials, destructive actions หรือ external services ให้หยุดและถาม operator ก่อน
