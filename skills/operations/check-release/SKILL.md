---
name: check-release
description: รันทุก gate ที่ต้องผ่านก่อนออก release ตรวจ version และ generated files แล้วรายงานสิ่งที่ยังติดโดยไม่ publish
disable-model-invocation: true
---
# เช็กความพร้อมก่อนปล่อย

ใช้เช็กความพร้อมก่อน release โดยไม่ commit, push, tag, publish หรือ deploy เอง

## สิ่งที่ต้องตรวจ

รันคำสั่งรวมด้านล่าง แล้วรายงานผลตามที่ script รายงานจริง (pass/fail ต่อ gate) — ห้ามสรุปว่า "พร้อม release" ถ้ายังไม่ได้รันจริง:

```bash
npm run verify:release
npm test -- --runInBand
```

`npm run verify:release` คือคำสั่งรวมที่ chain ทุก gate จริงไว้แล้ว รายการ gate ที่เป็น authoritative อยู่ใน `package.json` field `scripts.verify:release` เท่านั้น ห้าม hardcode รายชื่อ gate ซ้ำไว้ที่นี่ เพื่อไม่ให้ skill นี้ drift ออกจาก `package.json` อีก

## Git readiness

- ตรวจ `git status --short --branch`
- ถ้าอยู่บน main ให้ดู outgoing commits ด้วย `git log --oneline origin/main..HEAD`
- ก่อนแนะนำ commit ให้ scan staged added lines ว่าไม่มี secret

## Output

สรุปเป็น:

```markdown
## Release Check
- Scope: <scope>
- Gates: <pass/fail list>
- Git state: <clean/dirty/ahead/behind>
- Secret scan: <pass/fail/not run + reason>
- Blockers: <list>
- Next safe action: <one step>
```

## Safety

- ค่าเริ่มต้นคือ prepare-only
- ห้าม commit, push, tag, publish หรือ deploy โดยไม่มี confirmation ชัดเจน

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้
