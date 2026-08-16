# คู่มือผู้ใช้ Apipoj Skills

คู่มือนี้ครอบคลุม Apipoj Skills **v6.3.1** สำหรับ Claude Code, Codex และเครื่องมือที่รองรับ Agent Skills

อ่านฉบับภาษาอังกฤษได้ที่ [USER_GUIDE-EN.md](USER_GUIDE-EN.md)

## Apipoj Skills คืออะไร

Apipoj Skills คือชุด workflow สำหรับทำงาน software กับ AI แบบ Thai-first ตั้งแต่ทำความเข้าใจโจทย์ วางแผน เขียน code ตรวจสอบ ไปจนถึงเตรียม release โดยมีหลักสำคัญสามข้อ:

- เริ่มง่ายด้วย skill เดียว ไม่ต้องจำรายชื่อทั้งหมด
- งานสำคัญต้องมีหลักฐาน เช่น test result, diff scope, risk และ next action
- การแก้ไฟล์ไม่ได้แปลว่าอนุญาตให้ commit, push, deploy หรือ publish

รุ่นนี้มี **40 skills** และเรียกใช้เป็น command ได้ทุกตัว

## เริ่มใน 2 นาที

### 1. ตรวจ prerequisite

Claude Code และ Codex plugin ต้องใช้ Node.js 20 ขึ้นไป:

```bash
node --version
```

### 2. เลือกติดตั้งเพียงวิธีเดียว

#### Claude Code

```text
/plugin marketplace add apipoj/skills
/plugin install spk@spk
```

#### Codex

```bash
codex plugin marketplace add apipoj/skills
codex plugin add spk@spk
```

#### เครื่องมือที่รองรับ Agent Skills

```bash
npx skills@latest add apipoj/skills
```

อย่าติดตั้งทั้ง native plugin และ skills.sh ซ้ำใน project เดียว เพราะ agent อาจเห็น skill ซ้ำกัน

### 3. เริ่มงานแรก

| Platform | คำสั่งเริ่มต้น |
|---|---|
| Claude Code | `/spk:start` |
| Codex | `$spk:start` |
| Agent Skills-compatible tools | เลือก `start` จาก skills ที่ติดตั้ง ตาม syntax ของเครื่องมือนั้น |

จากนั้นบอก outcome ตามภาษาปกติ เช่น:

```text
/spk:start ช่วยเพิ่มระบบ export CSV ให้ feature นี้ พร้อม test และบอกสิ่งที่ต้องอนุมัติก่อนส่งงาน
```

`start` จะเลือก workflow ที่เล็กและตรงที่สุด ใช้ smart defaults เฉพาะทางเลือกที่ย้อนกลับได้และความเสี่ยงต่ำ และถามหนึ่งคำถามเมื่อคำตอบเปลี่ยน scope หรือความเสี่ยงจริง

## วิธีเรียก skill

ในตาราง skill จะมีสถานะการเรียกสองแบบ:

- **agent เรียกเองได้ / model or typed:** พิมพ์ชื่อ skill โดยตรงก็ได้ หรือปล่อยให้ `start` เลือกเมื่อ context ชัด
- **พิมพ์เอง / typed only:** ต้องพิมพ์ชื่อ skill ชัดเจน เพราะ agent จะไม่เรียก workflow นี้เอง

ตัวอย่าง typed-only:

```text
/spk:check-release ตรวจความพร้อม v6.3.1 โดยยังไม่ commit, tag หรือ publish
```

บน Codex ให้เปลี่ยนรูปแบบเป็น `$spk:check-release`

## เลือก workflow ตามงาน

ถ้าไม่แน่ใจ ให้เริ่มที่ `/spk:start` เสมอ ตารางนี้ใช้สำหรับคนที่ต้องการเลือกเอง:

| เป้าหมาย | Skills ที่เกี่ยวข้อง |
|---|---|
| เริ่มงานและทำ decision ให้ชัด | `/spk:start`, `/spk:ask-me`, `/spk:asking`, `/spk:ask-with-docs`, `/spk:wait-what`, `/spk:teach`, `/spk:handoff`, `/spk:to-questionnaire` |
| วางทิศทางและออกแบบงาน | `/spk:to-spec`, `/spk:plan`, `/spk:to-tickets`, `/spk:wayfinder`, `/spk:domain-modeling`, `/spk:codebase-design`, `/spk:prototype`, `/spk:design-options`, `/spk:bala`, `/spk:sunzi` |
| พัฒนา แก้ปัญหา และตรวจงาน | `/spk:code`, `/spk:tdd`, `/spk:debug`, `/spk:triage`, `/spk:improve-codebase`, `/spk:code-review`, `/spk:test-changes`, `/spk:fix-conflicts` |
| เข้าใจและดูแลความรู้ project | `/spk:setup`, `/spk:load-project`, `/spk:ask-project`, `/spk:research`, `/spk:add-knowledge`, `/spk:check-wiki`, `/spk:write-skills` |
| ตรวจระบบและเตรียมส่งงาน | `/spk:doctor`, `/spk:check-release`, `/spk:pr`, `/spk:task-to-pr`, `/spk:deploy`, `/spk:wizard`, `/spk:uninstall` |

