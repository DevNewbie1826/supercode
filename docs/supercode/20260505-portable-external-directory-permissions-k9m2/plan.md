# Plan: Portable OpenCode External Directory Permissions

## Work ID

20260505-portable-external-directory-permissions-k9m2

## Goal

Make the checked-in `executor`, `explorer`, and `librarian` built-in agent permission defaults support portable external-directory usage. The primary target is `executor`: add `external_directory: "allow"` plus explicit ordered read rules while preserving existing executor edit/delegation policy. The current PR branch already has `explorer` and `librarian` `read["*"]` tests and implementation; keep those as regression coverage while avoiding ignored local `.opencode/*` configuration changes.

## Source Spec

`docs/supercode/20260505-portable-external-directory-permissions-k9m2/spec.md`

## Architecture / Design Strategy

- Keep the new implementation change limited to the `executor` built-in agent default permission object, with tests covering both built-in definitions and emitted config.
- Treat `executor` as the primary target: add `external_directory: "allow"` and the same ordered nested `read` rules used for the research agents, while preserving existing `edit: "allow"`, `apply_patch: "deny"`, `todowrite: "allow"`, and bounded `task` delegation.
- Preserve existing `explorer` and `librarian` `read["*"]` implementation/tests as regression coverage; do not treat them as the expected RED source for this revision.
- Add the baseline read wildcard as the first key in executor's nested `read` permission object so OpenCode last-match-wins semantics keep later `.env` deny rules and `.env.example` exception effective.
- Do not change runtime permission merge logic, global/local OpenCode config, or any unrelated edit/write/bash/task permissions. Executor already has `edit: "allow"`; do not broaden beyond that existing edit permission.
- Do not refactor `src/agents/config.ts`; test emitted config through existing config-handler coverage to confirm executor `external_directory` and nested `read` entries are preserved.
- Drive implementation with focused RED test adjustments in `src/__tests__/builtin-agents.test.ts` and `src/__tests__/config-handler-agent.test.ts`, then update only `src/agents/definitions/executor.agent.ts`.

## Scope

In scope:
- Update tests for `executor` external-directory and read permission defaults, preserving existing executor edit/delegation permissions.
- Preserve existing tests for `explorer` and `librarian` read permission defaults as regression coverage.
- Update emitted-config tests for executor permissions in `src/__tests__/config-handler-agent.test.ts`.
- Update `src/agents/definitions/executor.agent.ts`.
- Run targeted and full verification commands.

Out of scope:
- `.opencode/*` files.
- OpenCode runtime permission engine changes.
- Machine-local absolute path allowlists.
- Dynamic project-root variables.
- New edit/write/bash/task permissions beyond preserving executor's existing `edit: "allow"`, `apply_patch: "deny"`, `todowrite: "allow"`, and bounded `task` delegation.
- Changes to non-target agents unless an existing test unexpectedly exposes a direct regression caused by this narrow change.
- Permission merge/clone-engine refactors in `src/agents/config.ts`.

## Assumptions

- Object literal key order is relevant for the intended OpenCode rule ordering and can be asserted practically via `toEqual` on the expected `read` object shape.
- `src/agents/config.ts` shallow-clones permission rule objects, so adding `"*": "allow"` to the checked-in built-in defaults does not require deep-merge changes.
- Existing tests in `src/__tests__/builtin-agents.test.ts` are the correct location for built-in agent permission assertions.
- Existing tests in `src/__tests__/config-handler-agent.test.ts` are the correct location for emitted-config assertions through `createConfigHandler`.
- The current PR branch already includes `explorer` and `librarian` `read["*"]` tests/implementation; those should remain intact as regression coverage and should not be expected to fail in T1.

## Source Spec Alignment

