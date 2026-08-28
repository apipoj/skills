---
name: task-to-pr
description: นำงาน ticket หรือ pull request หนึ่งรายการจากต้นทางไปสู่ PR ที่ผ่านการทดสอบและ review อิสระ พร้อมให้มนุษย์ merge โดยทำต่อจากงานเดิมที่ตรงกันและขอ approval ที่ bind ก่อน Git หรือ remote write
disable-model-invocation: true
---
# task-to-pr

นำงานหนึ่งรายการไปสู่ `READY_FOR_HUMAN_MERGE`

Skill นี้เป็น manual-only การ invoke อนุญาตเฉพาะการแก้ project แบบ bounded
ภายในงานที่ระบุ ยังไม่ใช่ approval ให้ fetch, สร้าง branch/worktree, commit,
push, เขียน ticket/PR, merge หรือ deploy

## Workflow

1. **Resolve หนึ่ง source** อ่านคำสั่งของ repo แล้วระบุ task และ acceptance criteria
   ที่แน่นอน ระบุ GitHub repository จาก selected remote URL และคำสั่งของ repo ให้ชัดเจน
   ใน fork ตัว CLI อาจตั้งค่า PR ไปที่ fork parent โดยอัตโนมัติ ห้ามพึ่ง inference นี้
   ให้ bind explicit repository selector เช่น `GH_REPO=<owner/repo>` หรือ
   `--repo <owner/repo>` กับทุก GitHub read/write และตรวจว่า repository ที่ตอบกลับมาตรงกัน
   จากนั้นสร้าง immutable snapshot เป็น canonical JSON ที่รวม source identity/version,
   task fields และ criteria โดย normalize text ทุกค่าเป็น Unicode NFC, แปลง CRLF/CR
   เป็น LF, รักษา whitespace อื่น, sort object keys ทุกระดับ, รักษา array order และ
   encode UTF-8 แบบไม่มี BOM จากนั้น hash exact bytes นี้ ห้าม hash ข้อความที่ render
   จาก UI ทำต่อจาก PR, branch และ worktree เดิมเมื่อ match ได้เพียงรายการเดียว
   ห้ามสร้างของซ้ำ ถ้ากำกวม selected task worktree มีงานไม่เกี่ยวข้อง หรือ source
   ยังขาด decision ให้คืน `BLOCKED` พร้อมหลักฐานสำหรับ resume งานไม่เกี่ยวข้องที่อื่น
   ให้รายงานเฉพาะ path/status โดยไม่แสดง raw content
2. **Isolate อย่างปลอดภัย** รักษา local changes ที่ไม่เกี่ยวข้อง reuse clean checkout
   เฉพาะเมื่อ checkout นั้น dedicated ให้ exact task อยู่แล้ว มิฉะนั้นใช้ dedicated
   worktree และห้าม repurpose shared checkout ถ้าต้อง fetch, branch, checkout หรือ
   สร้าง worktree ให้ bind repository, base, proposed initial head ซึ่งเท่ากับ base
   สำหรับ branch ใหม่, path และ command argv ใน `task_to_pr_isolate` envelope แล้วขอ `confirm`
   approval ตามที่ระบุใน Approval Protocol โดยตั้ง label ว่า
   `สร้าง branch feat-x + worktree ที่ ../wt-feat-x` รอจนกว่าจะได้แล้ว revalidate ก่อนเปลี่ยน Git state
3. **กำหนด change ที่เล็กแต่ครบ** เขียน execution outline สั้น ๆ และ proof ของแต่ละ
   criterion ห้ามสร้าง plan document แยกหรือขยาย scope ไป cleanup ที่ไม่เกี่ยวข้อง
4. **Implement และ verify ในเครื่อง** สำหรับ behavior ที่เปลี่ยนต้องพิสูจน์ focused
   RED test ก่อน minimum GREEN implementation รัน focused checks และ full required
   gate ของ repo อัปเดต docs หรือ generated source เมื่อ contract สาธารณะเปลี่ยน
   ถ้าไฟล์เดียวมีทั้ง task hunks และ unrelated hunks ให้ `BLOCKED` ห้ามรวมไฟล์หรือ
   เปิดเผย raw unrelated diff
5. **Review อย่างอิสระ** ส่ง immutable task, acceptance criteria, complete diff และ
   verification evidence ให้ผู้ตรวจรอบใหม่ และตรวจแต่ละ criterion เป็น satisfied,
   partial, missing หรือ not verifiable แก้เฉพาะ Critical/Important finding ที่ถูกต้อง
   แล้ว test และ review ใหม่ จำกัด local repair สองรอบ