## สูตรใช้งานที่พบบ่อย

แต่ละขั้นคือทางเลือกตามสถานะงาน ไม่ใช่คำสั่งให้ agent chain ทุก workflow อัตโนมัติ

### จากไอเดียสู่ change ที่ตรวจสอบแล้ว

1. `/spk:ask-me` เมื่อโจทย์ยังอยู่ในความคิด หรือ `/spk:ask-with-docs` เมื่ออยู่ใน repo และต้องเก็บความรู้ประกอบ
2. `/spk:to-spec` เพื่อทำ scope และ acceptance criteria ให้ชัด
3. `/spk:plan` หรือ `/spk:to-tickets` เพื่อวางลำดับ implementation
4. อนุมัติแผนที่เห็นแล้ว จากนั้นจึงใช้ `/spk:code` หรือ `/spk:tdd`
5. `/spk:test-changes` เพื่อ feedback เร็ว และ `/spk:code-review` เพื่อตรวจ diff
6. `/spk:check-release` ก่อนเลือกว่าจะ commit, เปิด PR หรือ deploy

### แก้บั๊กโดยไม่เดา

1. `/spk:debug` เพื่อทำ failure ให้ reproducible และพิสูจน์ root cause
2. ตรวจ diagnosis และ scope ของวิธีแก้
3. ขอ implementation แยก แล้วใช้ `/spk:code` หรือ `/spk:tdd`
4. รัน `/spk:test-changes` และ regression tests ที่เกี่ยวข้อง

### ทำความรู้จัก project เดิม

1. `/spk:load-project` เพื่ออ่านโครงสร้างและ context สำคัญ
2. `/spk:ask-project` สำหรับคำถามที่ตอบจาก repo ได้
3. `/spk:research` เมื่อต้องอ่าน primary sources ภายนอก
4. `/spk:add-knowledge` เมื่อต้องเก็บสิ่งที่ยืนยันแล้วกลับเข้า project memory

### สำรวจ UI ก่อนแตะ production

- `/spk:prototype` ใช้ตอบ design question เดียวด้วยของทดลองที่ทิ้งได้
- `/spk:design-options` ใช้สร้างหลายแนวที่แตกต่างกันจริงแล้วให้ผู้ใช้เลือก
- การเลือกแบบยังไม่ใช่สิทธิ์แก้ production code ต้องขอ implementation แยก

### เตรียม release

1. `/spk:doctor` ตรวจ installation และ runtime
2. `/spk:check-release` รัน gates และรายงาน blocker โดยยังไม่ publish
3. อนุมัติ Git action สำหรับ target และ payload ที่เห็นแล้ว
4. ใช้ `/spk:pr` หรือ `/spk:task-to-pr` เมื่อจะเปิด PR
5. ใช้ `/spk:deploy` เมื่อพร้อมกำหนด target, smoke test และ rollback ชัดเจน

## Bala 5: เช็กสมดุลก่อนลงแรง

`/spk:bala` เป็น skill แบบ **typed-only** และ **read-only** ใช้หลักพละ 5 เป็น decision lens สำหรับงาน engineering ไม่ใช่การสอนศาสนา

เหมาะกับการใช้ก่อน plan, code, review หรือระหว่าง debug เพื่อเช็กห้าด้าน:

- ศรัทธา / Confidence — ความมั่นใจมีหลักฐานหรือไม่
- วิริยะ / Energy — กำลังลงแรงกับ action ที่คุ้มที่สุดหรือไม่
- สติ / Awareness — เห็น context, constraints และสถานะจริงครบหรือไม่
- สมาธิ / Concentration — scope แคบพอจะจบและตรวจได้หรือไม่
- ปัญญา / Judgment — เข้าใจ root cause, tradeoff และสิ่งที่ยังไม่รู้หรือไม่

ตัวอย่าง:

```text
/spk:bala ตรวจแผน migration นี้ก่อนเริ่ม code หา imbalance หลัก แล้วแนะนำ action ที่เล็กที่สุดพร้อมหลักฐานว่าได้ผล
```

ผลลัพธ์จะเป็น rating ทั้งห้า, imbalance หลัก, action ถัดไปหนึ่งข้อ และ proof signal

## Sunzi: เลือก battle และ smallest winning move

`/spk:sunzi` เป็น skill แบบ **typed-only** และ **read-only** ใช้หลักซุนวูเป็น strategy lens ที่ practical และ testable โดยมอง “คู่ต่อสู้” เป็น constraint, bug, uncertainty, competition หรือ wasted motion ไม่ใช่การส่งเสริมความขัดแย้ง

