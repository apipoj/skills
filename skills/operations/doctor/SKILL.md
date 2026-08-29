---
name: doctor
description: วินิจฉัยสุขภาพการติดตั้งและ runtime ของ SPK บน host ที่รองรับด้วยการตรวจแบบ read-only แล้วรายงาน failure และคำสั่งแก้ไขที่แน่นอน
---
# SPK Doctor

วินิจฉัยชุด SPK ที่ติดตั้งโดยไม่เปลี่ยน project หรือ installation state

## Workflow

1. หารากชุดติดตั้งจาก trusted host metadata หรือตัวแปรรากที่ host ให้ ปฏิเสธ root นอกตำแหน่งติดตั้งและห้ามเลือกไฟล์ชื่อเดียวกันใน project
2. หา `scripts/spk-doctor.cjs` ใต้ root แล้วรันด้วย Node โดยใช้ target project เป็น cwd ถ้ารองรับให้ขอ structured output ด้วย flag `--json` ถ้าไม่รองรับให้ parse เฉพาะ key/value output ที่มีเอกสารรองรับ
3. ตรวจ diagnostics สำหรับ manifest discovery, skill/agent counts, hooks, MCP, runtime prerequisites, scaffold, permissions, host compatibility และ version drift
4. verify ซ้ำเฉพาะ check ที่ fail/ambiguous แบบ read-only ห้าม install, regenerate, rewrite config, auth หรือ restart
5. จัดระดับแต่ละ check เป็น `pass`, `warn` หรือ `fail` แล้วสรุปผลรวมเป็น `ok`, `warning`
   หรือ `error` ให้ exact repair command ทุก failure แต่ห้าม execute

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

คืน:

```json
{
  "schema": "spk.doctor/v1",
  "status": "ok | warning | error",
  "host": "<detected host>",
  "plugin_root": "<resolved path>",
  "checks": [{"id": "<check id>", "status": "pass | warn | fail", "message": "<fact>", "remediation": "<fix, when the script provides one>"}],
  "repair_commands": ["<exact command + argv>"]
}
```

## ข้อควรระวัง

- Doctor เป็น read-only ห้าม repair, install, auth หรือลบ
- ห้ามเปิดเผย env values, credential, token หรือ raw private sources
- Optional capability ที่หายเป็น `WARN` ไม่ใช่ `ERROR`
- ถ้า runtime script หายให้รายงาน installation corruption และ safe reinstall command แทนการ download หรือสร้างไฟล์เอง
