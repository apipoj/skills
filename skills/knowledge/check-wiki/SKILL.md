---
name: check-wiki
description: ตรวจ wiki ของโปรเจกต์เพื่อหาลิงก์เสีย ข้อมูลขัดกัน เนื้อหาล้าสมัย หลักฐานที่หาย และ secret
---
# ตรวจความรู้ในโปรเจกต์

รัน read-only health check บน project wiki หา orphan pages, contradictions, stale claims, missing citations, dead links และ secrets ที่อาจมี

## รวบรวม Context

- ลิสต์ไฟล์ทั้งหมดใน `ai_context/wiki/`
- อ่าน `ai_context/wiki/index.md` สำหรับ catalog
- อ่าน `ai_context/wiki/log.md` สำหรับ activity ล่าสุด
- ห้ามตรวจ `ai_context/sources/`, ignored paths, credential หรือ environment file ใด ๆ
- เช็ค marker file `ai_context/.spk-wiki-build` ก่อนเริ่มเสมอ ถ้ามีอยู่และอายุน้อยกว่า 2
  ชั่วโมง ให้ปฏิเสธการรัน เพราะอาจมี wiki build หรือ audit อื่นทำงานอยู่พร้อมกัน ถ้า marker
  เก่ากว่า 2 ชั่วโมงถือว่า stale ให้ลบด้วยคำสั่งตรงตัว `rm -f ai_context/.spk-wiki-build`
  (หรือคำสั่งเทียบเท่าตาม platform) ก่อนทำต่อ audit เองไม่สร้าง marker นี้ และเก็บ working
  notes ไว้ใน memory หรือใต้ OS temp directory เท่านั้น ห้ามเก็บใน repo

## Audit Checks

### 1. Orphan Detection
- Pages ที่ไม่ได้ link จาก index หรือ page อื่น
- Index entries ที่ชี้ไป pages ที่ไม่มี

### 2. Contradiction Check
- Claims บน page หนึ่งที่ขัดแย้งกับอีก page
- ข้อมูลเก่าที่ขัดแย้งกับ changes ล่าสุด

### 3. Stale Claims
- Pages ที่อ้างถึง APIs เก่า, versions เก่า หรือ features ที่ถูกลบ
- Temporal references ที่ล้าสมัย (เช่น events ที่ผ่านไปแล้วแต่เขียนว่า "upcoming")

### 4. Citation Audit
- Claims ที่ไม่มี source citations
- External links ที่ dead หรือ redirected

### 5. Link Integrity
- Internal wiki links ที่ชี้ไป pages ที่ไม่มี
- Cross-references ที่ขาด

### 6. Secret Scan
- Scan wiki pages ทั้งหมดสำหรับ secrets ที่อาจมี: API keys, tokens, credentials, passwords
- ทุก match คือ Critical finding

## Output Format

```markdown
## Wiki Lint Report
- Pages ที่ scan: <count>
- Index entries: <count>

### Findings

#### Critical
- <page> <issue>

#### Important
- <page> <issue>

#### Minor
- <page> <issue>

### Auto-fix Proposals
- <issue> → <proposed fix>
```

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## ข้อควรระวัง

- อ่าน wiki pages เท่านั้น ห้ามตรวจ raw private source
- เช็ค wiki-build marker (`ai_context/.spk-wiki-build`) ก่อนรันเสมอ ห้ามสร้าง marker นี้เอง
  และลบเฉพาะ marker ที่ stale เกิน 2 ชั่วโมงด้วยคำสั่งตรงตัวเท่านั้น
- audit mode ห้ามแก้ wiki; mechanical repair ทำได้เมื่อคำขอปัจจุบันระบุ fix ชัด ส่วน semantic repair ให้เสนอแนะก่อน
- Flag secrets เป็น Critical ไม่ว่า context อะไร
- รายงาน findings เรียงตาม severity
