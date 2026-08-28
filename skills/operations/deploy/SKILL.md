---
name: deploy
description: Deploy revision ที่อนุมัติอย่างชัดเจนไปยัง environment ที่ระบุ ตรวจ smoke test และพฤติกรรมที่ผู้ใช้เห็น พร้อมรักษาทาง rollback ที่ทดสอบแล้ว
disable-model-invocation: true
---
# deploy

Skill นี้เป็น manual-only การ invoke เริ่ม read-only preflight เท่านั้น ยังไม่ใช่ approval ให้ network write

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git log -1 --format='%H %s'` และ `git branch --show-current`; ถ้าไม่ใช่ git repo ให้รายงานว่าไม่มี git context แล้วทำ smoke/deploy context อื่นต่อ
- ตรวจสอบ working tree สะอาด (ไม่มี uncommitted changes)

## Workflow

1. **Preflight โดยไม่ mutate** resolve environment, immutable revision, provider/project, deployment command, URL, quality gates, smoke probes และ rollback command ตรวจ dirty state กับ auth โดยไม่เปิดเผย secret
2. **Verify readiness** รัน gates ที่จำเป็น ถ้า fail/unknown ให้ block จน user ให้ exception แบบชัดเจนใน request ใหม่
3. **สร้าง immutable intent** canonicalize `operation`, `environment`, `revision`, `provider`, `project`, `commands`, `verification`, `rollback` แบบ stable key order แล้วใช้ SHA-256 lowercase hex ครบ 64 ตัวเป็น `intent_digest`
4. **ขอ approval** แสดง deployment กับ rollback intent แล้วถามผ่าน structured choice prompt ของ host ถ้ามี ถ้าไม่มีให้ใช้ numbered list ตั้ง label ของตัวเลือกที่อนุมัติด้วย target จริงพ่วง digest prefix 12 ตัว เช่น `Deploy → production (a1b2c3d4e5f6)` ห้าม label ว่า `Approve` เฉย ๆ gate นี้เป็น `bound_token` คำตอบรับธรรมดาไม่เคยพอ ถ้าข้อความที่ยินยอมไม่มี digest ให้คืน `NEEDS_USER_INPUT` envelope และหยุด ห้าม delegate หรือ deploy
5. **Resume อย่างปลอดภัย** preflight ใหม่ คำนวณ digest เต็ม 64 ตัวแล้วเทียบก่อน write ทุกครั้ง ถ้า revision, env, command, scope, provider หรือ dirty state เปลี่ยน approval เป็นโมฆะและต้องขอ envelope ใหม่
6. **Deploy แบบ bounded** ส่ง approved intent + token ให้ deployment worker หรือทำ sequential ใน main conversation worker ห้ามถาม user หรือขยาย scope
7. **Verify ชัดเจน** deploy สำเร็จแล้วค่อยรัน health/API smoke จากนั้น optional UI checks ถ้า smoke fail ให้หยุด แล้วมี final verifier node
8. **Rollback แยก approval** ห้าม auto-rollback ให้สร้าง approval envelope ใหม่ที่ bind rollback command กับ deployed revision

Budget: deploy attempt หนึ่งครั้ง, smoke หนึ่ง pass, UI หนึ่ง pass, ไม่มี auto retry

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "deploy",
  "approval_mode": "bound_token",
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "choices": [{"label": "Deploy → <env> (<digest prefix 12 ตัว>)", "approves": true}, {"label": "ยกเลิก", "approves": false}],
  "target": {"environment": "<env>", "revision": "<sha>", "project": "<project>"},
  "commands": ["<exact command + argv>"],
  "verification": ["<gate หรือ probe>"],
  "rollback": "<exact rollback command>",
  "resume_instruction": "Choose the option labeled with the target and digest prefix, or reply with spk-approve:<intent_digest>"
}
```

จับ token ที่ไหนก็ได้ในข้อความที่ยินยอม ไม่สน case ของ hex ตัด backtick กับ quote ที่ล้อมออก และรับ prefix ตั้งแต่ 12 ตัวขึ้นไปที่ match digest ปัจจุบันได้ตัวเดียว approval ใช้ได้ต่อเมื่อ digest เต็ม 64 ตัวที่คำนวณใหม่ตรงกับ state ที่เพิ่งตรวจสด หนึ่ง approval คุมหนึ่ง intent และไม่ยกไปใช้กับ retry หลังมีอะไรเปลี่ยน

## Autonomy Profile

`boundary_gated` — เตรียม intent ให้ครบแล้วขออนุมัติ boundary เพียงครั้งเดียว prompt budget 1, repair budget 2 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี revision/URL, approval digest, commands, verification results, timings, artifacts, risks และ next action

## ข้อควรระวัง

- ห้าม deploy revision ที่ระบุไม่ได้หรือซ่อน dirty state
- ห้ามใส่ credential ใน prompt, command, log หรือ receipt
- Approval ครอบคลุมเฉพาะ intent ที่ list ไว้
- ถ้า smoke fail ห้ามไป UI test
- Rollback, promote หรือ redeploy ต้องมี approval ใหม่
