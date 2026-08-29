---
name: code-review
description: รีวิว diff แยกด้านมาตรฐาน สเปก ความถูกต้อง security tests และความพร้อมส่งมอบ
---
# code-review

รัน code review หลาย pass ครอบคลุม correctness, security, maintainability, tests, docs และ ship-readiness

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short --branch --untracked-files=all`
- ถ้าอยู่ใน git worktree ให้รัน `git diff --stat` และ `git diff --name-status`
- ถ้าอยู่ใน git worktree ให้รัน `git log -5 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และ review จาก scope ที่ user ให้มา

## Review Passes

รันแต่ละ pass แยกกัน รวม findings ก่อนรายงาน pass ที่เป็น read-only lens อิสระ (correctness, security, maintainability, tests/docs) รันพร้อมกันได้เป็น specialist call โดยให้ scope เดียวกันทุกตัวและต้องอ้าง file/line evidence เสมอ จากนั้น deduplicate ตาม root cause แล้วรัน verifier pass แยกอีกครั้งเพื่อตรวจ verdict ที่เสนอมาก่อนรายงานจริง

Budget: เรียก specialist ได้สูงสุด 6 ครั้ง, concurrent read-only lens สูงสุด 4 ตัว และ retry ได้ 1 ครั้งถ้า evidence ยังไม่พอ

### Pass 1: Correctness และ Edge Cases
- Logic errors, off-by-one, null/undefined handling
- Edge cases: empty inputs, boundary values, concurrent access
- Error handling: errors ถูก catch, log และ surface อย่างถูกต้องไหม

### Pass 2: Security และ Secrets
- Hardcoded secrets, API keys, tokens, credentials
- Authorization checks บน sensitive endpoints
- Input validation และ sanitization
- ทุกบรรทัดที่ดูเป็น secret คือ fail-closed จนกว่าจะพิสูจน์ว่าปลอดภัย

### Pass 3: Maintainability และ Scope
- การเปลี่ยนแปลงตรงกับ goal ที่ระบุไหม
- Scope creep: มี changes ไม่เกี่ยวข้องผสมอยู่ไหม
- Code duplication ที่ควร extract
- ความชัดเจนและ consistency ของ naming

### Pass 4: Tests และ Docs
- behaviors ใหม่มี test ครอบคลุมไหม
- tests เดิมยังผ่านไหม
- การเปลี่ยนแปลงมี docs หรือยัง (API docs, README, inline comments)
- Docs drift: ถ้า behavior, commands, manifests หรือ public workflow เปลี่ยน docs ต้องอัพเดต

### Pass 5: Ship-Readiness Gate
- Quality gate สุดท้าย: จะ ship ไหม
- มี Critical หรือ Important issues = HOLD

รันเฉพาะ check หรือ test ที่รู้แน่ชัดว่าไม่เขียนไฟล์ในโปรเจกต์ ถ้า command อาจเขียน caches, snapshots,
lockfiles, generated artifacts หรือ project state อื่น ให้รายงาน command นั้นเป็นขั้นตอน verification
ที่แนะนำแทนการรันเอง

## Output Format

```markdown
## Review Report
- Scope: <สิ่งที่ review>
- Files: <count และ list>

### Findings

#### Critical (blocks merge)
- <file:line> <issue> - <ทำไมสำคัญ> - <fix>

#### Important (ควรแก้ใน PR นี้)
- <file:line> <issue> - <ทำไมสำคัญ> - <fix>

#### Minor (ตามมาทีหลังได้)
- <file:line> <issue> - <suggestion>

### Verdict
<APPROVE | HOLD | REQUEST_CHANGES>
```

## Review Contract

- Critical: security/data loss/build พัง/behavior ผิด; blocks merge
- Important: ควรแก้ใน PR นี้ก่อน merge
- Minor: ตามมาทีหลังได้หรือ style suggestion
- Suggestions ไม่ใช่ blocker เว้นแต่มี concrete risk
- ทุกบรรทัดที่ดูเป็น secret คือ fail-closed จนกว่าจะพิสูจน์ว่าปลอดภัย
- ตรวจ docs drift เมื่อ behavior, commands, manifests หรือ public workflow เปลี่ยน

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- review แบบ read-only เท่านั้น ห้ามสร้างหรือแก้ project files รวมถึง reports, caches,
  snapshots, lockfiles และ generated artifacts และห้าม fix, stage, commit, push หรือ deploy
  ถ้า verification command อาจเขียนไฟล์ ให้รายงาน command เพื่อให้ user รันแทน
- ถ้าเจอ Critical หรือ Important ต้อง HOLD จนกว่าจะแก้ หรือ user รับความเสี่ยงนั้นชัดเจน
- อย่ารายงาน style preference เป็น blocker ถ้าไม่มี concrete risk
