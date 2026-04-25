# Work ID

`20260425-guard-unknown-main-d4e7`

# Goal

Fix the TODO tool guard so unseeded/unknown main-session candidates are guarded before and after tool execution, while existing `executor` and `other` skip semantics remain intact.

# Source Spec

`docs/supercode/20260425-guard-unknown-main-d4e7/spec.md`

# Architecture / Design Strategy

- Replace the current orchestrator-only guard policy with the minimal spec-backed policy: enforce TODO guard behavior for `orchestrator` and `unknown`; preserve existing skip behavior for `executor` and `other` unless a later spec changes it.
- Keep the role resolver unchanged. This work must not broaden event parsing, hook registration, config loading, diagnostics, or bootstrap behavior.
- Keep existing TODO-first logic, block message, stale reminder cadence, pending snapshot handling, and exempt tool handling unchanged.
- Drive behavior change with failing tests first in the focused guard tests and plugin-level hook tests.
- Prefer a small shared role-policy helper if it avoids duplicating divergent checks between `before.ts` and `after.ts`; otherwise keep the condition local and identical in both files.

# Scope

## In Scope

- Update role policy in `src/hooks/todo-tool-guard/before.ts`.
- Update role policy in `src/hooks/todo-tool-guard/after.ts`.
- Update focused tests in `src/__tests__/todo-tool-guard.test.ts`.
- Update plugin-level tests in `src/__tests__/plugin-mcp.test.ts`.
- Run focused tests, full tests, and typecheck.

## Out of Scope

- No changes to EasyCode.
- No diagnostic logging.
- No hook registration redesign.
- No plugin config loading changes.
- No skill bootstrap behavior changes.
- No role resolver event parsing changes unless a failing test after the guard policy fix proves it is still necessary; current plan assumes it is not necessary.
- No changes to TODO normalization, block message text, output reminder shaping, reminder cadence, TTL, or pending snapshot semantics.

# Assumptions

- `SessionRole` currently includes `"orchestrator" | "executor" | "other" | "unknown"`.
- Existing guard tests currently skip `executor`, `other`, and `unknown`; this plan changes only the `unknown` behavior.
- `unknown` must be treated as a main-session candidate and guarded.
- `orchestrator` must remain guarded.
- `executor` and `other` must keep existing skip semantics because the approved spec and challenger feedback do not provide explicit evidence to broaden behavior for `other`.
- Existing `todowrite` and `skill` with `{ name: "todo-sync" }` before-hook exemptions remain unchanged.

# Source Spec Alignment

- Objective: protects main/root sessions when runtime role seeding has not classified the session as `orchestrator` by enforcing guard behavior for `unknown`.
- Desired outcome: treats unknown sessions conservatively while preserving existing `executor` and `other` skip behavior.
- Scope item 1: updates `tool.execute.before` role policy.
- Scope item 2: updates `tool.execute.after` role policy consistently.
- Scope item 3: updates tests that currently assert unseeded sessions are allowed.
- Regression coverage: includes unknown before-hook blocking, executor and other allowance, seeded orchestrator blocking, and after-hook reminder eligibility/skipping.
- Constraints: keeps fix narrow, preserves block message/exemptions, and uses failing tests before behavior-changing production code.

# Execution Policy

- Use TDD: update/add tests first and confirm the relevant focused tests fail for the expected unknown-session behavior before modifying production guard policy.
- Modify only files listed in this plan unless execution finds a directly blocking compile/test issue requiring a narrow supporting edit.
- Keep production changes minimal and role-policy-only.
- Do not change `src/hooks/session-role-resolver/**` unless the plan is revised from the spec.
- Do not commit, push, or create PR as part of execution.
- After each task, run the task-specific QA listed below before moving on.

# File Structure

Existing files expected to be modified:

- `src/hooks/todo-tool-guard/before.ts`
- `src/hooks/todo-tool-guard/after.ts`
- `src/__tests__/todo-tool-guard.test.ts`
- `src/__tests__/plugin-mcp.test.ts`

No new files are required by default. If a shared helper is chosen, keep it within `src/hooks/todo-tool-guard/before.ts`, `after.ts`, or an existing todo-tool-guard module only if that is simpler and type-safe.

# File Responsibilities

- `src/hooks/todo-tool-guard/before.ts`: Decides whether a pre-tool call should be guarded; captures todowrite snapshots; enforces TODO-first block for guarded non-exempt tools.
- `src/hooks/todo-tool-guard/after.ts`: Decides whether post-tool reminder tracking applies; handles todowrite snapshot comparisons; increments stale counters and attaches reminders.
- `src/__tests__/todo-tool-guard.test.ts`: Focused unit/regression coverage for guard behavior across mocked roles and real session-role-resolver integration.
- `src/__tests__/plugin-mcp.test.ts`: Plugin-level integration coverage proving hook wiring and shared resolver state produce the intended guard policy through public plugin hooks.

