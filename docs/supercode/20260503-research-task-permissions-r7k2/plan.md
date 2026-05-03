# Work ID

20260503-research-task-permissions-r7k2

# Goal

Convert Supercode from orchestrator-mediated research handoffs to direct, bounded research delegation by task-owning non-research subagents, while preserving public workflow gates, agent authority boundaries, read/write separation, reviewer independence, and PR-ready verification.

# Source Spec

`/Volumes/storage/workspace/supercode/.worktrees/20260503-research-task-permissions-r7k2/docs/supercode/20260503-research-task-permissions-r7k2/spec.md`

# Architecture / Design Strategy

- Keep Supercode's stage model unchanged: `spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, `finish`.
- Replace the old research model at the permission, skill, agent-prompt, workflow-skill, test, and documentation layers:
  - target non-research subagents get a bounded nested `task` permission map allowing only `explorer` and `librarian`;
  - research agents stay terminal with `task: "deny"`;
  - `orchestrator` remains a primary workflow gatekeeper and is excluded from the target subagent task permission pattern;
  - `src/skills/orchestrator-mediated-research/` is deleted and replaced by `src/skills/research-delegation/SKILL.md`;
  - active prompt references move from `<needs_research>` / orchestrator handoff to direct, bounded `explorer` / `librarian` delegation.
- Treat prompt hardening as a bounded text-policy migration, not a workflow redesign:
  - adapt OMO patterns only where analogous to Supercode roles;
  - preserve Supercode gates and authority over OMO phrasing when they conflict;
  - avoid large copied prompt blocks and generic documentation bloat.
- Make tests prove enforceable repository behavior where possible:
  - default agent permission shape;
  - emitted config permission shape;
  - terminal research-agent delegation denial;
  - old skill removal / new skill presence across registration, export, generated index, fixtures, active docs, and path-based skill inventory surfaces where present;
  - stale prompt references are inventoried early and absent from active prompts and skills by final verification.

# Scope

## In scope

- Update agent default permissions in `src/agents/definitions/*.agent.ts` for the exact target agents named in the spec.
- Keep existing non-task permissions unchanged for each agent.
- Keep `explorer` and `librarian` as terminal research agents with `task: "deny"`.
- Keep `orchestrator` outside the restricted non-research subagent `task` permission pattern.
- Delete `src/skills/orchestrator-mediated-research/SKILL.md` and its containing skill directory.
- Add `src/skills/research-delegation/SKILL.md` with the delegation contract, budgets, stop rules, evidence rules, output expectations, and recursion prohibition.
- Update all relevant `src/agents/prompt-text/*.md` prompts listed in the spec.
- Update all relevant `src/skills/*/SKILL.md` workflow skill prompts that reference the old skill or research handoff model.
- Harden workflow skill prompts as first-class stage prompts for outcome-first contracts, stop rules, handoff/evidence standards, verification scope, conditional product-completeness/anti-AI-slop guidance, fresh-session guidance where relevant, and the `research-delegation` model.
- Update `README.md`; update `README.ko.md` if it contains the built-in skill list or old skill reference.
- Add/update tests under `src/__tests__/` for permissions, skill inventory/documentation expectations, and stale prompt references.
- Run `bun test` and `bun run typecheck`.

## Out of scope

- Redesigning Supercode stages, finish approvals, worktree rules, or the orchestrator role.
- Allowing arbitrary subagent-to-subagent delegation.
- Letting `explorer` or `librarian` call other agents.
- Changing external plugin configuration outside this repository.
- Adding new runtime dependencies unless an existing test framework requires nonequivalent support.
- Rewriting prompts wholesale or copying OMO prompts verbatim.

# Assumptions

- The repository uses Bun and TypeScript; verification commands are `bun test` and `bun run typecheck` from `package.json`.
- Nested permission maps are supported by `src/agents/types.ts` through `AgentPermissionRule = AgentPermissionValue | Record<string, AgentPermissionValue>`.
- Skill availability is path-based under `src/skills/*/SKILL.md`; any active skill list in README files must be kept accurate.
- Current worktree status before planning was clean (`git status --short` produced no output).
- README currently lists `orchestrator-mediated-research` as a built-in skill and therefore must be updated.

# Source Spec Alignment

- Permission target alignment: the plan includes exactly `executor`, `planner`, `plan-checker`, `plan-challenger`, `code-quality-reviewer`, `code-spec-reviewer`, `spec-reviewer`, `completion-verifier`, `final-reviewer`, `systematic-debugger`, and `task-compliance-checker`.
- Exclusion alignment: the plan preserves `explorer`, `librarian`, and `orchestrator` exclusions from the target permission pattern.
- Research model alignment: the plan removes active `<needs_research>` / orchestrator-mediated ordinary research instructions and replaces them with direct bounded `explorer` / `librarian` delegation.
- Prompt-hardening alignment: tasks explicitly cover OMO reference adaptation, anti-AI-slop guardrails, product completeness, fresh reviewer/verifier sessions, concise blocker reporting, retrieval budgets, stop rules, evidence standards, and executor evidence reports.
- Skill-hardening alignment: tasks explicitly cover full skill prompt hardening for `spec`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, `systematic-debugging`, `finish`, `worktree`, `test-driven-development`, and conditional/minimal updates to `todo-sync` and `playwright-cli`.
- Workflow-gate alignment: no task may relax stage gates, read-only reviewer boundaries, executor-only implementation authority, or finish/final-review requirements.

# Execution Policy

