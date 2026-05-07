# Phase 1 Workflow Gate Hardening Plan

## Work ID

`20260507-phase1-gates-a1b2`

## Goal

Harden existing Supercode workflow skill instructions and reviewer prompts for Phase 1 only: lightweight spec ambiguity/readiness scoring, clearer non-goals and decision boundaries, evidence-backed planning gates, concrete AI-slop/comment-quality review checks, and stricter fresh verification evidence requirements.

## Source Spec

`/Volumes/storage/workspace/supercode/.worktrees/20260507-phase1-gates-a1b2/docs/supercode/20260507-phase1-gates-a1b2/spec.md`

## Architecture / Design Strategy

- Keep the current public stage chain unchanged: `spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`.
- Make narrow markdown-only gate hardening changes in existing skill and prompt text files.
- Add/update tests that treat prompt/skill markdown as runtime contract text before or alongside prompt changes, using concept-level assertions rather than brittle exact wording checks.
- Prefer explicit, lightweight criteria over broad aspirational language.
- Do not add new persistent artifact systems, new public workflow stages, new agent authority, or Phase 2-4 implementation mechanisms.
- Do not modify `src/agents/definitions/*.agent.ts` unless execution discovers a repository convention or generated artifact that requires it; current evidence says prompts are loaded from markdown via `readFileSync(...).trim()`.

## Scope

### In Scope

- `src/skills/spec/SKILL.md`
- `src/agents/prompt-text/spec-reviewer-prompt.md`
- `src/skills/plan/SKILL.md`
- `src/agents/prompt-text/plan-checker-prompt.md`
- `src/agents/prompt-text/plan-challenger-prompt.md` if evidence-risk pressure testing is not already explicit enough
- `src/agents/prompt-text/code-quality-reviewer-prompt.md`
- `src/agents/prompt-text/completion-verifier-prompt.md`
- `src/agents/prompt-text/final-reviewer-prompt.md`
- `src/skills/final-review/SKILL.md` if skill-level fresh-evidence hard rules need matching language
- Prompt/skill tests and generated/snapshot artifacts required by repository conventions

### Out of Scope

- Phase 2-4 implementation items: `evidence.md`, `state.json`, `ledger.jsonl`, mailbox, task-list sharing, file ownership registry, per-worker worktrees, embedded MCP runtime, hierarchical `AGENTS.md`, wiki/knowledge layer, ultragoal mode.
- New public workflow stages or renamed stages.
- New implementation authority for reviewers or orchestrator.
- Auto-merge, auto-PR, auto-discard, unattended finish behavior.
- Unrelated production-code features.

## Assumptions

- The spec is approved and planning-ready.
- Prompt markdown files are runtime source files loaded directly by agent definitions.
- Skill markdown files are runtime/test source files loaded directly from `src/skills/<name>/SKILL.md`.
- Baseline verification in this worktree passed: `bun install`, `bun test`, and `bun run typecheck`.
- No tracked generated prompt artifacts were identified in the planning evidence packet; T1 must verify and record whether generated/snapshot/convention artifacts exist before T2-T5 start.
- The deferred Phase 2-4 roadmap is already recorded in the source spec and must not be implemented by this plan.

## Source Spec Alignment

- Success criteria 1-3 are addressed by Task T2.
- Success criteria 4-5 are addressed by Task T3.
- Success criterion 6 is addressed by Task T4.
- Success criterion 7 is addressed by Task T5.
- Success criterion 8 is addressed by Tasks T1 and T6.
- Phase 2-4 roadmap recording is preserved by keeping this plan limited to Phase 1 and by verifying no Phase 2-4 implementation artifacts are introduced.

## Execution Policy

- Follow TDD for behavior-changing prompt/skill contract changes: add or update tests that fail for the missing Phase 1 gate language before completing the corresponding markdown changes.
- For prompt/skill text where existing test conventions do not support a fine-grained red test, add a focused repository test that reads the markdown and asserts the required contract concepts using resilient, concept-level checks rather than exact prose snapshots.
- Keep tasks narrow and execute them in dependency order unless marked parallel-eligible.
- T1 owns the shared `phase1-gate-hardening` test contract. T2-T5 must not edit that shared test file during parallel execution unless the work is serialized or explicitly coordinated to avoid conflicting assertions.
- Reviewers must judge artifacts and fresh evidence, not executor effort narratives.
- Do not weaken current approval gates, reviewer isolation, final-review gate, finish-choice pause, or executor-only implementation authority.
- Do not change `.agent.ts` definitions unless required by discovered generated/snapshot conventions.
- T1 must discover and record whether generated prompt artifacts, snapshots, or prompt/skill convention files exist. If discovered, update them in the same later task that changes their source markdown and document the update in task verification notes.
- Each prompt/skill task must include manual diff review for actionability, consistency across related artifacts, and preservation of existing authority boundaries; tests are necessary but not sufficient.

