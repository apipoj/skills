# โครงสร้าง `ai_context` และ project artifacts สำหรับ SPK

วันที่วิจัย: 2026-09-01

## ข้อสรุป

SPK ควร **centralize กติกาและการค้นหา แต่ไม่รวมไฟล์ทุกชนิดไว้ในโฟลเดอร์เดียว** แนะนำให้ใช้โครงสร้างแบบ split-zone:

- `ai_context/` = local/private working state ของ agent: raw sources, derived memory, drafts, handoffs และ runtime state; ignore จาก Git เป็นค่าเริ่มต้น
- `docs/` + `CONTEXT.md` = เอกสาร canonical ที่ทีมต้อง review, share และเก็บ history
- issue tracker หรือระบบภายนอก = canonical backend ของ spec/task/customer deliverable เมื่อ project policy ระบุไว้
- `docs/agents/artifacts.md` = routing policy กลางแบบ Markdown ที่บอกทุก skill ว่า artifact แต่ละชนิดเริ่มที่ไหน, promote ไปไหน, ใครเป็น source of truth และเก็บนานเท่าไร

หัวใจคือ **หนึ่ง artifact มี canonical location เดียว** ส่วน `ai_context/wiki/` เก็บ summary/index/pointer ไปยัง canonical artifact ได้ แต่ห้ามทำสำเนาเนื้อหาอีกชุดที่อาจ drift

## วิธีวิจัยและขอบเขต

ตรวจ source code, workflow contracts, templates และ tests ของ repo นี้ แล้วเทียบกับ primary sources ของ Anthropic, OpenAI, GitHub, Agent Skills, Git, Diátaxis และผู้ริเริ่ม ADR แนวทางด้านล่างที่ระบุว่า “ข้อเสนอ” หรือ “อนุมาน” เป็น synthesis ของหลักฐานเหล่านี้ ไม่ใช่มาตรฐานที่แหล่งใดกำหนดไว้โดยตรง

## ข้อเท็จจริงที่พบใน repo ปัจจุบัน

