# Work ID

`20260425-guard-role-fix-a19c`

## Goal

Restore orchestrator/executor targeting for the hook subsystem by replacing undocumented role inference with SDK-type-conformant event seeding, then prove the fix with realistic resolver tests, plugin-level guard integration, and continuation-targeting regressions.

## Source Spec

- Approved spec: `/Users/mirage/go/src/supercode/.worktrees/20260425-guard-role-fix-a19c/docs/supercode/20260425-guard-role-fix-a19c/spec.md`
- Planning source of truth: the approved spec above, especially the authoritative event families, classification contract, fallback policy, and success criteria.

## Architecture / Design Strategy

1. Keep the existing hook-system shape from the prior hook design (`src/hooks/session-role-resolver`, `src/hooks/todo-tool-guard`, `src/hooks/todo-continuation-enforcer`, `src/index.ts`) rather than redesigning the subsystem.
2. Move session classification to a positive-evidence pipeline only:
   - cache root/child session lifecycle facts from `session.created` / `session.updated`
   - remove cached lifecycle data on `session.deleted`
   - classify `executor` from cached child-session evidence (`parentID` present)
   - classify `orchestrator` only when a cached root session later receives an assistant `message.updated` with `mode === "primary"`
   - leave sessions `unknown` when authoritative evidence is incomplete
3. Preserve a single shared resolver instance per plugin instance as an explicit invariant: the plugin `event` hook must seed the same in-memory resolver later read by `tool.execute.before` and continuation enforcement, with no duplicate per-hook resolver construction.
4. Verify behavior at three levels:
    - resolver-level tests for real event-shape sequences
    - plugin-level integration proving the shared resolver instance carries event seeding into later `tool.execute.before` blocking
    - continuation-targeting regressions proving orchestrator/executor remain the only targeted roles while `unknown` remains non-targeted

## Scope

In scope:

- revising role seeding and lookup to match the approved SDK event contract
- removing undocumented resolver assumptions from session events
- adding realistic resolver tests for root/orchestrator, child/executor, and unknown fallback cases
- adding plugin-level integration coverage for event seeding plus TODO guard blocking
- preserving continuation targeting for orchestrator/executor under the revised resolver behavior
- focused regression verification with `bun test` and `bunx tsc --noEmit`

Out of scope:

- implementing a new hook architecture
- broadening enforcement to all `unknown` sessions
- prompt/bootstrap behavior changes unrelated to the resolver contract
- finish-workflow or unrelated PR #4 feature changes

## Assumptions

1. The execution branch for this work includes the hook-system baseline described by the spec: `session-role-resolver`, `todo-tool-guard`, and `todo-continuation-enforcer` under `src/hooks/`. If those files are absent when execution starts, stop and route back; this plan is for the fix-on-top, not the initial hook-system build.
2. Existing tests already run under Bun and can add new hook-focused cases in `src/__tests__/` without introducing a new test framework.
3. Resolver state can remain in-memory and plugin-instance-scoped; no persistence changes are required for this fix.
4. The current plugin wiring continues to expose a shared `event` hook and `tool.execute.before` hook through `src/index.ts`.
5. If the current codebase still exports `other` in shared role types, that type may remain for compatibility, but this fix does not require adding or expanding any new positive-evidence path for producing `other`.

## Source Spec Alignment

| Spec requirement / success criteria | Planned coverage |
| --- | --- |
| Stop relying on undocumented `agent` fields or session-event mode assumptions | Task 1 locks authoritative event-shape tests; Task 2 removes unsupported inference and seeds only from approved event families. |
| Root session + assistant `mode === "primary"` becomes `orchestrator` | Tasks 1-2 add and satisfy explicit resolver tests for that sequence. |
| Child session with `parentID` becomes `executor` | Tasks 1-2 add and satisfy explicit resolver tests for child-session lifecycle events. |
| Guard blocks non-exempt tool use after orchestrator seeding | Tasks 1 and 3 add plugin-level red/green coverage across `event` then `tool.execute.before`, explicitly through one shared resolver instance. |
| `unknown` still bypasses orchestrator-only enforcement | Tasks 1 and 3 include explicit bypass tests and keep guard targeting narrow. |
| Continuation still targets orchestrator/executor correctly | Task 4 adds continuation regression coverage against the revised resolver contract, centered on orchestrator/executor targeting and unknown bypass. |
| Focused tests reflect SDK-type-conformant fixtures | Task 1 requires typed fixtures/sequences built from the approved event families only. |
| Full verification passes | Task 5 runs focused regressions, `bun test`, and `bunx tsc --noEmit`. |

