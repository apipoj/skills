---
name: debug
description: หาต้นเหตุของบั๊กหรือ performance regression ด้วย feedback loop ที่สั้น ชัด และพิสูจน์ซ้ำได้
---
# debug

## Response Rules

Reply in the user's language.

- **Simplicity** — one idea per sentence; the plain word over the impressive one.
- **Brevity** — answer first, then stop; no preamble, no restating the request, no summarizing what you just wrote.
- **Clarity** — lead with the outcome, then what changed and what it costs; label an unverified claim as unverified.
- **Humanity** — write as a colleague, not a system; familiar technical English over literal translation; no performative enthusiasm, no apology theater, no location stereotypes.

Use a reversible smart default; ask one material question only when the answer changes scope, risk, or success.

วิเคราะห์ root cause อย่างเป็นระบบก่อนที่จะลองแก้ไข

ใช้ตอน test fail, production bug, build error, regression, behavior ไม่ตามที่คาด หรือทุกสถานการณ์ที่การเดาจะเสียเวลา

## Redact

This skill has you show commands, outputs and captured artifacts. **Redact every secret first** — write `<REDACTED>` in its place. Build loops against env vars, so the credential stays in the environment rather than in what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short`, `git log -5 --oneline` และ `git diff --stat`; ถ้าไม่ใช่ git repo ให้ข้าม git context และใช้ข้อมูลที่มีแทน
- เก็บ error output, test failure หรือ behavior ที่ไม่คาดคิดให้ครบ

## Process RCA 4 ขั้น

### ขั้นที่ 1: อ่าน Error และ Reproduce
- เก็บ error message, stack trace หรือ failing assertion ที่แน่นอน
- ระบุ reproduction steps ขั้นต่ำ
- ถ้า reproduce ไม่ได้ ให้ return `NEEDS_REPRO` พร้อมระบุข้อมูลที่ขาด

### ขั้นที่ 2: เปรียบเทียบ Pattern ที่ทำงาน
- หา code path หรือ test ที่ใกล้เคียงกันที่ทำงานปกติ
- Diff working vs. failing path เพื่อแยกจุดที่ต่าง
- เช็ค commits ล่าสุดที่น่าจะเป็นต้นเหตุ

### ขั้นที่ 3: สร้างและทดสอบ Hypothesis
- เขียน hypothesis ทีละข้อ
- ทดสอบแต่ละ hypothesis ด้วย experiment ที่มุ่งเป้า (log, breakpoint, unit test)
- ทิ้ง hypothesis ที่ผิดก่อนสร้างข้อใหม่
- ถ้า 3 hypotheses ผิดแล้ว ให้ flag `POSSIBLE_ARCHITECTURE_ISSUE`

### ขั้นที่ 4: แนะนำ Fix
- ระบุ root cause พร้อมหลักฐาน
- ระบุ file:line ที่ได้รับผลกระทบ
- แนะนำ fix ที่เล็กที่สุด
- แนะนำ regression test ที่จะจับปัญหานี้ได้

## Output Format

```markdown
## Debug Report
- Error: <error หรือ behavior ที่แน่นอน>
- Root cause: <คำอธิบายที่มีหลักฐาน>
- ตำแหน่งที่ได้รับผล: <file:line list>
- Fix ที่แนะนำ: <การเปลี่ยนแปลงที่เล็กที่สุด>
- Regression test: <test ที่จะจับปัญหานี้>
- Status: <FIX_READY | NEEDS_REPRO | POSSIBLE_ARCHITECTURE_ISSUE>
```

## ข้อควรระวัง

- ห้ามแก้ไขก่อนมีหลักฐาน root cause
- ถ้า reproduce ไม่ได้ ให้ return `NEEDS_REPRO` พร้อมระบุข้อมูลที่ขาด
- ถ้าลองแก้แล้ว 3 ครั้งแล้วยังไม่ได้ ให้ flag `POSSIBLE_ARCHITECTURE_ISSUE` แทนที่จะเสนอ patch ที่ 4
- อย่าแก้ source code คืน diagnosis และ next action ที่แนะนำ
- สำหรับ production data, credentials, destructive actions หรือ external services ให้หยุดและถาม operator ก่อน
