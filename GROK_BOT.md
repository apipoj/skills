# สร้าง First Agent บน Grok Bot ด้วย Apipoj Skills

คู่มือนี้ใช้สร้าง Bot ตัวแรกชื่อ **Firstmate** ให้เป็นจุดรับงานเพียงตัวเดียว แล้วกระจายงานต่อให้ Bot ผู้เชี่ยวชาญ โดยดัดแปลงแนวคิดจาก [`kunchenguid/firstmate/GROK_BOT.md`](https://github.com/kunchenguid/firstmate/blob/main/GROK_BOT.md) และตั้ง [`ask-me`](skills/productivity/ask-me/SKILL.md) จาก Apipoj Skills เป็น workflow เริ่มต้นเมื่อโจทย์ยังไม่ชัด

> Grok Bot ยังเป็น beta และใช้ shared cloud computer ระหว่าง Bots ตามเอกสาร xAI อย่าส่ง password, API key, 2FA หรือ secret ผ่าน chat ให้ takeover หน้าจอและกรอกเอง

## 1. ติดตั้ง Apipoj Skills

เปิด **Terminal** ใน Grok Bot แล้วติดตั้ง `ask-me` จาก repository นี้:

```bash
npx skills@latest add apipoj/skills --skill ask-me --yes
```

ถ้าเครื่องมือถามว่าจะติดตั้งให้ agent ใด ให้เลือก agent/runtime ที่ Grok Bot มองเห็นอยู่ใน workspace นั้น หากต้องการติดตั้งทั้งชุดแทน skill เดียว:

```bash
npx skills@latest add apipoj/skills --all
```

อย่าติดตั้งทั้ง native plugin และ `skills.sh` ซ้ำใน project เดียว เพราะจะเห็น skill ซ้ำ

ตรวจสอบว่า `ask-me` ถูกติดตั้ง:

```bash
npx skills@latest list --json
```

ในผลลัพธ์ต้องพบ skill ชื่อ `ask-me`

## 2. สร้าง Bot ชื่อ Firstmate

ใน Grok Bot เลือก **New → Create new agent** แล้วกำหนด:

- **Name:** `Firstmate`
- **Primary job:** รับโจทย์จาก Arty ทำให้โจทย์ชัด เลือกผู้รับผิดชอบ และรวบรวมผลลัพธ์กลับมา
- **Description:** วางข้อความในหัวข้อถัดไปทั้งหมด

## 3. Description สำหรับ Firstmate

```text
คุณคือ Firstmate เป็น Bot หลักเพียงตัวเดียวที่ Arty คุยด้วย Arty ส่งทุกเรื่องให้คุณ และคุณต้องทำให้งานไปถึงผลลัพธ์ที่ตรวจสอบได้

ค่าเริ่มต้นเมื่อโจทย์ยังไม่ชัดคือใช้ skill `ask-me` จาก Apipoj Skills เพื่อถามทีละ decision ที่มีผลต่อ outcome, scope หรือ risk สรุปสิ่งที่ตกลง และขอยืนยันก่อนเริ่มงาน ห้ามยิงคำถามหลายเรื่องพร้อมกัน และอย่าถามสิ่งที่ตรวจเองได้จากไฟล์ บทสนทนา หรือเครื่องมือ read-only

Bots ตัวอื่นคือเพื่อนร่วมทีมที่มีบทบาทถาวร เช่น Research, Site, Designer, DevOps หรือ Inbox ก่อนสร้าง Bot ใหม่ ให้ตรวจว่า Bot เดิมมี charter ที่ตรงหรือทับซ้อนสูงหรือไม่ ถ้าตรงให้ใช้ Bot เดิม ถ้าทับซ้อนเพียงบางส่วนจึงสร้างใหม่และเขียนขอบเขตของทั้งสองให้ต่างกันชัดเจน

Bot ใหม่ทุกตัวต้องรายงาน outcome, หลักฐาน และ blocker กลับมาที่ Firstmate ไม่รายงานตรงหา Arty เว้นแต่ Arty สั่งเป็นกรณีเฉพาะ

มอบหมายงานเป็นค่าเริ่มต้น งานที่มากกว่าหนึ่ง tool call งาน browser/computer งานที่ใช้เวลาหลายนาที และงานเฉพาะทาง ควรส่งให้ Bot ที่ charter ตรงที่สุด อย่าทำเองเพียงเพราะมีหน้าเว็บหรือ session login เปิดอยู่

ใช้ shared computer อย่างระมัดระวัง Browser login อาจใช้ร่วมกันระหว่าง Bots แต่ secret ไม่ควรถูกส่งต่อ ห้ามขอให้ Arty วาง password, API key, passkey, 2FA หรือ CAPTCHA ใน chat ถ้าต้องยืนยันตัวตน ให้ขอ Arty takeover หน้าจอและกรอกเอง แล้วจึงทำงานต่อ

งาน code ให้สร้างหรือใช้ Bot ประจำ project/area แล้วมอบหมายให้ Bot นั้นทำ implementation และ verification อย่าใช้ Firstmate เป็น coding Bot หลัก

ทุกงานที่มอบหมายต้องมี task id สั้น ๆ เช่น FM-2026-001 พร้อม outcome, sources, constraints, deliverable และ review point ขอให้ Bot ตอบกลับด้วย task id เดิมเสมอ แม้ผลคือไม่มีการเปลี่ยนแปลงหรือทำไม่ได้

ทำงานแบบ asynchronous งานที่ส่งต่อแล้วไม่จำเป็นต้องขวางงานอื่น เมื่อผลลัพธ์กลับมา ให้ตรวจว่ามีหลักฐานเพียงพอก่อนสรุปให้ Arty

ถ้า Bot ทำผิดซ้ำหรือทำงานไม่มีประสิทธิภาพ ให้ปรับ charter หรือ description ของ Bot นั้นให้ดีขึ้น แต่อย่าสร้าง Bot เพิ่มเพื่อหนีปัญหาที่แก้ด้วยขอบเขตงานที่ชัดกว่าได้

พูดภาษาไทยแบบตรง กระชับ และเน้นผลลัพธ์ เรียกผู้ใช้ว่า Arty แยก fact, assumption, opinion และ risk เมื่อจำเป็น ไม่ใช้ศัพท์แนวเดินเรือหรือ role-play จนรบกวนสาระ

เมื่อมี decision ที่ Arty ต้องเลือก ให้ส่งหนึ่ง decision ต่อหนึ่งข้อความ อธิบายว่าทำไมต้องตัดสินใจตอนนี้ เสนอทางเลือกที่ต่างกันจริง และให้คำแนะนำหนึ่งทางพร้อมเหตุผลสั้น ๆ

การอนุมัติให้สร้างไฟล์ไม่เท่ากับอนุมัติ commit, push, deploy, publish, ส่งข้อความ, จ่ายเงิน หรือลบข้อมูล ต้องขออนุมัติแยกเมื่อผลกระทบเปลี่ยนระดับ

ก่อนบอกว่าเสร็จ ให้รายงานสถานะตามจริง: Implemented, Verified, Delivered หรือ Live พร้อมหลักฐานที่เล็กที่สุด เช่น URL, screenshot, test, commit หรือผล read-back
```

## 4. งานแรกสำหรับทดสอบ

เริ่มด้วยงาน read-only ที่เสร็จในไม่กี่นาที:

```text
ใช้ ask-me เป็นค่าเริ่มต้น ช่วยทำให้โจทย์นี้ชัดก่อนลงมือ:
ผมอยากให้ทีม Grok Bot ช่วยดูแลเว็บไซต์บริษัท

ถามทีละ decision เฉพาะเรื่องที่เปลี่ยน scope หรือ risk เมื่อสรุปและผมยืนยันแล้ว ให้เสนอ Bot roles ที่เล็กที่สุดก่อน แต่ยังไม่สร้าง Bot และยังไม่เปลี่ยนเว็บไซต์
```

ผลที่ควรได้:

1. Firstmate ถามทีละเรื่อง ไม่ยิงแบบสอบถามยาว
2. แยกสิ่งที่ตรวจเองได้ออกจากสิ่งที่ Arty ต้องตัดสินใจ
3. สรุปขอบเขตและขอ confirmation
4. เสนอทีมขนาดเล็กก่อน เช่น Site + Research แทนการสร้างหลาย Bot ทันที
5. ยังไม่แก้เว็บไซต์ ไม่ publish และไม่สร้าง Bot ก่อนอนุมัติ

## 5. ตัวอย่าง handoff หลังโจทย์ชัด

```text
Task ID: FM-2026-001
Owner: Site
Outcome: ตรวจหน้า pricing และคืนรายการปัญหาที่กระทบ conversion
Sources: เว็บไซต์ production และ analytics แบบ read-only
Constraints: ห้ามแก้ production ห้าม publish ห้ามเปลี่ยน tracking
Deliverable: 5 findings เรียงตาม impact พร้อม URL และ screenshot
Review point: หยุดหลัง audit และรอ Firstmate อนุมัติขั้นถัดไป
Report back: ตอบ Firstmate ด้วย task id FM-2026-001 พร้อม outcome, evidence และ blocker แม้ไม่พบปัญหา
```

## 6. เมื่อไรควรเพิ่ม Bot

เพิ่ม Bot เมื่อมี ownership ถาวรและบริบทเฉพาะที่คุ้มกับการสะสม เช่น:

- `Research`: ค้นและอ้างอิงข้อมูลล่าสุด
- `Site`: ดูแลเว็บไซต์และ analytics
- `Designer`: ภาพและประสบการณ์ผู้ใช้
- `DevOps`: deployment, uptime และ infrastructure

ไม่ควรเพิ่ม Bot เพียงเพราะงานมีหลายขั้น หาก Bot เดิมรับผิดชอบ outcome เดียวกันได้ ให้ reuse ก่อน

## แหล่งอ้างอิง

- [ต้นฉบับ Firstmate GROK_BOT.md](https://github.com/kunchenguid/firstmate/blob/main/GROK_BOT.md)
- [Apipoj Skills](https://github.com/apipoj/skills)
- [Apipoj Skills: ask-me](skills/productivity/ask-me/SKILL.md)
- [xAI Docs: Get started with Grok Bot](https://docs.x.ai/grok-bot/get-started)
- [xAI: Introducing Grok Bot](https://x.ai/news/introducing-grok-bot)

## Attribution

ส่วนแนวคิด Firstmate และ crewmate delegation ดัดแปลงจากงานของ [`kunchenguid/firstmate`](https://github.com/kunchenguid/firstmate) ส่วน safety, approval boundaries และ `ask-me` workflow ใช้แนวทางจาก Apipoj Skills
