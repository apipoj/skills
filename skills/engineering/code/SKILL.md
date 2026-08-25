---
name: code
description: ลงมือพัฒนาตามแผนที่อนุมัติแล้วทีละส่วน พร้อม test และ review โดยไม่ commit หรือ push เอง
---
# ลงมือพัฒนาตามแผน

Implement feature จาก plan ที่มีอยู่ ทำงานเป็น task เล็ก ๆ แบบ TDD ตรวจสอบงาน และอัพเดต docs

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- หา plan file (ปกติอยู่ที่ `ai_context/wiki/plans/` หรือ path ที่ระบุ)
- ดู project structure (package.json, tsconfig, pyproject.toml ฯลฯ)

## Workflow

1. **ตรวจ authority** อ่าน plan ที่อนุมัติแล้วและคำอนุญาตให้ code ถ้ามาจาก flow
   plan-to-dev ต้องมีคำตอบใหม่หลัง user เห็น plan ฉบับนั้น เช่น `เริ่มพัฒนาตาม plan`
   ถ้าไม่มีหรือกำกวม ให้คืน `NEEDS_USER_INPUT` ก่อนแก้ workspace
2. **อ่าน plan** โหลด plan file แล้วดึง: goal, non-goals, tasks, gates, acceptance criteria
   ถ้าไม่มี approved plan ให้หยุดและขอ plan ก่อน
3. **เลือก task ถัดไป** เลือก task แรกที่ยังไม่เสร็จ
4. **TDD ต่อ task** สำหรับแต่ละ task:
   - เขียนหรือระบุ test ที่พิสูจน์ behavior
   - รัน test และยืนยันว่า fail (RED)
   - Implement code ขั้นต่ำที่ทำให้ pass (GREEN)
   - รัน regression suite เพื่อยืนยันว่าไม่มีอะไรพัง
   - Refactor เฉพาะตอน green
   - บันทึก proposed commit message แต่ commit เฉพาะเมื่อผู้ใช้อนุญาต action นี้แยกต่างหาก
5. **ตรวจสอบ gates** หลังแต่ละ task รัน verification commands จาก plan หยุดถ้า gate ใด fail
6. **อัพเดต docs** ถ้า plan มี docs tasks ให้ทำตาม workflow
7. **รายงานความคืบหน้า** สรุปว่าทำอะไรไป ถัดไปคืออะไร และมี deviation จาก plan ไหม

## Implementation Authorization

ยอมรับ authority ได้สองแบบ:

- request ปัจจุบันขอให้ code plan ที่ระบุและอนุมัติแล้วโดยตรง
- ใน flow plan-to-dev คำตอบล่าสุดอนุมัติ plan ฉบับที่เพิ่งแสดงอย่างชัดเจน

ห้ามนับคำยืนยันจาก `ask-me`, การเลือกให้สร้าง plan หรือข้อความ “plan แล้ว dev” ก่อนเห็น
plan เป็น implementation approval ถ้า authority ไม่ครบ ห้ามเขียน code, tests หรือ docs

## Output Format

```markdown
## Implementation Progress
- Task ที่เสร็จ: <task name>
- Files ที่เปลี่ยน: <list>
- Tests: <pass/fail summary>
- Commit: <hash, proposed message หรือ "not authorized">
- Task ถัดไป: <name หรือ "done">
- Deviations: <none หรือ description>
```

## มาตรฐาน Plan

ถ้า plan ที่ให้มายังไม่ผ่านมาตรฐานต่อไปนี้ ให้หยุดและขอแก้หรือสร้าง approved plan ก่อน:
- Tasks เป็น action 2-5 นาทีที่ตรวจสอบได้แบบอิสระ
- ทุก task มี file path ที่ชัดหรือขั้นตอน discovery ที่ชัด
- ทุกการเปลี่ยน behavior มีขั้นตอน TDD
- Plan บอกว่าจะไม่ build อะไร
- Acceptance criteria สังเกตได้และ test ได้

## ข้อควรระวัง

- ห้ามแก้ workspace โดยไม่มี approved plan และ implementation authority ของ scope นั้น
- อย่าข้าม test ถ้า test harness ไม่มี ให้ flag `NEEDS_TEST_HARNESS`
- ห้าม commit, push หรือเปิด PR เว้นแต่ผู้ใช้อนุญาต action นั้นแยกต่างหาก
- ถ้า task ใหญ่เกินไป ให้แยกก่อน code
- อย่าแก้ไฟล์นอก scope ของ plan โดยไม่ถาม