- Use test-driven development for behavior covered by tests: write or update failing tests for permission and stale-reference expectations before changing production files that satisfy them.
- Keep each task's changes limited to its listed files unless direct evidence during execution identifies a required adjacent generated/index/documentation file; such additions must be reported with evidence.
- Do not change agent authority beyond the spec's bounded `task` permission change.
- Do not add implementation delegation permissions to any non-research subagent.
- Research-capable prompt language must always include scope, budget, stop condition, and expected output requirements.
- Reviewer/checker/verifier prompts must remain read-only and artifact-focused; fresh-session rules must be expressed as defaults for independent judgments.
- Prompt QA must include exact stale-reference searches and permission assertions before final review.
- Build an early stale-reference inventory/test harness before prompt migration so T4/T5/T6 do not discover reference scope only at the end.
- Prompt hardening must use minimal deltas: update the smallest prompt sections needed to satisfy the spec, preserve existing headings/contracts when still valid, and avoid wholesale rewrites unless a file is already too thin to patch coherently.
- Product-completeness guardrails are conditional: apply them only when a request, spec, plan, task, implementation, or verification target is user-facing/product/UI/UX related.
- OMO adaptations are advisory references only; use them only when they clarify a Supercode role and do not change Supercode authority, workflow gates, or output contracts.
- Execution batching:
  - T0 must run first to inventory old-skill references and establish the prompt/skill reference test harness.
  - T1 must precede permission implementation.
  - T2 and T3 may run after T0/T1.
  - T4 should run after T0 and T3 because prompts must use the new skill contract and known reference inventory.
  - T5 runs after T0/T3 and should coordinate with T4 because workflow skill references must align with agent prompt wording.
  - T5A runs after T5 and coordinates with T4 because full skill prompt hardening must preserve the same authority, fresh-session, product-completeness, and research-delegation language used by agent prompts.
  - T6 runs after T0/T3/T5/T5A because README skill lists and public wording must reflect final skill inventory and no broker wording.
  - T7 runs after code/prompt/docs tasks.

# File Structure

```text
src/
  agents/
    definitions/
      code-quality-reviewer.agent.ts
      code-spec-reviewer.agent.ts
      completion-verifier.agent.ts
      executor.agent.ts
      explorer.agent.ts
      final-reviewer.agent.ts
      librarian.agent.ts
      orchestrator.agent.ts
      plan-challenger.agent.ts
      plan-checker.agent.ts
      planner.agent.ts
      spec-reviewer.agent.ts
      systematic-debugger.agent.ts
      task-compliance-checker.agent.ts
    prompt-text/
      code-quality-reviewer-prompt.md
      code-spec-reviewer-prompt.md
      completion-verifier-prompt.md
      executor-prompt.md
      explorer-prompt.md
      final-reviewer-prompt.md
      librarian-prompt.md
      orchestrator-prompt.md
      plan-challenger-prompt.md
      plan-checker-prompt.md
      planner-prompt.md
      spec-reviewer-prompt.md
      systematic-debugger-prompt.md
      task-compliance-checker-prompt.md
    types.ts
  skills/
    research-delegation/SKILL.md
    orchestrator-mediated-research/       # delete
    execute/SKILL.md
    final-review/SKILL.md
    finish/SKILL.md
    plan/SKILL.md
    playwright-cli/SKILL.md
    pre-execute-alignment/SKILL.md
    spec/SKILL.md
    systematic-debugging/SKILL.md
    test-driven-development/SKILL.md
    todo-sync/SKILL.md
    worktree/SKILL.md
  __tests__/
    builtin-agents.test.ts
    config-handler-agent.test.ts
    config-handler-skills.test.ts
    skill-path-registration.test.ts
    skill-inventory.test.ts                  # create only if needed for skill directory/export/index/fixture checks
    prompt-research-delegation.test.ts    # create if no existing prompt-reference test fits
README.md
README.ko.md                             # update only if it references built-in skills or old skill name
```

# File Responsibilities

- `src/agents/definitions/*.agent.ts`: built-in agent default permission policy and immutable role registration metadata.
- `src/agents/types.ts`: existing nested permission-map type support; only modify if typecheck proves the current type is insufficient.
- `src/agents/prompt-text/*.md`: role-specific authority, research-delegation, prompt-hardening, product-completeness, OMO adaptation, fresh-session, and output-contract instructions.
- `src/skills/research-delegation/SKILL.md`: shared bounded research delegation contract for non-research subagents.
- `src/skills/*/SKILL.md`: stage workflow instructions; must reference `research-delegation` where research guidance is needed and preserve public workflow gates.
- `src/skills/spec/SKILL.md`, `src/skills/plan/SKILL.md`, `src/skills/pre-execute-alignment/SKILL.md`, `src/skills/execute/SKILL.md`, `src/skills/final-review/SKILL.md`, `src/skills/systematic-debugging/SKILL.md`, `src/skills/finish/SKILL.md`, `src/skills/worktree/SKILL.md`, `src/skills/test-driven-development/SKILL.md`: required full skill-hardening targets.
- `src/skills/todo-sync/SKILL.md`, `src/skills/playwright-cli/SKILL.md`: conditional skill-hardening targets; update only if stale references, unclear stop/completion rules, or product/UI verification wording needs bounded clarification.
- `src/__tests__/builtin-agents.test.ts`: direct built-in definition permission assertions.
- `src/__tests__/config-handler-agent.test.ts`: emitted OpenCode config permission assertions.
- `src/__tests__/config-handler-skills.test.ts` / `src/__tests__/skill-path-registration.test.ts`: skill path behavior if changed or if an inventory assertion is added near existing skill registration tests.
- `src/__tests__/skill-inventory.test.ts`: optional focused filesystem/content regression test proving old skill deletion and new skill presence across registration/export/generated index/fixtures/docs surfaces discovered by T0.
- `src/__tests__/prompt-research-delegation.test.ts`: early prompt/skill content regression harness for stale references, new reference expectations, fresh-session rules, product-completeness conditionals, and no-recursive-delegation wording if no existing test file is a better fit.
- `README.md` / `README.ko.md`: public built-in skill inventory and examples.

# Task Sections

## T0 — Inventory stale references and create reference QA harness

- **Task id:** T0
- **Task name:** Establish migration reference inventory
- **Purpose:** Identify every active old-skill reference and create an early regression harness before prompt/skill/doc migration begins.
- **Files to create / modify / test:**
  - Create or modify `src/__tests__/prompt-research-delegation.test.ts`
  - Create `src/__tests__/skill-inventory.test.ts` only if discovered skill registration/export/generated index/fixture behavior needs a separate focused test
  - Read-only inventory targets: `src/agents/prompt-text`, `src/skills`, `src/__tests__`, `README.md`, `README.ko.md`, and any exact registration/export/index/fixture paths discovered by content search
- **Concrete steps:**
  1. Search the repository for `orchestrator-mediated-research`, `<needs_research>`, `research-delegation`, and skill inventory/list patterns before editing prompts.
  2. Inventory active stale broker behavior broadly, including the old skill name, XML handoff wording, and paraphrases where the orchestrator routes, mediates, brokers, or returns ordinary subagent research evidence. Distinguish only explicit historical migration notes, if retained, from active instructions.
  3. Record the discovered active-reference categories in test names or test comments: agent prompts, workflow skills, README docs, tests/fixtures, generated or static indexes, package exports, and registration code if present.
  4. Add an early content test that initially fails for known stale active references and passes only after T3/T4/T5/T6 complete.
  5. Add a skill inventory test if any registration/export/generated index/fixture file names the old skill directly; assert the old skill is absent and `research-delegation` is present after migration.
  6. Keep the harness path-based and deterministic; do not rely on broad shell-only checks as the only final evidence.