## Execution Policy

- Execute with TDD: add or update failing tests before changing production hook logic.
- Keep changes bounded to resolver, hook consumers, plugin wiring, and directly related tests.
- Do not add agent-name fallbacks, undocumented event fields, or broad `unknown` blocking.
- Prefer updating existing hook files over creating new abstractions unless repeated logic becomes unreviewable.
- Preserve one shared resolver instance per plugin instance: guard and continuation code should depend on resolver output, not re-parse raw events independently or construct separate resolver state.
- Do not make `other` a planning dependency for this fix; center execution and verification on `orchestrator`, `executor`, and `unknown` unless a concrete existing positive-evidence path already exists in code and requires compatibility retention.
- If execution discovers the approved event families do not carry enough evidence for positive seeding, stop and route back instead of inventing speculative heuristics.

## File Structure

Expected production files in scope:

- `src/index.ts`
- `src/hooks/session-role-resolver/index.ts`
- `src/hooks/session-role-resolver/types.ts`
- `src/hooks/todo-tool-guard/index.ts`
- `src/hooks/todo-tool-guard/before.ts`
- `src/hooks/todo-tool-guard/after.ts`
- `src/hooks/todo-continuation-enforcer/index.ts`
- any small helper inside those existing hook directories only if required by the fix

Expected test files in scope:

- `src/__tests__/session-role-resolver.test.ts`
- `src/__tests__/plugin-mcp.test.ts`
- `src/__tests__/todo-tool-guard.test.ts`
- `src/__tests__/todo-continuation-enforcer.test.ts`

## File Responsibilities

- `src/hooks/session-role-resolver/index.ts`: authoritative event observation, lifecycle caching, classification, cache cleanup, resolver read API.
- `src/hooks/session-role-resolver/types.ts`: exported resolver/event-state types that reflect the revised positive-evidence contract.
- `src/hooks/todo-tool-guard/index.ts` / `before.ts` / `after.ts`: consume resolver output without widening enforcement; ensure `unknown` still bypasses and seeded `orchestrator` still blocks.
- `src/hooks/todo-continuation-enforcer/index.ts`: continue targeting only `orchestrator` and `executor` based on resolver output.
- `src/index.ts`: compose one shared resolver instance with plugin `event`, `tool.execute.before`, and any existing hook wiring so seeding occurs before downstream checks and all consumers read the same resolver state.
- `src/__tests__/session-role-resolver.test.ts`: authoritative event-shape unit coverage for root/orchestrator, child/executor, deleted-session cleanup, and unknown fallback.
- `src/__tests__/plugin-mcp.test.ts`: plugin-instance integration proving event seeding and later guard enforcement cooperate through the same shared resolver state.
- `src/__tests__/todo-tool-guard.test.ts`: focused guard behavior, including seeded orchestrator blocking and unknown bypass.
- `src/__tests__/todo-continuation-enforcer.test.ts`: regression coverage that continuation targeting still applies to orchestrator/executor and skips unknown; include `other` only if an existing positive-evidence path already exists and remains in use.

## Task Sections

### Task T1 — Lock the authoritative event contract in failing tests

- **Task ID:** T1
- **Task Name:** Authoritative resolver and integration red tests
- **Purpose:** Convert the spec’s runtime contract into executable tests before changing resolver behavior.
- **Files to create / modify / test:**
  - Create or modify: `src/__tests__/session-role-resolver.test.ts`
  - Modify: `src/__tests__/plugin-mcp.test.ts`
  - Modify: `src/__tests__/todo-tool-guard.test.ts`
  - Modify: `src/__tests__/todo-continuation-enforcer.test.ts`
- **Concrete steps:**
  1. Add resolver tests using only the approved event families and shapes:
     - root `session.created` / `session.updated` without `parentID` stays non-positive until a matching assistant `message.updated` with `mode === "primary"`
     - child session lifecycle event with `parentID` resolves to `executor`
     - incomplete evidence remains `unknown`
     - `session.deleted` clears cached classification/state
  2. Add a plugin-level integration test that seeds an orchestrator through the plugin `event` hook, then calls `tool.execute.before` for a non-exempt tool with no TODO state and expects blocking through the same shared resolver instance.
  3. Add or update guard tests to keep explicit `unknown` bypass coverage.
  4. Add or update continuation tests to confirm orchestrator/executor are targeted and `unknown` is skipped under the revised contract; add `other` coverage only if the codebase already has a concrete positive-evidence path that remains intentionally supported.
  5. Run the focused tests and confirm they fail for the expected resolver/guard reasons before production edits begin.
