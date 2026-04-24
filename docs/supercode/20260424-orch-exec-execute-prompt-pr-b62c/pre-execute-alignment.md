# Pre-Execute Alignment — `20260424-orch-exec-execute-prompt-pr-b62c`

## Inputs

- Spec: `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/spec.md`
- Plan: `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/plan.md`
- Active worktree: `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/`
- Active branch: `20260424-orch-exec-prompt-worktree-e3f1`

## Task Readiness Notes

- T01 output location resolved here: worktree validation findings and blockers are recorded in this alignment artifact.
- T02 output locations are:
  - `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/pre-execute-alignment.md`
  - `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/execute-review-notes.md`
- T03, T04, and T05 are execution-ready per task-compliance-checker review.

## Execution Order

1. T01 validate reusable worktree and lock execution boundaries.
2. T02 create alignment artifact and initialize execute review notes.
3. T03 review the existing edits and record findings.
4. T04 apply only required targeted fixes from recorded findings.
5. T05 run locked verification and finalize execute-stage evidence.

## Batching

- Batch 1 (serial): T01 -> T02 -> T03 -> T04 -> T05
- Parallelism: none allowed.
- Reason: every later task depends on validated worktree state or prior findings/evidence.

## Locked Verification Expectations

- T01 done means:
  - worktree path exists
  - branch is `20260424-orch-exec-prompt-worktree-e3f1`
  - non-artifact changed files are limited to:
    - `src/agents/definitions/orchestrator.agent.ts`
    - `src/agents/definitions/executor.agent.ts`
    - `src/agents/prompt-text/orchestrator-prompt.md`
    - `src/agents/prompt-text/executor-prompt.md`
    - `src/skills/execute/SKILL.md`
  - `bun run typecheck` passes before new edits

- T02 done means:
  - this alignment artifact exists
  - `execute-review-notes.md` exists and is ready to hold findings
  - locked verification commands are:
    - `bun run typecheck`
    - `bun test src/__tests__/agent-registry.test.ts src/__tests__/config-handler-agent.test.ts src/__tests__/config-handler-skills.test.ts src/__tests__/skill-path-registration.test.ts src/__tests__/builtin-agents.test.ts`

- T03 done means:
  - all five in-scope files are reviewed
  - findings are written to `execute-review-notes.md`
  - each finding includes file, issue, required action, and rationale
  - if no fixes are needed, `execute-review-notes.md` explicitly marks T04 as no-op

- T04 done means:
  - any edits map directly to recorded T03 findings
  - no implementation/content files outside the allowed five are modified
  - `execute-review-notes.md` marks each finding resolved, unchanged by design, or blocked

- T05 done means:
  - `bun run typecheck` passes
  - the locked `bun test ...` command passes
  - final non-artifact changed-file set remains within the allowed five
  - `execute-review-notes.md` records commands run and pass/fail outcomes

## Conflict Warnings

- The five editable files are all part of one tightly-coupled prompt/skill policy change; splitting them across parallel tasks risks inconsistent review and verification.
- If verification reveals a needed fix outside the five implementation/content files, execution must stop for scope confirmation.

## Worktree Validation Record

- Path exists: pending execute confirmation
- Branch matches: pending execute confirmation
- Non-artifact changed-file set matches scope: pending execute confirmation
- `bun run typecheck` baseline: previously observed passing; executor must reconfirm in T01/T05

## Alignment Status

`ready`
