---
name: tdd
description: พัฒนา behavior ทีละ slice ด้วยวงจร RED, GREEN และ refactor พร้อมหลักฐานจาก test จริง
---
# tdd

รัน TDD loop แบบเข้มงวด: เขียน test ที่ fail ยืนยันว่า fail ด้วยเหตุผลที่ถูกต้อง implement ขั้นต่ำให้ pass refactor แล้วทำซ้ำ นี่คือ strict red-green-refactor loop ถ้าไม่ได้ขอแบบนี้ชัดเจน ให้ใช้ skill `code` แทน

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- ระบุ test setup (package.json, pyproject.toml, pytest.ini, jest.config, vitest.config)

## TDD Cycle

### RED: เขียน Failing Test
1. เขียน behavior test ขั้นต่ำที่กำหนด expected behavior
2. Test ต้องเจาะจงและโฟกัสที่ behavior เดียว

ถ้ารูปทรงของ interface เองยังเป็นคำถาม — module ควรลึกแค่ไหน seam ควรอยู่ตรงไหน interface ควรเปิดอะไรออกมา — ให้ใช้ skill `codebase-design` เป็นคลังคำศัพท์ มันเป็นแหล่งเดียวของคำว่า module, interface, depth, seam, adapter, leverage และ locality และเป็นเอกสารอ้างอิงที่เอาไว้เปิดอ่าน ไม่ใช่ session ที่ต้องรัน

### Verify RED
3. รัน focused test และยืนยันว่า fail **ด้วยเหตุผลที่คาดไว้**
4. ถ้า test pass ทันที ให้แก้ test ก่อน code (มัน test สิ่งผิด)

### GREEN: Implementation ขั้นต่ำ
5. เขียน implementation ที่เล็กที่สุดที่ทำให้ test pass
6. อย่าเพิ่ม features, optimizations หรือ refactoring

### Verify GREEN
7. รัน focused test ต้อง pass
8. รัน regression suite ที่เกี่ยวข้อง ไม่มีอะไรพัง

### REFACTOR
9. ทำความสะอาด code เฉพาะตอนที่ tests green
10. รัน tests ที่เกี่ยวข้องทั้งหมดหลัง refactor

### Evidence
11. บันทึก evidence ของ TDD cycle ที่ตรวจสอบแล้ว
12. Commit เฉพาะเมื่อผู้ใช้อนุญาต action นี้แยกต่างหาก แล้วทำซ้ำสำหรับ behavior ถัดไป

## Output Format

```markdown
## TDD Cycle Report
- Behavior: <สิ่งที่ implement>
- Test file: <path>
- RED: <confirmed - test fails ด้วยเหตุผลที่คาดไว้>
- GREEN: <confirmed - test passes>
- REFACTOR: <สิ่งที่ทำความสะอาด>
- Regression suite: <pass/fail>
- Commit: <hash, proposed message หรือ "not authorized">
- Remaining behaviors: <list หรือ "none">
```

## Hard Stops

- ถ้า test แรก pass ทันที ให้แก้ test ก่อน code
- ถ้าไม่มี test harness ที่ใช้ได้ ให้ return `NEEDS_TEST_HARNESS` พร้อม harness ที่เล็กที่สุดที่ควรเพิ่ม
- ถ้าแก้ bug ให้รวม regression test ที่ fail ก่อน fix
- ห้าม commit, push หรือ deploy เว้นแต่ผู้ใช้อนุญาต action นั้นแยกต่างหาก

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- อย่ายอมรับ tests ที่ pass ก่อน implementation
- อย่าข้าม tests
- อย่ารวมหลาย behaviors ในหนึ่ง cycle หนึ่ง behavior ต่อ cycle
- อย่า refactor ตอน red
- ถ้าได้รับอนุญาตให้ commit ให้ใช้เฉพาะ cycle ที่ตรวจสอบแล้ว
