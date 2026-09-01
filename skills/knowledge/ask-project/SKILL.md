---
name: ask-project
description: ตอบคำถามเกี่ยวกับโปรเจกต์จาก wiki ภายใน repo นี้ก่อนเสมอ พร้อมอ้างหลักฐาน และค้นภายนอกเฉพาะเมื่อข้อมูลในโปรเจกต์ไม่พอ
---
# ถามข้อมูลโปรเจกต์

ตอบคำถามโดยเช็ค project wiki ก่อน ใช้ external sources เฉพาะเมื่อ wiki ไม่มีข้อมูลที่เกี่ยวข้อง

## รวบรวม Context

- อ่าน `docs/agents/artifacts.md` ถ้ามีเพื่อรู้ canonical backend และสถานะของ artifact
- เช็ค `ai_context/wiki/index.md` สำหรับ pages ที่มี
- เช็ค `ai_context/wiki/log.md` สำหรับ activity ล่าสุด

## Workflow

### 1. Wiki Lookup
- ค้น wiki index และ pages ที่เกี่ยวข้องที่เล็กที่สุดพอ
- เช็ค concept pages, decision pages และ entity pages
- Cross-reference pages ที่เกี่ยวข้อง
- ตาม pointer ไป canonical artifact เมื่อคำตอบพึ่ง decision, plan, spec หรือ shared research
- ถ้า wiki ขัดกับ canonical artifact ให้ canonical ชนะและถือว่า wiki stale
- ถ้า wiki ครบและยังไม่ stale ให้ตอบพร้อมอ้าง page/path แล้วข้ามไป step 3

### 2. External Fallback
- ถ้า wiki ไม่มีข้อมูลที่เกี่ยวข้องหรือ stale ให้ค้น current primary source
- ชอบ official documentation มากกว่า blog posts
- แยกให้ชัดว่าข้อมูลไหนเป็น fact จาก repository และข้อมูลไหนเป็น external finding
- อ้างอิง external sources ทุกแหล่ง
- claim ที่ high-stakes หรือขัดความคาดหมาย ให้ตรวจซ้ำกับ independent primary source

### 3. ตอบ
- ตอบให้ชัดและกระชับ
- อ้างอิง wiki pages หรือ external sources
- ถ้าคำตอบเป็นประโยชน์ต่อ wiki ให้เสนอบันทึกเป็น page ใหม่ ห้ามบันทึกเองโดยไม่ถาม

### 4. อัพเดต Wiki (เมื่อ user ขอเท่านั้น)
- บันทึกความรู้ใหม่ลง wiki เฉพาะเมื่อ user ขอ หรือ active workflow อนุญาต wiki update ไว้
  ชัดเจนเท่านั้น
- เมื่อได้รับอนุญาตแล้วค่อยสร้างหรืออัพเดต page ที่เกี่ยวข้อง พร้อมอัปเดต wiki index และ log

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

## Evidence Receipt

คืน `spk.evidence/v1` ที่มีคำตอบ, evidence path ในเครื่อง, external source ถ้าใช้,
ความสด/ความไม่แน่นอนของข้อมูล, risks และ next action

## ข้อควรระวัง

- เช็ค wiki ก่อนเสมอก่อน external sources
- อ้างอิง sources สำหรับทุกข้อเท็จจริง
- อย่าแต่งคำตอบ บอกว่า "ไม่รู้" และแนะนำที่ไปหา
- อย่าแก้ wiki pages เว้นแต่ user เห็นด้วยหรือ workflow ปัจจุบันอนุญาตไว้ชัดเจน
- อย่านำเสนอ wiki content ที่ stale เป็นข้อเท็จจริงปัจจุบัน
- ห้ามเปิดเผย raw private source หรือ credential
- ห้ามนำเสนอ local draft เป็น approved decision หรือ canonical plan/spec
