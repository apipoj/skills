---
name: check-wiki
description: ตรวจ wiki ของโปรเจกต์เพื่อหาลิงก์เสีย ข้อมูลขัดกัน เนื้อหาล้าสมัย หลักฐานที่หาย และ secret
---
# ตรวจความรู้ในโปรเจกต์

รัน health check บน project wiki หา orphan pages, contradictions, stale claims, missing citations, dead links และ secrets ที่อาจมี

## รวบรวม Context

- ลิสต์ไฟล์ทั้งหมดใน `ai_context/wiki/`
- อ่าน `ai_context/wiki/index.md` สำหรับ catalog
- อ่าน `ai_context/wiki/log.md` สำหรับ activity ล่าสุด

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

## ข้อควรระวัง

- อย่าแก้ wiki pages โดยไม่ได้รับ approval จาก user
- การสร้างและลบ `ai_context/.spk-wiki-build` ชั่วคราวคือ project write
  เพียงอย่างเดียวที่ workflow นี้ทำได้ และต้อง cleanup เสมอ
- Flag secrets เป็น Critical ไม่ว่า context อะไร
- รายงาน findings เรียงตาม severity
