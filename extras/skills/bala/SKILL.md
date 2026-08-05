---
name: spk-bala
description: ใช้หลักพละ 5 เป็นเครื่องมือตรวจสอบสมดุลก่อนเริ่มงาน plan, code, review หรือแก้ปัญหา
argument-hint: "[scope, plan, diff, incident, หรือ decision]"
---

# spk-bala

ใช้หลักพละ 5 ของพุทธศาสนาเป็นเครื่องมือตรวจสอบสมดุลสำหรับงาน engineering ร่วมกับ AI แปลงหลักพละให้เป็นพฤติกรรมที่สังเกตได้ในทางปฏิบัติ ไม่ใช่การสอนศาสนา

## รวบรวม Context

ก่อนประเมิน ให้เก็บสถานะปัจจุบันก่อน:
- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- ดู context ของ project (CLAUDE.md, AGENTS.md, package.json ฯลฯ)
- อ่าน plan, diff, incident หรือ decision ที่ให้มา

## แผนที่พละ 5

1. **ศรัทธา / Confidence** - ความมั่นใจต้องอาศัยหลักฐาน
   - สัญญาณดี: เป้าหมาย คุณค่าต่อ user และ acceptance criteria ชัดเจน
   - สัญญาณร้าย: ความมั่นใจบอด ผลลัพธ์ไม่ชัด หรือทำเพราะ agent ดูมั่นใจ
   - ถาม: "หลักฐานอะไรบ้างที่ทำให้งานนี้คุ้มทำตอนนี้?"

2. **วิริยะ / Energy** - ความพยายามต้องมั่นคงและเน้นที่ action ถัดไปที่มีประโยชน์มากที่สุด
   - สัญญาณดี: action ถัดไปเล็ก ย้อนกลับได้ และตรวจสอบได้
   - สัญญาณร้าย: ทำหลายอย่างพร้อมกัน เขียนใหม่ทั้งหมด หรือเปิดหลาย front
   - ถาม: "action ที่เล็กที่สุดที่ลดความไม่แน่นอนคืออะไร?"

3. **สติ / Mindfulness** - ความตื่นรู้ต่อ context, constraints และสถานะปัจจุบัน
   - สัญญาณดี: dirty files, assumptions, risks และ constraints ของ user มองเห็น
   - สัญญาณร้าย: ลืม decision เดิม เขียนทับงานคน หรือละเลย safety boundaries
   - ถาม: "อะไรต้องรู้ก่อนจะแตะอะไร?"

4. **สมาธิ / Concentration** - โฟกัสแคบพอที่จะทำให้เสร็จ
   - สัญญาณดี: หนึ่ง objective หนึ่ง branch หยุดรบกวนน้อยที่สุด
   - สัญญาณร้าย: ทำหลาย task พร้อมกันแล้วชนไฟล์เดียวกัน context กระจาย หรือ polish ก่อนถึงเวลา
   - ถาม: "อะไรควรหยุดทำจนกว่าสิ่งนี้จะตรวจสอบแล้ว?"

5. **ปัญญา / Wisdom** - ตัดสินใจจากความเข้าใจเหตุผลและ tradeoff
   - สัญญาณดี: root cause, alternatives, risks และ rollback อธิบายชัด
   - สัญญาณร้าย: แปะยาแก้ เอา pattern มาใช้โดยไม่คิด หรือซ่อนความไม่แน่นอน
   - ถาม: "อะไรรู้ อะไรไม่รู้ และอะไรจะเปลี่ยนการตัดสินใจ?"

## Workflow

1. อ่าน context ที่ให้มา (plan, diff, incident, decision หรือ general scope)
2. ประเมินพละแต่ละข้อกับสถานะปัจจุบัน
3. ระบุ imbalance ที่น่าจะเกิดขึ้นมากที่สุดหนึ่งข้อ
4. แนะนำ action ถัดไปที่เล็กที่สุด
5. กำหนด evidence ที่จะพิสูจน์ว่า action นั้นได้ผล

## Output Format

```markdown
## Bala 5 Check
- ศรัทธา / Confidence: <green|yellow|red> - <evidence>
- วิริยะ / Energy: <green|yellow|red> - <evidence>
- สติ / Mindfulness: <green|yellow|red> - <evidence>
- สมาธิ / Concentration: <green|yellow|red> - <evidence>
- ปัญญา / Wisdom: <green|yellow|red> - <evidence>

Imbalance ที่น่าจะเกิด: <หนึ่งประโยค>
Action ถัดไปที่เล็กที่สุด: <action ที่ทำได้จริง>
หลักฐานว่าได้ผล: <test/log/review signal>
```

## Use Case ที่นิยม

- ก่อน plan: ตรวจสอบว่าเป้าหมายมีเหตุผลพอจะวางแผนไหม
- ก่อน code: ป้องกัน overbuild และเลือก implementation slice ที่เล็กที่สุด
- ก่อน review: แยกความมั่นใจออกจากหลักฐานและจำกัด scope ของ review
- ระหว่าง debug: ชะลอการเดาและกลับไปที่ root-cause discipline

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี ratings ทั้งห้าพร้อมหลักฐาน, imbalance หลัก, action ที่เล็กที่สุด, proof signal, risks และ next action

## ข้อควรระวัง

- อย่าใช้ Bala 5 เป็น motivational speech แปลงทุกข้อให้เป็นพฤติกรรม engineering ที่สังเกตได้
- อย่าตำหนิ user หรือ agent รายงาน imbalance เป็น workflow signal
- อย่าเพิ่ม process ถ้า action ถัดไปชัดและปลอดภัยอยู่แล้ว
- ชอบ action ที่ทำได้จริงหนึ่งข้อมากกว่า checklist ยาว ๆ
- ไม่แก้ source code เว้นแต่ user ขอ implementation โดยตรง
