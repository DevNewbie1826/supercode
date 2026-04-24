# Execution Plan — `20260424-orch-exec-execute-prompt-pr-b62c`

## Plan Objective

Safely bring the existing prompt, agent-definition, and execute-skill edits in `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/` through the remaining Supercode stages without discarding the user-authored work, limiting any follow-up implementation/content changes to the same five edited files unless verification proves a directly coupled non-artifact file is required and scope is re-confirmed.

## Execution Policy

- Execute all review, edits, and verification inside `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/` on branch `20260424-orch-exec-prompt-worktree-e3f1`.
- Treat the current five changed files as the only allowed implementation/content edit set during execute; workflow artifacts under `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/` are allowed separately and do not count against this five-file limit:
  - `src/agents/definitions/orchestrator.agent.ts`
  - `src/agents/definitions/executor.agent.ts`
  - `src/agents/prompt-text/orchestrator-prompt.md`
  - `src/agents/prompt-text/executor-prompt.md`
  - `src/skills/execute/SKILL.md`
- Review already-authored edits first; do not rewrite them opportunistically.
- Only apply targeted fixes needed to resolve concrete review or verification findings.
- If a required fix appears outside the five files, stop and route back for scope confirmation before making that change.
- Required verification floor: `bun run typecheck`.
- Lock the additional verification command during planning to this concrete repository test invocation: `bun test src/__tests__/agent-registry.test.ts src/__tests__/config-handler-agent.test.ts src/__tests__/config-handler-skills.test.ts src/__tests__/skill-path-registration.test.ts src/__tests__/builtin-agents.test.ts`.
- Final state must be suitable for `final-review` PASS and a later finish-stage PR choice; do not create a PR during execute.

## Task List

### T01 — Validate reusable worktree and lock execution boundaries
- **Purpose:** Confirm the existing worktree can be safely reused and that execution starts from the branch/path/change-set state required by the spec.
- **Files to create / modify / test:**
  - No file modifications planned.
  - Validate worktree state in `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/`.
- **Concrete steps:**
  1. Confirm the worktree path exists and is usable.
  2. Confirm the checked-out branch is `20260424-orch-exec-prompt-worktree-e3f1`.
  3. Confirm the changed-file set for implementation/content files is limited to the five listed files, excluding workflow artifacts under `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/`; explicitly record any unexpected extra non-artifact files before proceeding.
  4. Reconfirm baseline verification state, including that `bun run typecheck` still passes before any new edits are made.
  5. Record any blockers that would prevent reuse of this worktree for the remaining stages.
- **Explicit QA / verification:**
  - Worktree path exists.
  - Branch name matches spec.
  - Changed-file set matches spec.
  - `bun run typecheck` passes from the reused worktree baseline.
- **Expected result:** A validated execution starting point, or a documented blocker that stops the workflow before further work.
- **Dependency notes:** None; this task must complete before all others.
- **Parallel eligibility:** No.

### T02 — Create pre-execute alignment artifact for the reused edit set
- **Purpose:** Freeze the execution order, scope guardrails, verification commands, and stop conditions before any targeted fixes are attempted.
- **Files to create / modify / test:**
  - Create `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/pre-execute-alignment.md`
  - Create `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`
  - Reference the five in-scope edited files and worktree path.
- **Concrete steps:**
  1. Capture the validated worktree facts from T01.
  2. List the five in-scope files as the only expected implementation/content edit targets during execute, and state that workflow artifacts under this docs work-item directory are allowed.
  3. Define the review order: agent-definition/prompt consistency first, execute-skill consistency second, targeted fixes third, verification last.
  4. Select the concrete verification commands to use after edits:
     - `bun run typecheck`
     - `bun test src/__tests__/agent-registry.test.ts src/__tests__/config-handler-agent.test.ts src/__tests__/config-handler-skills.test.ts src/__tests__/skill-path-registration.test.ts src/__tests__/builtin-agents.test.ts`
  5. Define `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md` as the required T03 output and T04 input artifact.
  6. Record the stop condition for any fix required outside the allowed implementation/content files.
- **Explicit QA / verification:**
  - Alignment artifact exists.
  - `pre-execute-alignment.md` names the exact worktree, branch, implementation/content file scope, locked verification commands, T03/T04 handoff artifact, and stop condition.
  - `execute-review-notes.md` is created as an empty or template-ready artifact for execute-stage findings.
- **Expected result:** Execute-stage work can proceed without guessing scope, order, or verification expectations.
- **Dependency notes:** Depends on T01.
- **Parallel eligibility:** No.

### T03 — Review the existing prompt and agent-definition edits for consistency
- **Purpose:** Determine whether the already-authored prompt and agent-definition changes are internally consistent and aligned with the spec before any fixes are made.
- **Files to create / modify / test:**
  - Review only:
    - `src/agents/definitions/orchestrator.agent.ts`
    - `src/agents/definitions/executor.agent.ts`
    - `src/agents/prompt-text/orchestrator-prompt.md`
    - `src/agents/prompt-text/executor-prompt.md`
    - `src/skills/execute/SKILL.md`
  - Update `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`
- **Concrete steps:**
  1. Compare each agent-definition file against its referenced prompt markdown to confirm the prompt load path and descriptive text still match the intended prompt behavior.
  2. Review `orchestrator-prompt.md` for the added `question`-tool escalation guidance and confirm it does not conflict with the orchestrator agent definition.
  3. Review `executor-prompt.md` and `src/skills/execute/SKILL.md` for consistent AST-aware, LSP-aware, and diagnostics-check guidance.
  4. Identify only concrete issues that would block review, verification, or PR readiness.
  5. Record the review outcome in `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`, with one entry per finding including file, issue, required action, and rationale.
  6. If no issues are found, explicitly record in `execute-review-notes.md` that T04 is a no-op.