## File Structure

```text
src/
  __tests__/
    phase1-gate-hardening.test.ts          # create or equivalent focused prompt/skill contract test
    skill-inventory.test.ts                # run; update only if conventions require
    agent-registry.test.ts                 # run; update only if conventions require
    prompt-research-delegation.test.ts     # run; update only if conventions require
    research-budget-discipline.test.ts     # run; update only if conventions require
    skill-path-registration.test.ts        # run; update only if conventions require
  agents/
    prompt-text/
      spec-reviewer-prompt.md
      plan-checker-prompt.md
      plan-challenger-prompt.md
      code-quality-reviewer-prompt.md
      completion-verifier-prompt.md
      final-reviewer-prompt.md
  skills/
    spec/SKILL.md
    plan/SKILL.md
    final-review/SKILL.md
```

## File Responsibilities

- `src/__tests__/phase1-gate-hardening.test.ts`: focused contract coverage for Phase 1 prompt/skill requirements by reading markdown files and asserting required gate criteria are present.
- `src/skills/spec/SKILL.md`: spec-authoring workflow requirements for ambiguity/readiness scoring, non-goals, and decision boundaries.
- `src/agents/prompt-text/spec-reviewer-prompt.md`: reviewer blocking criteria for missing/inconsistent readiness score, unresolved planner-blocking uncertainty, and missing non-goals/decision boundaries.
- `src/skills/plan/SKILL.md`: planner workflow requirements for evidence-backed planning and routing back when evidence is insufficient.
- `src/agents/prompt-text/plan-checker-prompt.md`: blocking criteria for evidence-free plans when repository facts, tests, conventions, or external behavior materially affect execution.
- `src/agents/prompt-text/plan-challenger-prompt.md`: pressure-testing criteria for evidence-risk, hidden unsupported assumptions, brittle sequencing, and scope inflation.
- `src/agents/prompt-text/code-quality-reviewer-prompt.md`: quality review criteria for concrete AI-slop and low-value comment patterns.
- `src/agents/prompt-text/completion-verifier-prompt.md`: completion verification criteria requiring fresh, inspected verification output tied to the spec/plan.
- `src/agents/prompt-text/final-reviewer-prompt.md`: final-review criteria requiring fresh evidence inspection instead of stale claims.
- `src/skills/final-review/SKILL.md`: skill-level final-review rules aligned with fresh inspected evidence requirements when needed.

## Task Sections

### T1 — Discover Prompt Conventions and Add Phase 1 Contract Tests

- **Task id:** T1
- **Task name:** Discover prompt conventions and add Phase 1 gate-hardening tests
- **Purpose:** Establish repository convention knowledge and executable coverage for the required Phase 1 prompt/skill contract before parallel markdown changes begin.
- **Files to create / modify / test:**
  - Create: `src/__tests__/phase1-gate-hardening.test.ts` or update an existing prompt/skill contract test if repository conventions clearly prefer it.
  - Inspect/record result for: generated prompt registries, snapshots, prompt indexes, or test fixtures related to changed markdown files.
  - Test: target prompt and skill markdown files listed in File Structure.
- **Concrete steps:**
  1. Inspect existing test style in the listed test files only enough to match Bun test conventions.
  2. Before adding prompt/skill assertions, search repository conventions for generated prompt artifacts, snapshots, prompt registries, or fixtures related to `src/agents/prompt-text/*.md` and `src/skills/*/SKILL.md`.
  3. Record the discovery result in the task verification notes: either `generated/snapshot artifacts found: <paths and update expectation>` or `generated/snapshot artifacts not found after checking: <checked paths/patterns/tests>`.
  4. Add tests that read the target markdown files with repository-standard file loading.
  5. Implement concept-level assertions that check for required contract ideas and representative terms without depending on exact sentence wording or full snapshots.
  6. Assert `src/skills/spec/SKILL.md` defines a fixed ambiguity/readiness rubric with required dimensions and 0/1/2 meanings.
  7. Assert `src/agents/prompt-text/spec-reviewer-prompt.md` checks score presence, internal consistency, unresolved planner-blocking uncertainty, non-goals, and decision boundaries.
  8. Assert `src/skills/plan/SKILL.md` and `src/agents/prompt-text/plan-checker-prompt.md` require evidence for repository facts, related tests, conventions, and external behavior when materially relevant.
  9. Assert `src/agents/prompt-text/plan-challenger-prompt.md` either explicitly pressure-tests evidence risk or existing language is specific enough to satisfy that requirement; prefer an explicit concept assertion if the file is updated.
  10. Assert `src/agents/prompt-text/code-quality-reviewer-prompt.md` names concrete AI-slop/comment-quality patterns from the spec: stale TODOs, comments that restate obvious code, unnecessary AI-assistant prose, over-explaining trivial logic, unjustified abstraction layers, and filler text not tied to maintainability.
  11. Assert `src/agents/prompt-text/completion-verifier-prompt.md`, `src/agents/prompt-text/final-reviewer-prompt.md`, and if updated `src/skills/final-review/SKILL.md` require fresh verification output to be run or gathered, inspected, and tied to the spec/plan rather than accepted as stale claims.
  12. Run the new/updated test before markdown changes and confirm it fails for the missing Phase 1 requirements, unless an assertion already passes because the repository already contains equivalent language.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - Verification notes must include generated/snapshot/convention discovery result from step 3.
  - Expected initial result: failing assertions for missing Phase 1 hardening language, or documented already-passing assertions where equivalent language already exists.