- Success criterion: `executor` has `external_directory: "allow"` and explicit ordered `read` rules while preserving existing executor edit/delegation policy — covered by T1 direct-definition and emitted-config tests, then T2 implementation.
- Success criterion: `explorer` and `librarian` include explicit `read["*"] = "allow"` — already covered by current PR branch tests/implementation and retained as regression coverage.
- Success criterion: preserve `.env` denies and `.env.example` allow — covered by T1 exact `Object.entries(permission.read)` expectations for executor plus retained explorer/librarian regression coverage.
- Success criterion: no new permissions beyond executor external-directory/read additions, research-agent explicit read baseline, and existing research-agent `external_directory: "allow"` — covered by T1 exact top-level permission key-set assertions and T3 full test/typecheck verification.
- Constraint: no ignored local config dependency — plan has no `.opencode/*` task.
- Constraint: no broad new edit/write/bash/task powers — T1 keeps executor's existing edit/todowrite/bounded-task behavior, research-agent non-writing behavior, and no-bash assertions intact.

## Execution Policy

- Follow TDD: T1 must be completed and the targeted test command must fail only because executor is missing `external_directory: "allow"` and nested `read` rules before T2 production changes are made. Existing `explorer`/`librarian` read wildcard coverage is regression coverage and is not an expected RED source.
- Keep changes surgical; do not reformat unrelated files or reorder unrelated permission keys.
- `.opencode/*` is out of scope and must not be touched. Do not rely on normal git diff/status to prove ignored `.opencode/*` is unchanged; if a check is required, use an explicit direct file read/status note for that ignored path only.
- Execute tasks in order: T1 → T2 → T3.
- No tasks are parallel-safe because T2 depends on the RED test expectation from T1, and T3 depends on all implementation changes.

## File Structure

- `src/__tests__/builtin-agents.test.ts`
- `src/__tests__/config-handler-agent.test.ts`
- `src/agents/config.ts` (test import only; no production modification)
- `src/agents/definitions/executor.agent.ts`
- `src/agents/definitions/explorer.agent.ts`
- `src/agents/definitions/librarian.agent.ts`

## File Responsibilities

- `src/__tests__/builtin-agents.test.ts`: asserts built-in agent defaults, including executor external-directory/read rules and preserved edit/delegation policy, research-agent read rules, read-rule entry order, exact top-level permission key sets, non-writing permissions, `external_directory`, and terminal task-deny behavior.
- `src/__tests__/config-handler-agent.test.ts`: asserts emitted built-in agent config through `createConfigHandler`; add executor emitted-config assertions for `external_directory` and ordered nested `read` rules while preserving existing emitted permission checks.
- `src/agents/config.ts`: existing config generation path; must not be modified for this work.
- `src/agents/definitions/executor.agent.ts`: defines the checked-in `executor` built-in agent defaults and permissions; primary implementation target for `external_directory` and ordered read rules.
- `src/agents/definitions/explorer.agent.ts`: defines the checked-in `explorer` built-in agent defaults and permissions.
- `src/agents/definitions/librarian.agent.ts`: defines the checked-in `librarian` built-in agent defaults and permissions.

## Tasks

### T1 — RED: Adjust target-agent permission tests

