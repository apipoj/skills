---
name: sunzi
description: ใช้หลักซุนวูเป็น strategy lens ก่อนเลือก battle, architecture, rollout หรือ competitive move
disable-model-invocation: true
---

# Sunzi Strategy Lens

ใช้หลักซุนวูเป็น strategy lens สำหรับงาน engineering และ product ร่วมกับ AI แปลง classic strategy ให้เป็นพฤติกรรม planning ที่สังเกตได้: รู้สถานการณ์ เลือก battle ที่ถูก สร้างเงื่อนไขก่อนลงมือ และหลีกเลี่ยงการต่อสู้แบบเสียเปรียบ

## รวบรวม Context

- ถ้าอยู่ใน git worktree ให้รัน `git status --short` และ `git log -3 --oneline`; ถ้าไม่ใช่ git repo ให้ข้าม git context และทำงานต่อ
- ดู project context (CLAUDE.md, AGENTS.md, package.json, README ฯลฯ)
- อ่าน plan, diff, competitor, incident หรือ architecture choice ที่ให้มา

## แผนที่ซุนวูสำหรับ Engineering

### 1. รู้เรา รู้เขา
- เรา: capability ปัจจุบัน, repo state, team bandwidth, tests ที่มี, deploy confidence
- เขา: customer need, competitor, broken behavior, constraints, budget, time, platform limits
- ถาม: "อะไรที่เรารู้เกี่ยวกับตัวเราและสถานการณ์ที่จะเปลี่ยนการเคลื่อนไหว?"

### 2. ชนะก่อนต่อสู้
- สร้างเงื่อนไขก่อนเขียน code: ชี้ acceptance, ลดความไม่แน่นอน, เพิ่ม diagnostics, แยก blast radius
- สัญญาณดี: implementation ดูชัดแล้วหลัง discovery
- สัญญาณร้าย: เริ่ม code ตอนที่ objective ยังคลุมเครือ
- ถาม: "เงื่อนไขอะไรที่เราปรับปรุงได้ก่อนเพื่อให้งานง่ายขึ้น?"

### 3. เลือก Terrain
- Terrain คือ code ownership, architecture boundaries, dependencies, CI, deployment paths, customer context และ timing
- สัญญาณดี: plan ทำงานร่วมกับ seams ที่มีอยู่
- สัญญาณร้าย: plan ต่อสู้กับ repo, framework หรือ release calendar
- ถาม: "เส้นทางที่ง่ายที่สุดผ่านระบบคืออะไร?"

### 4. หลีกเลี่ยงการบุกตรงที่แพง
- ชอบ leverage: small adapter, config fix, test harness, staged rollout หรือ documentation change มากกว่า rewrite เสี่ยง
- สัญญาณดี: files ที่แตะน้อยลง, rollback ชัดขึ้น, proof เร็วขึ้น
- สัญญาณร้าย: refactor ใหญ่เพราะ agent อยากได้ clean slate
- ถาม: "battle ไหนที่ไม่ควรสู้?"

### 5. ใช้ Timing อย่างรับผิดชอบ
- Timing: เรียงลำดับงานให้แต่ละ step สร้างข้อมูลดีขึ้นสำหรับ step ถัดไป
- Surprise ในมุม engineering: หา path ที่ไม่ชัดและง่ายกว่า ไม่ใช่หลอกลวงคน
- สัญญาณดี: move ถัดไปเปลี่ยน option set
- สัญญาณร้าย: big-bang changes ที่ไม่มี intermediate signal
- ถาม: "move ไหนสร้างข้อมูลหรือ leverage สูงสุดตอนนี้?"

### 6. วินัยชนะกำลัง
- Operations ที่แข็งแกร่งชนะ raw effort: gates, ownership, rollback, logs และ communication ที่ชัด
- สัญญาณดี: ทุก action มี proof และ exit path
- สัญญาณร้าย: เพิ่มงานเพื่อชดเชย direction ที่ไม่ชัด
- ถาม: "วินัยอะไรป้องกันความวุ่นวายตอนขยาย action?"

## Workflow

1. อ่าน context ที่ให้มา (plan, diff, competitor, incident, architecture choice หรือ rollout)
2. ประเมินแต่ละมิติ strategic
3. ระบุ leverage points
4. ระบุ battles ที่ควรหลีกเลี่ยง
5. แนะนำ smallest winning move
6. กำหนด verification signal

## Output Format

```markdown
## Sunzi Strategy Brief
- Objective: <winning คืออะไร>
- Terrain: <repo/product/customer/context constraints>
- Self: <capabilities และ limits>
- Other/Constraint: <external pressure, competitor, bug, platform หรือ risk>
- Leverage: <1-3 leverage points>
- Avoid: <battle ที่ไม่ควรสู้>
- Smallest winning move: <action ที่ทำได้จริง>
- Proof: <test, metric, customer signal, log หรือ review signal>
```

## Use Case ที่นิยม

- ก่อน plan: เลือก strategy ก่อน task decomposition
- ก่อน code: ตัดสินใจ implementation path ที่เล็กและชนะที่สุด
- ก่อน deploy: เลือก rollout, smoke tests, rollback และ timing
- ตอน competitive/product decisions: โฟกัสที่ terrain, differentiation และ leverage
- ตอน incidents: หลีกเลี่ยงการแก้แบบสุ่ม เลือก path เร็วที่สุดสู่ verified stability

## Evidence Receipt

คืน `spk.evidence/v1` ที่มี objective, terrain, capabilities, constraints, leverage, battle ที่เลี่ยง, smallest move, proof, risks และ next action

## ข้อควรระวัง

- เก็บให้เป็น secular, practical, engineering/product-focused และ testable
- อย่าโรแมนติกความขัดแย้ง หรือแนะนำการหลอกลวงที่เป็นอันตราย
- ไม่แก้ source code เว้นแต่ user ขอ implementation โดยตรง
