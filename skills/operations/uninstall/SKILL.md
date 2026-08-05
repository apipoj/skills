---
name: uninstall
description: ลบเฉพาะ artifact ในโปรเจกต์ที่ยืนยันว่า SPK เป็นเจ้าของ หลังแสดงเป้าหมายที่แน่นอน พร้อมรักษาความรู้โปรเจกต์และไฟล์ผู้ใช้ที่ไม่เกี่ยวข้อง
disable-model-invocation: true
---
# uninstall

Skill นี้เป็น manual-only และทำโดยตรงใน current conversation Invocation อย่างเดียวไม่ใช่ approval ให้ลบ

## Workflow

1. **Inventory read-only** ใช้ `.spk/installed.json` เป็น ownership evidence ก่อน normalize ทุก candidate ให้อยู่ใน workspace Legacy install รับเฉพาะ SPK marker หรือ registered exact name ห้ามเดาจาก directory กว้าง
2. **Preview exact effects** list ทุก file/range ที่จะลบ, stale record และทุกอย่างที่ preserve ต้องรักษา wiki, sources, human-authored context, credentials และ non-SPK files
3. **Bind intent** canonicalize operation, exact paths, text ranges, expected hashes และ preserve list แล้วใช้ SHA-256 lowercase hex ครบ 64 ตัว
4. **ขอ approval** ถ้า latest message ไม่มี exact `spk-approve:<intent_digest>` ให้คืน envelope แล้วหยุด
5. **Resume safely** re-read ownership กับ hashes drift ใด ๆ ต้องขอ approval ใหม่
6. **Apply narrowly** ลบเฉพาะ approved SPK-owned files และ marker block ที่อนุมัติ ห้าม recursive remove `.claude/` หรือ broad directory ลบ empty directory ได้หลังพิสูจน์ว่าว่าง
7. **Verify** ยืนยัน targets หาย, preserved paths byte-for-byte เหมือนเดิม, ไม่มี path escape workspace และรายงาน recovery ถ้าใช้ trash/quarantine

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "uninstall",
  "intent_digest": "<64 lowercase hex>",
  "approval_token": "spk-approve:<intent_digest>",
  "paths": ["<exact SPK-owned path>"],
  "text_edits": [{"path": "<shared file>", "range": "<SPK marker block>"}],
  "preserve": ["ai_context/wiki/", "ai_context/sources/", "<human-owned path>"],
  "resume_instruction": "Reply exactly: approve spk-approve:<intent_digest>"
}
```

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี approval digest, removed paths, edited ranges, preserved verification, recovery, risks และ next action

## ข้อควรระวัง

- Preview เป็นข้อบังคับ
- ห้าม unresolved glob, symlink target, recursive broad directory หรือ path นอก workspace
- ห้ามแตะ wiki/source data หรือ file ที่ไม่มี ownership evidence
- State drift ทำให้ approval เป็นโมฆะ