- **Expected result:** Generated/snapshot/convention discovery is recorded, and a focused test file exists as the shared acceptance contract for later prompt/skill edits.
- **Dependency notes:** Must run before completing T2-T5 markdown changes.
- **Parallel eligibility:** Not parallel. This task defines the shared contract and convention discovery result required before subsequent parallel tasks.

### T2 — Harden Spec Gate Readiness, Non-Goals, and Decision Boundaries

- **Task id:** T2
- **Task name:** Harden spec-stage readiness gate
- **Purpose:** Make the spec stage and spec reviewer consistently require lightweight readiness scoring and scope-control boundaries when needed.
- **Files to create / modify / test:**
  - Modify: `src/skills/spec/SKILL.md`
  - Modify: `src/agents/prompt-text/spec-reviewer-prompt.md`
  - Test: `src/__tests__/phase1-gate-hardening.test.ts`
- **Concrete steps:**
  1. In `src/skills/spec/SKILL.md`, add a lightweight ambiguity/readiness scoring requirement with a fixed 0/1/2 rubric per dimension.
  2. Lock the rubric meanings as: `0 = missing or unclear`, `1 = partially specified or carries material uncertainty`, and `2 = clear enough for the next gate to act without guessing`.
  3. Ensure the fixed dimensions include at least intent, outcome, scope, constraints, success criteria, and relevant repository context when applicable.
  4. State that the score is a readiness aid, not a fake-precision estimation framework, and does not require arbitrary numerical precision beyond the fixed 0/1/2 meanings.
  5. Require clarification or routing only when low scores or internally inconsistent scores leave planning-blocking uncertainty unresolved.
  6. Strengthen non-goals language so non-goals are required when omission would permit scope drift or downstream guessing.
  7. Add decision-boundary language defining what downstream agents may decide autonomously versus what requires user approval or routing back.
  8. In `src/agents/prompt-text/spec-reviewer-prompt.md`, add blocking criteria for missing readiness score, internally inconsistent scores, unresolved planner-blocking uncertainty, missing non-goals, and missing decision boundaries where their absence creates unauthorized decisions or scope drift.
  9. Keep wording narrow enough that small/simple specs are not blocked by unnecessary bureaucracy.
  10. Manually review the markdown diff for actionability, internal consistency between the skill and reviewer prompt, and preservation of existing spec-stage authority boundaries.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/skill-inventory.test.ts src/__tests__/agent-registry.test.ts src/__tests__/skill-path-registration.test.ts`
- **Expected result:** Spec-stage skill and reviewer prompt explicitly enforce lightweight readiness scoring, non-goals, and decision boundaries without changing the public workflow stage chain.
- **Dependency notes:** Depends on T1. Can proceed independently from T3-T5 after T1. Must not edit `src/__tests__/phase1-gate-hardening.test.ts` unless execution is serialized or explicitly coordinated with other tasks.
- **Parallel eligibility:** Parallel-eligible with T3, T4, and T5 after T1 if executors avoid editing the shared test file concurrently.

### T3 — Harden Planning Evidence Gate

- **Task id:** T3
- **Task name:** Harden evidence-backed planning gate
- **Purpose:** Ensure plans cannot pass when they rely on unsupported repository assumptions, undiscovered related tests, unclear conventions, or unsupported external behavior that materially affects execution.
- **Files to create / modify / test:**
  - Modify: `src/skills/plan/SKILL.md`
  - Modify: `src/agents/prompt-text/plan-checker-prompt.md`
  - Modify if needed: `src/agents/prompt-text/plan-challenger-prompt.md`
  - Test: `src/__tests__/phase1-gate-hardening.test.ts`
- **Concrete steps:**
  1. In `src/skills/plan/SKILL.md`, add or tighten instructions requiring evidence for repository reality when task boundaries depend on file targets, related tests, conventions, call sites, generated artifacts, or external behavior.
  2. Require bounded `research-delegation` or routed return when the Evidence Packet is insufficient for safe planning.
  3. Require plans to report checked scope, unchecked scope, and unresolved uncertainty when material to execution.
  4. In `src/agents/prompt-text/plan-checker-prompt.md`, add blocking criteria for evidence-free file targets, missing related-test discovery, unsupported convention assumptions, unsupported external API/library behavior, and fake certainty over missing evidence.
  5. Inspect `src/agents/prompt-text/plan-challenger-prompt.md`; if it does not explicitly pressure-test evidence-risk and unsupported assumptions, update it to do so.
  6. Record an explicit task verification note for `src/agents/prompt-text/plan-challenger-prompt.md`: `updated because <gap>` or `not updated because existing text covers <specific evidence-risk criteria>`.
  7. Keep evidence requirements proportional so trivial changes are not blocked by unnecessary broad research.
  8. Manually review the markdown diff for actionability, consistency between planner/checker/challenger roles, and preservation of reviewer isolation and planner-only plan authorship.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/prompt-research-delegation.test.ts src/__tests__/research-budget-discipline.test.ts src/__tests__/agent-registry.test.ts`
