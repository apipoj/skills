---
name: ask-project
description: ตอบคำถามเกี่ยวกับโปรเจกต์จาก wiki ภายในพร้อมอ้างหลักฐาน และค้นภายนอกเมื่อข้อมูลในโปรเจกต์ไม่พอ
---
# ถามข้อมูลโปรเจกต์

ตอบคำถามโดยเช็ค project wiki ก่อน ใช้ external sources เฉพาะเมื่อ wiki ไม่มีข้อมูลที่เกี่ยวข้อง

## รวบรวม Context

- เช็ค `ai_context/wiki/index.md` สำหรับ pages ที่มี
- เช็ค `ai_context/wiki/log.md` สำหรับ activity ล่าสุด

## Workflow

### 1. Wiki Lookup
- ค้น wiki index และ pages ที่เกี่ยวข้อง
- เช็ค concept pages, decision pages และ entity pages
- Cross-reference pages ที่เกี่ยวข้อง

### 2. External Fallback
- ถ้า wiki ไม่มีข้อมูลที่เกี่ยวข้อง ให้ค้น external sources
- ชอบ official documentation มากกว่า blog posts
- อ้างอิง external sources ทุกแหล่ง

### 3. ตอบ
- ตอบให้ชัดและกระชับ
- อ้างอิง wiki pages หรือ external sources
- ถ้าคำตอบเป็นประโยชน์ต่อ wiki ให้เสนอบันทึกเป็น page ใหม่

### 4. อัพเดต Wiki (optional)
- ถ้าคำตอบเติมช่องว่างใน wiki ให้สร้างหรืออัพเดต page ที่เกี่ยวข้อง
- อัพเดต wiki index และ log

## Output Format

```markdown
## Answer
<คำตอบเฉพาะเจาะจงตามคำถาม>

### Sources
- <wiki page หรือ external URL>

### Wiki updated
<yes/no ถ้า yes ระบุ pages>
```

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- เช็ค wiki ก่อนเสมอก่อน external sources
- อ้างอิง sources สำหรับทุกข้อเท็จจริง
- อย่าแต่งคำตอบ บอกว่า "ไม่รู้" และแนะนำที่ไปหา
- อย่าแก้ wiki pages เว้นแต่ user เห็นด้วย