- **Explicit QA / verification:**
  - Run the new/updated reference tests before migration and confirm failures correspond to inventoried stale references, not unrelated test errors.
  - Confirm the inventory explicitly covers registration/export/generated index/fixture/active docs surfaces, even if some categories are “none found.”
  - Confirm broad stale broker behavior inventory covers old skill name, XML handoff, and orchestrator-routing paraphrases, while allowing only explicit historical migration notes if justified.
- **Expected result:** Executors know the full stale-reference surface before prompt migration, and final cleanup is enforced by tests rather than only late manual search.
- **Dependency notes:** Must run before T3/T4/T5/T6.
- **Parallel eligibility:** Not parallel with prompt/skill/doc migration; can run in parallel with T1 if separate test files are edited.

## T1 — Add permission-policy regression tests

- **Task id:** T1
- **Task name:** Add bounded task permission tests
- **Purpose:** Establish focused failing tests for the new default and emitted task permission policy before changing agent definitions, without over-specifying unrelated permissions.
- **Files to create / modify / test:**
  - Modify `src/__tests__/builtin-agents.test.ts`
  - Modify `src/__tests__/config-handler-agent.test.ts`
  - Test with targeted `bun test src/__tests__/builtin-agents.test.ts src/__tests__/config-handler-agent.test.ts`
- **Concrete steps:**
  1. In `builtin-agents.test.ts`, add a target-agent list containing exactly: `executor`, `planner`, `plan-checker`, `plan-challenger`, `code-quality-reviewer`, `code-spec-reviewer`, `spec-reviewer`, `completion-verifier`, `final-reviewer`, `systematic-debugger`, `task-compliance-checker`.
  2. Assert each target agent has `defaults.permission.task` exactly equal to `{ "*": "deny", explorer: "allow", librarian: "allow" }`.
  3. For agents with existing non-task permissions, compare the pre-change intended non-task keys through focused `toMatchObject` assertions or object comparison that omits `task`; do not add a new global assertion about `bash` absence unless an existing test already owns that behavior.
  4. Assert `explorer.defaults.permission.task === "deny"` and `librarian.defaults.permission.task === "deny"`.
  5. Assert `orchestrator.defaults.permission` does not receive the target nested `task` pattern.
  6. In `config-handler-agent.test.ts`, update the remaining-agent permission emission test to expect the same nested `task` map for target non-research subagents instead of `task: "deny"`.
  7. Keep existing explorer/librarian emitted permission expectations at `task: "deny"`.
- **Explicit QA / verification:**
  - Run targeted tests before implementation and confirm they fail only because target agents do not yet have the expected nested task map.
  - After T2, rerun targeted tests and confirm they pass.
  - Verify tests do not fail due to unrelated non-task permission assumptions; non-task preservation checks must be narrow and intentional.
- **Expected result:** Tests encode the exact bounded `task` permission contract and protect excluded agents.
- **Dependency notes:** No dependency on production changes; must run before T2. Can run after or in parallel with T0 if files do not overlap.
- **Parallel eligibility:** Not parallel with T2; may run in parallel with T3 test drafting only if separate files are used and failures are expected.

## T2 — Implement bounded task permissions in agent definitions

- **Task id:** T2
- **Task name:** Update target agent permissions
- **Purpose:** Apply the spec's exact default `task` permission policy while preserving all existing non-task permissions.
- **Files to create / modify / test:**
  - Modify target definitions:
    - `src/agents/definitions/executor.agent.ts`
    - `src/agents/definitions/planner.agent.ts`
    - `src/agents/definitions/plan-checker.agent.ts`
    - `src/agents/definitions/plan-challenger.agent.ts`
    - `src/agents/definitions/code-quality-reviewer.agent.ts`
    - `src/agents/definitions/code-spec-reviewer.agent.ts`
    - `src/agents/definitions/spec-reviewer.agent.ts`
    - `src/agents/definitions/completion-verifier.agent.ts`
    - `src/agents/definitions/final-reviewer.agent.ts`
    - `src/agents/definitions/systematic-debugger.agent.ts`
    - `src/agents/definitions/task-compliance-checker.agent.ts`
  - Do not modify permission policy in `src/agents/definitions/explorer.agent.ts`, `src/agents/definitions/librarian.agent.ts`, or `src/agents/definitions/orchestrator.agent.ts` except if comments/descriptions need non-authority wording from later tasks.
  - Test with targeted agent tests from T1.
- **Concrete steps:**
  1. For each target non-research subagent, add or replace only the `permission.task` entry with:
     ```ts
     task: {
       "*": "deny",
       explorer: "allow",
       librarian: "allow",
     }
     ```
  2. Preserve existing permissions such as `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `todowrite` exactly as currently intended.
  3. For agents that currently lack a `permission` object or lack `task`, add the minimum permission entry without removing existing defaults such as `temperature` or `color`.
  4. Do not intentionally change unrelated non-task permissions; if formatting or object ordering changes, verify semantic equality through tests or review.
  5. Do not change `AgentPermission` typing unless `bun run typecheck` shows the existing nested-map type is insufficient.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/builtin-agents.test.ts src/__tests__/config-handler-agent.test.ts`.
  - Confirm target agents emit the nested `task` map and excluded agents do not.
  - Confirm non-task permissions for modified agents are preserved by the focused T1 comparison or by explicit diff review when no test fixture is practical.
- **Expected result:** Built-in definitions and emitted config enforce bounded research delegation permissions for target subagents only.
- **Dependency notes:** Depends on T1.
- **Parallel eligibility:** Can run in parallel with T3 after T1 exists, but avoid simultaneous edits to shared tests.

## T3 — Replace old research skill with `research-delegation`

- **Task id:** T3
- **Task name:** Delete old research handoff skill and add replacement skill
- **Purpose:** Remove the obsolete orchestrator-mediated research skill from active skill inventory and create the new bounded delegation skill.
- **Files to create / modify / test:**
  - Delete `src/skills/orchestrator-mediated-research/SKILL.md`
  - Delete empty directory `src/skills/orchestrator-mediated-research/`
  - Create `src/skills/research-delegation/SKILL.md`
  - Add/modify skill inventory tests if T0 discovers registration/export/generated index/fixture/docs references; likely create or update `src/__tests__/skill-inventory.test.ts`, `src/__tests__/prompt-research-delegation.test.ts`, or nearby skill test.
