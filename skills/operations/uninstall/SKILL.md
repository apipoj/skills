---
name: uninstall
description: ลบเฉพาะ artifact ในโปรเจกต์ที่ยืนยันว่า SPK เป็นเจ้าของ หลังแสดงเป้าหมายที่แน่นอน พร้อมรักษาความรู้โปรเจกต์และไฟล์ผู้ใช้ที่ไม่เกี่ยวข้อง
disable-model-invocation: true
---
# uninstall

Skill นี้เป็น manual-only และทำโดยตรงใน current conversation Invocation อย่างเดียวไม่ใช่ approval ให้ลบ

## Workflow

1. **Inventory read-only** ใช้ `.spk/manifest.json` เป็น ownership evidence ก่อน normalize ทุก candidate ให้อยู่ใน workspace Legacy install รับเฉพาะ SPK marker หรือ registered exact name ห้ามเดาจาก directory กว้าง Modern plugin install เป็นเจ้าของ `ai_context/.spk-version`, cache entry ใน `.claude/spk-webfetch-cache/`, และ SPK block ใน `.git/info/exclude` ด้วย
2. **Preview exact effects** list ทุก file/range ที่จะลบ, stale record และทุกอย่างที่ preserve ต้องรักษา wiki, sources, human-authored context, credentials และ non-SPK files
3. **Bind intent** canonicalize operation, exact paths, text ranges, expected hashes และ preserve list แล้วใช้ SHA-256 lowercase hex ครบ 64 ตัว
4. **ขอ approval** แสดง preview แล้วถามผ่าน structured choice prompt ของ host ถ้ามี ถ้าไม่มีให้ใช้ numbered list ตั้ง label ของตัวเลือกที่อนุมัติด้วย scope จริง เช่น `ลบไฟล์ SPK 7 ไฟล์ใน .claude/` ห้าม label ว่า `Approve` เฉย ๆ gate นี้เป็น `confirm` กดตัวเลือกนั้นหรือตอบรับธรรมดาก็นับทั้งคู่ แต่คำถาม การขอแก้ คำตอบรับที่อยู่ใน quote หรือ code block และคำตอบที่มาก่อนแสดง preview ไม่นับ ถ้ายังไม่อนุมัติให้คืน envelope แล้วหยุด
5. **Resume safely** re-read ownership กับ hashes แล้วคำนวณ digest ใหม่ก่อนลบทุกครั้ง drift ใด ๆ ต้องขอ approval ใหม่ เวลาเรียก uninstall module ให้ส่ง digest ที่ module ออกให้ user อนุมัติ preview ไม่ใช่อนุมัติตัว digest
6. **Apply narrowly** ลบเฉพาะ approved SPK-owned files และ marker block ที่อนุมัติ ห้าม recursive remove `.claude/` หรือ broad directory ลบ empty directory ได้หลังพิสูจน์ว่าว่าง
7. **Verify** ยืนยัน targets หาย, ยืนยันว่าทุก preserved path ใน evidence receipt ยังอยู่และไม่ปรากฏใน `removed` หรือ `edited`, ไม่มี path escape workspace และรายงาน recovery ถ้าใช้ trash/quarantine

## Approval Protocol

```json
{
  "schema": "spk.approval/v1",
  "status": "NEEDS_USER_INPUT",
  "operation": "uninstall",
  "approval_mode": "confirm",
  "intent_digest": "<64 lowercase hex>",
  "paths": ["<exact SPK-owned path>"],
  "text_edits": [{"path": "<shared file>", "range": "<SPK marker block>"}],
  "preserve": ["ai_context/wiki/", "ai_context/sources/", "<human-owned path>"],
  "choices": [{"label": "ลบไฟล์ SPK <n> ไฟล์ใน <scope>", "approves": true}, {"label": "ยกเลิก", "approves": false}],
  "resume_instruction": "Choose the approving option, or reply with a plain affirmative"
}
```

`intent_digest` ยังอยู่ใน envelope ในฐานะตัวจับ drift และเป็นค่าที่ส่งให้ uninstall module คำนวณใหม่แล้วเทียบก่อนลบ ไม่ใช่ให้ user พิมพ์

## Autonomy Profile

`boundary_gated` — เตรียม intent ให้ครบแล้วขออนุมัติ boundary เพียงครั้งเดียว prompt budget 1, repair budget 2 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี approval digest, removed paths, edited ranges, preserved verification, recovery, risks และ next action

## ข้อควรระวัง

- Preview เป็นข้อบังคับ
- ห้าม unresolved glob, symlink target, recursive broad directory หรือ path นอก workspace
- ห้ามแตะ wiki/source data หรือ file ที่ไม่มี ownership evidence
- State drift ทำให้ approval เป็นโมฆะ
