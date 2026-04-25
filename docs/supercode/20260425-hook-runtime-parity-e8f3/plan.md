# Work ID

`20260425-hook-runtime-parity-e8f3`

# Goal

Bring Supercode `skill-bootstrap` and `todo-continuation-enforcer` runtime behavior into parity with the EasyCode-compatible runtime shapes proven in the source spec, while preserving Supercode prompt content, existing duplicate prevention, and existing continuation safety semantics.

# Source Spec

`docs/supercode/20260425-hook-runtime-parity-e8f3/spec.md`

# Architecture / Design Strategy

- Keep changes localized to the two hook implementations and their focused tests.
- Use TDD for every reproduced Supercode/EasyCode difference: add a focused regression test, run the targeted test file and confirm the new assertion fails for the expected no-op/timer behavior, then implement the smallest code change needed to make it pass.
- For `skill-bootstrap`, separate path discovery from injection behavior so ordered candidate lookup and no-`info.sessionID` injection remain independently testable.
- For `todo-continuation-enforcer`, preserve existing cancellation, reschedule, timer cleanup, and prompt content behavior while removing continuation role gating and relaxing only the spec-approved runtime parsing/scheduling cases.
- Prefer existing test helpers and hook invocation patterns in `src/__tests__/skill-bootstrap.test.ts` and `src/__tests__/todo-continuation-enforcer.test.ts`; do not introduce new test frameworks or broad fixtures.

# Scope

## In Scope

- Add regression coverage for the reproduced `skill-bootstrap` path layout and missing `info.sessionID` differences.
- Implement ordered `skill-bootstrap.md` path candidate resolution using the exact order from the spec.
- Allow bootstrap injection into the first user message when `info.sessionID` is absent, while preserving single-injection/duplicate-prevention semantics and safe no-op for missing/blank markdown.
- Add regression coverage for `todo-continuation-enforcer` no-role-gate continuation, `session.idle` `properties.info.id` session extraction, and zero-second immediate execution.
- Implement the narrow continuation changes required by those tests.
- Run targeted hook tests, full test suite, and TypeScript typecheck.

## Out of Scope

- TODO guard blocking/reminder policy changes.
- Diagnostic logging.
- Plugin registration or config loading redesign.
- EasyCode changes.
- Bootstrap prompt content changes beyond runtime shape support.
- Continuation prompt content changes beyond what existing tests already require.
- Unrelated event parsing broadening outside `skill-bootstrap` and `todo-continuation-enforcer`.

# Assumptions

- The approved spec is authoritative for parity behavior and candidate path order.
- Existing tests already cover baseline duplicate prevention, deletion cancellation, rescheduling, isolation, and error swallowing; new tests should augment, not replace, that coverage.
- EasyCode continuation has no role gate; Supercode should not preserve `other` exclusion for continuation prompting.
- If existing helpers make exact file names differ from the likely files below, execution may use the actual nearby hook/test files but must not expand beyond the two hooks and their tests without returning for plan revision.

# Source Spec Alignment

| Spec requirement | Planned coverage |
| --- | --- |
| Ordered bootstrap candidate paths | Task B1 adds RED tests; Task B2 implements first-existing lookup in exact order. |
| Copied plugin layout via `<moduleDir>/../src/hooks/skill-bootstrap/skill-bootstrap.md` | Task B1 includes a regression for that layout; Task B2 makes it pass. |
| Bootstrap injection without `info.sessionID` | Task B3 adds RED regression and implementation. |
| Preserve duplicate prevention and safe no-op | Tasks B1-B3 require existing bootstrap tests plus explicit no-op/duplicate checks to remain passing. |
| No-role-gate continuation with incomplete TODOs | Task C1 adds RED regressions and removes continuation role gating. |
| `session.idle` extraction from `properties.info.id` | Task C2 adds RED regression and implementation. |
| Zero-second countdown executes immediately | Task C3 adds RED regression and implementation avoiding timer-tick dependency. |
| Preserve continuation deletion/reschedule/isolation/error-swallowing | Tasks C1-C3 require existing continuation tests to stay passing; Task Q1 runs target and full suites. |
| Full test suite and typecheck pass | Task Q1 executes required final verification. |