- **Expected result:** Planning skill and reviewer prompts explicitly block materially evidence-free plans and preserve bounded research discipline.
- **Dependency notes:** Depends on T1. Can proceed independently from T2, T4, and T5 after T1. Must not edit `src/__tests__/phase1-gate-hardening.test.ts` unless execution is serialized or explicitly coordinated with other tasks.
- **Parallel eligibility:** Parallel-eligible with T2, T4, and T5 after T1 if executors avoid editing the shared test file concurrently.

### T4 — Add AI-Slop and Comment-Quality Review Criteria

- **Task id:** T4
- **Task name:** Harden code quality reviewer against AI slop
- **Purpose:** Make quality review check changed code for concrete low-value comment and AI-slop patterns without turning style preferences into broad blockers.
- **Files to create / modify / test:**
  - Modify: `src/agents/prompt-text/code-quality-reviewer-prompt.md`
  - Test: `src/__tests__/phase1-gate-hardening.test.ts`
- **Concrete steps:**
  1. Add explicit review criteria for stale TODOs, comments that restate obvious code, unnecessary “AI assistant” prose, over-explaining trivial logic, unjustified abstraction layers, and filler text not tied to maintainability.
  2. State that the reviewer should focus on changed code and concrete maintainability impact.
  3. Preserve existing reviewer authority boundaries: review only, no implementation authority.
  4. Avoid subjective style-only language that would create false blockers.
  5. Manually review the markdown diff for actionability, concrete examples, and consistency with existing code-quality review responsibilities.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/agent-registry.test.ts`
- **Expected result:** The code quality reviewer prompt explicitly covers concrete AI-slop/comment-quality issues while remaining actionable.
- **Dependency notes:** Depends on T1. Can proceed independently from T2, T3, and T5 after T1. Must not edit `src/__tests__/phase1-gate-hardening.test.ts` unless execution is serialized or explicitly coordinated with other tasks.
- **Parallel eligibility:** Parallel-eligible with T2, T3, and T5 after T1 if executors avoid editing the shared test file concurrently.

### T5 — Tighten Fresh Verification Evidence Requirements

- **Task id:** T5
- **Task name:** Harden completion and final-review evidence gates
- **Purpose:** Ensure completion verification and final review reject stale or uninspected verification claims and require fresh inspected evidence tied to the spec/plan.
- **Files to create / modify / test:**
  - Modify: `src/agents/prompt-text/completion-verifier-prompt.md`
  - Modify: `src/agents/prompt-text/final-reviewer-prompt.md`
  - Modify if needed: `src/skills/final-review/SKILL.md`
  - Test: `src/__tests__/phase1-gate-hardening.test.ts`
- **Concrete steps:**
  1. In `completion-verifier-prompt.md`, require fresh verification output to be run or gathered for the current work, inspected, and tied to the source spec and approved plan.
  2. Add rejection criteria for stale claims, uninspected command output, copied executor narratives without evidence, or verification not mapped to acceptance criteria.
  3. In `final-reviewer-prompt.md`, require independent fresh evidence inspection and explicit classification of baseline failures versus regressions.
  4. Update `src/skills/final-review/SKILL.md` if its hard rules or completion gate need matching language to avoid prompt/skill inconsistency.
  5. Record an explicit task verification note for `src/skills/final-review/SKILL.md`: `updated because <skill-level mismatch>` or `not updated because existing skill text covers <specific fresh-evidence criteria>`.
  6. Preserve final-review as a gate and do not add unattended finish behavior.
  7. Manually review the markdown diff for actionability, consistency between completion verifier/final reviewer/final-review skill, and preservation of finish-choice pause.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/skill-inventory.test.ts src/__tests__/agent-registry.test.ts src/__tests__/skill-path-registration.test.ts`