- **Explicit QA / verification:**
  - All five files are reviewed.
  - Any findings are specific, file-scoped, and tied to a clear mismatch, policy conflict, or verification risk.
  - `execute-review-notes.md` exists and is usable as the sole handoff input for T04.
- **Expected result:** A bounded list of required targeted fixes, or explicit confirmation that the current edits are ready for verification without further modification.
- **Dependency notes:** Depends on T02.
- **Parallel eligibility:** No.

### T04 — Apply only required targeted fixes in the existing edited files
- **Purpose:** Resolve concrete findings from T03 while preserving the user-authored edits and keeping the change set narrow.
- **Files to create / modify / test:**
  - Modify only if required:
    - `src/agents/definitions/orchestrator.agent.ts`
    - `src/agents/definitions/executor.agent.ts`
    - `src/agents/prompt-text/orchestrator-prompt.md`
    - `src/agents/prompt-text/executor-prompt.md`
    - `src/skills/execute/SKILL.md`
  - Update `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md` to mark each finding resolved or no-op.
- **Concrete steps:**
  1. Fix only the specific inconsistencies or review blockers documented in `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`.
  2. Keep edits minimal and localized; do not broaden wording or policy beyond what is needed for consistency and verification.
  3. Recheck the modified files after each fix to ensure agent definitions still load prompt markdown via `readFileSync` as expected and no unrelated behavior is changed.
  4. Update `execute-review-notes.md` to mark each documented finding as resolved, unchanged by design, or blocked.
  5. If verification or review proves a directly coupled metadata/test file must change, stop and request scope confirmation before editing it.
- **Explicit QA / verification:**
  - Every change maps to a concrete T03 finding.
  - No implementation/content files outside the allowed set are modified without explicit scope re-confirmation.
  - Resulting file content remains aligned with the spec’s prompt/skill intent.
  - `execute-review-notes.md` shows disposition for every T03 finding.
- **Expected result:** The in-scope files are either unchanged because they already passed review, or minimally corrected and ready for final verification.
- **Dependency notes:** Depends on T03.
- **Parallel eligibility:** No.

### T05 — Run final verification and prepare execute-stage evidence for independent final-review
- **Purpose:** Prove the final branch state is reviewable, record execute-stage outcomes, and hand off independent evidence to the separate final-review stage.
- **Files to create / modify / test:**
  - Update `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`
  - Verify the final state of:
    - `src/agents/definitions/orchestrator.agent.ts`
    - `src/agents/definitions/executor.agent.ts`
    - `src/agents/prompt-text/orchestrator-prompt.md`
    - `src/agents/prompt-text/executor-prompt.md`
    - `src/skills/execute/SKILL.md`
  - Run:
    - `bun run typecheck`
    - `bun test src/__tests__/agent-registry.test.ts src/__tests__/config-handler-agent.test.ts src/__tests__/config-handler-skills.test.ts src/__tests__/skill-path-registration.test.ts src/__tests__/builtin-agents.test.ts`
- **Concrete steps:**
  1. Run `bun run typecheck` in the worktree.
  2. Run `bun test src/__tests__/agent-registry.test.ts src/__tests__/config-handler-agent.test.ts src/__tests__/config-handler-skills.test.ts src/__tests__/skill-path-registration.test.ts src/__tests__/builtin-agents.test.ts` in the worktree.
  3. Confirm the final implementation/content changed-file set remains limited to the five in-scope files unless a separately approved directly coupled file was added; ignore workflow artifacts in this docs work-item directory for this check.
  4. Update `execute-review-notes.md` with: final changed files, commands run, pass/fail outcomes, and any no-op note if T04 made no edits.
  5. If any verification fails, return to targeted fixes only within the approved scope; if the needed fix exceeds scope, stop and escalate.
- **Explicit QA / verification:**
  - `bun run typecheck` passes.
  - The locked repository test command passes and its result is recorded.
  - `execute-review-notes.md` contains PASS/FAIL-ready execute evidence for the independent `final-review` stage.
  - Final implementation/content changed-file set remains within scope.
- **Expected result:** Execute-stage evidence is complete, verification is recorded, and the branch is ready for independent `final-review` and a later user-selected PR finish option.
- **Dependency notes:** Depends on T04.
- **Parallel eligibility:** No.

## Sequencing Summary

1. T01 validate reusable worktree.
2. T02 create alignment artifact and freeze verification choices.
3. T03 review the already-authored edits.
4. T04 apply only required targeted fixes.
5. T05 run verification and finalize execute-stage evidence for final-review.

No tasks are parallel-safe because each later task depends on validated state or findings from the prior task.

## Completion Criteria

- `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/pre-execute-alignment.md` exists.
- `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md` exists and captures the T03→T04 handoff plus final execute verification outcomes.
- The reused worktree is validated and remains usable.
- The final implementation/content change set is still limited to the five listed files unless scope was explicitly re-confirmed for a directly coupled extra file; workflow artifacts under this docs work-item directory are excluded from that limit.
- `bun run typecheck` passes.
- The locked repository test command passes and is recorded.
- Execute-stage evidence is sufficient for an independent final-review PASS/FAIL decision and later finish-stage PR preparation.
