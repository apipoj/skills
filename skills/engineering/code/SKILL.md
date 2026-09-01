---
name: code
description: ลงมือพัฒนาคำขอที่ชัดหรือแผนที่ review แล้วด้วย adaptive loop ที่เลือกระดับความเข้มตาม Quick patch, Feature, Bug fix หรือ Refactor และใช้ tdd เมื่อผู้ใช้ขอ test-first แบบเข้มงวด
---
# พัฒนาแบบ Adaptive

นี่คือ default loop สำหรับงาน development ในเครื่อง เลือกรูปทรงงานหนึ่งครั้ง แล้วใช้ workflow
ที่เล็กที่สุดแต่ยังพิสูจน์ผลลัพธ์ได้ ถ้าผู้ใช้ขอ strict test-first โดยตรง หรือจุดเปลี่ยนมีความเสี่ยงสูง
จน RED/GREEN ช่วยลดความเสี่ยงจริง ให้ใช้ `tdd`

ถ้าต้องใช้ plan ให้อ่าน `docs/agents/artifacts.md` ก่อน แล้วค้น path ที่ระบุ,
`ai_context/work/plans/`, `docs/plans/` ตามลำดับ อ่าน `ai_context/wiki/plans/` เฉพาะ
legacy compatibility fallback และห้ามถือว่าเป็น canonical

## หลักการทำงาน

- เลือก smallest change ที่มีเหตุผล ลบ ใช้ของเดิม หรือลดความซับซ้อนก่อนเพิ่ม abstraction,
  dependency, file หรือ workflow
- ระบุ data shape หรือ domain shape ก่อนเขียน code เฉพาะเมื่อ state, branching หรือ assumption
  ที่ซ้ำกันทำให้ model นั้นมีประโยชน์ ถ้าไม่ใช่ให้เลือก code ธรรมดาที่อ่านง่าย
- ตรวจ real artifact หรือ real surface ที่ผู้ใช้จะเจอจริง การ compile ผ่านอย่างเดียวไม่ได้พิสูจน์ว่า
  UI, CLI, API, migration หรือ generated output ใช้งานได้
- subagent เป็น optional และต้องเลือกใช้อย่าง deliberate ใช้เฉพาะ scope ที่เป็นอิสระ, design ที่ต้อง
  เทียบหลายทาง หรือ context ก้อนใหญ่ที่รบกวน main thread งานเล็กที่ต่อเนื่องกันให้ทำใน main thread

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
3. รัน focused tests ระหว่างแก้ และเพิ่ม regression, type, lint, build, browser หรือ release gates
   ตาม blast radius กับ repository instructions รัน full suite เมื่อ repo หรือ release gate กำหนด
   ไม่ใช่พิธีบังคับสำหรับ local edit ทุกครั้ง
4. อัปเดต docs เมื่อ public behavior, command, API, data หรือ operation เปลี่ยน
5. ยกระดับ workflow เมื่อหลักฐานและความเสี่ยงสมควร งาน cross-boundary, security, concurrency,
   migration, architecture ที่ยังเห็นต่าง หรือ diff ใหญ่อาจต้องใช้ `plan`, `codebase-design`, strict
   `tdd`, parallel specialist หรือ independent verifier การยกระดับเป็น risk decision ไม่ใช่ default
6. วินิจฉัยและซ่อม failure ใน scope ภายใน repair budget หยุดถามเฉพาะเมื่อมี material user-owned
   decision, access หาย, security/privacy risk, scope expansion หรือ Git, remote, destructive
   effect ที่ยังไม่ได้อนุมัติ
7. จบด้วยหลักฐานภาษาคน: เปลี่ยนอะไร ตรวจอะไรแล้ว ยังไม่แน่ใจอะไร และ next action เฉพาะเมื่อมี
   ห้ามแสดง YAML, JSON, schema, field ว่าง หรือ internal receipt เว้นแต่ผู้ใช้ขอ machine-readable
   output โดยตรง

## Implementation Authorization

ยอมรับ bounded workspace authority ได้สามแบบ:

- request ปัจจุบันขอ implement, fix, update, refactor หรือ test outcome ที่ระบุ
- request ปัจจุบันขอ plan แล้ว implement outcome ที่ระบุ
- request ปัจจุบันขอ implement reviewed plan ที่อ้างถึง

สรุปจาก `ask-me` เพียงอย่างเดียวยังเป็น read-only และคำขอ plan-only ต้องหยุดที่ plan ถ้า outcome
ชัดแต่ไม่มี plan file ให้ใช้ micro-plan ห้ามสร้าง approval local รอบใหม่

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

## Upstream Discipline

คำแนะนำ implementation จาก Matt Pocock snapshot ที่ pin ไว้ยังเป็น source แต่ adaptive loop และ
approval boundary ที่เข้มกว่าของ SPK มีผลก่อน

ทำงานที่ user ระบุใน spec หรือ ticket ใช้ `/tdd` ที่ seam ซึ่งตกลงกันและ strict RED/GREEN ช่วยจริง
รัน type check กับ test ตามขนาดการเปลี่ยน และรัน full suite เมื่อ repo หรือ release กำหนด ใช้
`/code-review` กับงาน material หรือ high-risk เตรียม commit message ได้ แต่ commit เฉพาะเมื่อ user
อนุมัติ Git write นั้นแยกต่างหาก