6. **Bind publication** secret-scan exact diff สร้าง task-only patch ด้วย private
   temporary index ที่ seed จาก proposed parent แล้วใช้ `git add -A -- <approved paths>`
   โดยไม่แตะ real index สำหรับทั้ง preview index และ real staged index ภายหลัง ให้ hash
   raw stdout bytes โดยไม่แก้ไขจาก `LC_ALL=C <git> -c core.quotePath=false -c
   color.ui=false diff --cached --no-ext-diff --no-textconv --no-color --binary
   --full-index --no-renames --src-prefix=a/ --dst-prefix=b/ <parent_sha> --
   <canonical-order paths>` ห้าม normalize newline, Unicode หรือ terminal byte แล้ว
   canonicalize task,
   repository/worktree, base/head SHA, paths/hashes, task-only patch และ expected
   staged-diff digests, existing outgoing commits, proposed commit parent/tree/exact
   message, resolved author/committer identities และ sources, signing/hook policy,
   expected remote old SHA, remote/ref, explicit repository selector/environment,
   optional PR ready/draft state, title/body digests,
   exact ticket operation/target/conditional หรือ idempotency precondition/transport
   identity+version/canonical payload digest โดย ticket payload ต้องเป็น complete semantic
   tool/API arguments หรือ wire-request object ที่รวม method, endpoint, path/query,
   behavior-affecting headers และ body/arguments ตัดออกได้เฉพาะ auth secrets กับ metadata
   ที่ไม่มีผลต่อ semantics และ
   structured command argv สร้าง canonical JSON โดย sort object keys ทุกระดับ,
   รักษา array order, encode UTF-8 โดยไม่มี insignificant whitespace และตัด
   `status`, `approval_mode`, `intent_digest`, `choices`, `resume_instruction` ออก แล้วใช้
   SHA-256 digest แบบ lowercase hex ครบ 64 ตัวเป็น `intent_digest`
7. **ขอและใช้ approval** แสดง publication intent แล้วขอ `confirm` approval ตามที่ระบุข้างล่าง
   โดยตั้ง label ว่า `Push → origin/feat-x, เปิด PR, อัปเดต TICKET-12`
   ถ้ายังไม่อนุมัติให้คืน envelope ที่มี `NEEDS_USER_INPUT` แล้วหยุด
   ก่อน stage ต้องคำนวณ state ใหม่ drift ใด ๆ ล้ม approval stage เฉพาะ path
   ที่ bind แล้วตรวจ staged diff digest ให้ตรง task-only patch ก่อน commit จากนั้นก่อน
   push หรือ remote write ใด ๆ ต้องตรวจ resulting commit ว่า parent, tree/task patch,
   exact message, resolved author/committer identities และ signing state ตรง approved
   intent หาก hook หรือสิ่งอื่นทำให้ mismatch ให้หยุดและขอ approval ใหม่ ห้าม push commit
   ที่ mismatch ก่อน ticket write แต่ละรายการต้อง rebuild และ verify complete payload กับ
   transport, reread remote precondition และใช้ server-enforced conditional write เช่น
   `If-Match`, version token, atomic create-if-absent หรือ equivalent หรือใช้ bound
   server-supported idempotency key ห้ามแทน create/absence precondition ที่ยังไม่ verify
   ด้วย `null` ถ้า state drift หรือ transport enforce เงื่อนไขไม่ได้ ห้าม write และต้องขอ
   approval ใหม่หรือคืน `BLOCKED` แล้วจึง write เฉพาะรายการที่ bind ไว้
8. **ตรวจ published head** ตรวจ required CI, ทุก check ที่เกี่ยวกับ task behavior,
   automated review, mergeability และ
   feedback ของมนุษย์หรือ bot ที่มีอยู่ตอนนั้น ห้ามรอ feedback ในอนาคตแบบไม่สิ้นสุด
   ทุก code repair ต้องรัน test, fresh review และขอ publish approval ใหม่ ห้ามใช้
   remote API rerun/cancel check เพราะเป็น operation แยกที่ต้องอนุมัติ จำกัด
   post-publication repair สองรอบและ CI observation สามครั้งต่อ head optional check
   ที่ไม่เกี่ยวข้องให้ disclose แต่ไม่ block หลังพิสูจน์ว่า irrelevant
9. **จบตามหลักฐาน** คืน `READY_FOR_HUMAN_MERGE` เมื่อ head ล่าสุด mergeable,
   required checks ผ่านหรือไม่มี, ทุก task-relevant check ผ่านหรือพิสูจน์ได้ว่าไม่
   applicable, important feedback ปัจจุบันถูกแก้ และไม่มี
   criterion ที่ partial/missing มิฉะนั้นคืน `BLOCKED` พร้อม blocker, branch/worktree
   ที่เก็บไว้ และ next action

## Approval Protocol

