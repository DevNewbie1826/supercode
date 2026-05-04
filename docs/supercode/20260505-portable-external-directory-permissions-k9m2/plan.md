# Plan: Portable OpenCode External Directory Permissions

## Work ID

20260505-portable-external-directory-permissions-k9m2

## Goal

Make the checked-in `explorer` and `librarian` built-in agent permission defaults explicitly allow normal reads via `read["*"] = "allow"` while preserving existing `.env` protections and avoiding ignored local `.opencode/*` configuration changes.

## Source Spec

`docs/supercode/20260505-portable-external-directory-permissions-k9m2/spec.md`

## Architecture / Design Strategy

- Keep the change limited to built-in research-agent default permission objects and their existing tests.
- Add the baseline read wildcard as the first key in each nested `read` permission object so OpenCode last-match-wins semantics keep later `.env` deny rules and `.env.example` exception effective.
- Do not change runtime permission merge logic, global/local OpenCode config, non-research agents, or any edit/write/bash/task permissions.
- Do not refactor `src/agents/config.ts`; only test generated built-in agent config output to confirm the existing clone path preserves nested `read` entries and order.
- Drive implementation with a focused RED test adjustment in `src/__tests__/builtin-agents.test.ts`, then update only the two agent definition files.

## Scope

In scope:
- Update tests for `explorer` and `librarian` read permission defaults.
- Update tests for generated built-in agent config output using `buildBuiltinAgentEntry` or `buildBuiltinAgentEntries`.
- Update `src/agents/definitions/explorer.agent.ts`.
- Update `src/agents/definitions/librarian.agent.ts`.
- Run targeted and full verification commands.

Out of scope:
- `.opencode/*` files.
- OpenCode runtime permission engine changes.
- Machine-local absolute path allowlists.
- Dynamic project-root variables.
- New edit/write/bash/task permissions.
- Changes to non-research agents unless an existing test unexpectedly exposes a direct regression caused by this narrow change.
- Permission merge/clone-engine refactors in `src/agents/config.ts`.

## Assumptions

- Object literal key order is relevant for the intended OpenCode rule ordering and can be asserted practically via `toEqual` on the expected `read` object shape.
- `src/agents/config.ts` shallow-clones permission rule objects, so adding `"*": "allow"` to the checked-in built-in defaults does not require deep-merge changes.
- Existing tests in `src/__tests__/builtin-agents.test.ts` are the correct location for built-in agent permission assertions.
- `buildBuiltinAgentEntry` and `buildBuiltinAgentEntries` are exported from `src/agents/config.ts` and can be imported by `src/__tests__/builtin-agents.test.ts` for generated-config assertions without modifying config production code.

## Source Spec Alignment

- Success criterion: `explorer` and `librarian` include explicit `read["*"] = "allow"` — covered by T1 direct-definition and generated-config tests, then T2 implementation.
- Success criterion: preserve `.env` denies and `.env.example` allow — covered by T1 exact `Object.entries(permission.read)` expectations and T2 insertion order.
- Success criterion: no new permissions beyond explicit read baseline and existing `external_directory: "allow"` — covered by T1 exact top-level permission key-set assertions and T3 full test/typecheck verification.
- Constraint: no ignored local config dependency — plan has no `.opencode/*` task.
- Constraint: no broad new edit/write/bash/task powers — T1 keeps existing non-writing and no-bash-deny assertions intact.

## Execution Policy

- Follow TDD: T1 must be completed and the targeted test command must fail for the missing `read["*"]` baseline before T2 production changes are made.
- Keep changes surgical; do not reformat unrelated files or reorder unrelated permission keys.
- `.opencode/*` is out of scope and must not be touched. Do not rely on normal git diff/status to prove ignored `.opencode/*` is unchanged; if a check is required, use an explicit direct file read/status note for that ignored path only.
- Execute tasks in order: T1 → T2 → T3.
- No tasks are parallel-safe because T2 depends on the RED test expectation from T1, and T3 depends on all implementation changes.

## File Structure

- `src/__tests__/builtin-agents.test.ts`
- `src/agents/config.ts` (test import only; no production modification)
- `src/agents/definitions/explorer.agent.ts`
- `src/agents/definitions/librarian.agent.ts`

## File Responsibilities

- `src/__tests__/builtin-agents.test.ts`: asserts built-in agent defaults, including research-agent read rules, read-rule entry order, generated built-in config output, exact top-level permission key sets, non-writing permissions, `external_directory`, and terminal task-deny behavior.
- `src/agents/config.ts`: provides `buildBuiltinAgentEntry` / `buildBuiltinAgentEntries` for generated-config test coverage; must not be modified for this work.
- `src/agents/definitions/explorer.agent.ts`: defines the checked-in `explorer` built-in agent defaults and permissions.
- `src/agents/definitions/librarian.agent.ts`: defines the checked-in `librarian` built-in agent defaults and permissions.

## Tasks

### T1 — RED: Adjust research-agent read permission tests