# Execution Policy

- Modify only files listed in this plan unless a discovered existing helper/test file is directly required for the same two hooks; if so, document the reason in execution notes and keep scope equivalent.
- For each reproduced difference, perform and record TDD RED before production changes:
  1. Add the focused regression test.
  2. Run the relevant targeted test command.
  3. Confirm the new test fails for the expected current behavior.
  4. Implement the minimal production change.
  5. Re-run the relevant targeted test command and confirm GREEN.
- Do not batch production implementation before all associated RED failures for that task are observed.
- Preserve prompt text unless an existing test requires otherwise.
- Prefer deterministic tests; do not rely on real time delays for zero-second countdown behavior.
- After code edits, run LSP/TypeScript diagnostics on touched TypeScript files where available, then run required Bun and TypeScript commands.

# File Structure

```text
docs/supercode/20260425-hook-runtime-parity-e8f3/
  spec.md
  plan.md
src/hooks/skill-bootstrap/
  index.ts
  skill-bootstrap.md
src/hooks/todo-continuation-enforcer/
  index.ts
  constants.ts
  session-status-normalizer.ts
src/__tests__/
  skill-bootstrap.test.ts
  todo-continuation-enforcer.test.ts
```

# File Responsibilities

- `docs/supercode/20260425-hook-runtime-parity-e8f3/plan.md`: execution plan only; no runtime code.
- `src/hooks/skill-bootstrap/index.ts`: bootstrap markdown candidate resolution and first-user-message injection behavior.
- `src/hooks/skill-bootstrap/skill-bootstrap.md`: existing bootstrap content fixture/source; should not be edited unless existing tests require fixture-only setup, and prompt content must remain unchanged.
- `src/__tests__/skill-bootstrap.test.ts`: focused bootstrap parity regressions and existing bootstrap behavior coverage.
- `src/hooks/todo-continuation-enforcer/index.ts`: idle event parsing, role gating, countdown scheduling/immediate execution, cancellation/timer behavior.
- `src/hooks/todo-continuation-enforcer/constants.ts`: role constants only if existing implementation centralizes `TARGET_ROLES` or role exclusion here.
- `src/hooks/todo-continuation-enforcer/session-status-normalizer.ts`: session ID/status extraction only if existing implementation centralizes idle payload normalization here.
- `src/__tests__/todo-continuation-enforcer.test.ts`: focused continuation parity regressions and existing continuation behavior coverage.

# Task Sections

## Task B1 — Bootstrap ordered candidate path RED tests

- **Task id:** B1
- **Task name:** Add failing tests for EasyCode-compatible bootstrap markdown lookup layouts.
- **Purpose:** Prove Supercode currently no-ops for copied plugin layouts and does not honor the exact ordered candidate set required by the spec.
- **Files to create / modify / test:**
  - Modify/test: `src/__tests__/skill-bootstrap.test.ts`
  - Test indirectly: `src/hooks/skill-bootstrap/index.ts`
- **Concrete steps:**
  1. Add a regression that constructs a temporary `moduleDir` representing a copied plugin layout where `skill-bootstrap.md` exists at `<moduleDir>/../src/hooks/skill-bootstrap/skill-bootstrap.md` and not at the current single Supercode lookup path.
  2. Assert the hook inserts exactly one bootstrap part into the first user message using existing Supercode bootstrap content/shape expectations.
  3. Add an ordered-first-existing regression if not already covered: create multiple candidate files with distinguishable markdown and assert candidate 1 wins over later candidates, or candidate 3 wins when candidates 1 and 2 are absent.
  4. Run `bun test src/__tests__/skill-bootstrap.test.ts`.
  5. Confirm RED: the new copied-layout/ordered-candidate assertion fails because current code does not find the required candidate path.
- **Explicit QA / verification:**
  - RED evidence from `bun test src/__tests__/skill-bootstrap.test.ts` must show the new path lookup test failing before production code changes.
  - Existing bootstrap tests in the same file must not be weakened or skipped.