- **Concrete steps:**
  1. Create `research-delegation` skill with these required sections: Purpose, When to Use, Research Agents, Delegation Contract, Budget Rules, Stop Rules, Evidence Rules, Output Expectations, Recursive Delegation Prohibition, Agent-Specific Use Notes, Completion Criteria.
  2. Include `explorer` guidance for repository structure, implementation tracing, call sites, tests, internal docs, conventions, and impact radius.
  3. Include `librarian` guidance for official docs, OSS examples, API behavior, version-specific behavior, best practices, and external references.
  4. Require internal research first when both internal and external evidence are needed unless external API behavior is the blocker.
  5. Include delegation prompt contract fields: TASK, QUESTION, WHY NEEDED, SCOPE, REQUIRED SOURCES, BUDGET, STOP CONDITION, EXPECTED OUTPUT.
  6. Include budget rules: start with one focused call, parallelize only independent questions, do not ask duplicates, stop after two unproductive rounds, stop when evidence is sufficient.
  7. Include evidence standards: absolute internal paths, official docs or stable permalinks for external evidence, confirmed facts separated from inference, unchecked scope and unresolved uncertainty reported.
  8. Explicitly state `explorer` and `librarian` must not call other agents.
  9. Delete the old skill file/directory.
  10. Update every direct old-skill registration/export/generated index/fixture reference discovered by T0; if no such files exist, leave an explicit note in the execution report that T0 found none.
  11. Add or update tests asserting:
      - old skill path does not exist;
      - new skill path exists;
      - no active registration/export/generated index/fixture still names `orchestrator-mediated-research`;
      - active inventory surfaces include `research-delegation` where they enumerate built-in skills.
- **Explicit QA / verification:**
  - Confirm `src/skills/research-delegation/SKILL.md` exists.
  - Confirm `src/skills/orchestrator-mediated-research/SKILL.md` no longer exists.
  - Confirm T0-discovered registration/export/generated index/fixture/docs references are updated or proven absent by tests.
  - Run the relevant skill/prompt test added or updated for this task.
- **Expected result:** The active skill tree contains `research-delegation` and no longer contains `orchestrator-mediated-research`.
- **Dependency notes:** Depends on T0 inventory; can run after or alongside T1 if test files do not conflict. T4/T5 should reference this new skill after it exists.
- **Parallel eligibility:** Can run in parallel with T2; not parallel with T5 if editing skill reference tests concurrently.

## T4 — Update and harden agent prompts

- **Task id:** T4
- **Task name:** Migrate agent prompts to direct bounded research and prompt-quality guardrails
- **Purpose:** Teach each relevant agent its new research-delegation behavior while strengthening outcomes, evidence standards, product completeness, fresh-session expectations, and concise output contracts.
- **Files to create / modify / test:**
  - Modify all files under `src/agents/prompt-text/` listed in File Structure.
  - Test with `src/__tests__/prompt-research-delegation.test.ts` from T0 and full test suite later.
- **Concrete steps:**
  1. For `orchestrator-prompt.md`:
     - preserve workflow gatekeeper role and public stage gates;
     - remove default research-broker instructions for ordinary subagent research;
     - explain that non-research subagents directly use `research-delegation` within their bounded `task` permissions;
     - keep user-facing question/approval and finish/final-review responsibilities intact.
  2. For target non-research prompts, replace normal `<needs_research>` / orchestrator handoff instructions with direct `research-delegation` usage, including scope, budget, stop condition, expected output, research used, checked sources/paths, not checked, and unresolved uncertainty.
  3. For `executor-prompt.md`:
     - preserve TDD, AST/LSP-aware editing, todo-sync, scoped code changes, and executor-only implementation authority;
     - clarify that research delegation is only for assigned-task evidence and only to `explorer` / `librarian`;
     - make the completion report an evidence artifact with changed files, tests run, research used, unchecked scope, and known risks.
  4. For `planner-prompt.md` and `plan-checker-prompt.md`:
     - add bounded research for file targets/tests/conventions when needed;
     - strengthen executable verification requirements;
     - add product-complete planning/checking only when work is user-facing/product/UI/UX related;
     - warn against vague manual checks and scope inflation.
  5. For `plan-challenger-prompt.md`, add the Momus-style “blocker-finder, not perfectionist” posture, bounded risk research, and max major-risk reporting.
  6. For reviewer/checker/verifier prompts (`spec-reviewer`, `code-spec-reviewer`, `code-quality-reviewer`, `completion-verifier`, `final-reviewer`, `task-compliance-checker`):
     - preserve read-only artifact-focused authority;
     - add bounded research only for missing judgment evidence;
     - add concise blocker limits and unchecked-scope reporting;
     - add fresh-session defaults for independent judgments;
     - treat unsupported claims as incomplete where evidence is required.
  7. For `systematic-debugger-prompt.md`, add active bounded research delegation for root-cause tracing with evidence confidence and routing expectations; preserve debugger continuity where useful.
  8. For `explorer-prompt.md`:
     - state it is a terminal internal research agent and must not call other agents;
     - add retrieval budget, stop rules, absolute-path evidence format, concise result limits, confirmed/inferred separation, and unchecked-scope reporting.
  9. For `librarian-prompt.md`:
     - state it is a terminal external research agent and must not call other agents;
     - add clearer phase boundaries, request-type budgets, stop rules, citation/permalink standards, sufficient-evidence criteria, and concise result limits.
  10. Apply OMO reference adaptations explicitly but concisely and only when they clarify an existing Supercode responsibility:
      - Sisyphus/Atlas 6-section delegation where it reduces ambiguity without changing allowed agents/tools;
      - Metis intent classification and anti-AI-slop checks without adding a new stage;
      - Momus blocker-finder review posture without weakening PASS/FAIL or READY/BLOCKED gates;
      - Explore/Librarian bounded evidence reporting without enabling recursive delegation;
      - Oracle concise output limits without hiding required evidence;
      - Hephaestus explore-plan-execute-verify discipline without replacing TDD, AST/LSP, or executor-only write authority;
      - task continuity rules allowing executor/debugger continuity while reviewer/verifier/checker/final-review sessions are fresh by default.
  11. Add product-completeness guardrails conditionally for user-facing/product/UI/UX work: existing UI patterns, integration, relevant states, accessibility, responsiveness, and user-flow verification where applicable; do not apply these requirements to purely internal, CLI, config, prompt-only, or test-only work unless the spec/task makes them product-facing.
  12. Use the per-prompt checklist below and keep edits minimal-delta: update the relevant sections, preserve existing role authority language, and avoid wholesale rewrites unless a prompt is too thin to meet the checklist safely.
