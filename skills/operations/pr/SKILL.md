---
name: pr
description: เตรียม pull request ที่มีขอบเขตจากงานที่ตรวจทานแล้ว ตรวจ diff และ checks ที่แน่นอน และขออนุมัติก่อน push หรือเขียนข้อมูลระยะไกล
disable-model-invocation: true
---
# pr

Skill นี้เป็น manual-only โหมด default คือ **prepare-only**: สร้าง PR body และ safety report โดยไม่ stage, commit, push หรือสร้าง PR

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short --branch --untracked-files=all`
- ถ้าอยู่ใน git worktree ให้รัน `git remote get-url origin` และ `git rev-list --left-right --count HEAD...origin/main`; ถ้า remote/main ไม่มี ให้บันทึกว่าไม่มีข้อมูลเปรียบเทียบ
- ถ้าอยู่ใน git worktree ให้รัน `git log --oneline --decorate -8` และ `git diff --stat`; ถ้าไม่ใช่ git repo ให้รายงานว่า PR context ไม่พร้อมแทนการหยุดด้วย error
- เช็ค `gh auth status`

## Workflow

1. **Prepare-only เป็น default** ตรวจ branch, remote, dirty/untracked files, diff, outgoing commits, review, gates และ auth ระบุ GitHub repository จาก selected remote URL และคำสั่งของ repo ให้ชัดเจน ใน fork ห้ามปล่อยให้ CLI infer fork parent เป็น PR target ให้ bind explicit repository selector เช่น `GH_REPO=<owner/repo>` หรือ `--repo <owner/repo>` กับทุก GitHub read/write แล้วตรวจ repository ที่ตอบกลับมา จากนั้นสร้าง title/body, exact paths, test plan, risks โดยห้าม local/remote write
2. **Resolve writes** ถ้า user ขอ commit/push/open/update ให้ list exact paths, commit message, outgoing commits, remote/ref, API operations, title/body digest และ force mode
3. **Verify** secret-scan proposed staged diff ที่แน่นอนและรัน gates ถ้า auth หายหรือ gate fail ให้ `BLOCKED`
4. **Bind intent** canonicalize proposed write object แบบ stable key ordering แล้วใช้ SHA-256 lowercase hex ครบ 64 ตัว
5. **ขอ approval** แสดง intent — target, paths, commits, commands — แล้วถามผ่าน structured choice prompt ของ host ถ้ามี ถ้าไม่มีให้ใช้ numbered list ตั้ง label ของตัวเลือกที่อนุมัติด้วย target จริง เช่น `Push → origin/feat-x, open PR` ห้าม label ว่า `Approve` เฉย ๆ gate นี้เป็น `confirm` กดตัวเลือกนั้นหรือตอบรับธรรมดาก็นับทั้งคู่ แต่คำถาม การขอแก้ คำตอบรับที่อยู่ใน quote หรือ code block และคำตอบที่มาก่อนแสดง intent ไม่นับ ถ้ายังไม่อนุมัติให้คืน envelope และหยุด ห้าม delegate mutating step
6. **Resume + revalidate** คำนวณ state/digest ใหม่ก่อน write ทุกครั้ง drift ใด ๆ ล้ม approval ให้แสดง intent ใหม่แล้วถามอีกรอบ หนึ่ง approval คุมหนึ่ง intent ไม่ยกไป gate ถัดไปหรือ retry หลังมีอะไรเปลี่ยน
7. **Execute exact intent** ส่ง approved intent + token ให้ PR worker หรือทำ sequential stage เฉพาะ paths ที่ list, commit/push/API write เฉพาะที่อนุมัติ
8. **Verify outcome** รายงาน commit SHA, remote ref, PR URL และ CI state การแก้ CI ที่ write/push ต้อง approval ใหม่

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "pull_request_write",
  "approval_mode": "confirm",
  "intent_digest": "<64 lowercase hex>",
  "target": {"remote": "<remote>", "branch": "<branch>", "repository": "<owner/repo>"},
  "paths": ["<reviewed path>"],
  "commits": ["<outgoing หรือ proposed commit>"],
  "commands": ["<exact git/API command + environment + argv รวม GH_REPO=<owner/repo>>"],
  "choices": [{"label": "<label ที่ระบุ target จริง>", "approves": true}, {"label": "ยกเลิก", "approves": false}],
  "resume_instruction": "Choose the approving option, or reply with a plain affirmative"
}
```

`intent_digest` ยังอยู่ใน envelope ในฐานะตัวจับ drift คำนวณใหม่แล้วเทียบก่อน write ไม่ใช่สิ่งที่ user ต้องพิมพ์

## Autonomy Profile

`boundary_gated` — เตรียม intent ให้ครบแล้วขออนุมัติ boundary เพียงครั้งเดียว prompt budget 1, repair budget 2 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี mode, approval digest, paths, commit/ref, PR URL, commands/gates, files ที่ตั้งใจไม่ stage, risks และ next action

## Safety Rules

- Default เป็น prepare-only: อย่า stage, commit, push หรือ create/update PR เว้นแต่ถูกขออย่างชัดเจน
- อย่า force-push เว้นแต่ถูกสั่งและใช้ `--force-with-lease`
- ห้าม network/local write จนกว่า approval จะผ่าน revalidation ของ state ปัจจุบัน
- อย่า push จาก dirty `main` โดยไม่ระบุ commit ทั้งหมดที่จะออกไป
- Stage เฉพาะ paths ที่ review แล้ว อย่า `git add .` เมื่อมี untracked/generated/operator files
- Secret-scan staged diff ก่อน commit
- ถ้า GitHub auth ไม่มี ให้เตรียม PR body ไว้ที่เครื่องแล้วรายงาน setup steps
