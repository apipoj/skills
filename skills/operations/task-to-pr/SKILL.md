---
name: task-to-pr
description: นำงานที่ระบุหนึ่งรายการจากต้นทางไปสู่ PR ที่ผ่าน test, review และ local browser QA สำหรับสิ่งที่ผู้ใช้เห็น โดยไม่ขออนุมัติซ้ำระหว่างทาง
disable-model-invocation: true
---

# นำหนึ่ง Task ไปจน PR พร้อม Merge

ทำ task, ticket หรือ pull request ที่ระบุเพียงหนึ่งรายการไปจนถึง
`READY_FOR_HUMAN_MERGE` โดยไม่ต้องให้ผู้ใช้เฝ้า development, local QA, publication
หรือ CI repair ตามปกติ

## Task-Bound Authority

คำขอปัจจุบันที่ชัดว่าให้นำหนึ่ง task ไปเป็น pull request อนุญาตสิ่งต่อไปนี้ตลอด workflow:

- อ่าน source และตรวจ repo แบบ read-only
- fetch และสร้างหรือ reuse branch/worktree ที่ dedicated ให้ task
- แก้ workspace, test, docs และ generated source ภายใน scope
- start app ตามเอกสารแล้วรัน local browser QA แบบไม่ทำลายข้อมูล
- stage exact paths, commit และ push ไป pull-request head ref ที่ไม่ใช่ default/protected
- สร้างหรืออัปเดต pull request ของ task
- ซ่อม local, browser QA, review และ CI failure ที่อยู่ใน scope ภายใน repair budget

authority นี้ไม่รวม merge, deploy, force-push, default/protected branch, destructive
production action, unrelated tracker write, credential exposure หรือ scope expansion

## Workflow

1. **Resolve source เดียว** อ่าน repository instructions แล้วหา exact task และ acceptance
   criteria ระบุ GitHub repository จาก selected remote แล้ว bind `GH_REPO=<owner/repo>`
   หรือ `--repo <owner/repo>` กับทุก GitHub read/write ห้ามให้ fork-aware client เดา fork
   parent และต้องตรวจว่า repository ที่ตอบกลับตรง selector จากนั้นสร้าง immutable snapshot
   เป็น canonical JSON: Unicode NFC, newline LF,
   sort object keys ทุกระดับ, รักษา array order และ encode UTF-8 แบบไม่มี BOM จากนั้น
   hash exact bytes ทำต่อจาก PR/branch/worktree เดิมเมื่อ match ได้รายการเดียว ถ้ากำกวม
   หรือขาด product decision สำคัญให้คืน `BLOCKED`
2. **Isolate อัตโนมัติ** รักษา unrelated local work ใช้ clean checkout เดิมเฉพาะเมื่อ
   dedicated ให้ task นี้ มิฉะนั้น fetch และสร้าง branch/worktree แยกภายใต้ task-bound
   authority ห้าม repurpose shared dirty checkout
3. **กำหนด change ที่เล็กแต่ครบ** ทำ internal outline ที่ map ทุก acceptance criterion
   ไป code, tests, browser behavior ที่เกี่ยวข้อง และ verification ห้ามขยาย scope ไป cleanup
4. **Implement และ verify local** พิสูจน์ focused RED ก่อน minimum GREEN รัน focused
   checks และ full required gate อัปเดต docs/generated source เมื่อ public behavior เปลี่ยน
   ถ้าไฟล์เดียวปน task hunks กับ unrelated hunks ให้ `BLOCKED` ห้ามดูดงานนั้นเข้ามา
5. **Review อิสระ** ให้ fresh reviewer ตรวจ immutable task, acceptance criteria, complete
   diff และ evidence แก้ Critical/Important finding ที่ถูกต้อง แล้ว test และ fresh review
   ใหม่ จำกัด local repair สองรอบ
6. **รัน local browser QA** เมื่อเปลี่ยนสิ่งที่ผู้ใช้เห็น ให้ start app บน localhost ที่ไม่ใช่
   production, derive flow จาก acceptance criteria, navigate/fill/click/assert URL, DOM,
   text และ visible state เก็บ pass evidence และ screenshot/DOM ตอน fail พร้อม page,
   console และ network errors ซ่อมใน scope แล้ว rerun test กับทุก flow ที่กระทบ จำกัด browser
   repair สองรอบ แล้ว stop server แบบ finally-style งาน non-UI ให้บันทึก
   `NOT_APPLICABLE` พร้อมหลักฐาน
