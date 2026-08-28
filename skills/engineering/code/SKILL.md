---
name: code
description: ลงมือพัฒนาคำขอที่ชัดหรือแผนที่ review แล้วจนผ่าน test และ local verification โดยไม่ถามอนุมัติ workspace ซ้ำ
---
# ลงมือพัฒนาและตรวจให้ครบ

Implement คำขอที่ชัดหรือ reviewed plan ภายใน scope แบบ TDD ตรวจสอบงาน และอัปเดต docs

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- หา plan file (ปกติอยู่ที่ `ai_context/wiki/plans/` หรือ path ที่ระบุ)
- ดู project structure (package.json, tsconfig, pyproject.toml ฯลฯ)

## Workflow

1. **ตรวจ authority** คำขอปัจจุบันที่ระบุให้ implement, fix, update, refactor, test หรือ
   plan-and-implement outcome ที่ชัด ถือเป็น bounded workspace authority
2. **สร้าง outline** ถ้ามี reviewed plan ให้ดึง goal, non-goals, tasks, gates และ acceptance
   criteria ถ้าไม่มี plan file ให้สร้าง micro-plan ภายในจากหลักฐานใน repo แล้วทำต่อ
3. **เลือก task ถัดไป** เลือก task แรกที่ยังไม่เสร็จ
4. **TDD ต่อ task** สำหรับแต่ละ task:
   - เขียนหรือระบุ test ที่พิสูจน์ behavior
   - รัน test และยืนยันว่า fail (RED)
   - Implement code ขั้นต่ำที่ทำให้ pass (GREEN)
   - รัน regression suite เพื่อยืนยันว่าไม่มีอะไรพัง
   - Refactor เฉพาะตอน green
   - บันทึก proposed commit message แต่ commit เฉพาะเมื่อผู้ใช้อนุญาต action นี้แยกต่างหาก
5. **ตรวจสอบ gates** หลังแต่ละ task รัน verification commands และซ่อม failure ที่อยู่ใน
   scope ได้ไม่เกิน repair budget
6. **อัพเดต docs** ถ้า plan มี docs tasks ให้ทำตาม workflow
7. **รายงานความคืบหน้า** สรุปว่าทำอะไรไป ถัดไปคืออะไร และมี deviation จาก plan ไหม

## Implementation Authorization

ยอมรับ bounded workspace authority ได้สามแบบ:

- request ปัจจุบันขอ implement, fix, update, refactor หรือ test outcome ที่ระบุ
- request ปัจจุบันขอ plan แล้ว implement outcome ที่ระบุ
- request ปัจจุบันขอ implement reviewed plan ที่อ้างถึง

สรุปจาก `ask-me` เพียงอย่างเดียวยังเป็น read-only และคำขอ plan-only ต้องหยุดที่ plan
ถ้า outcome ชัดแต่ไม่มี plan file ให้ใช้ micro-plan ห้ามสร้าง approval local รอบใหม่

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

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- ห้ามแก้ workspace โดยไม่มีคำขอ implementation ที่ชัดและ bounded authority ของ scope นั้น
- อย่าข้าม test ถ้า test harness ไม่มี ให้ flag `NEEDS_TEST_HARNESS`
- ห้าม commit, push หรือเปิด PR เว้นแต่ผู้ใช้อนุญาต action นั้นแยกต่างหาก
- ถ้า task ใหญ่เกินไป ให้แยกก่อน code
- อย่าแก้ไฟล์นอก scope; ถ้าต้องขยาย scope ให้ถาม decision เดียวที่เปลี่ยนผลลัพธ์หรือความเสี่ยง