- **Task ID:** T1
- **Task name:** RED test update for explicit read baseline
- **Purpose:** Make the intended permission behavior executable before changing agent defaults.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/builtin-agents.test.ts`
  - Test: `src/__tests__/builtin-agents.test.ts`
- **Concrete steps:**
  1. Define or inline the expected order-sensitive read entries for each research agent exactly as:
     ```ts
     [
       ["*", "allow"],
       ["*.env", "deny"],
       ["*.env.*", "deny"],
       ["*.env.example", "allow"],
     ]
     ```
  2. In the existing librarian permission test, assert `Object.entries(permission.read)` equals the exact expected entries above. Keep or adjust object-shape assertions only as secondary coverage; the order-sensitive `Object.entries(...)` assertion is required.
  3. In the existing explorer permission test, assert `Object.entries(permission.read)` equals the exact expected entries above. Keep or adjust object-shape assertions only as secondary coverage; the order-sensitive `Object.entries(...)` assertion is required.
  4. Add exact top-level permission key-set assertions for both `explorer` and `librarian`, using `Object.keys(permission)` or equivalent, so the key list is exactly the current intended set: `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, `task`, `external_directory`, `webfetch`, `doom_loop`, `read`. This must ensure no extra permissions, including `bash`, slip in.
  5. Add generated built-in agent config output coverage by importing `buildBuiltinAgentEntry` or `buildBuiltinAgentEntries` from `../agents/config` and asserting the generated `permission.read` for `explorer` and `librarian` preserves the same exact `Object.entries(...)` order. Prefer `buildBuiltinAgentEntries({}, createBuiltinAgentRegistry())` if it fits existing test setup; `buildBuiltinAgentEntry` with each named built-in agent is also acceptable.
  6. Preserve existing assertions that write/delegation tools remain denied, `external_directory` remains allowed, `webfetch` remains allowed, `doom_loop` remains denied, and `task` remains denied for terminal research agents.
  7. Do not add tests or assertions for `.opencode/*` local config, and do not touch `.opencode/*` files.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts`
  - Expected RED result before T2: the command fails because `permission.read` for `explorer` and `librarian` does not yet include `"*": "allow"`.
- **Expected result:**
  - Tests encode the required wildcard read baseline, exact read-entry ordering, generated-config preservation of read-entry ordering, exact top-level permission key sets, and the `.env` deny / `.env.example` allow rules.
- **Dependency notes:**
  - Must run before T2.
- **Parallel eligibility:**
  - Not parallelizable; this is the RED gate for the production change.

### T2 — Update explorer and librarian agent defaults

- **Task ID:** T2
- **Task name:** Add explicit read wildcard baseline to research agents
- **Purpose:** Implement the checked-in permission default change required by the spec.
- **Files to create / modify / test:**
  - Modify: `src/agents/definitions/explorer.agent.ts`
  - Modify: `src/agents/definitions/librarian.agent.ts`
  - Test: `src/__tests__/builtin-agents.test.ts`
- **Concrete steps:**
  1. In `src/agents/definitions/explorer.agent.ts`, add `"*": "allow"` as the first entry inside `defaults.permission.read`.
  2. In `src/agents/definitions/librarian.agent.ts`, add `"*": "allow"` as the first entry inside `defaults.permission.read`.
  3. Leave the existing later entries unchanged and ordered after the wildcard: `"*.env": "deny"`, `"*.env.*": "deny"`, `"*.env.example": "allow"`.
  4. Do not alter `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, `task`, `external_directory`, `webfetch`, `doom_loop`, `bash`, prompt, mode, description, color, or temperature settings.
  5. Do not modify `src/agents/config.ts` because the evidence packet indicates shallow-cloning is sufficient for this default-object addition; generated-config behavior is covered by T1 tests only.
  6. Do not touch `.opencode/*` files.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts`
  - Expected result after T2: targeted tests pass.
- **Expected result:**
  - Both research agents have explicit nested read defaults with normal reads allowed first and `.env` protections preserved by later specific rules, with no extra top-level permission keys introduced.
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
  - Test/check repository via configured commands.
- **Concrete steps:**
  1. Run targeted built-in agent tests.
  2. Run the full test suite.
  3. Run typecheck.
  4. If a verification failure is unrelated to these changes, capture the command and failure summary; do not broaden implementation scope without routing back through the workflow.
  5. Confirm by task discipline that `.opencode/*` was not part of implementation. Do not use ordinary git diff/status as proof for ignored `.opencode/*`; if a specific ignored-config concern arises, inspect that path explicitly and record the direct-read/status note.
- **Explicit QA / verification:**
  - Run: `bun test src/__tests__/builtin-agents.test.ts`
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

- The targeted test must fail after T1 and before T2 for the missing `read["*"]` baseline.
- T1 must include exact order-sensitive assertions using `Object.entries(permission.read)` equal to `[ ["*", "allow"], ["*.env", "deny"], ["*.env.*", "deny"], ["*.env.example", "allow"] ]` for direct built-in definitions and generated built-in config output.
- T1 must include exact top-level permission key-set assertions for both `explorer` and `librarian` so no extra permission keys are accepted.
- The targeted test must pass after T2.
- Full verification requires passing:
  - `bun test src/__tests__/builtin-agents.test.ts`
  - `bun test`
  - `bun run typecheck`
- `.opencode/*` is out of scope and tasks must not touch it. Because `.opencode/*` is ignored local config, do not rely on ordinary git diff/status as proof it is unchanged; use explicit direct inspection only if a concrete concern requires it.

## Revisions

- Initial plan created from approved spec and evidence packet. Directly inspected `src/__tests__/builtin-agents.test.ts`, `src/agents/definitions/explorer.agent.ts`, and `src/agents/definitions/librarian.agent.ts` to ground file targets and exact test/update steps.
- Revised plan to require exact order-sensitive `Object.entries(permission.read)` tests, generated built-in config output coverage via `buildBuiltinAgentEntry` or `buildBuiltinAgentEntries`, exact top-level permission key-set assertions, and clearer `.opencode/*` out-of-scope handling without git-diff reliance. Directly inspected `src/agents/config.ts` to confirm exported generated-config helper names and avoid planning a merge-engine refactor.
