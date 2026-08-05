---
name: load-project
description: อ่านโครงสร้าง คำสั่ง และข้อตกลงของ repo แล้วสร้างบริบทสั้น ๆ ให้ agent เริ่มงานได้ถูกทาง
---
# รู้จักโปรเจกต์

Scan source-code folders และสร้างหรืออัพเดต `AGENTS.md` เป็น canonical local context file เพื่อให้ downstream development work มี project knowledge ที่ถูกต้อง โดย `CLAUDE.md` ใน folder เดียวกันต้องเป็น pointer บรรทัดเดียว `@AGENTS.md`

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- ระบุ source subtrees ที่สำคัญ (package.json, pyproject.toml, go.mod, Cargo.toml, tsconfig, requirements.txt)

## Workflow

### 1. Scan Source Roots
- เดินตาม project tree และระบุ source directories ที่สำคัญ
- ข้าม node_modules, .git, dist, build และ generated directories อื่น ๆ
- เคารพ .gitignore patterns

### 2. วิเคราะห์แต่ละ Subtree
- ระบุ: language, framework, test setup, build tool, entry points
- บันทึก dependencies, scripts และ configuration
- ตรวจจับ monorepo structure (workspaces, packages, apps)
- **อ้างทุก claim จาก source code ที่อ่านจริงในรอบนี้** — `AGENTS.md`/`CLAUDE.md`/`README` ที่มีอยู่เดิมถือเป็น hint ที่ยังไม่ verify ไม่ใช่ source of truth (อาจ stale หรือผิด) ห้าม copy ข้อเท็จจริงจากไฟล์ context เดิมมาตรง ๆ ให้ re-derive จาก source (โค้ด, `manifest.json`/`package.json`, โครงไดเรกทอรี) แล้ว confirm ก่อนเขียน ถ้า claim เดิมขัดกับ source จริง → ยึด source แล้วแก้ให้ถูก ถ้า verify ไม่ได้ → ตัดทิ้ง อย่า carry forward

### 3. สร้างหรืออัพเดต Context Files
- เขียนหรืออัพเดต `AGENTS.md` ที่ root และใน source subfolders ที่เกี่ยวข้องเป็น source of truth
- ให้ `CLAUDE.md` ใน folder เดียวกันมีเฉพาะ pointer บรรทัดเดียว `@AGENTS.md`
- ถ้ามี `CLAUDE.md` เดิมที่มีเนื้อหาสำคัญ ให้ migrate เนื้อหาเฉพาะที่ยังไม่มีไปไว้ใน `AGENTS.md` ก่อน แล้วค่อยเปลี่ยน `CLAUDE.md` เป็น pointer
- แต่ละ `AGENTS.md` ต้องมี section `## Scoped Commands` (คำสั่ง test/build/lint เฉพาะของ subtree นั้น ไม่ใช่ค่า default ของทั้ง repo) เพื่อให้รันเฉพาะที่เกี่ยวข้อง ไม่ติด timeout จากการรันทั้งชุด
- แต่ละ `AGENTS.md` ต้องมี section `## Code Navigation` ที่ชี้ให้ใช้ tools `mcp__spk-codebase-search__*` เมื่อมี (`search_code`, `find_symbol`, `file_outline`) และให้ fallback ไป Grep/Glob เมื่อไม่มี — อย่า hard-depend
- สร้างหรืออัพเดต `.claudeignore` ที่ root โดยลิสต์ path ที่ generated/vendor/build ปริมาณมาก (`node_modules/`, `dist/`, `build/`, `coverage/` ฯลฯ) เพื่อให้การค้นโค้ดแม่นและไม่เจอ noise
- เก็บ `AGENTS.md` ให้กระชับและตรงตัวเป็นจริง
- **อย่า hardcode ข้อเท็จจริงที่เปลี่ยนบ่อยลงใน prose** — ห้ามเขียนเลข version, วันที่ release, หรือจำนวน (skills, agents, commands, ไฟล์, tests) ที่มีอยู่แล้วในไฟล์ source-of-truth เพราะมันจะ stale ทันทีที่มีอะไรเปลี่ยน และขัดกับไฟล์ที่เป็นเจ้าของข้อมูลนั้น ให้ชี้ไปที่ source แทน เช่นเขียนว่า "ดู `manifest.json` สำหรับ version และ roster ของ command/agent ที่เป็นทางการ" ไม่ใช่ "v3.2.0, 17 skills, 21 agents" — ระบุเฉพาะข้อเท็จจริงที่คงทน (สถาปัตยกรรม, ownership, conventions, คำสั่ง) ส่วนอะไรที่เปลี่ยนทุก release ให้ชี้ไป manifest/package
- อนุรักษ์เนื้อหาที่คนเขียนใน `AGENTS.md` อย่าเขียนทับ sections ที่มีอยู่
- ปิดท้ายแต่ละ `AGENTS.md` ด้วยบรรทัดเตือน: ให้ load-project ใหม่ตาม scope หลังมีการเปลี่ยนโครงสร้าง (เพิ่ม package, ย้าย dir, เปลี่ยนคำสั่ง test/build) ไฟล์จะได้ไม่ล้าสมัยเงียบ ๆ

### 4. ตรวจสอบ
- ยืนยันว่าไม่มี source code ถูกแก้ไข
- ยืนยันว่าไม่มี secrets ถูกเขียน
- ยืนยันว่า `CLAUDE.md` ทุกไฟล์ที่อยู่คู่กับ `AGENTS.md` มีแค่ `@AGENTS.md`
- ยืนยันว่าเคารพ .gitignore

## Output Format

```markdown
## Prime Report
- Scope: <repo หรือ specific paths>
- Source trees ที่พบ: <list>
- Context files ที่สร้าง: <list ของ AGENTS.md/CLAUDE.md pointer>
- Context files ที่อัพเดต: <list ของ AGENTS.md/CLAUDE.md pointer>
- Corrections: <claim เดิมที่ source ขัด เช่น `corrected <หัวข้อ>: ไฟล์เขียน "<A>" แต่ source เป็น "<B>"`, `dropped <claim>: verify กับ source ไม่ได้` — ถ้าไม่มีให้เขียน "none — claim เดิมตรงกับ source">
- Directories ที่ข้าม: <list>
- Source code ที่เปลี่ยน: <none>
- Secrets ที่พบ: <none>
```

## ข้อควรระวัง

- อย่าแก้ product source code
- อย่าเขียน secrets เข้า context files
- เคารพ .gitignore
- อย่าเขียนเนื้อหาซ้ำทั้งใน `CLAUDE.md` และ `AGENTS.md`; `CLAUDE.md` ต้องเป็น `@AGENTS.md`
- อนุรักษ์เนื้อหาที่คนเขียนใน `AGENTS.md` ที่มีอยู่
- เก็บ `AGENTS.md` ให้กระชับ ชอบ structure และ commands มากกว่า prose
