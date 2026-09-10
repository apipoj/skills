---
name: to-spec
description: สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ
---
# สรุปเป็นสเปก

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions, `docs/agents/artifacts.md` และ
   `docs/agents/issue-tracker.md` ถ้ามี แล้วอ่านหลักปฏิบัติฉบับเต็มใน
   [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## ปลายทาง Artifact

เขียน draft ที่พร้อม review ลง `ai_context/work/specs/YYYY-MM-DD-spec-<slug>.md` เป็น
ค่าเริ่มต้น จากนั้น promote ไป canonical backend เดียวที่ `docs/agents/artifacts.md`
เลือกไว้: issue tracker ที่ตั้งค่าแล้ว หรือ `docs/specs/` สำหรับ project แบบ file-based
ถ้ายังไม่มี authority สำหรับ external publication ให้เก็บ draft ไว้ local ห้ามดูแล issue
และ Markdown file เป็น source of truth ที่แก้ไขได้สองชุด

## จุดเน้น

สรุปบทสนทนาและหลักฐานจาก codebase เป็นสเปกที่พร้อมตรวจและนำไปวางแผนต่อ

## Product loop specification

Synthesize the confirmed vision, reviewed wireframes, selected mockups, and repository
facts into one spec. Link the source artifacts and preserve their decisions. Include
problem/value, users and journeys, MVP/non-goals, behavior and relevant data/API constraints,
numbered acceptance criteria (AC-01), and test cases (TC-01) with preconditions, steps,
expected results, and linked ACs. Record agreed automation/browser QA/UAT scope and open
material decisions. A PRD and SRD may be sections rather than separate duplicate files.

Check that every in-scope AC has appropriate verification and no requirement silently
contradicts the vision or selected design. Reuse agreed test seams; ask only unresolved
material choices. In a selected product loop, return the spec reference for planning;
a spec-only request stops here. These local-draft and consent rules take precedence over
UPSTREAM.md publication, exhaustive-story, and repeated-confirmation suggestions.

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
