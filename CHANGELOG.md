# Apipoj Skills

## 6.6.0 - 2026-08-29

### Added

- Four new release gates close the drift classes a full-roster review surfaced: `verify:mirror-parity` (every EN mirror byte-identical to its canonical payload), `verify:autonomy` (embedded Autonomy Profile paragraphs match the contract, with a budget cross-check), `verify:router-coverage` (every contract workflow reachable from the `start` router), and reference-integrity/invocation-authority extensions (backticked `scripts/*.cjs` mentions must resolve; every shipped `.md` is scanned for invocations and for skill ids outside the roster).
- Real activation vocabulary for the confusable implicit pairs — `code`↔`tdd`, `research`↔`ask-project`, `asking`↔`ask-me` (upstream's stress-test/"grill" phrasing restored) — plus realistic mixed Thai/English trigger phrases replacing templated "use X" entries, and SkillLab scenarios that now test those exact disambiguations, including a bound-token digest quoted inside a question scoring as non-consent.

### Fixed

- Runtime breaks: `test-changes` pointed at a helper script that never shipped; `check-release` enumerated half the release gates by hand (now runs `verify:release` itself); `uninstall` cited ownership evidence that nothing ever wrote and now inventories the modern runtime artifacts; shipped `UPSTREAM.md` files told the agent to invoke nine upstream skill ids that do not exist in this distribution.
- Approval model: `triage` (the only external-write workflow without an approval mode) is now confirm-gated with a displayed target+payload envelope; `fix-conflicts` gains bounded authority to actually finish a merge/rebase; `deploy`'s bound_token gate gains the quoted/question/pre-intent consent exclusions its siblings had; `task-to-pr` re-fetches and re-digests its task snapshot on resume and before publish.
- Source-of-truth drift: payload-only content back-ported into the Thai sources (task-to-pr, ask-project, check-wiki, load-project, code, plan, setup, the interview trio) and Thai-only content shipped into the runtime (design-options' Anti-Slop Gates, deploy's Gather Context preflight, debug's RCA structure and report format, code-review's five passes and three-value verdict); stale mostly-Thai EN mirrors rebuilt; `teach` and `handoff` received real file contracts; `doctor`'s receipt now matches what spk-doctor.cjs emits; `add-knowledge` specifies the `hash=` log format auto-ingest depends on and fails closed outside a git repo.
- Discoverability: `start` routes all 40 workflows (four had fallen out) and presents manual-only skills as commands to the user; bucket READMEs corrected; calqued Thai phrasing in bala/sunzi/asking replaced with natural wording.
- The wiki-build guard (`gitignore-guard.cjs`) now exempts the whole `ai_context/` tree, not just `ai_context/sources/`. With `ai_context/` machine-locally excluded by default, the old sources-only exemption made the guard block the wiki-build from reading its own wiki (`add-knowledge` steps 6–8 failed closed); the same failure already existed in any project that ignored `ai_context/` itself. Symlink escapes out of `ai_context/` are still blocked via the resolved-path check.
- The `ai_context/` scaffold no longer dirties consumer working trees. The SessionStart hook kept writing project-local runtime artifacts that showed up as untracked, so every clean-working-tree gate (deploy preflight, PR prepare, release checks) rejected the tree. Unless the project already ignores `ai_context/` or deliberately tracks it, the hook now adds a machine-local exclude entry to `.git/info/exclude` — never to the tracked `.gitignore`, because editing a tracked file would itself dirty the tree the entry exists to keep clean. The healing runs every session, so installs that predate the fix pick it up too, and deleting the commented entry restores normal Git visibility for users who commit their wiki.

## 6.5.0 - 2026-08-28

### Added

- Every shipped workflow now declares an autonomy profile with explicit prompt and repair budgets. Low-risk local work can continue AFK within its declared effect boundary, while material decisions and external effects remain visible and bounded.
- `task_bound` approvals authorize one exact task-to-PR run instead of interrupting for each reversible step. The bound run may create its branch or worktree, implement, test, perform local browser QA when a UI exists, run an independent review, commit, push, open the PR, observe CI, and repair failures within the approved scope.
- The workflow contract advances to schema v2. Generation now validates every autonomy profile and emits it into all 40 English, Thai, Claude, and Codex skill payloads; SkillLab covers the new autonomous and boundary-stop outcomes.

### Changed

- `plan-and-implement` carries already granted workspace authority into implementation, and `code` builds a compact micro-plan when it receives an executable request without a separate plan artifact. Neither workflow asks for a redundant second approval before local edits.
- Planning, build, browser-test, and PR agents now share task-bound authority, bounded repair loops, and explicit evidence receipts. GitHub operations pin the selected repository explicitly and verify the returned repository or PR URL.

### Guardrails

- Autonomous runs never merge, deploy, force-push, write to the protected or default branch, expand scope, weaken secret scanning, or cross a newly discovered material decision. Those boundaries still require fresh exact approval.
- Browser QA is required when the changed product exposes a local UI and is reported as `NOT_APPLICABLE` with evidence when no browser surface exists.

## 6.4.1 - 2026-08-28

### Fixed

- Skill payloads now ship every auxiliary file from the English source directory, including retained `UPSTREAM.md` guidance and referenced templates. The upstream mirrors are regenerated from the reviewed pin instead of recursively pointing back to themselves, and the release gates now reject missing runtime links or drifted mirrors.
- Repository and PR workflow guidance now pins an explicit GitHub repository selector so fork-aware CLIs cannot redirect pull-request operations to an upstream parent.

## 6.4.0 - 2026-08-18

### Added

- A fifth response rule, **Terminology**, carried verbatim by every skill: reach for the precise domain term and keep it in its English form; never respell it phonetically in the reply's script (`ผลเทสท์` for `test`) or translate it literally (`หูจับ` for `handle`); gloss an unfamiliar term once — `CPA (ต้นทุนต่อการได้ลูกค้าหนึ่งราย)` — then anchor it with one concrete example. **Humanity** already asked for familiar technical English over literal translation, but it said nothing about phonetic respelling, and replies drifted toward Thai-script spellings of terms the reader already knows in English.
- The rule is stated once and generalizes past Thai: it names "the reply's script" rather than Thai script, so it holds in whatever language the reply lands in. The examples stay Thai because that is where the failure was observed.
- Two tests pin what the block says — the roster of five named rules, and both failure shapes the Terminology rule exists to prevent. The response-policy gate only checks that the contract and the 120 files agree, so a bad edit to the contract used to propagate everywhere without failing anything.
- `npm run verify:invocation` enforces that no skill body tells the agent to invoke one of the 21 user-invoked skills. `disable-model-invocation: true` stops a host from auto-firing a skill, but it never stopped a sibling skill's prose from instructing the agent to go run it, and two skills were doing exactly that. Wired into `verify:release`. Adopted from upstream's `.agents/invocation.md` invariant; the reviewed upstream pin stays at `84fdeff`.
- The gate is a lint on phrasing, not a proof. It fires on an invocation verb governing a code-span or slash reference — the form SPK writes real references in — and stays quiet on a bare name, because `setup`, `triage`, `handoff`, and `pr` are ordinary English words long before they are skill ids. It also stays quiet when the instruction is aimed at the user, since "tell the user to run `/setup`" is the correct rewrite of a violation and a gate that rejected its own fix would be useless.

### Fixed

- `debug` told the agent to hand its post-mortem off to `improve-codebase`, and `code-review` told it to run `/setup` when the issue tracker doc was missing. Both are user-invoked, so neither hand-off could ever have fired — the agent was being pointed at a door it cannot open. Both now instruct the user. Upstream deleted its equivalent post-mortem outright; SPK keeps it, because naming what would have prevented the bug is the useful half and only the hand-off was broken.

### Changed

- `domain-modeling` says when it fires, not only what it does: "Fires when discussing codebase terminology, writing or editing CONTEXT.md, or recording an ADR." Adopted from upstream's trigger rewrite, in both locales. The clause went into `description` rather than the contract's `triggers`, because `triggers` is validated but never emitted into a runtime artifact — every skill still carries the same `use <id>` / `<id> workflow` boilerplate there, and adding real ones would have changed nothing an agent reads.
- `ask-me` gave up its `ROI (ผลตอบแทนจากการลงทุน)` gloss rule, now stated by the block. Its restriction to *familiar* work terms stays, since the block does not say it.
- `ask-me`'s word ceiling moved from 1050 to 1100, disclosed here rather than raised quietly. 6.3.0 named this risk and said the voice trim had to pay for the block: it did not. The block grew by 50 words and `ask-me` had 13 of its own to give back. The one remaining redundancy — the `จากเรื่องนี้ ทำ PRD ต่อคุ้มที่สุด` example — also anchors "never sound bureaucratic," which the block does not state, so the ceiling moved instead of the guidance going. The 180-line ceiling did not move.

## 6.3.1 - 2026-08-16

### Fixed

- `verify-response-policy.cjs` built the paths in its error messages with `path.join`, so on Windows it reported `locales\en\skills\...` while its tests asserted forward slashes. Five tests failed on the `windows-latest` matrix leg and 6.3.0 shipped with a red CI run; the gate's file checking was correct on every platform, only its reporting was not. Reported paths are now POSIX everywhere, and a regression test asserts no backslash reaches an error message.

## 6.3.0 - 2026-08-16

### Added

- Response rules, stated once in `contracts/workflows.json` as `responsePolicy` and carried verbatim by every skill: **Simplicity** — one idea per sentence, the plain word over the impressive one. **Brevity** — answer first then stop, no preamble, no restating the request, no summarizing what you just wrote. **Clarity** — lead with the outcome, then what changed and what it costs, and label an unverified claim as unverified. **Humanity** — write as a colleague not a system, familiar technical English over literal translation, no performative enthusiasm, no apology theater, no location stereotypes. Each rule names an observable behavior; four abstract nouns on their own would not have bound anything.
- `npm run verify:response` checks that all 40 runtime skills and all 40 English mirrors carry the block verbatim under `## Response Rules`, that the choice-prompt addendum is verbatim and directly follows the block where it appears, and that the retired heading is gone. Wired into `verify:release`.

### Changed

- `## Thai-first Experience` is now `## Response Rules`. The section no longer covers only Thai; `Reply in the user's language` and the technical-English rule keep the Thai-first intent.
- The block absorbed what it duplicated: colleague tone, familiar technical English, literal translation, location stereotypes, and leading with the outcome. `ask-me` gave up the voice rules the block now states and stayed under its existing word and line budgets without either ceiling moving.

### Fixed

- The shared block was hand-copied and had drifted into three variants across the 40 runtime skills — 46 words in 33, 46 plus the interaction policy in 6, and a 39-word rewording in `start`. 6.2.0 made `start` worse by landing its interaction-policy sentence above the section heading, because `start` lacked the phrase the insertion anchored on. All 40 now carry one text, and the new gate is what keeps them there.
- The English mirror carried the block in 17 of 40 files. `CLAUDE.md` names `locales/en/skills/` a source of truth and requires both locale sources to move together, but nothing read the mirror's content, so that rule was unenforceable. All 40 mirrors now carry the block and the gate covers them.

## 6.2.0 - 2026-08-15

### Changed

- Approval gates now come in two modes, defined in `contracts/workflows.json` as `approvalModes`. `pr`, `task-to-pr`, and `uninstall` use `confirm`: approval is a click on the approving option or a plain affirmative such as `approve` or `เอาเลย`. Only `deploy` keeps `bound_token` and still requires the intent digest. Previously every gate demanded a transcribed 64-character token, so creating a branch and a worktree — local and reversible — was gated as heavily as a production deploy.
- `bound_token` matching is lenient about form and strict about identity: the token may appear anywhere in the message, hex case is ignored, surrounding backticks and quotes are stripped, and a unique prefix of at least 12 hex characters is accepted. The rule that discounted quoted or forwarded tokens is removed — the protection is that the digest must match freshly revalidated state.
- Approval envelopes carry `approval_mode` and `choices` instead of a user-facing `approval_token` in `confirm` mode. `intent_digest` remains as the drift detector.

### Added

- `interactionPolicy` in `contracts/workflows.json`: when a decision or confirmation is needed, use the host's structured choice prompt if one is available, otherwise present a numbered list. Options stay genuinely distinct with exactly one recommended, every label names the real target or outcome rather than reading `Approve`, and a free-form answer stays possible. The rule is capability-phrased, so Claude Code renders buttons while Codex keeps the existing numbered-list behavior. Applied to `ask-me`, `asking`, `start`, `wizard`, `design-options`, `to-questionnaire`, `setup`, and the four gated skills.

### Removed

- Redundant prose found by auditing all 40 skills for restated instructions. `ask-me` dropped a duplicated language rule, a one-question rule stated in three places, a second anti-bureaucratic example, a location-stereotype rule already in the shared block, and a manual-only guardrail that `disable-model-invocation: true` enforces mechanically — 71 words, back under its original budget with the new interaction policy included. `task-to-pr` states the `confirm` rule once under Approval Protocol instead of spelling it out at both gates. `bala` and `to-questionnaire` each dropped a guardrail restated verbatim in their workflow.
- The audit left 5 flagged pairs in place as intentional parallel structure, and treated `wizard`'s and `code-review`'s overlap between their SPK section and their retained `## Upstream Discipline` section as the two-layer design it is, not as duplication.

### Unchanged

- `scripts/install/uninstall.cjs` still performs its full digest round-trip; that exchange runs between the agent and the module, not through a human.
- Secret scanners and the guardrails against `git add .`, force-push without `--force-with-lease`, and staging unapproved paths.

## 6.1.0 - 2026-08-15

### Changed

- Runtime skill prompts are now English to save tokens. Agents reply in the user's language and keep Thai cultural fit: colleague tone, familiar technical English when clearer, no literal translation, and no location stereotypes.
- Converted the remaining thin Thai plugin shells to English and removed duplicated Thai upstream text from `tdd`.

## 6.0.1 - 2026-08-15

### Fixed

- `wait-what`'s description carried an unquoted `: `, which YAML reads as a second key, so the skill's frontmatter did not parse. Claude Code and the skills.sh adapters parse that frontmatter, and an installer reported the warning in the field while every release gate stayed green — `verify-skill-descriptions` matched frontmatter lines with a regular expression and never parsed them as YAML. The description is reworded and all 40 shipped skills now parse.

### Added

- `npm run verify:descriptions` now checks that every skill's frontmatter is parseable. It enforces a rule narrower than YAML — each value is either properly quoted or a plain scalar free of `: `, a trailing `:`, ` #`, and leading indicator characters — which needs no YAML dependency and is exact for the flat key/value frontmatter these skills use.

## 6.0.0 - 2026-08-14

### Breaking Changes

- Removed all 21 compatibility aliases. `skills/compat/` promised support only up to 6.0.0, and this release keeps that promise. Typing a removed name now reports that no such skill exists instead of forwarding. The canonical replacements: `ask-matt`/`spk`/`jumpstart` → `/start`, `setup-matt-pocock-skills` → `/setup`, `review` → `/code-review`, `grill-me` → `/ask-me`, `grilling` → `/asking`, `grill-with-docs` → `/ask-with-docs`, `diagnosing-bugs` → `/debug`, `implement` → `/code`, `design-shotgun` → `/design-options`, `resolving-merge-conflicts` → `/fix-conflicts`, `writing-great-skills`/`writing-for-agents` → `/write-skills`, `prime` → `/load-project`, `query` → `/ask-project`, `ingest` → `/add-knowledge`, `wiki-lint` → `/check-wiki`, `improve-codebase-architecture` → `/improve-codebase`, `scoped-tests` → `/test-changes`, `release-check` → `/check-release`.
- The published roster is now 40 canonical skills with no alias tier.

### Upstream

- Re-pinned the reviewed `mattpocock/skills` source at `84fdeffd12f2ee307994d1eb6feb48173b6e0502`, up from `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`. The only substantive change in range is one sentence in an upstream reference page; no skill behavior changed.

### Fixed

- The retained upstream reference pages under `docs/` were stale. Every page claimed to hold the content of the pinned commit while holding pre-5.1 text, and four pages — `wizard`, `to-questionnaire`, `wait-what`, `writing-for-agents` — were never created when 5.1 added those skills. All 25 pages are now generated from the pin.

### Added

- `npm run sync:upstream-docs` regenerates the reference pages from an upstream checkout and writes `docs/upstream/reference-hashes.json`.
- `npm run verify:upstream` now verifies every reference page body against that index. Re-pinning without regenerating fails the release gate — the exact gap that let 5.1 ship stale mirrors.

### Changed

- The `setup` skill's English title now reads `# Setup Apipoj Skills`, matching the Thai source (`# ตั้งค่า Apipoj Skills`) instead of the old `# Setup Matt Pocock's Skills`.

## 5.2.0 - 2026-08-09

### Added

- `/bala` — apply the five Bala strengths as a practical balance check for engineering plans, changes, incidents, and decisions, then recommend the smallest evidence-producing next action.
- `/sunzi` — apply Sun Tzu as a practical strategy lens for terrain, leverage, sequencing, battles to avoid, and the smallest winning move.
- Add Thai-first `USER_GUIDE.md` and its English mirror with installation, workflow recipes, authority boundaries, troubleshooting, and practical `bala`/`sunzi` examples.

### Changed

- `bala` and `sunzi` now ship in the default Claude Code and Codex bundles as manual, read-only skills instead of optional extras.

## 5.1.1 - 2026-08-07

### Fixed

- Installing the plugin no longer requires configuration. `node_path` was a required `userConfig` option with no default, so a plain `/plugin install spk@spk` left every SessionStart hook failing with `Plugin option "node_path" isn't set`. Hooks and the MCP server now launch `node` from the host lookup, matching what the Codex payload already did. Present since 5.0.0.
- The CI plugin smoke test installed with `--config node_path=...`, so it passed while the documented install path was broken. It now installs exactly as the README instructs.
- `README.md` and `README-EN.md` cited the pre-5.1 upstream commit in their licensing note.

### Changed

- The generated skill tables now carry an invocation column. 40 of 59 skills are typed-only, so an agent asked to "use `/spk:ask-with-docs`" correctly reports it does not exist — it cannot see the skill at all. The published roster now says which skills the agent can reach and which you must type yourself.

## 5.1.0 - 2026-08-07

### Upstream

- Re-pinned the reviewed `mattpocock/skills` source at `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e`, up from `2ab958093e83e0ec752e6c1c5932da465bf23e0c`.

### Added

- `/wizard` — author an interactive bash wizard for the setup steps only a human can perform, then verify it statically and hand it over. Apipoj Skills never runs the generated script.
- `/to-questionnaire` — turn a decision you cannot answer alone into a Markdown questionnaire for the person who can.
- `/wait-what` — re-pitch the last message that did not land, in plain language, using the project's own vocabulary.
- `/writing-for-agents` — compatibility alias disclosing the canonical `/write-skills`.

### Changed

- `/write-skills` now covers writing any document an agent consumes — skills, `AGENTS.md`/`CLAUDE.md`, and docs reached by a pointer — with context-pointer and two-loads guidance in a new `SKILL-MECHANICS.md` reference.
- `/start` replaces the handoff-versus-compact advice with the five-option phase-boundary tree, and raises the smart zone to 150k tokens.
- `/prototype` answers logic and state-model questions with a single shareable HTML file instead of a terminal app.
- `/asking` interviews in rounds over a frontier of settled prerequisites instead of one question at a time.
- `/tdd` points at `codebase-design` when the shape of the interface is itself the open question.

### Fixed

- `session-reflect` tests no longer fail on hosts whose Node is dynamically linked: the harness verifies its relocated copy can execute and falls back to the real binary.

## 5.0.0 - 2026-08-05

### Major Changes

- Fork `mattpocock/skills` at `2ab958093e83e0ec752e6c1c5932da465bf23e0c` as the composable workflow base.
- Rebrand the product to Apipoj Skills while retaining the short `spk` plugin namespace.
- Add a Thai-first `/spk:start` router, native Thai bucketed sources, and an English compatibility mirror.
- Preserve SPK evidence receipts, approval gates, project memory, security hooks, and generated Claude/Codex payloads.
- Ship 35 canonical skills and 20 temporary compatibility aliases; move `bala` and `sunzi` to optional extras.
- Make public commands easier to understand for Thai users: `grill-me` becomes `ask-me`, `diagnosing-bugs` becomes `debug`, `implement` becomes `code`, and 12 more long or specialist names gain short action-led replacements while their old names keep working until v6.

## Upstream history

## 1.1.0

### Minor Changes

- [#406](https://github.com/mattpocock/skills/pull/406) [`930a450`](https://github.com/mattpocock/skills/commit/930a450089f77a49af09001d955db8452a4b867d) Thanks [@mattpocock](https://github.com/mattpocock)! - Bring the **`ask-matt`** router up to date with the full skill set. It now maps five skills it was missing: **`tdd`** (woven into the main flow as the red-green engine `implement` drives), **`diagnosing-bugs`** (a new "Something's broken" on-ramp — there was previously no route for a bug), **`domain-modeling`** and **`codebase-design`** (a new "Vocabulary underneath" section), and **`grilling`** (the shared interview primitive). `prototype` is fleshed out as a standalone and the description broadens from "user-invoked skills" to "the skills". A maintenance rule is added to `CLAUDE.md` so any future skill add/rename/remove or flow change triggers an `ask-matt` re-check, beside the existing docs-page re-sync rule.

- [#464](https://github.com/mattpocock/skills/pull/464) [`639df6e`](https://github.com/mattpocock/skills/commit/639df6e7386dfddc739b2aecdeff37a876f2483b) Thanks [@mattpocock](https://github.com/mattpocock)! - Promote and harden **`code-review`**. The in-progress **`review`** skill is renamed to **`code-review`** and moved from `in-progress/` into `engineering/`: it now ships in the plugin, is listed in the top-level and Engineering READMEs (Model-invoked), and has a docs page at `docs/engineering/code-review.md`. The `/implement` skill and docs point at `/code-review`.

  It also gains an always-on **Fowler smell baseline** on its Standards axis — a curated ~12 high-signal "Bad Smells in Code" (Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest) inlined into `SKILL.md` as a fixed baseline alongside whatever the repo documents, not a new third axis. Two binding rules keep it safe: a documented repo standard overrides the baseline, and every smell is reported as a judgement call, never a hard violation.

- [#464](https://github.com/mattpocock/skills/pull/464) [`639df6e`](https://github.com/mattpocock/skills/commit/639df6e7386dfddc739b2aecdeff37a876f2483b) Thanks [@mattpocock](https://github.com/mattpocock)! - Sharpen **`grilling`** on two fronts.

  **A confirmation gate.** The agent won't enact the plan until you confirm the shared understanding has been reached — turning the skill's existing "shared understanding" completion criterion into an explicit stop-gate. The `description` also recruits the pretrained **`grill`** leading word ("Grill the user relentlessly") to sharpen invocation, and the docs page is re-synced.

  **Facts vs. decisions.** Grilling now splits _facts_ (look them up — explore the codebase) from _decisions_ (put each one to the human and wait for their answer). The old blanket line — "if a question can be answered by exploring the codebase, explore the codebase instead" — was written for the live-human case, but once another skill runs grilling inside a resolve-the-ticket frame it read as license to answer _decisions_ autonomously too. Separating the two keeps a grilling agent from racing ahead and answering its own questions.

- [#463](https://github.com/mattpocock/skills/pull/463) [`af6d692`](https://github.com/mattpocock/skills/commit/af6d6922c3e2b5288eef155346cbe319e4ed3bd0) Thanks [@mattpocock](https://github.com/mattpocock)! - Add two adjacent Steering failure modes to **`writing-great-skills`**, both about how language you think of as "off" still steers the agent. **Negation** — the _elephant_ — is steering by prohibition: naming what _not_ to do drags the forbidden behaviour into context and makes it _more_ available, not less (_don't think of an elephant_), so the cure is to prompt the **positive**. **Negative Space** — the void — is blindness to the steering done by what you leave _out_: every decision a skill declines is delegated to the agent's priors rather than left neutral, so the cure is to read a draft for its silences and decide each omission deliberately (fill it, or leave it open as a real **branch**). Kept as two entries, not one — they carry different diagnostics and different cures — each a full `GLOSSARY.md` entry plus a `SKILL.md` failure-mode bullet, matching how every other failure mode is carried.

- [`850873c`](https://github.com/mattpocock/skills/commit/850873cd73d5f81826ebf512ad35d2b1e113001f) Thanks [@mattpocock](https://github.com/mattpocock)! - Make the **`prototype`** skill model-invoked, so the agent can reach for it autonomously (and other skills can too). Its description is rewritten around the leading word _prototype_ — throwaway code that answers a design question — with one trigger per branch (state/logic sanity-check, or UI exploration).

- [#409](https://github.com/mattpocock/skills/pull/409) [`0d74d01`](https://github.com/mattpocock/skills/commit/0d74d01cbc64ca27778a49b38599f70c534e76a0) Thanks [@mattpocock](https://github.com/mattpocock)! - Add the **`research`** skill — a small, model-invoked skill that spins up a **background agent** to investigate a question against **primary sources** (official docs, source code, specs, first-party APIs), then leaves a single cited Markdown file wherever the repo keeps such notes. It's delegable reading legwork: you keep working while it reads, and get back a document to grill, plan, or design against. Listed in the top-level and Engineering READMEs (Model-invoked), added to `.claude-plugin/plugin.json`, given a docs page at `docs/engineering/research.md`, and routed as a Standalone in `ask-matt`.

- [#469](https://github.com/mattpocock/skills/pull/469) [`a0329ba`](https://github.com/mattpocock/skills/commit/a0329ba95751f58566ed7ab484475917a68f1629) Thanks [@mattpocock](https://github.com/mattpocock)! - Split the **`to-issues`** skill into a lean **Process** and a **Reference** section, and teach it to handle a **wide refactor** — a single mechanical change (like renaming a column) whose **blast radius** fans across the whole codebase, breaking thousands of call sites at once so no vertical slice can land green. The drafting step now points at two co-located reference blocks: the **Vertical slice rules** for ordinary tracer bullets, and **Wide refactors**, which slices the change by **expand–contract** (expand the new form beside the old, migrate call sites in batches sized by blast radius, then contract the old form away) so CI stays green batch to batch — or, when it can't, only at a final integrate-and-verify issue. The issue body template moves into Reference too.

- [#464](https://github.com/mattpocock/skills/pull/464) [`386d4ff`](https://github.com/mattpocock/skills/commit/386d4ff719a7c420ad1454232d0436b01f1b8c17) Thanks [@mattpocock](https://github.com/mattpocock)! - Unify the planning skills. **`to-prd` is renamed to `to-spec`** — "spec" is now the single through-line term (it still opens with "you may know this document as a PRD" for discoverability). **`to-plan` and `to-issues` are merged into one `to-tickets` skill, and `to-issues` is deleted.**

  `to-tickets` breaks a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring its **blocking edges**. That one artifact reads two ways depending on the tracker `/setup-matt-pocock-skills` configured: a **local file** (`tickets.md`) writes the edges as text and you work it top-to-bottom by hand; a **real tracker** writes them as native blocking links, so any ticket whose blockers are done is on the frontier and several agents can run at once. The edges live in the ticket either way — the medium only decides whether anything acts on them in parallel.

  Publishing prefers the tracker's **native sub-issues** for parent → slice and **native blocking edges** for `Blocked by` where the tracker supports them, keeping the `## Parent` / `## Blocked by` body sections as the fallback. The "What to build" template points at where a `/prototype`'s code lives rather than inlining a snippet from it.

  `ask-matt`'s main flow now routes `idea → /to-spec → /to-tickets → /implement`, and there are human-facing docs pages at `docs/engineering/to-spec.md` and `docs/engineering/to-tickets.md`.

- [#464](https://github.com/mattpocock/skills/pull/464) [`0557d57`](https://github.com/mattpocock/skills/commit/0557d57579d9b3d39839fdaf8d4a6542b17539ce) Thanks [@mattpocock](https://github.com/mattpocock)! - Settle wayfinder's place in the docs as a **situational on-ramp**, not the new main entry flow — the grill-led _idea → ship_ chain stays the front door (crowning wayfinder as the default spine is a v2-sized move, not a 1.1). The **`ask-matt`** router now names wayfinder's concrete triggers — a greenfield project or a huge feature build, too big for one session — and the two grill front doors (**`grill-me`**, **`grill-with-docs`**) signpost _up_ to wayfinder for the effort that's too big to hold in one session, so the on-ramp is discoverable from where a reader actually starts.

- [#464](https://github.com/mattpocock/skills/pull/464) [`639df6e`](https://github.com/mattpocock/skills/commit/639df6e7386dfddc739b2aecdeff37a876f2483b) Thanks [@mattpocock](https://github.com/mattpocock)! - Graduate and reframe **`wayfinder`** — the skill for planning a huge chunk of work, more than one agent session can hold. It moves out of `in-progress/` into `engineering/` (plugin entry, top-level + Engineering READMEs under **User-invoked**, a docs page at `docs/engineering/wayfinder.md`, and a route in `ask-matt`), landing as a mature skill. The rename and reframe that got it there:

  - **`decision-mapping` is renamed to `wayfinder`**, invoked as `/wayfinder`. "Decision map" was jargony and inaccurate — only one ticket type is actually a decision. The reframe charts a route through a foggy problem instead, giving one coherent leading-word frame — **fog of war**, **frontier**, **the map** — rather than an invented term layered on top.
  - **Destination as the leading word.** Wayfinding finds the _way_ to a destination; it doesn't charge at building it. Naming the destination is the first act of charting — it fixes the scope and shapes every ticket — so the map gains a `## Destination` field every session orients to, and triage pins it before any ticket exists.
  - **Plan, don't do.** The map produces **decisions, not deliverables**; it's done when nothing is left to decide before someone builds the thing. An effort can override this in its Notes.
  - **The map is an index, not a store.** A decision lives in exactly one place — its ticket — so the map only gists and links, never restates; graduating fog into a ticket clears the graduated patch so nothing lingers in two places.
  - **Collaborative by default.** The map moves off a local Markdown file onto the repo's issue tracker: a single `wayfinder:map` issue whose tickets are its child issues — one shared URL the team can watch. Sessions load the map at low resolution and zoom into tickets on demand. Wayfinder stays tracker-agnostic (GitHub, GitLab, local-markdown) behind a pointer in `docs/agents/issue-tracker.md`, and `setup-matt-pocock-skills` seeds the "Wayfinding operations" section.
  - **Claim by assignment, not a label.** A session claims a ticket by assigning it to the driving dev — the assignee _is_ the claim — freeing the label vocabulary to `wayfinder:<type>` alone.
  - **Native blocking.** Blocking prefers the tracker's native dependency relationship, which renders the frontier visually in the tracker's own UI so the human sees what's takeable without opening the map. GitHub and GitLab templates spell out the native recipe, with a body-convention fallback.
  - **Fog vs. out of scope, split.** Two plainly-named map sections — `## Not yet specified` (in-scope fog that graduates as the frontier advances) and `## Out of scope` (work ruled beyond the destination, closed, never graduating) — so beyond-destination work no longer reads as takeable frontier.
  - **A fourth `task` ticket type.** For literal manual work that blocks a decision (provisioning access, moving data, signing up for a service) — the one type that _does_ rather than decides, earning its place by unblocking a decision.
  - **HITL / AFK ticket classification.** Every ticket type is **HITL** (human in the loop — grilling, prototype) or **AFK** (agent alone — research; task is either). A HITL ticket only resolves through the live exchange, so "wait for the human" falls out of the label — a grilling agent that answers its own questions has, by definition, broken HITL. (This fixes students' reports of `/wayfinder` grilling _itself_ instead of the human.)
  - **No-fog early exit restored.** If the opening breadth-first grilling surfaces no fog, the journey is small enough for one session — so it stops and asks how you'd like to proceed rather than building a map nobody needs.

### Patch Changes

- [#464](https://github.com/mattpocock/skills/pull/464) [`639df6e`](https://github.com/mattpocock/skills/commit/639df6e7386dfddc739b2aecdeff37a876f2483b) Thanks [@mattpocock](https://github.com/mattpocock)! - Reshape **`tdd`** into a reference-only skill and add a missing anti-pattern.

  **Reference-only.** The red → green → refactor loop is anchored by leading words the model already holds, so the step-by-step Workflow was largely restating the loop. Dropped the Workflow and per-cycle checklist; folded their one durable idea — vertical slices / tracer bullets — into the Anti-patterns section and a short Rules-of-the-loop list. Introduced **seam** as the leading word for where tests go: test only at pre-agreed seams, confirmed with the user before any test is written. Also dropped the refactor stage — TDD is now red → green; refactoring belongs to the review stage, so the refactor rule and `refactoring.md` moved out (its home is `code-review`).

  **Tautological tests.** Added the tautological-test anti-pattern: a test whose assertion is recomputed the way the code computes it passes by construction and gives zero confidence — distinct from the implementation-coupling anti-pattern already covered. Added as a peer at the same sites: a Philosophy principle (expected values must come from an independent source of truth), a checklist gate, and a BAD/GOOD example pair in `tests.md`.

- [`e00eadb`](https://github.com/mattpocock/skills/commit/e00eadb4bb32c3d5a631ead1a5ed5d6a7c5f74e2) Thanks [@mattpocock](https://github.com/mattpocock)! - Extend the **`triage`** skill to triage external pull requests, treating a PR as an issue with attached code that runs through the same roles and state machine. PRs flow inline alongside issues (gated by a per-repo setup toggle), discovery surfaces only external PRs, the bug-only "reproduce" step is generalized into a single "verify the claim" step, and a redundancy check resolves already-implemented requests to `wontfix` without polluting the out-of-scope knowledge base. `setup-matt-pocock-skills` gains the PRs-as-a-request-surface toggle for GitHub/GitLab.

- [#472](https://github.com/mattpocock/skills/pull/472) [`d869d45`](https://github.com/mattpocock/skills/commit/d869d45afc32beab1c2d1350f8de5e81589512cd) Thanks [@mattpocock](https://github.com/mattpocock)! - Fix **`wayfinder`** hardcoding the issue-tracker doc path, which broke the indirection the rest of the suite relies on.

  `to-issues`, `to-prd`, and `triage` never name a path — they resolve the tracker through the `### Issue tracker` block that `setup-matt-pocock-skills` writes into `CLAUDE.md` / `AGENTS.md`, which points at the tracker doc wherever it lives. Wayfinder instead pinned the literal `docs/agents/issue-tracker.md`, so in a repo that keeps its agent docs elsewhere it silently fell back to the local-markdown tracker — even one whose `CLAUDE.md` clearly declares GitHub issues. It now resolves the doc via that same pointer and reads its "Wayfinding operations" section by name, keeping the indirection consistent across the suite.

## 1.0.1

### Patch Changes

- [`d20ee26`](https://github.com/mattpocock/skills/commit/d20ee2684e2a9442698ac3c1e0f2c5b68c4cf296) Thanks [@mattpocock](https://github.com/mattpocock)! - Make the **`teach`** skill reuse-first. Lessons are now built from reusable **components** in `./assets/` — stylesheets, quiz widgets, simulators, diagram helpers. Reuse is the default: the agent reads `./assets/` before authoring a lesson, builds from what's there, and extracts anything new and reusable into a component rather than inlining it.

## 1.0.0

### Major Changes

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Add the **`ask-matt`** skill — a user-invoked router that points you at the right skill or flow for your situation.

  **Breaking:** `ask-matt` routes over the other user-invoked skills in this repo, so it expects them to be installed.

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Add the shared design skills and rewire existing skills onto them.

  - New **`codebase-design`** skill — the deep-module vocabulary (module, interface, depth, seam, adapter) and the principles for putting a lot of behaviour behind a small interface. The language that previously lived in `improve-codebase-architecture/LANGUAGE.md` now lives here, generalized for reuse across skills.
  - New **`domain-modeling`** skill — actively build and sharpen a project's domain model, stress-testing terms against the glossary and keeping `CONTEXT.md` and ADRs current.
  - `improve-codebase-architecture` now draws its architecture vocabulary from `/codebase-design` and its domain model from `/domain-modeling`.
  - `tdd` now leans on `/codebase-design` for interface-design guidance — its inline `deep-modules.md` / `interface-design.md` notes were removed in favour of the shared skill.
  - `grill-with-docs` now builds the domain model inline via `/domain-modeling`.

  **Breaking:** these skills now depend on the new `codebase-design` / `domain-modeling` skills, so you must install them too.

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Remove the **`caveman`** and **`zoom-out`** skills.

  - `caveman` was a duplicate of another skill I was testing and was never meant to be public.
  - `zoom-out` went unused in practice, so it's been removed from the repo.

  **Breaking:** both skills have been removed.

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Rename the **`diagnose`** skill to **`diagnosing-bugs`**.

  **Breaking:** invoke it as `/diagnosing-bugs` — the old `/diagnose` name no longer exists.

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Replace **`write-a-skill`** with **`writing-great-skills`**.

  - Removed `write-a-skill`.
  - Added `writing-great-skills` (plus its `GLOSSARY.md`) — a reference for writing and editing skills well: the vocabulary and principles that make a skill predictable, hunting no-ops down to the sentence level.
  - Exposed `grilling` as a model-invoked skill — the reusable interview loop behind `grill-me` and `grill-with-docs`.

  **Breaking:** `write-a-skill` has been removed; use `writing-great-skills` instead.

### Minor Changes

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Add the **`resolving-merge-conflicts`** skill — a loop for resolving an in-progress git merge or rebase conflict. Standalone, with no dependencies on other skills.

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Rename the skill taxonomy from **Commands / Skills** to **User-invoked / Model-invoked** across the docs, and add `docs/invocation.md` defining the split: user-invoked skills are reachable only when you type them and exist to orchestrate; model-invoked skills can also be reached automatically when the task fits. A user-invoked skill may invoke model-invoked skills, but never another user-invoked one.

### Patch Changes

- [`47bde84`](https://github.com/mattpocock/skills/commit/47bde84da032afb2e5058f997f3bbca47d321dbd) Thanks [@mattpocock](https://github.com/mattpocock)! - Tighten the **`review`** skill: fail-fast ref check, single-sourced rules, and no-op cuts.
