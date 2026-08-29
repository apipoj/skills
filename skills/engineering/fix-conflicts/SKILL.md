---
name: fix-conflicts
description: แก้ merge หรือ rebase conflict ทีละจุด โดยรักษาเจตนาของทั้งสองฝั่งและตรวจผลก่อนทำต่อ
---
# แก้ merge conflict

ตอบเป็นภาษาไทยธรรมชาติแบบเพื่อนร่วมงานเป็นค่าเริ่มต้น ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อทำให้อ่านง่ายกว่า และเริ่มจากผลลัพธ์หรือ decision ที่ผู้ใช้ต้องรู้ก่อน

## Workflow

1. อ่านคำขอ repository instructions และหลักปฏิบัติฉบับเต็มใน [UPSTREAM.md](UPSTREAM.md)
2. คำขอที่ชัดเจนให้แก้ merge/rebase นี้ = ให้สิทธิ์ Git write แบบมีขอบเขตเพื่อทำให้จบ ได้แก่ stage ไฟล์ที่แก้แล้ว, `git rebase --continue`/`git merge --continue`, และ commit แก้ conflict เอง รวมถึง commit ที่เหลือทุกตัวถ้าเป็น rebase หลาย commit ถ้าทั้งสองฝั่งแก้ logic เดียวกันและเลือกทางไหนก็เสีย behavior ให้หยุดถามแทนการเดา
3. ทำงานตาม discipline ของ skill นี้เป็น slice สั้น ๆ และแสดง progress เท่าที่ช่วยให้ตรวจสอบได้
4. สรุปผล หลักฐาน ความเสี่ยง และสิ่งที่ยังต้องตัดสินใจโดยไม่ยืดเยื้อ

## จุดเน้น

แก้ merge หรือ rebase conflict ทีละ hunk โดยตามเจตนาของทั้งสองฝั่งและตรวจผลก่อนเดินต่อ

## Autonomy Profile

`decision_aware` — ตรวจ fact และทำ draft ได้ถึง effect level ที่ skill ประกาศ โดย read-only ยังต้อง read-only แล้วถามได้สูงสุดหนึ่ง decision สำคัญ; prompt budget 1, repair budget 3 รอบ ก่อนหยุดต้องบันทึก decision ledger, evidence และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน artifact, คำสั่งตรวจสอบ, ผลจริง, ความเสี่ยง และ next action ที่เล็กที่สุด

## Guardrails

- อย่าขยาย scope เกินกว่าทำให้ merge/rebase นี้จบ
- การแก้ merge/rebase นี้ไม่ได้ให้สิทธิ์ push, force-push, แก้ history เกินขอบเขตงานนี้, สร้าง commit อื่นที่ไม่เกี่ยวข้อง หรือ `--abort` ทิ้ง — ต้องขอ approval ใหม่แยกต่างหากเสมอ
- ถ้าหลักฐานไม่พอ ให้บอกช่องว่างแทนการเดา