7. **เตรียม publication state** secret-scan complete diff สร้าง task-only patch ผ่าน private
   temporary index ที่ seed จาก parent แล้วใช้ `git add -A -- <task paths>` ห้ามแตะ real
   index และห้าม `git add .` hash raw canonical patch จาก Git ด้วย `--no-ext-diff`
   บันทึก task snapshot, path hashes, parent/tree, exact message, identity/signing/hook,
   expected remote SHA/ref, explicit repository selector/environment, PR digests,
   command argv และ `payload_digest` พร้อม non-null
   conditional/idempotency precondition
8. **Commit และ publish โดยไม่ถามซ้ำ** revalidate material state, stage เฉพาะ task paths,
   verify complete staged patch, commit แล้วตรวจ parent/tree/task patch/message/identity
   ก่อน push เฉพาะ non-protected PR ref พร้อม bound repository selector สร้างหรืออัปเดต PR
   แล้วตรวจว่า URL อยู่ใน selected repository ใช้ `If-Match`, version token,
   create-if-absent หรือ bound idempotency key กับ task write ห้าม write ถ้า enforce
   precondition ไม่ได้
9. **Observe และ repair published head** ตรวจ required CI, task-relevant checks,
   automated review, mergeability และ feedback ปัจจุบัน วินิจฉัยก่อนซ่อม ซ่อมเฉพาะใน
   scope แล้ว rerun tests, fresh review และ browser QA ที่เกี่ยวข้อง จากนั้น commit/push
   โดยไม่ถามซ้ำ จำกัด post-publication repair สองรอบและ observation สามครั้งต่อ head
10. **จบตามหลักฐาน** คืน `READY_FOR_HUMAN_MERGE` เมื่อ latest head mergeable, required
    CI ผ่านหรือไม่มี, task-relevant checks ผ่านหรือพิสูจน์ว่าไม่เกี่ยว, browser QA ที่ต้องทำ
    ผ่าน, important feedback ถูกแก้ และ acceptance criteria ครบ ไม่เช่นนั้นคืน `BLOCKED`
    พร้อม branch/worktree ที่เก็บไว้และ checkpoint ที่ resume ได้

## Run Receipt

```json
{
  "schema": "spk.task-authority/v1",
  "approval_mode": "task_bound",
  "task": "<canonical identity>",
  "task_snapshot_digest": "<sha256>",
  "target": {"repository": "<owner/repo>", "worktree": "<absolute path>", "base_sha": "<sha>", "head_sha": "<sha>", "remote": "<remote>", "ref": "<PR ref>", "repository_selector": "GH_REPO=<owner/repo>"},
  "paths": [{"path": "<task path>", "sha256": "<hash>"}],
  "task_patch_digest": "<sha256>",
  "browser_qa": {"status": "PASS | FAIL | NOT_APPLICABLE", "flows": [], "artifacts": []},
  "repairs": {"local": 0, "browser": 0, "post_publication": 0},
  "phase": "<current phase>",
  "next_action": "<smallest resumable action>"
}
```

## Autonomy Profile

`afk_to_pr` — ทำ task ที่ระบุจน PR พร้อมให้มนุษย์ merge โดยไม่ถามซ้ำ prompt budget 0,
repair budget 2 รอบ ทำต่อผ่าน resolve, isolate, implement, test, local browser QA,
review, commit, push, PR และ CI repair ก่อนหยุดต้องเก็บ branch/worktree แล้วบันทึก task,
head, evidence, attempts, PR state และ next action ที่ resume ได้

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี task identity, acceptance status, repo/worktree, base/head,
changed paths, RED/GREEN/full gates, independent review, local browser QA หรือหลักฐานว่า
ไม่เกี่ยว, exact commit/ref/task writes, PR URL, CI/feedback, repair counts, final status,
risks และ resumable next action

## Guardrails

- ห้าม `git add .`; stage เฉพาะ complete explicit task paths
- ห้าม stage mixed task/unrelated hunks หรือเปิดเผย unrelated raw content
- ห้าม force-push, merge, deploy หรือ push default/protected branch
- bind explicit repository selector ทุก GitHub read/write และตรวจ returned URL
- ห้าม publish credential, raw private source หรือ known-bad task head
- ทุก task-relevant check ต้องผ่าน; optional failure ที่ไม่เกี่ยวต้องมีหลักฐาน
- เก็บ branch/worktree ไว้เพื่อ recovery; cleanup เป็น exact-path operation แยก

ออกแบบ workflow โดยได้แรงบันดาลใจจาก Blueprint task-to-pr ของ Owain Lewis ภายใต้
MIT License
