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
4. **ขอ approval** ถ้า latest user message ไม่มี token ตรง `spk-approve:<intent_digest>` ให้คืน `NEEDS_USER_INPUT` envelope และหยุด ห้าม delegate หรือ deploy
5. **Resume อย่างปลอดภัย** เมื่อมี exact token ให้ preflight ใหม่ ถ้า revision, env, command, scope, provider หรือ dirty state เปลี่ยน token เป็นโมฆะ
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
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "target": {"environment": "<env>", "revision": "<sha>", "project": "<project>"},
  "commands": ["<exact command + argv>"],
  "verification": ["<gate หรือ probe>"],
  "rollback": "<exact rollback command>",
  "resume_instruction": "Reply exactly: approve spk-approve:<intent_digest>"
}
```

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี revision/URL, approval digest, commands, verification results, timings, artifacts, risks และ next action

## ข้อควรระวัง

- ห้าม deploy revision ที่ระบุไม่ได้หรือซ่อน dirty state
- ห้ามใส่ credential ใน prompt, command, log หรือ receipt
- Approval ครอบคลุมเฉพาะ intent ที่ list ไว้
- ถ้า smoke fail ห้ามไป UI test
- Rollback, promote หรือ redeploy ต้องมี approval ใหม่