# Task Sections

## Task T1 — Update focused guard tests for minimal role policy

### Task ID

T1

### Task Name

Focused TODO guard role-policy regression tests

### Purpose

Create failing tests that encode the desired policy before production changes: unknown sessions are guarded, seeded orchestrators remain guarded, and existing executor/other skip semantics are preserved.

### Files to Create / Modify / Test

- Modify/test: `src/__tests__/todo-tool-guard.test.ts`

### Concrete Steps

1. In the before-hook role tests, replace the existing loop that allows `executor`, `other`, and `unknown` with explicit cases:
   - `unknown` with empty TODOs rejects with the existing TODO block message.
   - `executor` with empty TODOs resolves without blocking.
   - `other` with empty TODOs resolves without blocking.
   - Keep or add `orchestrator` coverage proving seeded/main roles still reject with empty TODOs.
2. In the real resolver integration section, change the current unseeded session test from “bypasses guard” to “is blocked by guard with no TODO”.
3. Keep the seeded executor real resolver test and update its description/comment from “only orchestrator blocked” to “known executor skipped” or equivalent.
4. In the after-hook role tests, replace the current loop that skips `executor`, `other`, and `unknown` with explicit cases:
   - `unknown` receives/remains eligible for reminder behavior by driving 20 non-todowrite calls and asserting the 20th output contains `TODO`.
   - `executor` remains untouched after 20 non-todowrite calls.
   - `other` remains untouched after 20 non-todowrite calls.
5. Do not change reminder cadence, output shape assertions, TODO normalization assertions, TTL tests, or snapshot comparison assertions except where role setup is necessary.

### Explicit QA / Verification

- Run `bun test src/__tests__/todo-tool-guard.test.ts` before production changes.
- Expected pre-implementation result: fails only on the newly changed unknown-session expectations because current production code returns early unless role is `orchestrator`.

### Expected Result

Focused tests clearly define the new role policy, fail against the current orchestrator-only implementation only for unknown-session guard expectations, and preserve `executor`/`other` skip expectations.

### Dependency Notes

- No production-code dependency.
- Must be completed before T3 production changes.

### Parallel Eligibility

- Can run in parallel with T2 because it edits a different test file.

## Task T2 — Update plugin-level integration tests for unseeded sessions

### Task ID

T2

### Task Name

Plugin hook regression test for unknown session guard

### Purpose

Ensure the public plugin hook path enforces the same minimal policy for unseeded sessions without requiring event seeding.

### Files to Create / Modify / Test

- Modify/test: `src/__tests__/plugin-mcp.test.ts`

### Concrete Steps

1. In `SupercodePlugin – event seeding enables guard enforcement`, change the unseeded session test from resolving successfully to rejecting with the existing TODO block message.
2. Rename the test to state that an unseeded/unknown session is blocked by `tool.execute.before` when TODO state is empty.
3. Keep the seeded orchestrator test rejecting.
4. Keep the seeded executor test resolving, but update comments/descriptions from “only orchestrator is blocked” to “known executor is skipped” or equivalent.
5. Do not change plugin setup, config loading, hook exposure tests, or MCP default assertions.

### Explicit QA / Verification

- Run `bun test src/__tests__/plugin-mcp.test.ts` before production changes.
- Expected pre-implementation result: fails only on the changed unseeded-session expectation because current production code allows unknown sessions.

### Expected Result

Plugin-level coverage fails on current behavior and proves the eventual fix works through the actual `SupercodePlugin` hook surface.

### Dependency Notes

- No production-code dependency.
- Must be completed before T3 production changes.

### Parallel Eligibility

- Can run in parallel with T1 because it edits a different test file.

## Task T3 — Implement minimal guard role policy

### Task ID

T3

### Task Name

Guard unknown/main-candidate sessions in before and after hooks

### Purpose

Change production behavior so `unknown` sessions and seeded `orchestrator` sessions receive TODO guard enforcement and reminders, while `executor` and `other` keep existing skip behavior.

### Files to Create / Modify / Test

- Modify/test: `src/hooks/todo-tool-guard/before.ts`
- Modify/test: `src/hooks/todo-tool-guard/after.ts`
- Re-test: `src/__tests__/todo-tool-guard.test.ts`
- Re-test: `src/__tests__/plugin-mcp.test.ts`

### Concrete Steps