- **Expected result:** Focused failing regression(s) exist for ordered bootstrap path resolution.
- **Dependency notes:** Depends only on the approved spec and current test helpers.
- **Parallel eligibility:** Can run in parallel with C1/C2/C3 test-authoring only if no shared test utilities are edited; must complete before B2 implementation.

## Task B2 — Implement ordered bootstrap markdown resolution

- **Task id:** B2
- **Task name:** Resolve `skill-bootstrap.md` from the exact spec candidate list.
- **Purpose:** Make bootstrap content discovery tolerate the runtime layouts EasyCode handles while preserving safe no-op behavior.
- **Files to create / modify / test:**
  - Modify: `src/hooks/skill-bootstrap/index.ts`
  - Test: `src/__tests__/skill-bootstrap.test.ts`
- **Concrete steps:**
  1. In `src/hooks/skill-bootstrap/index.ts`, replace the single exact path lookup with ordered candidate resolution using caller-provided `moduleDir`:
     - `<moduleDir>/skill-bootstrap.md`
     - `<moduleDir>/hooks/skill-bootstrap/skill-bootstrap.md`
     - `<moduleDir>/../src/hooks/skill-bootstrap/skill-bootstrap.md`
     - `<moduleDir>/../../src/hooks/skill-bootstrap/skill-bootstrap.md`
  2. Use the first existing file from that list.
  3. Preserve current behavior when no candidate exists or the chosen file is blank: no bootstrap insertion and no thrown error.
  4. Do not change bootstrap markdown content or injected prompt text.
  5. Run `bun test src/__tests__/skill-bootstrap.test.ts`.
- **Explicit QA / verification:**
  - B1 RED test(s) become GREEN.
  - Existing safe no-op and duplicate-prevention bootstrap tests remain GREEN.
  - If available, run LSP/TypeScript diagnostics for `src/hooks/skill-bootstrap/index.ts` after the edit.
- **Expected result:** Bootstrap uses the exact ordered candidate set and injects from copied plugin layouts where it previously no-oped.
- **Dependency notes:** Requires B1 RED evidence first.
- **Parallel eligibility:** Not parallel with B1 or B3 if editing `src/hooks/skill-bootstrap/index.ts`; can be separate from continuation tasks after RED tests are established.

## Task B3 — Bootstrap no-`info.sessionID` RED test and implementation