- **Per-prompt checklist:**
  - `orchestrator-prompt.md`: gates preserved; ordinary research broker wording removed; direct research-delegation supervision described; question/finish approvals unchanged.
  - `executor-prompt.md`: TDD/AST/LSP/todo-sync preserved; only `explorer`/`librarian` research delegation allowed; no implementation delegation; evidence completion report required.
  - `planner-prompt.md`: bounded research for file/test/convention uncertainty; executable QA planning; conditional product-completeness planning; anti-scope-inflation.
  - `plan-checker-prompt.md`: bounded validation research; blocker-focused output; conditional product-facing completeness blocker check; no scope invention.
  - `plan-challenger-prompt.md`: blocker-finder not perfectionist; max major risks; bounded hidden-risk research; no open-ended redesign.
  - `spec-reviewer-prompt.md`: bounded planning-readiness research only; conditional product-complete outcome check; concise PASS/FAIL evidence.
  - `code-spec-reviewer-prompt.md`: bounded compliance research only; spec/plan/task focus; concise blockers and unchecked scope.
  - `code-quality-reviewer-prompt.md`: bounded changed-file/context research; quality defects only; conditional placeholder/bare UI issue for user-facing work.
  - `completion-verifier-prompt.md`: fresh evidence gathering; supported/unsupported/inconclusive distinction; unchecked scope.
  - `final-reviewer-prompt.md`: strict final PASS/FAIL; bounded missing-evidence research only; no implementation/planning redo.
  - `systematic-debugger-prompt.md`: active root-cause research; confidence/evidence reporting; debugger continuity allowed for same failure.
  - `task-compliance-checker-prompt.md`: bounded task-reference verification; READY/BLOCKED concise output; executable QA expectations.
  - `explorer-prompt.md`: terminal internal research agent; no agent calls; retrieval budget; absolute paths; stop rules; concise evidence.
  - `librarian-prompt.md`: terminal external research agent; no agent calls; phase/request budgets; official docs/permalinks; stop rules; concise evidence.
- **Explicit QA / verification:**
  - Run stale-reference search from T7 and ensure active agent prompts do not instruct ordinary research via `orchestrator-mediated-research` or `<needs_research>`.
  - Run new-reference verification from T7 and ensure target non-research prompts reference `research-delegation`, `explorer`, and/or `librarian` as appropriate.
  - For each prompt in the checklist, record checklist pass/fail in the executor completion report.
  - Manually inspect prompt diffs for minimal-delta behavior and authority preservation: reviewers remain read-only; executor remains only implementation writer; orchestrator remains gatekeeper; no OMO adaptation changes gates, permissions, or output contracts.
- **Expected result:** Agent prompts are aligned to direct bounded research, strengthened prompt-quality rules, product completeness, and fresh independent review without changing Supercode's authority model.
- **Dependency notes:** Depends on T0 and T3 for the reference inventory, new skill name, and contract; coordinate with T5 to avoid contradictory workflow wording.
- **Parallel eligibility:** Not parallel with T5 for files that share research instructions; can be split by prompt file groups if executor coordinates final stale-reference QA.

## T5 — Update workflow skill prompts and preserve gates

- **Task id:** T5
- **Task name:** Migrate workflow skills to research-delegation model
- **Purpose:** Remove old research-reference behavior from workflow skills and switch necessary research guidance to `research-delegation` without performing the full skill prompt hardening owned by T5A.
- **Files to create / modify / test:**
  - Modify relevant `src/skills/*/SKILL.md`, especially:
    - `src/skills/spec/SKILL.md`
    - `src/skills/plan/SKILL.md`
    - `src/skills/pre-execute-alignment/SKILL.md`
    - `src/skills/execute/SKILL.md`
    - `src/skills/final-review/SKILL.md`
    - `src/skills/finish/SKILL.md`
    - `src/skills/systematic-debugging/SKILL.md`
    - `src/skills/worktree/SKILL.md` if it references research handoff or skill lists
    - `src/skills/todo-sync/SKILL.md` only if stale references or role-boundary wording exists
    - `src/skills/test-driven-development/SKILL.md` only if stale references or evidence wording exists
    - `src/skills/playwright-cli/SKILL.md` only if stale references exist
  - Do not modify `src/skills/research-delegation/SKILL.md` except to keep cross-references coherent.
  - Test with stale-reference verification focused on old broker behavior migration.
- **Concrete steps:**
  1. Replace references instructing subagents to use `orchestrator-mediated-research` with `research-delegation` where research guidance remains needed.
  2. Remove active stale broker behavior: old skill name, `<needs_research>` as the normal broad-research path, and paraphrases where the orchestrator routes/mediates ordinary subagent research evidence.
  3. Preserve only explicit historical migration notes if they are clearly labeled as non-active history and do not advertise the old skill as available.
  4. Add the minimum replacement wording needed for direct bounded `explorer`/`librarian` research delegation; defer outcome-first contracts, stop-rule expansion, evidence/handoff standards, fresh-session elaboration, and product-completeness hardening to T5A unless needed to make the research migration coherent.
  5. Preserve the orchestrator's stage-gate sequence and approval boundaries in all workflow skills.
