---
name: research
description: ค้นคว้าคำถามจากแหล่งภายนอกหรือเว็บ ไม่ใช่ความรู้ที่ repo นี้มีอยู่แล้ว แล้วเก็บข้อค้นพบเป็นเอกสาร research พร้อม citation ที่ตรวจย้อนกลับได้
---
# ค้นคว้าจากแหล่งหลัก

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions, `docs/agents/artifacts.md` ถ้ามี และหลักปฏิบัติ
   ฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. ใช้ smart defaults เมื่อความเสี่ยงต่ำ ถ้ามี decision ที่เปลี่ยน scope ให้ถามเพียงหนึ่งคำถามพร้อมคำแนะนำ
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## ปลายทาง Artifact

เขียน cited draft ที่ `ai_context/work/research/YYYY-MM-DD-research-<slug>.md` เป็น
ค่าเริ่มต้น Promote ไป `docs/research/YYYY-MM-DD-research-<slug>.md` เฉพาะเมื่อ artifact
policy หรือคำขอระบุว่าเป็นข้อมูล reusable/team-shared ให้บันทึก canonical path และให้ wiki
เก็บเพียง pointer ห้ามคัดลอก body ซ้ำ

## จุดเน้น

ค้นคว้าคำถามจาก primary sources และเก็บข้อค้นพบพร้อม citation ที่ตรวจย้อนกลับได้

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เอง
- อย่า commit, push, publish หรือแก้ระบบภายนอกโดยไม่มี approval ที่ตรงเป้าหมาย
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