- **Task ID:** T1
- **Task name:** RED test update for executor permission defaults
- **Purpose:** Make the intended executor external-directory/read behavior executable before changing executor defaults, while retaining existing research-agent read-baseline regression coverage.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/builtin-agents.test.ts`
  - Modify: `src/__tests__/config-handler-agent.test.ts`
  - Test: `src/__tests__/builtin-agents.test.ts`
  - Test: `src/__tests__/config-handler-agent.test.ts`
- **Concrete steps:**
  1. Define or inline the expected order-sensitive read entries exactly as:
     ```ts
     [
       ["*", "allow"],
       ["*.env", "deny"],
       ["*.env.*", "deny"],
       ["*.env.example", "allow"],
     ]
     ```
  2. In `src/__tests__/builtin-agents.test.ts`, add or update an executor permission test that asserts:
     - `permission.external_directory` is exactly `"allow"`.
     - `Object.entries(permission.read)` equals the exact expected entries above.
     - Existing `permission.edit` remains exactly `"allow"`.
     - Existing `permission.apply_patch` remains exactly `"deny"`.
     - Existing `permission.todowrite` remains exactly `"allow"`.
     - Existing bounded `permission.task` remains exactly `{ "*": "deny", explorer: "allow", librarian: "allow" }`.
     - `permission` has no `bash` key.
     - The exact top-level executor permission key set is only `apply_patch`, `edit`, `todowrite`, `task`, `external_directory`, and `read` so no unrelated top-level permission keys slip in.
  3. Keep existing explorer/librarian direct-definition tests as regression coverage, including exact `Object.entries(permission.read)` order and exact top-level permission key-set assertions. Do not rewrite them into the expected RED source because the current PR branch already has their `read["*"]` tests/implementation.
  4. In `src/__tests__/config-handler-agent.test.ts`, add executor emitted-config assertions through `createConfigHandler` that verify emitted `permission.external_directory` is exactly `"allow"`, emitted `Object.entries(permission.read)` equals the exact expected entries above, emitted `edit` remains `"allow"`, emitted `apply_patch` remains `"deny"`, emitted `todowrite` remains `"allow"`, emitted bounded `task` remains exactly `{ "*": "deny", explorer: "allow", librarian: "allow" }`, emitted permission has no `bash`, and emitted top-level permission keys are exactly `apply_patch`, `edit`, `todowrite`, `task`, `external_directory`, and `read`.
  5. Preserve existing config-handler explorer/librarian emitted permission tests as regression coverage; they are not expected to fail in T1.
  6. Do not add tests or assertions for `.opencode/*` local config, and do not touch `.opencode/*` files.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts src/__tests__/config-handler-agent.test.ts`
  - Expected RED result before T2: the command fails only because executor lacks `external_directory: "allow"` and nested `read` rules in direct built-in defaults and emitted config. Existing explorer/librarian wildcard-read assertions should already pass and remain regression coverage.
- **Expected result:**
  - Tests encode executor external-directory/read behavior, executor preservation of edit/apply_patch/todowrite/bounded-task permissions, no executor bash/unrelated top-level keys, emitted-config preservation of executor read/external-directory behavior, and retained explorer/librarian regression coverage.
- **Dependency notes:**
  - Must run before T2.
- **Parallel eligibility:**
  - Not parallelizable; this is the RED gate for the production change.

### T2 — Update executor agent defaults

- **Task ID:** T2
- **Task name:** Add executor external-directory/read defaults
- **Purpose:** Implement the new checked-in executor permission default changes while preserving existing explorer/librarian wildcard-read changes already present on the PR branch.
- **Files to create / modify / test:**
  - Modify: `src/agents/definitions/executor.agent.ts`
  - Test: `src/__tests__/builtin-agents.test.ts`
  - Test: `src/__tests__/config-handler-agent.test.ts`
- **Concrete steps:**
  1. In `src/agents/definitions/executor.agent.ts`, add `external_directory: "allow"` inside `defaults.permission`.
  2. In `src/agents/definitions/executor.agent.ts`, add nested `read` rules inside `defaults.permission` with entries ordered exactly: `"*": "allow"`, `"*.env": "deny"`, `"*.env.*": "deny"`, `"*.env.example": "allow"`.
  3. Preserve executor's existing `apply_patch: "deny"`, `edit: "allow"`, `todowrite: "allow"`, and bounded `task` object exactly. Do not add `bash` or any unrelated executor permission keys.
  4. Do not modify `src/agents/definitions/explorer.agent.ts` or `src/agents/definitions/librarian.agent.ts`; preserve their existing PR-branch `read["*"]` implementation and tests as regression coverage.
  5. Do not modify `src/agents/config.ts` because the evidence packet indicates shallow-cloning is sufficient for this default-object addition; emitted-config behavior is covered by T1 tests only.
  6. Do not touch `.opencode/*` files.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts src/__tests__/config-handler-agent.test.ts`
  - Expected result after T2: targeted tests pass.
- **Expected result:**
  - Executor has `external_directory: "allow"` and explicit nested read defaults with normal reads allowed first and `.env` protections preserved by later specific rules, while preserving existing edit/apply_patch/todowrite/bounded-task behavior and adding no bash/unrelated permission keys. Explorer and librarian existing PR-branch wildcard-read coverage remains intact.
- **Dependency notes:**
  - Depends on T1 RED test update.
- **Parallel eligibility:**
  - Not parallelizable with T1; can be implemented as one small production-change batch after T1 fails for the expected reason.

### T3 — Verification

- **Task ID:** T3
- **Task name:** Targeted, full test, and typecheck verification
- **Purpose:** Confirm the narrow permission-default change satisfies the spec without introducing broader regressions.
- **Files to create / modify / test:**
  - Test: `src/__tests__/builtin-agents.test.ts`
  - Test: `src/__tests__/config-handler-agent.test.ts`
  - Test/check repository via configured commands.
- **Concrete steps:**
  1. Run targeted built-in agent tests.
  2. Run the full test suite.
  3. Run typecheck.
  4. If a verification failure is unrelated to these changes, capture the command and failure summary; do not broaden implementation scope without routing back through the workflow.
  5. Confirm by task discipline that `.opencode/*` was not part of implementation. Do not use ordinary git diff/status as proof for ignored `.opencode/*`; if a specific ignored-config concern arises, inspect that path explicitly and record the direct-read/status note.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts src/__tests__/config-handler-agent.test.ts`
  - Run: `bun test`
  - Run: `bun run typecheck`
  - Expected result: all three commands pass.
- **Expected result:**
  - Targeted tests, full tests, and typecheck pass; implementation remains limited to in-scope test and built-in agent definition changes with no `.opencode/*` task and no unintended permission expansion.
- **Dependency notes:**
  - Depends on T1 and T2 completion.
- **Parallel eligibility:**
  - Not parallelizable with implementation tasks; verification commands should run after T2. `bun test` and `bun run typecheck` may be run independently after the targeted test passes if executor deems local resources sufficient, but record outputs separately.

## QA Standard

- The targeted test must fail after T1 and before T2 only for missing executor `external_directory: "allow"` and nested `read` rules. Existing explorer/librarian `read["*"]` tests/implementation are already present on the PR branch and must remain passing regression coverage.
- T1 must include exact order-sensitive assertions using `Object.entries(permission.read)` equal to `[ ["*", "allow"], ["*.env", "deny"], ["*.env.*", "deny"], ["*.env.example", "allow"] ]` for executor direct built-in defaults and executor emitted config. Existing explorer/librarian assertions remain regression coverage.
- T1 must include exact top-level permission key-set assertions for `executor`, `explorer`, and `librarian` so no extra permission keys are accepted.
- T1 must assert executor preserves `edit: "allow"`, `apply_patch: "deny"`, `todowrite: "allow"`, bounded `task`, no `bash`, and emitted-config `external_directory`/read preservation.
- The targeted test must pass after T2.
- Full verification requires passing:
  - `bun test src/__tests__/builtin-agents.test.ts`
  - `bun test src/__tests__/config-handler-agent.test.ts`
  - `bun test`
  - `bun run typecheck`
- `.opencode/*` is out of scope and tasks must not touch it. Because `.opencode/*` is ignored local config, do not rely on ordinary git diff/status as proof it is unchanged; use explicit direct inspection only if a concrete concern requires it.

## Revisions

- Initial plan created from approved spec and evidence packet. Directly inspected `src/__tests__/builtin-agents.test.ts`, `src/agents/definitions/explorer.agent.ts`, and `src/agents/definitions/librarian.agent.ts` to ground file targets and exact test/update steps.
- Revised plan to require exact order-sensitive `Object.entries(permission.read)` tests, generated built-in config output coverage via `buildBuiltinAgentEntry` or `buildBuiltinAgentEntries`, exact top-level permission key-set assertions, and clearer `.opencode/*` out-of-scope handling without git-diff reliance. Directly inspected `src/agents/config.ts` to confirm exported generated-config helper names and avoid planning a merge-engine refactor.
- Revised plan to include `executor` as the primary target, add `src/agents/definitions/executor.agent.ts` to target files, require RED tests for executor `external_directory`, ordered read rules, preserved edit/apply_patch/todowrite/bounded-task permissions, no bash/unrelated top-level keys, and generated-config preservation, while keeping existing explorer/librarian read-baseline coverage.
- Revised plan to acknowledge current PR-branch explorer/librarian wildcard-read tests/implementation as existing regression coverage, make executor the only expected RED source, include `src/__tests__/config-handler-agent.test.ts` for executor emitted-config assertions, and limit T2 production changes to `src/agents/definitions/executor.agent.ts` only.