- **Explicit QA / verification:**
  - Run stale-reference search from T7 across `src/skills` and confirm no active skill uses `orchestrator-mediated-research` as an available skill.
  - Confirm no active workflow skill contains broad stale broker behavior: XML handoff as the normal path or paraphrases where the orchestrator routes/mediates ordinary subagent research.
  - Confirm any retained historical migration note is explicitly non-active and does not instruct agents to use the old model.
  - Confirm all public gates (`spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, `finish`) remain named and ordered in workflow instructions.
  - Confirm no workflow skill grants implementation authority to reviewers/checkers/verifiers/research agents.
  - Confirm T5 does not introduce full prompt-hardening edits that conflict with the T5A checklist.
- **Expected result:** Workflow skills no longer contain active old broker research behavior and reference the new research-delegation model where research guidance is needed, while full skill prompt hardening remains cleanly scoped to T5A.
- **Dependency notes:** Depends on T0 and T3; should be coordinated with T4.
- **Parallel eligibility:** Can be split by skill file after T3, but final stale-reference QA must run after all edits.

## T5A — Fully harden workflow skill prompts

- **Task id:** T5A
- **Task name:** Apply full skill prompt hardening
- **Purpose:** Harden skill documents as first-class workflow prompts so each existing stage has clear outcome-first contracts, stop rules, evidence/handoff standards, verification scope, conditional anti-AI-slop/product-completeness guidance, fresh-session guidance where relevant, and direct bounded `research-delegation` language without redesigning the workflow.
- **Files to create / modify / test:**
  - Modify required targets:
    - `src/skills/spec/SKILL.md`
    - `src/skills/plan/SKILL.md`
    - `src/skills/pre-execute-alignment/SKILL.md`
    - `src/skills/execute/SKILL.md`
    - `src/skills/final-review/SKILL.md`
    - `src/skills/systematic-debugging/SKILL.md`
    - `src/skills/finish/SKILL.md`
    - `src/skills/worktree/SKILL.md`
    - `src/skills/test-driven-development/SKILL.md`
  - Modify conditional targets only if needed by stale-reference inventory or bounded clarification:
    - `src/skills/todo-sync/SKILL.md`
    - `src/skills/playwright-cli/SKILL.md`
  - Update `src/__tests__/prompt-research-delegation.test.ts` or `src/__tests__/skill-inventory.test.ts` if needed for skill-prompt QA assertions.
- **Concrete steps:**
  1. Apply minimal-delta edits only; preserve existing stage names, public gates, approval points, file artifact paths, role boundaries, and output formats unless the spec requires clarification. Do not repeat T5's old-reference migration except to verify or lightly align already-migrated wording.
  2. For `src/skills/spec/SKILL.md`:
     - add/strengthen outcome-first planning-readiness contract;
     - clarify stop rules for clarification and research loops;
     - add conditional product-facing clarification trigger and anti-literal-request guidance;
     - preserve one-question-at-a-time clarification, spec artifact path, spec-reviewer gate, and no implementation.
  3. For `src/skills/plan/SKILL.md`:
     - strengthen executable QA planning and plan handoff contract;
     - add anti-AI-slop planning guardrails and conditional user-facing product-completeness planning;
     - clarify planning research/revision loop stop rules;
     - preserve planner/checker/challenger split, plan-checker approval gate, and no implementation.
  4. For `src/skills/pre-execute-alignment/SKILL.md`:
     - add outcome-first alignment package definition;
     - make task-readiness, verification-lock, and conservative parallelism stop rules explicit;
     - require fresh checker expectations where independent readiness judgment is needed;
     - preserve no implementation and route-back-to-plan behavior when blocked.
  5. For `src/skills/execute/SKILL.md`:
     - define executor completion report as official evidence artifact;
     - add direct bounded `research-delegation` rules for assigned-task evidence;
     - add conditional product-completeness execution guardrail;
     - clarify final execution gate and failure/debug stop conditions;
     - preserve executor-only write authority, TDD, AST/LSP checks, task-level spec review, quality review, and verification loop.
  6. For `src/skills/final-review/SKILL.md`:
     - add fresh verifier/reviewer session requirements;
     - state that passing tests alone is not enough for PASS;
     - strengthen evidence completeness criteria and concise PASS/FAIL record contract;
     - add conditional product-facing final review checks;
     - preserve binary final verdict, saved `final-review.md`, no code modification, and finish only after PASS.
  7. For `src/skills/systematic-debugging/SKILL.md`:
     - add root-cause confidence/evidence standard;
     - define stop rules for investigation and when to route back;
     - add direct bounded `research-delegation` for tracing;
     - preserve debugger read-only/no-fix authority and routing back to the appropriate stage.
  8. For `src/skills/finish/SKILL.md`:
     - only clarify final test scope, PR/merge preconditions, and concise final-state reporting contract;
     - preserve exactly four finish options and do not add, remove, rename, merge, reorder materially, or change the meaning of options;
     - preserve discard confirmation semantics exactly, including typed discard confirmation, no auto-discard, no auto-merge/PR, and existing worktree cleanup rules.
  9. For `src/skills/worktree/SKILL.md`:
     - clarify baseline verification evidence, degraded-baseline acceptance wording, and setup stop conditions;
     - preserve `.worktrees/<work_id>/` convention, ignore safety, and baseline-before-planning requirement.
  10. For `src/skills/test-driven-development/SKILL.md`:
      - sharpen RED/GREEN evidence expectations;
      - add anti-test-slop guidance;
      - add `research-delegation` wording only when test discovery requires repository or external evidence;
      - preserve “no production code before a failing test” for behavior-changing work.
  11. For `src/skills/todo-sync/SKILL.md`, update only if needed to clarify terminal completion, stale todo prevention, or stale old-research references; preserve its simple synchronization role.
  12. For `src/skills/playwright-cli/SKILL.md`, update only if useful for UI/product verification wording or stale old-research references; preserve browser automation scope and safety.
  13. Across all changed skill prompts:
      - include outcome/completion gate near the top;
      - state when to stop, when to route backward, and what evidence is required before proceeding;
      - include handoff/output expectations for the next stage or caller;
      - use `research-delegation` for bounded direct `explorer`/`librarian` research and do not reintroduce orchestrator research-broker wording;
      - keep product-completeness guidance strictly conditional on user-facing/product/UI/UX work and not applicable to internal/prompt/config-only workflows unless the approved spec/task explicitly scopes a product-facing outcome;
      - keep anti-AI-slop guidance focused on scope-risk contexts such as unnecessary dependencies, premature abstraction, documentation bloat, or literal-only user-facing outputs;
      - keep OMO adaptation disciplined and Supercode-specific.
- **Explicit QA / verification:**
  - Run stale old-research reference QA across all `src/skills/*/SKILL.md`; no active skill may instruct ordinary research through `orchestrator-mediated-research`, `<needs_research>`, or any paraphrase where the orchestrator routes, mediates, brokers, or returns ordinary subagent research evidence. Only explicit historical migration notes may remain if clearly non-active.
  - Perform a semantic diff audit mapped to the spec's full skill prompt hardening target table: for each required skill target, record whether the diff adds the required improvements and preserves the listed invariants; for conditional targets, record “updated” or “not needed” with the reason.
  - Verify public gate order remains exactly: `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`; no new public stages are introduced.
  - Verify `finish/SKILL.md` still exposes exactly four finish options, no additional final branch outcomes, and unchanged discard confirmation semantics.
  - Verify `execute/SKILL.md` preserves executor-only write authority and does not grant implementation authority to reviewers, verifiers, research agents, or the orchestrator.
  - Verify reviewer/checker/verifier/final-review skill handoffs preserve read-only artifact judgment and fresh-session expectations where relevant.
  - Verify product-completeness language is strictly conditional, not a universal requirement for internal/prompt/config/test-only work unless explicitly scoped as product-facing.
  - Verify no changed skill describes the orchestrator as the ordinary research broker.
  - Verify each changed skill has a concrete outcome/completion gate, stop/route-back rules, evidence requirements, and handoff/output contract.
- **Expected result:** Workflow skill prompts are hardened consistently with the newly approved full skill scope while preserving existing Supercode stages, gates, authority boundaries, finish semantics, and direct bounded research model.
- **Dependency notes:** Depends on T0, T3, and T5; coordinate with T4 so skill and agent prompt authority/research/fresh-session/product-completeness wording remains consistent.
- **Parallel eligibility:** Can be split by independent skill files after T5, but final skill-prompt QA must run after all skill hardening edits; not parallel with T7 final verification.

## T6 — Update public docs and skill inventory references

- **Task id:** T6
- **Task name:** Update README skill lists and examples
- **Purpose:** Keep public documentation consistent with the active skill inventory and new research model.
- **Files to create / modify / test:**
  - Modify `README.md`
  - Modify `README.ko.md` only if it references `orchestrator-mediated-research`, built-in skills, or research-broker descriptions
  - Test through stale-reference search and docs-specific grep checks.
- **Concrete steps:**
  1. In `README.md`, replace `orchestrator-mediated-research` in the Built-in Skills list with `research-delegation`.
  2. Update any README description that says the orchestrator “manages research routing” or similar default research-broker wording; preserve orchestrator gatekeeping language.
  3. Check `README.ko.md` for the old skill name and equivalent built-in skill list; update if present.
  4. Do not add broad new documentation beyond the inventory and short behavior correction needed for accuracy.
- **Explicit QA / verification:**
  - Search README files for `orchestrator-mediated-research`; any remaining occurrence must be justified as a migration note, otherwise remove it.
  - Search README files for `research-delegation` and confirm built-in skill inventory includes it.
- **Expected result:** Public docs no longer advertise the deleted skill and accurately describe direct research delegation without implying ordinary orchestrator research brokering.
- **Dependency notes:** Depends on T3; may run after T5/T5A for final wording consistency.
- **Parallel eligibility:** Can run in parallel with T7 assertion tightening after T3, but final stale-reference QA must include docs.

## T7 — Complete reference QA and run repository verification

- **Task id:** T7
- **Task name:** Complete stale-reference QA and final verification
- **Purpose:** Use the T0 harness plus final searches to prove that the migration is complete, bounded permissions are enforced, prompts reference the new skill, skill deletion side effects are handled, full skill prompt hardening preserves workflow authority/gates, and the repository is type/test clean for PR readiness.
- **Files to create / modify / test:**
  - Modify `src/__tests__/prompt-research-delegation.test.ts` from T0 if final assertions need tightening
  - Modify `src/__tests__/skill-inventory.test.ts` from T0 if skill inventory assertions need tightening
  - May modify existing tests if a better-fit prompt/skill content test already exists
  - Test all changed areas with `bun test` and `bun run typecheck`
- **Concrete steps:**
  1. Re-run the T0 content tests that read active agent prompts, workflow skill prompts, docs, and any discovered registration/export/generated index/fixture files.
  2. Assert active files do not contain stale active references to `orchestrator-mediated-research`.
  3. Assert active files do not instruct the ordinary broad-research path through stale broker behavior: the old skill name, `<needs_research>` XML handoff, or paraphrases where the orchestrator routes, mediates, brokers, or returns ordinary subagent research evidence. If a historical/migration mention is intentionally retained, the test must whitelist the exact file and reason and confirm it is explicitly non-active; default should be no active references.
  4. Assert `src/skills/research-delegation/SKILL.md` exists and includes `explorer`, `librarian`, budget rules, stop rules, evidence rules, expected output, and recursive delegation prohibition.
  5. Assert no T0-discovered registration/export/generated index/fixture/active docs surface names `orchestrator-mediated-research`, and active inventory surfaces name `research-delegation` where they enumerate built-in skills.
  6. Assert target non-research prompts include or are covered by `research-delegation` guidance and that `explorer-prompt.md` / `librarian-prompt.md` include terminal-agent no-recursive-delegation language.
  7. Assert fresh-session wording covers all required agents and forbidden reuse cases across agent prompts and workflow handoffs.
  8. Assert product-completeness guardrails are conditional on user-facing/product/UI/UX work, not universal requirements for every task.
  9. Assert full skill prompt hardening QA:
     - stale old research references are absent from active skill prompts;
     - public gate order remains `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`;
     - `finish/SKILL.md` has exactly four finish options;
     - discard confirmation semantics are unchanged;
     - executor-only write authority is preserved;
     - reviewer/checker/verifier/final-review read-only judgment is preserved;
     - no new public stages are introduced;
     - no orchestrator ordinary research-broker wording remains.
  10. Assert permission tests from T1 pass and include exact bounded task permission assertions.
  11. Run explicit prompt QA commands or equivalent tests:
     - stale `orchestrator-mediated-research` reference search across `src/agents/prompt-text`, `src/skills`, `README.md`, and `README.ko.md`;
     - broad stale broker behavior audit for XML handoff and orchestrator routing/mediation/broker paraphrases, allowing only explicit non-active migration notes;
     - stale old-skill registration/export/generated index/fixture search across T0-discovered paths;
     - `research-delegation` reference verification across the same active prompt/docs areas;
     - semantic diff audit mapped to the spec skill target table;
     - skill prompt hardening verification for gate order, exactly four finish options, unchanged discard confirmation semantics, executor-only write authority, reviewer read-only wording, strictly conditional product completeness, no new stages, and no orchestrator broker wording;
     - bounded task permission assertions through tests.
  12. Run `bun test`.
  13. Run `bun run typecheck`.
  14. Capture final PR-readiness notes: tests run, typecheck result, known unchecked scope if any, prompt checklist result, skill side-effect cleanup result, skill hardening QA result, and confirmation that workflow gates/authority boundaries were preserved.
- **Explicit QA / verification:**
  - `bun test` passes.
  - `bun run typecheck` passes.
  - Content tests pass for stale-reference removal and new-skill references.
  - Skill inventory/side-effect tests pass for registration/export/generated index/fixture/active docs cleanup.
  - Permission tests pass for exact target/excluded-agent policy.
  - Fresh-session and product-completeness conditional checks pass.
  - Full skill prompt QA passes for public gate order, exactly four finish options, unchanged discard confirmation semantics, executor-only write authority, reviewer read-only boundaries, no new stages, semantic diff audit coverage, and no orchestrator research-broker wording.
  - Final diff review confirms no implementation code outside the scoped prompt/skill/agent-definition/test/docs files was changed.
- **Expected result:** The repository is ready for final review and PR creation with objective evidence for permissions, prompt migration, skill replacement, docs, tests, and typecheck.
- **Dependency notes:** Depends on T0 through T6, including T5A.
- **Parallel eligibility:** Final verification is not parallel; test-file authoring may start earlier, but final run must occur after all edits.

# QA Standard

Minimum acceptable verification before final review:

1. **Permission assertions**
   - Target non-research subagents have exact `task` permission:
     ```ts
     {
       "*": "deny",
       explorer: "allow",
       librarian: "allow",
     }
     ```
   - `explorer` and `librarian` remain `task: "deny"`.
   - `orchestrator` is not assigned the target nested `task` permission pattern.
   - Existing non-task permissions remain unchanged through focused comparison or explicit diff review; tests must not add broad unrelated assertions such as a new global bash policy.

2. **Early reference inventory and skill replacement assertions**
   - T0 inventory/test harness runs before prompt migration and covers stale old-skill references, `<needs_research>` ordinary handoff wording, broad orchestrator research routing/mediation/broker paraphrases, `research-delegation` references, and registration/export/generated index/fixture/active docs surfaces.
   - `src/skills/orchestrator-mediated-research/SKILL.md` is deleted.
   - `src/skills/research-delegation/SKILL.md` exists and contains delegation contract, budget rules, stop rules, evidence rules, output expectations, and recursion prohibition.
   - No stale registration/export/generated index/fixture/active docs reference treats `orchestrator-mediated-research` as an available skill.
   - README skill inventory lists `research-delegation`, not `orchestrator-mediated-research`.

3. **Prompt QA**
   - Stale reference search covers `src/agents/prompt-text`, `src/skills`, `README.md`, and `README.ko.md`.
   - Active prompts and workflow skills do not direct ordinary broad research through stale broker behavior: old skill name, `<needs_research>` XML handoff, or orchestrator routing/mediation/broker paraphrases. Only explicit non-active historical migration notes may remain if justified.
   - Relevant prompts reference or incorporate `research-delegation` and direct bounded `explorer` / `librarian` use.
   - Research agents explicitly prohibit recursive delegation.
   - Each prompt satisfies its T4 per-prompt checklist with minimal-delta edits and no wholesale rewrite unless explicitly justified.
   - Reviewer/checker/verifier/final-review prompts and workflow handoffs include fresh-session defaults for all required agents and forbidden reuse cases.
   - Product-completeness guardrails are strictly conditional and present where user-facing/product/UI/UX work is handled; they do not apply to internal/prompt/config-only workflows unless explicitly scoped as product-facing.
   - OMO references are adapted only where they clarify existing Supercode roles and do not alter authority, gates, permissions, or output contracts.

4. **Skill prompt QA**
   - Required skill targets (`spec`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, `systematic-debugging`, `finish`, `worktree`, `test-driven-development`) have outcome-first contracts, stop/route-back rules, evidence requirements, and handoff/output expectations.
   - Conditional skill targets (`todo-sync`, `playwright-cli`) are updated only if needed for stale references or bounded clarification.
   - Stale old research references are absent from active skill prompts.
   - A semantic diff audit maps each changed skill to the spec skill target table, proving required improvements were added and listed invariants preserved.
   - Public gate order remains exactly `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`.
   - `finish/SKILL.md` preserves exactly four finish options and unchanged discard confirmation semantics; finish edits are limited to final test scope, PR/merge preconditions, and final-state reporting.
   - Skill prompts preserve executor-only write authority and reviewer/checker/verifier/final-review read-only judgment.
   - Product-completeness skill wording is strictly conditional on user-facing/product/UI/UX work and not applicable to internal/prompt/config-only workflows unless explicitly scoped.
   - No skill introduces new workflow stages or ordinary orchestrator research-broker wording, including paraphrased broker/route/mediate behavior.

5. **Authority and gate preservation**
   - Public workflow gates remain present and ordered.
   - Only executor prompt/role retains implementation-write authority.
   - Reviewers/checkers/verifiers remain read-only and artifact-focused.
   - Research agents gather evidence only.

6. **Repository verification**
   - `bun test`
   - `bun run typecheck`
   - Final PR-readiness summary includes tests run, typecheck result, stale-reference QA result, skill side-effect cleanup result, prompt checklist result, skill hardening QA result, and known unchecked scope.

# Revisions

- Initial plan created from approved spec. Incorporated repository state evidence: clean worktree, existing Bun scripts, current built-in skill README entry for `orchestrator-mediated-research`, current nested permission type support, existing agent definition files, prompt files, skill files, and relevant permission/config tests.
- Revised after challenger feedback to add early stale-reference inventory/harness, explicit skill deletion side-effect checks for registration/export/generated index/fixtures/docs, narrower permission preservation testing, per-prompt minimal-delta checklist, conditional product-completeness scope, consistent fresh-session verification, and disciplined OMO adaptation constraints.
- Revised for newly approved full skill prompt hardening scope by adding T5A, skill-target responsibilities, execution ordering, final QA for skill prompts, and explicit checks for stale old research references, public gate order, exactly four finish options, executor-only write authority, reviewer read-only boundaries, conditional product completeness, no new stages, and no orchestrator research-broker wording.
- Revised after challenger feedback on skill hardening to clarify T5/T5A boundaries, constrain `finish/SKILL.md` edits and discard confirmation preservation, require semantic diff audit against the spec skill target table, broaden stale broker behavior detection beyond keywords, and re-emphasize product-completeness as strictly conditional.