- **Explicit QA / verification:**
  - `bun test src/__tests__/session-role-resolver.test.ts src/__tests__/plugin-mcp.test.ts src/__tests__/todo-tool-guard.test.ts src/__tests__/todo-continuation-enforcer.test.ts`
  - Expected before implementation: at least the new resolver/guard assertions fail because current role seeding does not satisfy the contract.
- **Expected result:** A failing test harness that precisely describes the required fix and preserves current scope.
- **Dependency notes:** First task; establishes the red baseline for all production changes.
- **Parallel eligibility:** No.

### Task T2 — Revise shared role seeding to match actual SDK event shapes

- **Task ID:** T2
- **Task Name:** Replace speculative role inference with positive-evidence seeding
- **Purpose:** Make the shared resolver classify sessions only from authoritative lifecycle and assistant-message evidence.
- **Files to create / modify / test:**
  - Modify: `src/hooks/session-role-resolver/index.ts`
  - Modify: `src/hooks/session-role-resolver/types.ts`
  - Test: `src/__tests__/session-role-resolver.test.ts`
- **Concrete steps:**
  1. Remove any dependency on undocumented `agent` fields or session-event `mode` assumptions.
  2. Cache session lifecycle facts keyed by `sessionID`, including whether `parentID` is present.
  3. On assistant `message.updated`, upgrade a known root session to `orchestrator` only when the message belongs to the same session and `mode === "primary"`.
  4. Resolve known child sessions to `executor` without needing assistant-message seeding.
  5. Keep all unsupported or incomplete cases at `unknown`; do not add or expand an `other` inference path for this fix unless an existing implementation contract already requires a concrete positive-evidence mapping.
  6. Prune or clear cached state on `session.deleted` and through any existing resolver disposal path.
  7. Stabilize the exported resolver role/type surface before downstream hook work begins.
  8. Re-run resolver tests until the authoritative contract passes.
- **Explicit QA / verification:**
  - `bun test src/__tests__/session-role-resolver.test.ts`
  - Confirm resolver tests pass and no assertion still depends on undocumented fields.
- **Expected result:** Resolver output matches the approved classification and fallback policy.
- **Dependency notes:** Depends on T1 red tests. Must finish before downstream hook adjustments.
- **Parallel eligibility:** No.

### Task T3 — Reconnect TODO guard and plugin wiring to seeded orchestrator state

- **Task ID:** T3
- **Task Name:** Guard enforcement through shared seeded resolver state
- **Purpose:** Ensure event seeding and `tool.execute.before` enforcement cooperate through one plugin instance without broadening enforcement.
- **Files to create / modify / test:**
  - Modify: `src/index.ts`
  - Modify: `src/hooks/todo-tool-guard/index.ts`
  - Modify as needed: `src/hooks/todo-tool-guard/before.ts`
  - Modify as needed: `src/hooks/todo-tool-guard/after.ts`
  - Test: `src/__tests__/plugin-mcp.test.ts`
  - Test: `src/__tests__/todo-tool-guard.test.ts`
- **Concrete steps:**
  1. Ensure the plugin instance feeds all approved runtime events into the shared resolver before downstream hook logic relies on role state.
  2. Verify the plugin creates and reuses one resolver instance across `event`, `tool.execute.before`, and any continuation integration paths.
  3. Keep TODO guard targeting dependent on resolver output only.
  4. Verify `todowrite` and other existing exemptions remain unchanged unless an adjustment is strictly required by the resolver fix.
  5. Preserve explicit `unknown` bypass behavior.
  6. Use the new plugin-level integration test to confirm: seed root session lifecycle event, seed matching assistant primary message, invoke non-exempt `tool.execute.before`, receive the expected TODO block.
  7. Re-run focused guard tests until both integration and guard-only coverage pass.