1. In `before.ts`, replace the current `if (role !== "orchestrator") return` policy with an explicit enforce-for-main-candidates policy.
   - Intended condition: return early unless `role === "orchestrator" || role === "unknown"`.
   - Equivalent skip semantics are acceptable only if they clearly skip `role === "executor" || role === "other"` and enforce for `orchestrator`/`unknown`.
   - Continue to execute existing todowrite snapshot capture, exempt tool checks, TODO fetch, and empty-TODO block logic for `orchestrator` and `unknown` only.
2. In `after.ts`, apply the same role policy before all reminder/snapshot work.
   - Intended condition: return early unless `role === "orchestrator" || role === "unknown"`.
   - Equivalent skip semantics are acceptable only if they clearly skip `role === "executor" || role === "other"` and enforce for `orchestrator`/`unknown`.
   - Continue to process todowrite snapshot comparison and non-todowrite stale reminder logic for `orchestrator` and `unknown` only.
3. Update nearby comments so they describe the new policy accurately without adding diagnostics or broad architectural notes.
4. If using a helper, ensure both hooks call the same helper and that its name communicates skip/enforce semantics clearly.
5. Do not alter block message constants, exempt tool logic, TODO normalization, stale counter thresholds, TTL pruning, or output-shape handling.

### Explicit QA / Verification

- Run `bun test src/__tests__/todo-tool-guard.test.ts src/__tests__/plugin-mcp.test.ts`.
- Verify previously failing T1/T2 unknown-session tests now pass.
- Verify seeded executor tests still pass and do not call guarded behavior that would block empty TODOs.
- Verify explicit `other` role tests still pass and do not call guarded behavior that would block empty TODOs or attach reminders.

### Expected Result

Both hooks enforce the TODO guard/reminder policy for unknown main candidates and seeded orchestrators while preserving existing `executor` and `other` exemptions.

### Dependency Notes

- Depends on T1 and T2 failing tests being in place.

### Parallel Eligibility

- Not parallel with T1/T2 because it depends on their failing tests.
- `before.ts` and `after.ts` changes are conceptually separable but should be implemented together to preserve consistent policy.

## Task T4 — Full verification and regression sweep

### Task ID

T4

### Task Name

Full test and typecheck verification

### Purpose

Prove the narrow role-policy change does not regress existing test or type contracts.

### Files to Create / Modify / Test

- Test only: repository test suite and TypeScript project.

### Concrete Steps

1. Run the focused tests again if not already run after the final production edit:
   - `bun test src/__tests__/todo-tool-guard.test.ts src/__tests__/plugin-mcp.test.ts`
2. Run the full test suite:
   - `bun test`
3. Run the typecheck:
   - `bunx tsc --noEmit`
4. If any failure is unrelated/flaky, capture exact output and do not broaden implementation scope without a routed decision.
5. If any failure is caused by the role-policy change, fix narrowly within the planned files and rerun the failed command plus the full verification commands.

### Explicit QA / Verification

- `bun test src/__tests__/todo-tool-guard.test.ts src/__tests__/plugin-mcp.test.ts` passes.
- `bun test` passes.
- `bunx tsc --noEmit` passes.

### Expected Result

All focused and full verification commands pass with the minimal unknown-session guard policy in place.

### Dependency Notes

- Depends on T3.

### Parallel Eligibility

- Not parallel; verification must run after implementation.

# QA Standard

- Behavior-changing code must be preceded by failing tests for the changed behavior.
- Focused tests must cover:
  - unknown/unseeded before-hook blocking with empty TODO state;
  - known executor before-hook allowance with empty TODO state;
  - `other` before-hook allowance with empty TODO state;
  - seeded orchestrator before-hook blocking with empty TODO state;
  - unknown after-hook reminder eligibility;
  - known executor after-hook skip behavior;
  - `other` after-hook skip behavior;
  - plugin-level unseeded session blocking through `tool.execute.before`.
- Existing semantics that must remain stable:
  - TODO block message content matches existing `/TODO/i` assertions;
  - `todowrite` before-hook exemption and snapshot capture;
  - `skill` with `{ name: "todo-sync" }` before-hook exemption;
  - stale reminder cadence and output-shape behavior;
  - executor and `other` role skip behavior.
- Required final commands:
  - `bun test src/__tests__/todo-tool-guard.test.ts src/__tests__/plugin-mcp.test.ts`
  - `bun test`
  - `bunx tsc --noEmit`

# Revisions

- Initial execution plan created from approved spec `docs/supercode/20260425-guard-unknown-main-d4e7/spec.md` and repository context showing `before.ts`/`after.ts` currently return unless `role === "orchestrator"`, with tests currently expecting unknown sessions to bypass guard behavior.
- Revised plan to address challenger risk: do not broaden behavior for `SessionRole` `"other"` without explicit spec evidence. The intended implementation now enforces only for `"orchestrator"` and `"unknown"`, while preserving existing skip semantics for `"executor"` and `"other"` with explicit regression tests.