เหมาะก่อนเลือก architecture, rollout, competitive move หรือแนวทางแก้ incident:

```text
/spk:sunzi ประเมิน rollout นี้ ระบุ terrain, leverage, battle ที่ควรเลี่ยง และ smallest winning move พร้อม proof กับ exit path
```

ผลลัพธ์จะสรุป objective, terrain, capability, constraints, leverage, สิ่งที่ควรเลี่ยง, move ถัดไป และวิธีพิสูจน์

ถ้าต้องใช้ร่วมกัน ให้เรียกอย่างตั้งใจทีละขั้น:

1. `/spk:sunzi` เลือก strategy และ terrain
2. `/spk:bala` ตรวจสมดุลของ decision ที่เลือก
3. `/spk:plan` แตก strategy เป็นแผนที่ตรวจสอบได้

## ขอบเขตอำนาจและ approval

Apipoj Skills แยกสิทธิ์เป็นชั้นเพื่อป้องกันการตีความกว้างเกินคำขอ:

| Effect | ทำอะไรได้ | สิ่งที่ยังต้องอนุมัติแยก |
|---|---|---|
| `read_only` | อ่าน วิเคราะห์ และรายงาน | การแก้ไฟล์ทุกชนิด |
| `workspace_write` | สร้างหรือแก้ไฟล์ใน scope ที่ขอ | commit, branch, push, PR, deploy และ publish |
| `git_write` | เปลี่ยน Git state หลังเห็น target/payload และอนุมัติ | remote write และ deployment |
| `external_write` | เปลี่ยน remote system ตาม target ที่อนุมัติ | target หรือ payload อื่นนอก approval |
| `destructive` | ลบเฉพาะ target ที่แสดงชัดและอนุมัติแล้ว | การขยาย target, broad glob หรือข้อมูลที่ ownership ไม่ชัด |

จำง่าย ๆ:

- อนุมัติแผน ไม่เท่ากับอนุมัติ implementation
- อนุมัติแก้ไฟล์ ไม่เท่ากับอนุมัติ commit
- อนุมัติ commit ไม่เท่ากับอนุมัติ push หรือ PR
- อนุมัติ push ไม่เท่ากับอนุมัติ deploy หรือ publish

## อ่านหลักฐานที่ agent คืนมา

งานสำคัญควรมี evidence receipt ในรูปแบบใกล้เคียงนี้:

```yaml
schema: spk.evidence/v1
workflow: <canonical skill>
effect: <read_only|workspace_write|git_write|external_write|destructive>
status: <complete|needs_user_input|blocked>
approval_required: <true|false>
```

ให้ดูสามอย่างก่อนเชื่อคำว่าเสร็จ:

1. **Result:** outcome ที่เกิดขึ้นจริง
2. **Evidence:** test, log, diff หรือ source ที่ตรวจได้
3. **Gap:** สิ่งที่ยังไม่ได้ตรวจ blocker และ next safe action

## แก้ปัญหาเบื้องต้น

### พิมพ์ชื่อ skill แล้ว agent บอกว่ามองไม่เห็น

ตรวจว่าสกิลเป็น typed-only หรือไม่ แล้วพิมพ์คำสั่งเต็มด้วยตัวเอง เช่น `/spk:bala` บน Claude Code หรือ `$spk:bala` บน Codex

### เห็น skill ซ้ำ

ถอนวิธีติดตั้งที่ซ้ำ เหลือเพียง native plugin หรือ skills.sh อย่างใดอย่างหนึ่งต่อ project

### Hook หรือ MCP เริ่มไม่ได้

ตรวจว่า `node --version` เป็น 20 ขึ้นไปและ `node` อยู่ใน `PATH` จากนั้นรัน `/spk:doctor`

### Agent ตอบกว้างหรือใช้ context ผิด project

รัน `/spk:load-project` ก่อนถามต่อ หรือเริ่ม task ใหม่ใน directory ที่ถูกต้อง

### ต้องการถอนการติดตั้ง

ใช้ `/spk:uninstall` เพื่อให้ระบบแสดงรายการ target และข้อมูลที่จะรักษาไว้ก่อนลบ การเรียก skill ยังไม่อนุญาตให้ลบทันที

## เอกสารที่เกี่ยวข้อง

- [README.md](README.md) — ภาพรวมและ roster เต็ม
- [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md) — วิธีติดตั้งสำหรับ agent และระบบอัตโนมัติ
- [RESOLVER.md](RESOLVER.md) — ตาราง resolve command และ dispatch
- [CHANGELOG.md](CHANGELOG.md) — สิ่งที่เปลี่ยนในแต่ละเวอร์ชัน
- [README-EN.md](README-EN.md) — README ภาษาอังกฤษ
