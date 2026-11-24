---
name: poteto-mode
description: พัฒนา feature แก้บั๊ก หรือ refactor ด้วย poteto-mode เลือกหลักการตามปัญหาในโค้ด แล้วตรวจการเปลี่ยนแปลงผ่านทางที่ผู้ใช้เรียกจริง
---
# เขียนโค้ดแบบ poteto-mode

นี่คือ default loop สำหรับงาน development ในเครื่อง เลือกรูปทรงงานหนึ่งครั้ง แล้วใช้ workflow
ที่เล็กที่สุดแต่ยังพิสูจน์ผลลัพธ์ได้ ถ้าผู้ใช้ขอ strict test-first โดยตรง หรือจุดเปลี่ยนมีความเสี่ยงสูง
จน RED/GREEN ช่วยลดความเสี่ยงจริง ให้ใช้ `tdd`

ถ้าต้องใช้ plan ให้อ่าน `docs/agents/artifacts.md` ก่อน แล้วค้น path ที่ระบุ,
`ai_context/work/plans/`, `docs/plans/` ตามลำดับ อ่าน `ai_context/wiki/plans/` เฉพาะ
legacy compatibility fallback และห้ามถือว่าเป็น canonical

## Select the playbook and principles

For a quick patch, make the smallest justified change and verify the real surface. For a larger task, use the [playbook index](references/playbooks.md) to select the requested outcome and open the matching file. Use the [principle index](references/principles.md) to identify the decision at hand and open the relevant guidance. For stateful work, inspect the data shape, retry boundary and write ownership. Subagents are optional for independent, authorized scopes.

Apply the implementation loop below to code changes. For an investigation, plan, status check or pause, stop at that playbook's requested outcome. Operational playbooks can prepare a concrete intent and check evidence. Git, remote, destructive and deployment actions remain subject to the applicable workflow and exact approval. A request for one playbook does not start the next.

For a scoped comment cleanup, select `no-comments`. For reusable proof of a code invariant, select `create-formal-verification-skill`.

## Ticket input

If the user supplies a ticket reference, resolve it through the configured tracker
and state its title and acceptance criteria before implementation. Ask when the
reference is ambiguous. Fetching a ticket grants no tracker or Git write authority.

## Workflow

1. อ่าน repository instructions, current diff, code ที่เกี่ยวข้อง, acceptance criteria และ
   authority คำขอปัจจุบันที่ระบุให้ implement, fix, update, refactor, test หรือ
   plan-and-implement ถือเป็น bounded workspace authority ถ้าไม่มี plan file ให้สร้าง
   internal micro-plan แล้วทำต่อ
2. จัดงานเป็นหนึ่งรูปทรงแล้วใช้ playbook ที่ตรง:
   - **Quick patch** — ดูหลักฐาน แก้ smallest change โดยตรง แล้วรัน check ที่เล็กที่สุดซึ่งจับ
     regression ได้ ค่าเริ่มต้นไม่ต้องมี plan artifact, subagent หรือ independent verifier
   - **Feature** — ระบุ user-visible outcome และ data shape ที่จำเป็น เขียน micro-plan สั้นตาม
     dependency ทำ working slice ที่เล็กที่สุด แล้วลองผ่าน real surface ถ้ามี
   - **Bug fix** — reproduce bug หรือ failure บน surface เดิม แยกและพิสูจน์ root cause ก่อนแก้
     ถ้ามี test seam ที่ถูกและ reliable ให้เก็บ failing regression test ก่อน ถ้าไม่มีให้ใช้ runtime
     reproduction เป็น RED evidence และยืนยัน reproduction เดิมหลังแก้
   - **Refactor** — pin behavior เดิมด้วย focused test, snapshot, type check หรือหลักฐาน
     equivalence ที่เหมาะสม ลบก่อนเพิ่ม รักษา behavior และแสดงว่า reader load หรือ structural risk ลดลง
3. หากมี verification skill ในโปรเจกต์ ให้อ่าน check map และรัน checks ที่เกี่ยวข้องภายใน authority เดิม รายงานหลักฐานและสิ่งที่ยังไม่รัน ถ้าผู้ใช้ขอวิธีตรวจที่ใช้ซ้ำได้และยังไม่มี ให้ใช้ `create-verification-skill`
   รัน focused tests ระหว่างแก้ และเพิ่ม regression, type, lint, build, browser หรือ release gates
   ตาม blast radius กับ repository instructions รัน full suite เมื่อ repo หรือ release gate กำหนด
   ไม่ใช่พิธีบังคับสำหรับ local edit ทุกครั้ง
4. อัปเดต docs เมื่อ public behavior, command, API, data หรือ operation เปลี่ยน
5. ยกระดับ workflow เมื่อหลักฐานและความเสี่ยงสมควร งาน cross-boundary, security, concurrency,
   migration, architecture ที่ยังเห็นต่าง หรือ diff ใหญ่อาจต้องใช้ `plan`, `codebase-design`, strict
   `tdd`, parallel specialist หรือ independent verifier การยกระดับเป็น risk decision ไม่ใช่ default
6. วินิจฉัยและซ่อม failure ใน scope ภายใน repair budget หยุดถามเฉพาะเมื่อมี material user-owned
   decision, access หาย, security/privacy risk, scope expansion หรือ Git, remote, destructive
   effect ที่ยังไม่ได้อนุมัติ

A plan-only request and an interview summary remain read-only. An explicit request to implement a reviewed plan grants workspace authority within that plan.

## Autonomy Profile

`afk_local` — ทำงานต่อเองได้ถึง effect level ที่ skill นี้ประกาศเท่านั้น และห้ามยกระดับ read-only เป็น write; prompt budget 0, repair budget 3 รอบ ก่อนหยุดต้องบันทึก phase, assumption, evidence, attempts และ next action ที่ทำต่อได้

## Evidence Receipt

รายงาน outcome ด้วยภาษาที่ผู้ใช้อ่านเข้าใจ ใส่เฉพาะ artifact ที่เปลี่ยน, verification ที่เกี่ยวข้อง,
risk หรือ approval boundary ที่สำคัญ และ next action เมื่อมี ห้ามบังคับให้ผู้ใช้อ่าน internal format

## ข้อควรระวัง

- อยู่ใน scope ที่อนุมัติและรักษา unrelated user changes
- ห้ามแก้ workspace โดยไม่มี implementation outcome ที่ชัดและ bounded authority ของ scope นั้น
- ห้ามข้าม failing gate ที่จำเป็น แต่งผล test หรือบอกว่างานเสร็จทั้งที่ยังไม่ได้ตรวจ
- ห้าม commit, push, เปิด PR, deploy หรือทำ remote write อื่นโดยไม่มีการอนุมัติ action นั้นแยกต่างหาก