- **Task id:** B3
- **Task name:** Inject bootstrap into first user message without requiring `info.sessionID`.
- **Purpose:** Match EasyCode behavior for first user messages that lack `info.sessionID` while preserving duplicate prevention.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/skill-bootstrap.test.ts`
  - Modify: `src/hooks/skill-bootstrap/index.ts`
- **Concrete steps:**
  1. Add a regression where the first user message has no `info.sessionID` but otherwise matches the runtime shape used by existing bootstrap tests.
  2. Assert a bootstrap part is inserted exactly once with required fields remaining type-safe: `id`, `messageID`, `type`, `text`, and `synthetic`; do not require a defined `sessionID` if the runtime message lacks one.
  3. Run `bun test src/__tests__/skill-bootstrap.test.ts` and confirm RED from the current early return/no insertion.
  4. Update `src/hooks/skill-bootstrap/index.ts` to remove only the hard sessionID precondition that blocks first-message injection.
  5. Ensure duplicate detection still prevents a second bootstrap insertion when the hook sees an already-bootstrapped message/part.
  6. Re-run `bun test src/__tests__/skill-bootstrap.test.ts`.
- **Explicit QA / verification:**
  - RED evidence must show the no-`info.sessionID` regression failing before implementation.
  - GREEN evidence must show the new regression plus existing single-injection and duplicate-prevention tests passing.
  - If available, run LSP/TypeScript diagnostics for `src/hooks/skill-bootstrap/index.ts`.
- **Expected result:** Bootstrap inserts into the first user message even when `info.sessionID` is absent, without duplicate insertion regressions.
- **Dependency notes:** May depend on B2 if the test needs candidate path setup; otherwise independent within bootstrap scope. Must not change prompt content.
- **Parallel eligibility:** Not parallel with B2 when both edit `src/hooks/skill-bootstrap/index.ts`; can run after B2 or be combined only if each RED is captured before production edits.

## Task C1 — No-role-gate continuation RED test and implementation

- **Task id:** C1
- **Task name:** Continue idle incomplete TODO sessions regardless of resolver role.
- **Purpose:** Match EasyCode's continuation behavior by removing Supercode's role gate from the continuation enforcer.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Modify as needed: `src/hooks/todo-continuation-enforcer/index.ts`
  - Modify as needed: `src/hooks/todo-continuation-enforcer/constants.ts`
- **Concrete steps:**
  1. Add regressions for `session.idle` with incomplete TODO state and roles `unknown` and `other`; assert continuation prompts are sent/scheduled using existing prompt assertions.
  2. Run `bun test src/__tests__/todo-continuation-enforcer.test.ts` and confirm RED for current role-gated no-op behavior.
  3. Remove the continuation role gate from the enforcer so idle incomplete TODO sessions are eligible regardless of resolver role.
  5. Re-run `bun test src/__tests__/todo-continuation-enforcer.test.ts`.
- **Explicit QA / verification:**
  - RED evidence must show the new role-gate regressions failing before implementation.
  - GREEN evidence must show `unknown` and `other` both prompt when idle with incomplete TODOs.
  - Existing deletion, reschedule, isolation, and error-swallowing tests remain GREEN.
- **Expected result:** Idle incomplete TODO sessions receive continuation prompts regardless of resolver role.
- **Dependency notes:** Independent of bootstrap tasks. Coordinate with C2/C3 because all may edit `src/hooks/todo-continuation-enforcer/index.ts`.
- **Parallel eligibility:** Test authoring can run in parallel with B tasks; production edit should not overlap with C2/C3 production edits to avoid conflicting role/session scheduling logic.

## Task C2 — `properties.info.id` session extraction RED test and implementation

- **Task id:** C2
- **Task name:** Extract `sessionID` from `session.idle` `properties.info.id`.
- **Purpose:** Match EasyCode's observed tolerance for idle payloads that carry the session identifier at `properties.info.id` instead of the currently expected location.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Modify as needed: `src/hooks/todo-continuation-enforcer/index.ts`
  - Modify as needed: `src/hooks/todo-continuation-enforcer/session-status-normalizer.ts`
- **Concrete steps:**
  1. Add a regression for a `session.idle` event whose usable session ID is only present at `properties.info.id`.
  2. Ensure the fixture also has incomplete TODO state and an eligible role so the only reason for current failure is missing session ID extraction.
  3. Run `bun test src/__tests__/todo-continuation-enforcer.test.ts` and confirm RED because current code does not extract from `properties.info.id`.
  4. Update the existing idle event/session normalization path to fall back to `properties.info.id` when the primary session ID is absent.
  5. Keep parsing narrow to `session.idle` handling; do not broaden unrelated event shapes.
  6. Re-run `bun test src/__tests__/todo-continuation-enforcer.test.ts`.
- **Explicit QA / verification:**
  - RED evidence must show the new `properties.info.id` regression failing before implementation.
  - GREEN evidence must show continuation prompt scheduling/sending for the fallback ID case.
  - Existing session deletion cancellation and timer cleanup tests remain GREEN.
- **Expected result:** `session.idle` events with `properties.info.id` can locate the session and continue when TODOs are incomplete.
- **Dependency notes:** Coordinate with C1 if role eligibility is required in the same fixture; avoid making this test depend on `unknown` unless intentionally covering both would obscure the session-ID failure.
- **Parallel eligibility:** Test authoring can run in parallel with B tasks; production edit should be sequenced with C1/C3 production edits.

## Task C3 — Zero-second countdown RED test and immediate execution implementation

- **Task id:** C3
- **Task name:** Execute zero-second continuation countdown immediately.
- **Purpose:** Remove timer-tick dependency for zero-second countdowns and match EasyCode's deterministic immediate behavior.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Modify: `src/hooks/todo-continuation-enforcer/index.ts`
- **Concrete steps:**
  1. Add a deterministic regression configured for a zero-second continuation countdown.
  2. Assert the continuation action occurs synchronously/immediately after idle handling without advancing fake timers or waiting for a timer callback.
  3. Run `bun test src/__tests__/todo-continuation-enforcer.test.ts` and confirm RED because current behavior schedules through a timer callback.
  4. Update countdown handling so a computed zero-second delay invokes the continuation path immediately.
  5. Preserve nonzero countdown scheduling through existing timer/cancellation cleanup logic.
  6. Re-run `bun test src/__tests__/todo-continuation-enforcer.test.ts`.
- **Explicit QA / verification:**
  - RED evidence must show immediate assertion failing before implementation.
  - GREEN evidence must show zero-second immediate execution and existing nonzero timer/deletion/reschedule tests passing.
  - If available, run LSP/TypeScript diagnostics for `src/hooks/todo-continuation-enforcer/index.ts`.
- **Expected result:** Zero-second countdown continuation executes immediately; nonzero timer behavior and cleanup are unchanged.
- **Dependency notes:** Independent of C1/C2 at the behavior level but likely shares implementation file; sequence production edits to keep diffs reviewable.
- **Parallel eligibility:** Test authoring can run in parallel with B tasks; production edit should be sequenced with C1/C2 production edits.

## Task Q1 — Final integrated verification

- **Task id:** Q1
- **Task name:** Run required focused and full quality gates.
- **Purpose:** Confirm all spec success criteria and existing hook behavior remain intact after localized changes.
- **Files to create / modify / test:**
  - Test: `src/__tests__/skill-bootstrap.test.ts`
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Typecheck: all TypeScript files in project
- **Concrete steps:**
  1. Run `bun test src/__tests__/skill-bootstrap.test.ts src/__tests__/todo-continuation-enforcer.test.ts`.
  2. Run `bun test`.
  3. Run `bunx tsc --noEmit`.
  4. Review failures, if any, and route back to the specific task area rather than making broad unrelated changes.
- **Explicit QA / verification:**
  - Targeted hook tests pass.
  - Full test suite passes.
  - TypeScript typecheck passes.
  - No tests are skipped, weakened, or rewritten to hide a regression.
- **Expected result:** The implementation satisfies all source spec success criteria with passing targeted/full tests and typecheck.
- **Dependency notes:** Requires B1-B3 and C1-C3 complete and GREEN.
- **Parallel eligibility:** Not parallel; final gate must run after all implementation tasks.

# QA Standard

- Every reproduced difference must have a focused regression test that is observed RED before the corresponding production change:
  - Bootstrap copied plugin/candidate path lookup.
  - Bootstrap missing `info.sessionID` injection.
  - Continuation without role gating for incomplete TODOs.
  - `session.idle` fallback session ID from `properties.info.id`.
  - Zero-second immediate continuation execution.
- Required commands:
  - `bun test src/__tests__/skill-bootstrap.test.ts`
  - `bun test src/__tests__/todo-continuation-enforcer.test.ts`
  - `bun test src/__tests__/skill-bootstrap.test.ts src/__tests__/todo-continuation-enforcer.test.ts`
  - `bun test`
  - `bunx tsc --noEmit`
- Use existing fake timer/test isolation patterns for continuation tests; zero-second immediate behavior must not require advancing timers.
- Preserve existing tests for duplicate bootstrap prevention, safe missing/blank bootstrap no-op, deletion cancellation, rescheduling, isolation, and error swallowing.
- Run LSP/TypeScript diagnostics on touched TypeScript implementation files when available before final verification.

# Revisions

- Initial plan created from approved spec `docs/supercode/20260425-hook-runtime-parity-e8f3/spec.md`; includes explicit TDD RED requirements for each reproduced EasyCode/Supercode runtime difference and keeps implementation scope limited to the two hook areas.