- **Expected result:** Completion and final-review artifacts explicitly require fresh, inspected evidence tied to spec/plan and reject stale claims.
- **Dependency notes:** Depends on T1. Can proceed independently from T2-T4 after T1. Must not edit `src/__tests__/phase1-gate-hardening.test.ts` unless execution is serialized or explicitly coordinated with other tasks.
- **Parallel eligibility:** Parallel-eligible with T2, T3, and T4 after T1 if executors avoid editing the shared test file concurrently.

### T6 — Generated Artifact Check and Full Verification

- **Task id:** T6
- **Task name:** Verify repository conventions and full quality gates
- **Purpose:** Confirm prompt/skill changes are synchronized with the T1-recorded repository conventions and all available verification passes.
- **Files to create / modify / test:**
  - Modify only if discovered: generated prompt registry, snapshots, or test fixtures required by repository conventions.
  - Test: all changed prompt/skill files and listed test files.
- **Concrete steps:**
  1. Check repository status and changed files to confirm the diff is limited to in-scope prompt/skill/test/generated artifacts.
  2. Re-check the T1 generated/snapshot/convention discovery note and confirm any discovered artifacts were updated by the task that changed their source markdown; if T1 found none, confirm no new generated/snapshot artifacts appeared in the final diff.
  3. Confirm no Phase 2-4 implementation artifacts were added: no `evidence.md`, `state.json`, `ledger.jsonl`, mailbox, file ownership registry, per-worker worktree system, MCP runtime, generated `AGENTS.md`, wiki layer, or ultragoal mode.
  4. Run targeted tests for the new Phase 1 contract and existing prompt/skill registration tests.
  5. Run full test and typecheck commands.
  6. If any verification fails, classify it as a baseline failure or regression using fresh command output before routing back for fixes.
- **Explicit QA / verification:**
  - `git status --short`
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/skill-inventory.test.ts src/__tests__/agent-registry.test.ts src/__tests__/prompt-research-delegation.test.ts src/__tests__/research-budget-discipline.test.ts src/__tests__/skill-path-registration.test.ts`
  - `bun test`
  - `bun run typecheck`
- **Expected result:** All relevant tests and typecheck pass, generated/snapshot artifacts are synchronized if they exist, and the final diff remains Phase 1-only.
- **Dependency notes:** Depends on T2-T5 completion.
- **Parallel eligibility:** Not parallel. This is the final integration and verification task.

## QA Standard

- Each prompt/skill behavior change must be covered by a focused test assertion where repository conventions support it.
- Prompt/skill tests must assert required concepts and representative terms, not fragile exact prose, unless the repository already uses snapshots for that artifact.
- Manual diff review is required for each changed prompt/skill artifact to confirm the text is actionable, internally consistent, and aligned with existing Supercode authority boundaries.
- Each task must run its targeted verification commands using fresh output from the current worktree.
- Final verification must include:
  - `bun test src/__tests__/phase1-gate-hardening.test.ts`
  - `bun test src/__tests__/skill-inventory.test.ts src/__tests__/agent-registry.test.ts src/__tests__/prompt-research-delegation.test.ts src/__tests__/research-budget-discipline.test.ts src/__tests__/skill-path-registration.test.ts`
  - `bun test`
  - `bun run typecheck`
- Verification evidence must be inspected, not merely claimed.
- Any failure must be classified as baseline or regression before final review.
- The final diff must not include Phase 2-4 implementation artifacts or changes that weaken Supercode gate order, approval points, context isolation, reviewer authority boundaries, TDD, final-review, or finish-choice pause.

## Revisions

- 2026-05-07: Initial execution-ready plan created from approved Phase 1 gate hardening spec and planning evidence packet.
- 2026-05-07: Revised for plan-challenger risks: moved generated/snapshot discovery into T1, clarified shared test ownership and parallel coordination, required concept-level assertions plus manual diff review, added optional-artifact verification notes, and locked the ambiguity rubric shape.