1. Scaffold ปัจจุบันมีสองพื้นที่หลัก: raw source ที่ `ai_context/sources/` และ LLM-maintained wiki ที่ `ai_context/wiki/`; wiki รองรับ page type `concept`, `entity`, `decision`, `plan`, `learning` และบังคับ citation สำหรับ claim ที่ไม่ obvious ([SCHEMA.md](../../plugins/spk/templates/ai_context/wiki/SCHEMA.md#L3-L17), [SCHEMA.md](../../plugins/spk/templates/ai_context/wiki/SCHEMA.md#L39-L55))

2. Schema เรียก `wiki/` ว่า “commit-safe” แต่ runtime exclude `ai_context/` **ทั้งโฟลเดอร์** ผ่าน `.git/info/exclude` เมื่อ project ยังไม่ได้ track หรือ ignore เอง ดังนั้น “เขียนได้โดยผ่าน secret scan” ไม่ได้แปลว่า “ทีมอื่นจะเห็นผ่าน Git” ([SCHEMA.md](../../plugins/spk/templates/ai_context/wiki/SCHEMA.md#L57-L60), [init-ai-context.cjs](../../plugins/spk/scripts/init-ai-context.cjs#L208-L217), [init-ai-context.cjs](../../plugins/spk/scripts/init-ai-context.cjs#L239-L291))

3. `sources/.gitignore` ignore raw files และเปิดไว้เฉพาะ policy file; initializer ปฏิเสธ symlink/special-file destination และรักษา user-owned wiki pages, index และ log เมื่อ upgrade ([init-ai-context.cjs](../../plugins/spk/scripts/init-ai-context.cjs#L22-L29), [init-ai-context.cjs](../../plugins/spk/scripts/init-ai-context.cjs#L140-L178), [init-ai-context.test.js](../../tests/init-ai-context.test.js#L90-L152))

4. Artifact writers ยังใช้คนละ convention:

   - `plan` เขียน `ai_context/wiki/plans/YYYY-MM-DD-<slug>.md` และ `code` อ่านจาก path นี้ ([plan/SKILL.md](../../skills/engineering/plan/SKILL.md#L9-L15), [plan/SKILL.md](../../skills/engineering/plan/SKILL.md#L43-L46), [workflows.json](../../contracts/workflows.json#L2022-L2036))
   - `handoff` เขียนที่ project root ([handoff/SKILL.md](../../skills/productivity/handoff/SKILL.md#L10-L20))
   - `to-questionnaire` เขียนใน current directory ([to-questionnaire/SKILL.md](../../skills/productivity/to-questionnaire/SKILL.md#L32-L36))
   - `research` เลือก “ที่ที่ repo ใช้อยู่” และถ้าไม่มีให้หาที่เหมาะสมเอง จึงไม่มี default ข้าม project ที่แน่นอน ([research/UPSTREAM.md](../../skills/engineering/research/UPSTREAM.md#L6-L13))
   - `to-spec` ใช้ issue tracker เป็น canonical destination ([to-spec/UPSTREAM.md](../../skills/engineering/to-spec/UPSTREAM.md#L7-L20))
   - `CONTEXT.md` และ ADR อยู่ที่ root/`docs/adr/` หรือใต้ context ใน monorepo; `CONTEXT.md` เป็น glossary ไม่ใช่ spec หรือ scratch pad ([domain-modeling/UPSTREAM.md](../../skills/engineering/domain-modeling/UPSTREAM.md#L10-L40), [domain-modeling/UPSTREAM.md](../../skills/engineering/domain-modeling/UPSTREAM.md#L60-L74))

5. `ask-me` เวอร์ชันปัจจุบันเป็น `read_only` และหยุดก่อนสร้าง artifact; จุดกระจายของไฟล์จึงอยู่ที่ workflow ที่รับ handoff ต่อ ไม่ใช่ตัว `ask-me` เอง ([workflows.json](../../contracts/workflows.json#L1815-L1819), [workflows.json](../../contracts/workflows.json#L1846-L1856), [ask-me/SKILL.md](../../skills/productivity/ask-me/SKILL.md#L12-L14))

6. `setup` มี pattern สำหรับ config กลางอยู่แล้ว: บันทึก issue tracker, domain docs และ triage vocabulary ใน `docs/agents/*.md` แล้วใส่ pointer สั้นใน `AGENTS.md`/`CLAUDE.md` ([setup/SKILL.md](../../skills/engineering/setup/SKILL.md#L10-L16), [setup/SKILL.md](../../skills/engineering/setup/SKILL.md#L64-L113)) การเพิ่ม `docs/agents/artifacts.md` จึงต่อยอด convention เดิมได้โดยไม่สร้างระบบ config ชุดใหม่

### ปัญหาที่ตามมาจาก state นี้

- Approved plan ที่อยู่ใต้ `ai_context/` อาจหายจากการ review/share เพราะ default Git behavior ซ่อน parent directory ทั้งก้อน
- root/current-directory writers ทำให้ user ต้องเดาว่าไฟล์ไหนเป็น draft, transit document หรือ team record
- `wiki/` อาจมี decision/plan ซ้ำกับ `docs/adr/`, issue tracker หรือไฟล์อื่นจนไม่รู้ว่าอันไหนใหม่กว่า
- Wiki page ที่ cite raw file ใต้ `sources/` อาจ “commit-safe” แต่ citation เปิดไม่ได้บนเครื่องอื่น เพราะ raw source ถูก ignore

## สิ่งที่ primary sources บอก

### 1. แยก instruction, memory และ task-specific workflow

Claude Code แยก `CLAUDE.md` ซึ่งคนเขียนเพื่อกำหนด instruction/rule ออกจาก auto memory ที่ agent เขียนเป็น learning/pattern; project instruction แชร์กับทีมผ่าน source control ส่วน local instruction เป็นของผู้ใช้คนเดียว ([Anthropic: How Claude remembers your project](https://code.claude.com/docs/en/memory#claudemd-vs-auto-memory), [ตำแหน่งและ scope ของ CLAUDE.md](https://code.claude.com/docs/en/memory#choose-where-to-put-claudemd-files)) Anthropic ยังแนะนำให้เก็บสิ่งที่ต้องใช้ทุก session ไว้สั้น ๆ และย้าย procedure เฉพาะงานไป skill หรือ path-scoped rule ([Anthropic: When to add to CLAUDE.md](https://code.claude.com/docs/en/memory#when-to-add-to-claudemd), [Organize rules](https://code.claude.com/docs/en/memory#organize-rules-with-clauderules))

Codex ใช้ instruction chain จาก project root ลงมาถึง working directory โดยไฟล์ที่ใกล้งานกว่ามี precedence สูงกว่า และมี combined-size limit 32 KiB โดย default; OpenAI จึงแนะนำให้วาง rule ใกล้ scope ที่มันกำกับ ([OpenAI: Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md/#how-codex-discovers-guidance), [Layer project instructions](https://developers.openai.com/codex/guides/agents-md/#layer-project-instructions))

GitHub Copilot แยก always-on custom instructions, reusable prompt, custom agent, skill และ hook ตามหน้าที่ และรองรับ path-specific instruction; เมื่อหลาย instruction file ใช้พร้อมกัน GitHub เตือนให้หลีกเลี่ยงกติกาที่ขัดกัน ([GitHub: customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet), [GitHub: multiple instruction files](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions#how-multiple-instruction-files-interact))

**อนุมานสำหรับ SPK:** `AGENTS.md`/`CLAUDE.md` ควรมี pointer และ policy สั้น ๆ ไม่ควรกลายเป็น knowledge dump หรือ artifact catalog ทั้งหมด ส่วนรายละเอียดควรถูกอ่าน on demand จาก `docs/agents/artifacts.md` และ artifact ตัวจริง

### 2. ใช้ progressive disclosure แทนการโหลดทุกอย่าง

Agent Skills กำหนดให้ `SKILL.md` เก็บ core instruction และแยก `references/`, `scripts/`, `assets/`; metadata โหลดตอนเริ่ม, skill body โหลดเมื่อ activate และ resource โหลดเมื่อจำเป็น ([Agent Skills specification](https://agentskills.io/specification#directory-structure), [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure))

**อนุมานสำหรับ SPK:** skill ทุกตัวควรรู้เพียง “อ่าน artifact policy แล้ว resolve destination ของชนิดนี้” ไม่ควร hardcode รายละเอียดทุก destination ซ้ำในแต่ละ skill เพราะจะ drift และกิน context

### 3. Git boundary ต้องสอดคล้องกับการแชร์

Git ระบุว่า `.gitignore` เหมาะกับ pattern ที่ต้อง version-control และแจกให้ clone อื่น ส่วน `$GIT_COMMON_DIR/info/exclude` เหมาะกับ auxiliary files ของ workflow เฉพาะผู้ใช้/เฉพาะ repo; tracked file ไม่ได้รับผลจาก ignore และไม่สามารถ re-include child ได้หาก parent directory ถูก exclude ([Git: gitignore](https://git-scm.com/docs/gitignore.html#_description), [Git: pattern format](https://git-scm.com/docs/gitignore.html#_pattern_format))

**อนุมานสำหรับ SPK:** เมื่อ runtime เลือก `/ai_context/` ใน `.git/info/exclude` แล้ว พื้นที่นี้ควรนิยามเป็น local zone ให้ชัด และ promote เอกสารที่ต้องแชร์ออกไป `docs/` หรือ external system แทนการพยายาม selectively track ลูกบาง path ใต้ parent ที่ถูก exclude

### 4. Canonical decision ต้องมี history และสถานะ

Michael Nygard เสนอให้เก็บ ADR เป็นไฟล์สั้นใน project repository, ใช้เลขไม่ซ้ำ และเมื่อกลับ decision เดิมให้เก็บ record เดิมไว้พร้อม mark ว่า superseded ([Cognitect: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) Azure Well-Architected ย้ำว่า accepted ADR ควรเป็น append-only; decision ใหม่ต้อง supersede และ link ของเดิม พร้อมใช้สถานะ `Proposed`, `Accepted`, `Superseded` และมี single source of truth ที่ทีมเข้าถึงได้ ([Microsoft: Maintain an ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record))

**อนุมานสำหรับ SPK:** decision page ใน local wiki ไม่ควรแข่งขันกับ `docs/adr/`; wiki ควรชี้ไป ADR canonical และเก็บ derived summary เท่านั้น

### 5. แยกตามหน้าที่ของเอกสาร

Diátaxis ชี้ว่าการมี content category ที่ขอบเขตชัดช่วยทั้งผู้อ่านและผู้เขียน และการปล่อยให้ tutorial/how-to/reference/explanation ปะปนกันทำให้ทั้ง structure และ content เสื่อม ([Diátaxis: The map](https://diataxis.fr/map/))

**อนุมานสำหรับ SPK:** แม้ plan/spec/ADR/handoff จะไม่ตรงกับสี่หมวด Diátaxis โดยตรง แต่ควรแยกตาม purpose และ lifecycle ไม่ใช่รวมทุก Markdown ใต้ `wiki/` เพียงเพราะ agent เป็นผู้สร้าง

## ทางเลือกด้าน architecture

| ทางเลือก | รูปแบบ | ข้อดี | ข้อเสีย/ความเสี่ยง | ข้อสรุป |
|---|---|---|---|---|
| A. ทุกอย่างใต้ `ai_context/` | `sources/`, `wiki/`, `drafts/`, `deliverables/` อยู่ใต้ parent เดียว แล้วเลือก track บางส่วน | จุดเดียว จำง่าย | ขัดกับ default `/ai_context/` exclusion; raw/private อยู่ใกล้ canonical; selective tracking ซับซ้อน; review visibility ไม่แน่นอน | ไม่แนะนำ |
| B. ทุกอย่างใต้ tracked `docs/` | raw input, memory, drafts และ canonical docs อยู่ใน Git | ทีมค้นง่ายและมี history | เสี่ยง commit private input/draft; repo noisy; runtime locks/logs ปะปนกับเอกสาร; agent memory กลายเป็นทีม policy โดยไม่ผ่าน review | ไม่แนะนำ |
| C. Split-zone + policy กลาง | `ai_context/` local, `docs/`/tracker canonical, `docs/agents/artifacts.md` เป็น router | privacy และ source of truth ชัด; ใช้ Git semantics ปัจจุบัน; รองรับหลาย backend; migration แบบค่อยเป็นค่อยไป | ต้องแก้หลาย skill/contract และมี promote step | **แนะนำ** |
| D. Registry/database กลาง | ทุก artifact ลง registry พร้อม backend adapter และ metadata schema | query/automation ดีที่สุด | over-engineered สำหรับ Markdown-first skill pack; เพิ่ม failure mode, lock-in และข้อมูลเทคนิคที่ user ต้องเห็น | พิจารณาเฉพาะอนาคต |

## โครงสร้างที่แนะนำ

```text
project/
├── AGENTS.md หรือ CLAUDE.md        # instruction สั้น + pointer ไป policy
├── CONTEXT.md                     # canonical glossary (หรือ CONTEXT-MAP.md)
├── docs/
│   ├── agents/
│   │   ├── artifacts.md           # canonical routing/source-of-truth policy
│   │   ├── domain.md
│   │   └── issue-tracker.md
│   ├── adr/                       # canonical architecture decisions
│   ├── plans/                     # reviewed plans ที่ทีมเลือกเก็บ
│   ├── research/                  # cited research ที่ reusable/shared
│   ├── specs/                     # optional เมื่อ policy เลือก file-based specs
│   └── deliverables/
│       └── <audience-or-client>/  # approved repo-backed external artifacts
└── ai_context/                    # local by default; /ai_context/ ใน info/exclude
    ├── .spk-version
    ├── runtime/                   # locks, state, generated logs/review files
    ├── sources/                   # immutable raw/private inputs
    ├── wiki/
    │   ├── SCHEMA.md
    │   ├── index.md
    │   ├── concepts/
    │   ├── entities/
    │   ├── learnings/
    │   └── pointers/              # summary + link; ไม่ duplicate canonical docs
    └── work/
        ├── plans/
        ├── specs/
        ├── research/
        ├── questionnaires/
        ├── handoffs/
        └── archive/               # closed local artifacts; cleanup ต้อง explicit
```

ใช้ชื่อ `wiki/` ต่อในรุ่นแรกเพื่อลด migration cost; เปลี่ยนความหมายของ `decision`/`plan` page จาก source of truth เป็น pointer หรือ derived summary แทน การ rename เป็น `memory/` ทำได้ภายหลังแต่ไม่จำเป็นต่อการแก้ปัญหา

### Routing default ต่อ artifact

| Artifact | Draft/default write | Canonical destination | Git/visibility | Lifecycle note |
|---|---|---|---|---|
| AI/project memory | `ai_context/wiki/` | ไม่มี; เป็น derived memory | local | index/pointer เท่านั้นเมื่ออ้าง canonical artifact |
| Raw source | `ai_context/sources/` | external source เดิม หรือ sanitized promoted doc | local/private | immutable; ห้าม publish อัตโนมัติ |
| Glossary | แก้ `CONTEXT.md`/context-local file โดยตรงหลัง term resolved | ไฟล์เดียวกัน | tracked candidate | ไม่ใช้เป็น spec/scratch pad |
| ADR | `docs/adr/NNNN-slug.md` สถานะ `proposed` | ไฟล์เดียวกันเมื่อ `accepted` | tracked candidate | accepted record ไม่ rewrite; ใช้ ADR ใหม่ supersede |
| Plan | `ai_context/work/plans/YYYY-MM-DD-slug.md` | `docs/plans/…` เฉพาะ reviewed/shared plan; ไม่เช่นนั้นคง local | local → tracked candidate | หลังจบเปลี่ยน status, ไม่จำเป็นต้องย้าย path |
| Spec | `ai_context/work/specs/…` | issue tracker โดย default ปัจจุบัน หรือ `docs/specs/` เมื่อ policy ระบุ | local → external/tracked | ห้ามมี issue และไฟล์ editable สอง canonical copies |
| Research | `ai_context/work/research/…` | `docs/research/…` เมื่อ reusable หรือเป็น decision evidence | local → tracked candidate | citation ต้องเปิดได้สำหรับ audience ของ canonical doc |
| Questionnaire | `ai_context/work/questionnaires/…` | `docs/deliverables/<audience>/…` หรือระบบส่งเอกสารที่ policy ระบุ | local → tracked/external | การสร้างไม่เท่ากับอนุญาตส่ง |
| Customer deliverable | `ai_context/work/<kind>/…` | `docs/deliverables/…` เฉพาะ repo ที่อนุญาต หรือ external DMS | local → controlled | review/redact ก่อน promote; send/publish gate แยก |
| Handoff | `ai_context/work/handoffs/…` | โดยปกติไม่มี; ส่ง path หรือ upload ตามคำขอ | local/transit | reference canonical artifacts, ไม่ copy; expire หลัง task จบ |

คำว่า “tracked candidate” หมายถึง path อยู่ในพื้นที่ที่ Git มองเห็น แต่ยังไม่เท่ากับอนุญาต `git add`, commit หรือ push

## `docs/agents/artifacts.md` ควรมีอะไร

ใช้ Markdown table ที่คนอ่านได้ ไม่ใช้ YAML/JSON receipt เป็น user-facing config:

1. artifact type และ purpose
2. draft destination
3. canonical destination/backend
4. visibility: `local-private`, `team`, `external`
5. promotion authority: ใคร/เหตุการณ์ใดทำให้ draft เป็น canonical
6. retention/archive rule
7. consumer rule: skill ใดอ่านอะไร และ fallback เมื่อ path ไม่มี

Root `AGENTS.md`/`CLAUDE.md` ควรมีเพียงหนึ่งย่อหน้าว่า “อ่าน `docs/agents/artifacts.md` ก่อนเขียน project artifact; ห้าม hardcode destination ถ้า policy มี mapping” เพื่อไม่เพิ่ม always-on context มากเกินจำเป็น

## Artifact lifecycle ที่แนะนำ

```text
capture/input
    ↓
local draft ใน ai_context/work/
    ↓ review + privacy check
approved/promoted ไป canonical backend
    ↓
ai_context/wiki/index.md เพิ่ม pointer/summary
    ↓
completed | delivered | superseded | cancelled
    ↓
เก็บ history ที่ canonical path เดิม หรือย้ายเฉพาะ local transit artifact ไป work/archive/
```

กติกา:

1. **Draft ไม่ authoritative** — skill อื่นอ่านได้เพื่อทำงานต่อ แต่ห้ามอ้างว่าเป็น approved decision/spec
2. **Promotion เป็น copy/move ที่ตรวจได้** — บันทึก source draft, canonical path/URL, reviewer/authority และสถานะ โดยตอบผู้ใช้เป็นภาษาคน ไม่พ่น serialized receipt
3. **Index หลัง promote** — wiki index ชี้ canonical path/URL พร้อม summary สั้น; ไม่ copy body
4. **Archive เป็น status ก่อนเป็น folder** — canonical path ควร stable เพื่อไม่ทำ link แตก; ADR ใช้ superseded link, plan/spec ใช้ `completed`, `cancelled` หรือ `superseded` ส่วน local handoff/draft ค่อยย้าย `work/archive/` เมื่อได้รับอนุญาต cleanup
5. **External send แยกจาก create/promote** — approved file ยังไม่ให้สิทธิส่งลูกค้า, publish หรือ upload จนเห็น artifact, recipients และ channel ที่แน่นอน

## Source-of-truth rules

1. `docs/agents/artifacts.md` เป็น source of truth ของ **routing policy** เท่านั้น ไม่ใช่เนื้อหา artifact
2. Artifact หนึ่งชนิดใน project หนึ่งมี canonical backend เดียว เช่น spec อยู่ GitHub Issue **หรือ** `docs/specs/`; ถ้าต้องมี mirror ให้ label ว่า generated/read-only และ link กลับ canonical
3. `CONTEXT.md` เป็น source of truth ของ vocabulary; ADR เป็น source of truth ของ accepted architecture rationale; code/tests เป็น source of truth ของ executable behavior; plan ไม่ควร override ของเหล่านี้
4. `ai_context/wiki/` เป็น derived index/memory ถ้าขัดกับ code, canonical docs หรือ tracker ให้ถือ canonical source และ mark wiki ว่า stale
5. Handoff อ้าง path/URL ของ spec, plan, ADR, issue, commit และ diff; ไม่คัดลอกเนื้อหา
6. Canonical doc ต้องใช้ citation ที่ audience เปิดได้ ส่วน raw local source อาจเป็น evidence สำหรับ agent แต่ไม่ใช่ shareable citation เว้นแต่มี sanitized/team-accessible copy

## Privacy และ Git behavior

- คง `/ai_context/` ใน `.git/info/exclude` เป็น default เพราะตรงกับ Git semantics ของ auxiliary workflow files เฉพาะ repo/ผู้ใช้ และทำให้ clean-tree gate ไม่ถูกรบกวน
- คง `ai_context/sources/.gitignore` แบบ fail-closed เผื่อ project เลือก track `ai_context` เองในอนาคต แต่ document ให้ชัดว่าการ track parent เป็น opt-in ขั้นสูง ไม่ใช่ default
- “ignored” ไม่ได้แปลว่า encrypted หรือไม่ถูก backup/sync; ห้ามใส่ credential และต้องคง path-containment, symlink rejection และ secret scanning
- Canonical docs ต้องผ่าน review และ secret/privacy scan แยกจาก wiki scan; “ผ่าน scanner” ไม่ได้แปลว่าได้รับอนุญาตให้เผยแพร่ลูกค้า
- หลีกเลี่ยง PII/ชื่อลูกค้าเต็มใน filename เมื่อไม่จำเป็น ใช้ audience slug ที่ project policy อนุมัติ

## Naming และ status

- ใช้ lowercase kebab-case; draft/research/plan/deliverable ใช้ `YYYY-MM-DD-<kind>-<slug>.md`
- Handoff ที่อาจมีหลายไฟล์ต่อวันใช้ `YYYY-MM-DDTHHMMSSZ-<slug>.md`
- ADR คง `NNNN-<slug>.md` เลขเพิ่มอย่างเดียวและไม่ reuse
- ใช้ status vocabulary ตามชนิด:
  - ADR: `proposed | accepted | deprecated | superseded`
  - plan/spec/research: `draft | in-review | active | completed | cancelled | superseded`
  - deliverable: `draft | approved | delivered | withdrawn`
  - handoff: `active | consumed | expired`
- แสดง metadata ในเอกสารภายในแบบ Markdown ที่อ่านง่าย (`Status:`, `Updated:`, `Canonical:`); customer-facing body ไม่ควรมี internal routing metadata เว้นแต่จำเป็น

## Migration impact

### Phase 1 — เพิ่ม policy โดยยังไม่ย้ายข้อมูล

- ให้ `setup` สร้าง/อัปเดต `docs/agents/artifacts.md` และเพิ่ม pointer ใน `AGENTS.md`/`CLAUDE.md`
- เพิ่ม scaffold `ai_context/work/*` และ `ai_context/runtime/`
- ให้ readers รองรับทั้ง legacy path และ policy-resolved path ชั่วคราว

### Phase 2 — เปลี่ยน writers

- `plan`/`code`: draft ที่ `work/plans`; promote reviewed shared plan ไป `docs/plans`
- `handoff`: จาก project root ไป `work/handoffs`
- `to-questionnaire`: จาก current directory ไป `work/questionnaires`, แล้ว promote ตาม deliverable policy
- `research`: default ที่ `work/research`, promote reusable result ไป `docs/research`
- `to-spec`: ร่าง local ก่อน publish ไป backend ที่ `issue-tracker.md`/`artifacts.md` ระบุ
- `ask-with-docs`/`domain-modeling`: คง `CONTEXT.md` และ `docs/adr/` เป็น canonical ไม่ย้ายเข้า wiki
- `add-knowledge`, `ask-project`, `check-wiki`: ไม่ ingest drafts โดยปริยาย และให้ index canonical pointers โดยไม่ duplicate body

### Phase 3 — classify legacy artifacts แบบไม่ทำลาย

- Inventory `ai_context/wiki/plans/*`, root `handoff-*.md`, `to-questionnaire-*.md` และ research notes ก่อน
- Approved/shared plan → `docs/plans/`; active local plan → `ai_context/work/plans/`
- Root handoff/questionnaire → local work dir หรือ `docs/deliverables/` ตาม intent ที่ตรวจได้
- คง legacy file หรือสร้าง tombstone pointer จน consumer ทั้งหมดอ่าน path ใหม่ได้; ห้าม bulk-delete และห้าม auto-move user-owned/actively tracked `ai_context`

### Phase 4 — contracts, generated payloads และ tests

ต้องแก้พร้อมกัน:

- `contracts/workflows.json`: artifact paths, evidence และ guardrails ของ `setup`, `plan`, `code`, `research`, `handoff`, `to-questionnaire`, `to-spec`, knowledge workflows และ router
- Thai source + English mirror; จากนั้น regenerate `plugins/spk/`/`plugins/spk-codex/` ตาม source-of-truth rules ของ repo
- `plugins/spk/templates/ai_context/`, initializer/runtime scripts และ schema version โดยรักษา user index/log/pages
- tests อย่างน้อย:
  1. routing contract: artifact-writing skill ห้าม hardcode root/current directory เมื่อ policy มี mapping
  2. lifecycle: draft → promote → index โดยไม่มี duplicate canonical body
  3. Git/privacy: `ai_context/` ยัง local, raw sources ignored, canonical docs visible, tracked override ไม่ถูกทำลาย
  4. migration: legacy readers ทำงาน, user-owned files ไม่ถูก overwrite/delete, symlink/path guard ยัง fail closed
  5. locale/manifest/generated-payload sync และ full release gate

## Recommendation ที่ลงมือได้ก่อน

ทำเป็นสอง release เพื่อลด blast radius:

1. **Policy release:** เพิ่ม `docs/agents/artifacts.md`, scaffold `work/`/`runtime/`, compatibility readers และ tests โดยยังไม่ย้ายไฟล์เดิม
2. **Writer migration release:** เปลี่ยน artifact writers ทีละกลุ่ม, ทำ inventory/migration assistant และ deprecate legacy paths หลังมี evidence ว่าไม่มี consumer เหลือ

อย่าเริ่มด้วยการ rename `ai_context/wiki` หรือย้าย ADR/`CONTEXT.md`; สองอย่างนี้เพิ่ม migration cost แต่ไม่แก้ root cause เท่าการกำหนด local/canonical boundary และ routing policy กลาง

## ช่องว่างและ decision ที่ยังต้องเลือก

1. ไม่มีมาตรฐานภายนอกใดกำหนด directory tree สำหรับ plan/spec/handoff/customer deliverable ครบชุด ข้อเสนอนี้เป็น inference จาก scope, progressive disclosure, Git visibility และ ADR lifecycle
2. ต้องเลือก project default ว่า reviewed plan เป็น team record ใน `docs/plans/` เสมอ หรือเก็บเฉพาะ plan ที่มี audit value
3. ต้องเลือก customer deliverable backend เริ่มต้น: repo-backed `docs/deliverables/` หรือ external DMS; ไม่ควรเดาจาก project type
4. Claude auto memory แชร์ข้าม worktree แต่ `ai_context/` ปัจจุบันอยู่ในแต่ละ workspace path; หาก SPK ต้องแชร์ memory ข้าม worktree จริง ๆ ต้องออกแบบ common storage/locking เพิ่มต่างหาก ([Anthropic: auto-memory storage](https://code.claude.com/docs/en/memory#storage-location))
5. ต้องกำหนด retention/cleanup ของ local drafts และ handoffs; การลบควรเป็น explicit/recoverable action ไม่ใช่ side effect ของ session start

## Primary sources

- [Anthropic — How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [OpenAI — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md/)
- [GitHub — Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [GitHub — Copilot customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
- [Agent Skills — Specification](https://agentskills.io/specification)
- [Git — gitignore documentation](https://git-scm.com/docs/gitignore.html)
- [Michael Nygard/Cognitect — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Microsoft Azure Well-Architected — Maintain an architecture decision record](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)
- [Diátaxis — The map](https://diataxis.fr/map/)
