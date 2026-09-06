---
name: test-changes
description: รัน test ที่ไฟล์เปลี่ยนกระทบ พร้อมบอกส่วนที่ตรวจไม่ครอบคลุม
---
# ทดสอบเฉพาะส่วนที่เปลี่ยน

เร่ง inner loop ด้วยการรันเฉพาะ test suites ที่การเปลี่ยนแปลงปัจจุบันมีผลกระทบ แทนที่จะรันทั้งชุดทุกครั้งที่แก้ ใช้ตอนทำ TDD หรือ implement ทีละขั้นเมื่อการรันทั้งชุดช้า รันทั้งชุดเมื่อ policy ของ repo, release gate หรือความไม่แน่ใจในการจับคู่กำหนด
ทำ workflow นี้โดยตรงใน conversation ปัจจุบัน

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้ดูไฟล์ที่เปลี่ยนด้วย `git diff --name-only HEAD`; ถ้าไม่ใช่ git repo ให้ระบุ paths ที่เปลี่ยนเอง
- ตรวจ test runner ของ project: `package.json` ที่มี jest → Jest, `pyproject.toml`/`pytest.ini` → pytest, `go.mod` → `go test`

## Workflow

### 1. หา packaged planner
หารากชุดติดตั้งจาก metadata หรือตัวแปรรากที่ host ให้ แล้วใช้ `scripts/scoped-tests.cjs` ใต้รากนั้น ห้ามเลือกไฟล์ชื่อเดียวกันใน repo ของ user ก่อน

### 2. รวบรวมไฟล์ที่เปลี่ยน
ถ้า user ระบุ paths ให้ใช้ paths นั้น ไม่งั้นใช้ทั้ง tracked และ untracked changes ของ repo ถ้าอยู่นอก git worktree ต้องระบุ paths เอง

### 3. สร้างแผนแบบ structured
จาก project cwd รัน `node <install-root>/scripts/scoped-tests.cjs -- <path>...` helper จะคืน JSON schema `spk.scoped-tests/v1` ที่มี `mode`, `runner`, `selected`, `unmapped`, `focused` และ `full` ใช้ `command` กับ `args` เป็น argv array ห้ามต่อเป็น shell string

### 4. รันอย่างปลอดภัย
- `mode: scoped` → รัน `focused.command` พร้อม `focused.args`
- `mode: full` → อธิบายเหตุผล fallback แล้วรัน `full`
- `mode: blocked` → รายงาน runner ที่ขาด/ไม่รองรับแล้วหยุด

### 5. รายงาน scope ตามจริง
รายงาน changed paths, selected inputs, unmapped paths, command/argv, exit status และบอกว่าเป็น scoped หรือ full

### 6. จบตามขอบเขตการตรวจ
รัน `full` เมื่อ policy ของ repo, release gate หรือการจับคู่ที่ไม่มั่นใจกำหนด นอกนั้น focused pass จบการตรวจ local ที่มีขอบเขตได้ โดยระบุข้อจำกัด ตรวจเพิ่มหรือซ้ำเมื่อมี change ใหม่, failure หรือ risk ที่ยังไม่คลี่คลาย รายงาน failure และแก้เฉพาะเมื่อคำขอ implementation ที่ครอบอยู่อนุญาต

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- ห้ามรันบางส่วนเงียบ ๆ — changed path ที่ map ไม่ได้แม้แต่ไฟล์เดียวต้อง fallback ทั้งชุด
- ห้ามรัน shell string ที่ประกอบจากข้อมูลใน repo ให้ใช้ command + args แยกกัน
- การรันแบบ scope ไม่ใช่ release gate; `npm run verify:release` ยังรันทั้งหมดอยู่
- ใช้ได้นอก git worktree เฉพาะเมื่อระบุ paths ที่เปลี่ยนเอง
