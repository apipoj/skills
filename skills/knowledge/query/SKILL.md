---
name: query
description: ตอบคำถามเกี่ยวกับโปรเจกต์จาก wiki ภายในก่อน อ้างหลักฐานที่แน่นอน และใช้การค้นคว้าภายนอกเมื่อความรู้ในโปรเจกต์ไม่เพียงพอเท่านั้น
---
# query

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

## ข้อควรระวัง

- เช็ค wiki ก่อนเสมอก่อน external sources
- อ้างอิง sources สำหรับทุกข้อเท็จจริง
- อย่าแต่งคำตอบ บอกว่า "ไม่รู้" และแนะนำที่ไปหา
- อย่าแก้ wiki pages เว้นแต่ user เห็นด้วย
