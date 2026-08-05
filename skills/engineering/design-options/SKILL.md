---
name: design-options
description: ลอง UI หลายแนวที่ต่างกันจริง เปรียบเทียบด้วยเนื้อหาสมจริง แล้วให้ผู้ใช้เลือกก่อนเขียน production code
---
# ลองหลายแบบก่อนเลือก

สร้างหลายทิศทาง design ก่อน commit ไป implement เปรียบเทียบ เก็บ feedback และล็อกทิศทางที่อนุมัติ

ใช้ตอน: "ขอดู design options", "UI นี้ไม่ถูกใจ", "visual brainstorm", "ขอหลายแบบให้เลือก" หรือ "ทำให้ screen นี้ดูดีขึ้น"

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- อ่าน DESIGN.md ถ้ามี
- ตรวจสอบ app/routes/components ที่เกี่ยวข้อง
- เช็ค designs ที่อนุมัติแล้วใน `.spk/design-options/`

## Design Shotgun Loop

### 1. Context
อ่าน DESIGN.md, routes/components ปัจจุบัน, screenshots/URLs ที่มี และ approved designs เดิม เก็บเฉพาะ context ที่สำคัญต่อ design: audience, job-to-be-done, constraints และจำนวน variant (default 3)

### 2. Concepts
สร้าง 3 ทิศทางที่แตกต่างกัน แต่ละอันมี stance ไม่เหมือนกัน เช่น compact operator console, editorial trust layer, playful onboarding, brutalist power tool, calm B2B dashboard

### 3. Variants
สร้าง mockup แบบ self-contained สำหรับแต่ละ concept ชอบ HTML (inspectable, ง่ายต่อการ promote) แต่ละ variant ต้องต่างกันทั้ง layout, typography, palette และ density

### 4. Board
สร้าง comparison page ให้ user ประเมิน variants ทั้งหมดข้าง ๆ กัน

### 5. Feedback
ขอให้ user เลือก A/B/C, remix ส่วนบางอย่าง, regenerate หรือ approve สำหรับ implementation

### 6. Approval
เขียน approval record หลัง user confirmation อย่างชัดเจนเท่านั้น

## กฎป้องกัน Convergence

- แต่ละ variant ต้องต่างกันทั้ง **layout**, **typography**, **palette** และ **density**
- ถ้า 2 variants ดูเหมือนพี่น้องกัน ให้ regenerate อันที่อ่อนแอกว่า
- อย่าทำ SaaS cards 3 อันที่ต่างแค่สี accent
- อย่า copy UI จากบุคคลที่สามโดยตรง แปลง references เป็นหลักการ
- อย่าละเลย DESIGN.md เว้นแต่ user ขอสำรวจนอก design system

## Anti-Slop Gates

เช็คทุก variant ก่อนนำเสนอ ทุกข้อต้องตอบ **ไม่** (กลั่นจาก [hallmark](https://github.com/Nutlope/hallmark) ของ Together AI, MIT license):

- ใช้ template AI ทั่วไป (hero → 3 feature cards → CTA → footer) หรือ structure ซ้ำกับ variant อื่น?
- Hero centered ทุกอย่าง (eyebrow + title + lede + CTA อยู่แกนกลางเดียวกันหมด)? centered ได้ไม่เกิน 2 element
- Display font เป็น Inter/Roboto/Open Sans/Poppins? มี gradient ม่วง-น้ำเงิน (โดยเฉพาะ gradient text)? heading เป็น italic?
- ใช้ font เกิน 3 family? สี base เป็น `#000`/`#fff` ล้วนหรือเทาแบบ zero-chroma? accent เกิน ~5% ของ viewport?
- Card ซ้อนใน card, grid 3 คอลัมน์ icon-บน-heading, icon หลาย library ปนกัน หรือใช้ emoji (✨🚀⚡) เป็น feature icon?
- `transition: all`, hover-scale เหมือนกันทุกที่ หรือ animate `width`/`height`/`top`/`left`? (animate เฉพาะ transform/opacity)
- Motion ไม่มี `prefers-reduced-motion` fallback? focus ring แบบ fade-in? interactive element ขาด state ใดใน default/hover/focus-visible/active/disabled?
- Contrast ต่ำกว่า 4.5:1 (body) / 3:1 (text ใหญ่, icon, focus ring)? section พื้นเข้มแต่ลืม flip สีตัวอักษร? ปุ่มสีตัวอักษรเกือบเท่าสีพื้น?
- มี Jane Doe / John Smith หรือชื่อ startup โหล ๆ (Acme, Nexus)? prose กว้างเกิน 45–75ch? spacing นอก scale 4px?

**Self-critique ก่อนนำเสนอ:** ให้คะแนน 1–5 ต่อ variant ใน Philosophy / Hierarchy / Execution / Specificity / Restraint / Variety ข้อไหนต่ำกว่า 3 ให้แก้ก่อนนำเสนอ และบันทึกคะแนนลง board

## Artifact Convention

```text
.spk/design-options/<screen>-YYYYMMDD-HHMM/
├── board.html
├── README.md
├── variant-a.html
├── variant-b.html
├── variant-c.html
└── approved.json          # เฉพาะหลัง user confirmation
```

## Output Format

```markdown
## Design Shotgun Results
- Artifact dir: `.spk/design-options/<screen>-<date>/`
- Board: `.spk/design-options/<screen>-<date>/board.html`
- Variants: A <name>, B <name>, C <name>

### Head-to-head
- A: <จุดแข็ง> / <จุดอ่อน>
- B: <จุดแข็ง> / <จุดอ่อน>
- C: <จุดแข็ง> / <จุดอ่อน>

Recommendation: <เลือกหนึ่งและบอกเหตุผล>
```

## ข้อควรระวัง

- อย่าแก้ production source code เว้นแต่ user ขอ implementation โดยตรง
- Variants เป็น disposable artifacts มีไว้เพื่อประเมินเท่านั้น
- ต้องมี user confirmation อย่างชัดเจนก่อนจะ approve (ตอบข้อความ ไม่ใช่ assume)