- **Explicit QA / verification:**
  - `bun test src/__tests__/plugin-mcp.test.ts src/__tests__/todo-tool-guard.test.ts`
  - Confirm at least one passing test exercises `event` seeding and later `tool.execute.before` blocking on the same plugin instance through one shared resolver instance.
  - Confirm explicit `unknown` bypass tests still pass.
- **Expected result:** Seeded orchestrator sessions are blocked correctly; unknown sessions remain unblocked in this fix.
- **Dependency notes:** Depends on T2 and should not start until the resolver role/type surface is stable.
- **Parallel eligibility:** Conditional — may run in parallel with T4 only if T2 finishes with no expected further changes to resolver exports or shared role semantics; otherwise serialize.

### Task T4 — Preserve continuation targeting under the revised role contract

- **Task ID:** T4
- **Task Name:** Continuation-targeting regression alignment
- **Purpose:** Prevent the resolver fix from regressing which sessions receive continuation prompts.
- **Files to create / modify / test:**
  - Modify as needed: `src/hooks/todo-continuation-enforcer/index.ts`
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Test as supporting evidence: `src/__tests__/session-role-resolver.test.ts`
- **Concrete steps:**
  1. Review continuation targeting against the revised resolver outputs.
  2. Update continuation code only if it depends on removed resolver assumptions or stale role names.
  3. Add or update regressions proving orchestrator/executor are still targeted and `unknown` is skipped.
  4. Include `other` continuation coverage only if an existing concrete positive-evidence path remains part of the stabilized resolver surface after T2.
  5. Re-run continuation tests against the stabilized resolver contract.
- **Explicit QA / verification:**
  - `bun test src/__tests__/todo-continuation-enforcer.test.ts src/__tests__/session-role-resolver.test.ts`
  - Confirm continuation tests still pass with orchestrator/executor targeted and `unknown` skipped.
- **Expected result:** Continuation enforcement remains correctly bounded after the resolver change.
- **Dependency notes:** Depends on T2 and should not start until the resolver role/type surface is stable.
- **Parallel eligibility:** Conditional — may run in parallel with T3 only if T2 finishes with no expected further changes to resolver exports or shared role semantics; otherwise serialize.

### Task T5 — Final regression and type safety verification

- **Task ID:** T5
- **Task Name:** Focused plus full verification
- **Purpose:** Prove the fix is complete, bounded, and type-safe before handoff.
- **Files to create / modify / test:**
  - Test: `src/__tests__/session-role-resolver.test.ts`
  - Test: `src/__tests__/plugin-mcp.test.ts`
  - Test: `src/__tests__/todo-tool-guard.test.ts`
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Test: repository-wide TypeScript sources via `tsc`
- **Concrete steps:**
  1. Run the focused hook regression suite for resolver, guard, plugin integration, and continuation.
  2. Run the full test suite.
  3. Run `bunx tsc --noEmit`.
  4. Verify the working tree contains only intended fix files and test updates.
- **Explicit QA / verification:**
  - `bun test src/__tests__/session-role-resolver.test.ts src/__tests__/plugin-mcp.test.ts src/__tests__/todo-tool-guard.test.ts src/__tests__/todo-continuation-enforcer.test.ts`
  - `bun test`
  - `bunx tsc --noEmit`
  - `git status --short`
- **Expected result:** All focused and full verification checks pass, with no unintended scope drift.
- **Dependency notes:** Depends on T3 and T4.
- **Parallel eligibility:** No.

## QA Standard

- Every production change must be justified by a failing test added in T1.
- Resolver verification must use only approved SDK event families and field shapes from the spec.
- At least one passing integration test must prove seeding and guard enforcement happen through the same plugin instance and one shared resolver instance.
- Guard verification must explicitly cover both seeded-orchestrator blocking and `unknown` bypass.
- Continuation verification must explicitly cover positive targeting (`orchestrator`, `executor`) and `unknown` as the required non-target case; cover `other` only if execution confirms an existing concrete positive-evidence path remains supported.
- Final acceptance requires all focused tests, full `bun test`, and `bunx tsc --noEmit` to pass.

## Revisions

- 2026-04-25: Initial execution-ready plan created for resolver-contract fix, realistic tests, plugin guard integration, and continuation-targeting preservation.
- 2026-04-25: Revised plan to make the single shared resolver instance an explicit invariant, de-emphasize unsupported `other`-role planning dependence, and make T3/T4 parallelism conditional on T2 role/type-surface stability.