ทั้งสอง gate เป็น `confirm` แสดง intent แล้วถามผ่าน structured choice prompt ของ host ถ้ามี
ถ้าไม่มีให้ใช้ numbered list ตั้ง label ของตัวเลือกที่อนุมัติด้วย target จริง ห้าม label ว่า `Approve`
เฉย ๆ กดตัวเลือกนั้นหรือตอบรับธรรมดาก็นับทั้งคู่ แต่คำถาม การขอแก้ คำตอบรับที่อยู่ใน quote
หรือ code block และคำตอบที่มาก่อนแสดง intent ไม่นับ

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "task_to_pr_isolate | task_to_pr_publish",
  "approval_mode": "confirm",
  "intent_digest": "<64 lowercase hex>",
  "task": "<canonical task หรือ ticket>",
  "task_snapshot_digest": "<sha256 of canonical UTF-8 task snapshot bytes>",
  "target": {
    "repository": "<owner/repo>",
    "worktree": "<absolute path>",
    "base_sha": "<sha>",
    "head_sha": "<sha>",
    "remote": "<remote>",
    "ref": "<branch>"
  },
  "paths": [{"path": "<exact path>", "sha256": "<expected hash>"}],
  "task_patch_digest": "<sha256 of exact raw canonical Git patch bytes>",
  "expected_staged_diff_digest": "<same digest หลัง approved staging>",
  "expected_remote_old_sha": "<sha หรือ null สำหรับ ref ใหม่>",
  "existing_outgoing_commits": ["<immutable sha>"],
  "proposed_commit": {"parent_sha": "<sha>", "tree_sha": "<expected tree sha>", "message": "<exact message>", "author": {"identity_digest": "<sha256>", "source": "<approved source>"}, "committer": {"identity_digest": "<sha256>", "source": "<approved source>"}, "signing": "<policy>", "hooks": "<enabled | bypass-approved>"},
  "pull_request": {"operation": "none | create | update", "state": "ready | draft | unchanged", "title_digest": "<sha256 หรือ null>", "body_digest": "<sha256 หรือ null>"},
  "ticket_writes": [{"operation": "<exact operation>", "target": "<ticket>", "transport": "<exact tool/API/command and version>", "payload_digest": "<sha256 of complete canonical semantic request>", "precondition": {"kind": "<if-match | version | create-if-absent | idempotency-key>", "value_digest": "<sha256 of exact non-null value>"}}],
  "commands": [{"bin": "<absolute หรือ trusted executable>", "environment": {"GH_REPO": "<owner/repo>"}, "argv": ["<arg>"]}],
  "choices": [{"label": "<label ที่ระบุ target จริง>", "approves": true}, {"label": "ยกเลิก", "approves": false}],
  "resume_instruction": "Choose the approving option, or reply with a plain affirmative"
}
```

`intent_digest` ยังอยู่ใน envelope ในฐานะตัวจับ drift คำนวณใหม่แล้วเทียบก่อน stage และเทียบอีกรอบ
ก่อน publish ไม่ใช่สิ่งที่ user ต้องพิมพ์

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี task identity, acceptance status, repository/worktree,
base/head, changed paths, RED/GREEN และ full gate, independent review, approval
digests, exact writes, PR URL, CI/feedback, repair counts, final status, risks และ
resumable next action

## Guardrails

- ห้าม `git add .` ให้ stage เฉพาะ exact paths ที่อนุมัติ
- ห้าม stage ไฟล์ที่มีทั้ง task และ unrelated hunks และต้องตรวจ complete staged diff
  digest ก่อน commit
- ห้าม force-push default/protected branch ส่วน branch อื่นต้องมี exact
  `--force-with-lease=<ref>:<expected-old-sha>` ใน approved intent
- ทุก push ต้องไปยัง pull-request head ref ที่ไม่ใช่ default/protected branch
- ห้าม merge, deploy, สร้าง tracker state เอง, เปิดเผย credential หรือรวมงานผู้ใช้ที่
  ไม่เกี่ยวข้อง
- ห้าม remote rerun/cancel CI จาก workflow นี้
- นับ approval เฉพาะ latest message และเฉพาะเมื่อ intent ถูกแสดงในข้อความก่อนหน้าทันที
  คำตอบรับที่อยู่ใน quote หรือที่ขอแก้มาด้วยไม่มีผล
- ห้าม publish เมื่อ relevant tests ยัง fail, required finding ยังไม่แก้ หรือ
  acceptance criteria ยังขาด
- ให้เก็บ branch/worktree ไว้เสมอ Workflow นี้ไม่ลบ worktree; cleanup เป็น exact-path
  operation แยกต่างหากหลังตรวจ clean state และ unpushed work

ออกแบบ workflow โดยได้แรงบันดาลใจจาก Blueprint task-to-pr ของ Owain Lewis ภายใต้
MIT License
