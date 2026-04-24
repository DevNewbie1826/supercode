# Hook Diagnostics Execution Plan

## Work ID

`20260425-hook-diagnostics-c9d2`

## Goal

Implement environment-gated Supercode hook diagnostics that use `client.app.log({ body })` only when `SUPERCODE_DEBUG_HOOKS` is enabled, proving plugin initialization, returned hook keys, and runtime entry into the `event`, `experimental.chat.messages.transform`, `tool.execute.before`, and `tool.execute.after` hook paths without changing hook behavior.

## Source Spec

- Approved spec: `/Users/mirage/go/src/supercode/.worktrees/20260425-hook-diagnostics-c9d2/docs/supercode/20260425-hook-diagnostics-c9d2/spec.md`

## Architecture / Design Strategy

- Add a small diagnostics helper module that owns all gating, schema construction, and log-failure swallowing.
- Gate diagnostics exclusively on `process.env.SUPERCODE_DEBUG_HOOKS` being exactly `"1"`, `"true"`, or `"yes"`.
- Keep `src/index.ts` as the plugin-level integration point because it has access to `client.app.log`, plugin input fields, returned hook keys, shared `roleResolver`, and all hook wrappers.
- Wrap existing hook handlers in `src/index.ts` to emit entry logs before delegating to existing behavior. The wrappers must not change the delegate input/output contract.
- Keep diagnostic payloads small and structured. Do not log message text, tool args, tool output, prompt content, environment variables, or large payloads.
- Add focused Bun tests that instantiate `SupercodePlugin` directly with fake clients; do not require a live OpenCode process.
- Write failing diagnostics tests before production implementation for initialization, hook-entry, and failure-swallowing behavior. Production changes may start only after the corresponding focused red test has been observed failing for the expected reason.

## Scope

### In Scope

- Env-gated diagnostics helper.
- Plugin initialization diagnostic with sorted returned hook keys.
- Entry diagnostics for:
  - `event`
  - `experimental.chat.messages.transform`
  - `tool.execute.before`
  - `tool.execute.after`
- Tests for disabled diagnostics, enabled diagnostics, required fields, sorted hook keys, and swallowed logging failures.
- Full test/typecheck verification.

### Out of Scope

- Changing guard enforcement policy.
- Changing role-resolution logic.
- Changing hook semantics or hook return values.
- Adding always-on logging.
- Logging full prompts, user messages, tool args, tool outputs, secrets, environment variables, or large payloads.
- Copying EasyCode implementation directly.

## Assumptions

- `client.app.log({ body })` is available on the OpenCode plugin client path already used by existing tests.
- The plugin input `directory`, `worktree`, and resolved `moduleDir` are available in `src/index.ts` at initialization time.
- Existing hook function signatures in `src/index.ts` are the stable integration surface for this work.
- Existing `roleResolver.getRole(sessionID)` and `roleResolver.extractSessionID(event)` can be used for diagnostic metadata without changing resolver behavior.
- Tests may temporarily set and restore `process.env.SUPERCODE_DEBUG_HOOKS`, but env mutation helpers must restore the prior state with `try/finally` or an equivalent guaranteed cleanup mechanism.

## Source Spec Alignment

| Spec Requirement | Plan Coverage |
| --- | --- |
| Env-gated diagnostics only by `SUPERCODE_DEBUG_HOOKS` | Task T1 implements exact allow-list gating; T3 tests disabled/enabled values. |
| Initialization log with directory, worktree, moduleDir, sorted hookKeys | Task T2 wraps plugin return construction and emits init log after hook object creation; Task T3 verifies fields and sorting. |
| Event entry log with eventType and sessionID | Task T2 adds event wrapper log using safe event metadata only; Task T4 verifies. |
| Chat transform entry log with messageCount and hasUserMessage | Task T2 adds transform wrapper log derived from `output.messages`; Task T4 verifies. |
| Tool before entry log with tool/session/call/role | Task T2 resolves role before delegation and logs required fields; Task T4 verifies. |
| Tool after entry log with tool/session/call | Task T2 logs required fields before delegation; Task T4 verifies. |
| Small structured `client.app.log({ body })` payloads | Task T1 centralizes body schema and does not accept raw payloads; Tasks T3/T4 assert exact `extra` key sets per diagnostic log. |
| Logging failures swallowed | Task T1 helper catches log errors; Task T5 verifies plugin init and hook calls continue without changing hook return values or delegate error propagation. |
| No live OpenCode process | All tests instantiate plugin with fake client. |
| Full `bun test` / `bunx tsc --noEmit` pass | QA Standard and Task T6 require both commands. |

## Execution Policy

- Use test-driven development: write or extend focused tests before production changes for each behavior cluster.
- Red-test gate: initialization diagnostics tests, hook-entry diagnostics tests, and logging-failure-swallowing tests must each be written and run before the production code intended to satisfy them. Record/observe that each fails for the expected missing-diagnostics behavior, not for unrelated syntax or setup errors.
- Preserve existing behavior: new tests must assert diagnostics without changing existing hook semantics.
- Do not introduce production dependencies.
- Prefer explicit wrapper functions in `src/index.ts` over changing individual hook implementation modules unless needed for type-safe integration.
- Keep production changes limited to diagnostic helper and plugin wiring.
- Run focused tests after each task cluster, then full `bun test` and `bunx tsc --noEmit` before completion.
- Use TypeScript/LSP diagnostics on changed `.ts` files before final verification.
- Treat diagnostics test work as serial because `src/__tests__/hook-diagnostics.test.ts` and `SUPERCODE_DEBUG_HOOKS` env state are shared. Do not run T3, T4, or T5 in parallel with each other or with production edits that change the same assertions.

## File Structure

### Create

- `src/hooks/hook-diagnostics.ts`
  - New helper for gating and safe structured logging.
- `src/__tests__/hook-diagnostics.test.ts`
  - Focused tests for env gating, init logging, hook entry logging, and log failure swallowing.

### Modify

- `src/index.ts`
  - Import diagnostics helper.
  - Build returned hook object before returning so sorted hook keys can be logged.
  - Wrap hook entrypoints to emit diagnostics and then delegate to existing behavior.

### Read / Reference Only

- `src/hooks/session-role-resolver/index.ts`
  - Existing `getRole` and `extractSessionID` behavior informs wrapper metadata.
- `src/hooks/skill-bootstrap/index.ts`
  - Existing transform signature and output shape.
- `src/hooks/todo-tool-guard/before.ts`
  - Existing before hook signature and role-dependent behavior.
- `src/hooks/todo-tool-guard/after.ts`
  - Existing after hook signature and behavior.
- `src/__tests__/plugin-mcp.test.ts`
  - Existing plugin fake-client setup conventions.

## File Responsibilities

- `src/hooks/hook-diagnostics.ts`
  - Export exact env-gate predicate for `SUPERCODE_DEBUG_HOOKS`.
  - Export a safe diagnostic logger factory/function that accepts `client.app.log`, `message`, and `extra`.
  - Ensure every emitted `body` has:
    - `service: "supercode-plugin"`
    - `level: "debug"`
    - `message: string`
    - `extra: Record<string, unknown>`
  - Catch and swallow synchronous throws and asynchronous rejections from `client.app.log`.
- `src/index.ts`
  - Continue constructing config/tools/hooks exactly as before.
  - Create wrapped hook handlers for diagnostics while preserving delegate call order and original inputs/outputs.
  - Log plugin initialization after the hook object is assembled, with sorted `hookKeys` from the actual returned object.
- `src/__tests__/hook-diagnostics.test.ts`
  - Own all diagnostics-specific tests so existing behavior tests remain focused.
  - Use fake clients with `app.log`, `session.todo`, and `session.prompt` stubs as needed.
  - Restore `SUPERCODE_DEBUG_HOOKS` after each test with `try/finally` or an equivalent guaranteed cleanup helper.
  - Assert exact `extra` key sets for every diagnostic log so accidental raw messages, args, outputs, prompts, environment values, or other unsanctioned fields fail tests.

## Task Sections

### T1 — Add diagnostics helper

- **Task id:** T1
- **Task name:** Env-gated safe diagnostic logger
- **Purpose:** Centralize exact env gating, structured body creation, and log failure swallowing.
- **Files to create / modify / test:**
  - Create: `src/hooks/hook-diagnostics.ts`
  - Test via: `src/__tests__/hook-diagnostics.test.ts`
- **Concrete steps:**
  1. Add focused tests for the helper gate: enabled for exactly `1`, `true`, `yes`; disabled for unset, empty string, `0`, `false`, `no`, and any other value.
  2. Run the focused helper tests before implementation and confirm they fail for the missing helper/gating behavior.
  3. Implement a helper that reads only `process.env.SUPERCODE_DEBUG_HOOKS`.
  4. Implement safe logging that returns without calling `client.app.log` when disabled.
  5. When enabled, call `client.app.log({ body })` with the required schema.
  6. Catch both synchronous throw and Promise rejection from `client.app.log`.
  7. Keep the helper payload API narrow: callers provide only `message` and small `extra` objects.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/hook-diagnostics.test.ts` after adding helper tests and implementation.
  - Confirm tests assert the exact body schema and exact env allow-list.
  - Run LSP/TypeScript diagnostics on `src/hooks/hook-diagnostics.ts`.
- **Expected result:**
  - Diagnostics are off by default and safe when enabled.
  - Logging failures cannot break plugin code that awaits or calls the helper and cannot alter hook return values or delegate error propagation.
- **Dependency notes:**
  - No production dependency on later tasks.
- **Parallel eligibility:**
  - Serial. Must run before T2 because plugin wiring depends on the helper API and this task shares `src/__tests__/hook-diagnostics.test.ts` / env state with later diagnostics tests.

### T2 — Wire diagnostics into plugin initialization and hook wrappers

- **Task id:** T2
- **Task name:** Plugin-level diagnostics wiring
- **Purpose:** Emit required diagnostic logs from the only layer that has `client.app.log`, plugin input metadata, and all returned hooks.
- **Files to create / modify / test:**
  - Modify: `src/index.ts`
  - Test via: `src/__tests__/hook-diagnostics.test.ts`
- **Concrete steps:**
  1. Do not start production wiring until the T3 initialization red tests, T4 hook-entry red tests, and T5 failure-swallowing red tests that target `src/index.ts` have been written and observed failing for expected missing-diagnostics behavior.
  2. Import the diagnostics helper from `src/hooks/hook-diagnostics.ts`.
  3. Keep existing construction of `moduleDir`, `roleResolver`, `bootstrapTransform`, `guard`, and `enforcer`.
  4. Replace the direct returned object with a local `hooks` object containing the same hook keys and values.
  5. Wrap `event` so it logs `"Supercode hook invoked: event"` with:
     - `eventType`: string event type if available
     - `sessionID`: `roleResolver.extractSessionID(event)` when available
     Then delegate to existing `roleResolver.observe(event)` and `enforcer.handler({ event })` behavior in the current order.
  6. Wrap `experimental.chat.messages.transform` so it logs `"Supercode hook invoked: experimental.chat.messages.transform"` with:
     - `messageCount`: `output.messages.length` when `output.messages` is an array, otherwise `0`
     - `hasUserMessage`: whether any output message has `info.role === "user"`
     Then delegate to `bootstrapTransform`.
  7. Wrap `tool.execute.before` so it resolves `roleResolver.getRole(input.sessionID)`, logs `"Supercode hook invoked: tool.execute.before"` with `tool`, `sessionID`, `callID`, and `role`, then delegates to `guard.before`.
  8. Wrap `tool.execute.after` so it logs `"Supercode hook invoked: tool.execute.after"` with `tool`, `sessionID`, and `callID`, then delegates to `guard.after`.
  9. After the local `hooks` object is complete, log `"Supercode plugin initialized"` with `directory`, `worktree`, `moduleDir`, and sorted `hookKeys` from `Object.keys(hooks).sort()`.
  10. Return the same local `hooks` object.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/hook-diagnostics.test.ts`.
  - Run existing plugin wiring tests: `bun test src/__tests__/plugin-mcp.test.ts`.
  - Run LSP/TypeScript diagnostics on `src/index.ts`.
  - Inspect diagnostic payload construction to confirm it does not include raw messages, args, outputs, prompts, or env values.
- **Expected result:**
  - Existing plugin hook keys remain available.
  - Diagnostics are emitted only through the helper and only when enabled.
  - Hook semantics, delegate order, hook return values, and delegate error propagation remain unchanged except for swallowed diagnostic logging failures.
- **Dependency notes:**
  - Depends on T1 helper API.
- **Parallel eligibility:**
  - Serial. Not parallel with T1/T3/T4/T5 because it depends on the helper API and the required red tests in the shared diagnostics test file.

### T3 — Test disabled/enabled plugin initialization diagnostics

- **Task id:** T3
- **Task name:** Initialization diagnostics tests
- **Purpose:** Prove initialization logs are quiet by default and complete when enabled.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/hook-diagnostics.test.ts`
  - Exercises: `src/index.ts`, `src/hooks/hook-diagnostics.ts`
- **Concrete steps:**
  1. Add test setup that saves the previous `SUPERCODE_DEBUG_HOOKS` value and restores it after each test with `try/finally` or an equivalent guaranteed cleanup helper.
  2. Add a fake plugin client whose `app.log` records calls in an array.
  3. Test disabled/default mode by deleting or unsetting `SUPERCODE_DEBUG_HOOKS`, instantiating `SupercodePlugin`, and asserting no diagnostic log calls are recorded.
  4. Test enabled mode with `SUPERCODE_DEBUG_HOOKS="1"`, instantiating `SupercodePlugin`, and asserting one initialization log exists with exact message and required body fields.
  5. Assert `extra.hookKeys` is sorted and equals the actual returned hook keys.
  6. Assert `extra.directory`, `extra.worktree`, and `extra.moduleDir` match plugin input/options.
  7. Assert the initialization diagnostic `extra` object has exactly these keys and no others: `directory`, `worktree`, `moduleDir`, `hookKeys`.
  8. Run this test group before production wiring and confirm it fails for the expected missing initialization diagnostic.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/hook-diagnostics.test.ts`.
  - Confirm disabled test fails if any initialization log is emitted while env is unset.
  - Confirm enabled test fails if hook keys are missing or unsorted.
- **Expected result:**
  - Success criteria 1 and 2 are covered for initialization diagnostics.
- **Dependency notes:**
  - Red-test authoring depends on T1 helper availability only where helper imports are needed; final green depends on T2 production wiring.
- **Parallel eligibility:**
  - Serial. Do not run or edit in parallel with T4/T5 because they share `src/__tests__/hook-diagnostics.test.ts` and mutate `SUPERCODE_DEBUG_HOOKS`; final green depends on T2 wiring.

### T4 — Test hook entry diagnostics

- **Task id:** T4
- **Task name:** Hook entry diagnostics tests
- **Purpose:** Prove each specified hook emits the required structured entry log when diagnostics are enabled.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/hook-diagnostics.test.ts`
  - Exercises: `src/index.ts`
- **Concrete steps:**
  1. Enable diagnostics with `SUPERCODE_DEBUG_HOOKS="true"` or `"yes"` in focused tests using a helper that restores the previous env value with `try/finally` or equivalent guaranteed cleanup.
  2. Instantiate `SupercodePlugin` with fake `app.log`, `session.todo`, and `session.prompt` functions sufficient for hook delegation.
  3. Call `hooks.event({ event })` with a small event object containing a known type and extractable session ID; assert the event diagnostic message and `eventType`/`sessionID` fields.
  4. Call `hooks["experimental.chat.messages.transform"]` with an output containing a small messages array including a user message; assert `messageCount` and `hasUserMessage` fields. Do not assert or log message text.
  5. Seed role resolver state through `event` calls if needed so the before-hook role is deterministic, then call `hooks["tool.execute.before"]` with a small input/output. Assert `tool`, `sessionID`, `callID`, and `role` fields.
  6. Call `hooks["tool.execute.after"]` with a small input/output. Assert `tool`, `sessionID`, and `callID` fields.
  7. Filter recorded logs by `body.message` rather than relying on call order except where initialization necessarily precedes hook invocation.
  8. Assert exact `extra` key sets for each hook-entry diagnostic:
     - Event: exactly `eventType`, `sessionID` when a session ID is available in the test event; if testing an event without a session ID, assert only `eventType`.
     - Chat transform: exactly `messageCount`, `hasUserMessage`.
     - Tool before: exactly `tool`, `sessionID`, `callID`, `role`.
     - Tool after: exactly `tool`, `sessionID`, `callID`.
  9. Run this test group before production wiring and confirm it fails for expected missing hook-entry diagnostics.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/hook-diagnostics.test.ts`.
  - Confirm tests fail if any required diagnostic message or field is omitted.
  - Confirm tests fail if any diagnostic `extra` object includes unexpected keys such as raw message text, tool args, tool output, prompt text, or env values.
  - Confirm tests do not inspect or require live OpenCode behavior.
- **Expected result:**
  - Success criteria 3 through 6 are covered for hook entry diagnostics.
- **Dependency notes:**
  - Red-test authoring depends on T1 helper availability only where helper imports are needed; final green depends on T2 production wiring.
- **Parallel eligibility:**
  - Serial. Do not run or edit in parallel with T3/T5 because they share `src/__tests__/hook-diagnostics.test.ts` and mutate `SUPERCODE_DEBUG_HOOKS`; final green requires T2.

### T5 — Test logging failure swallowing without swallowing hook behavior

- **Task id:** T5
- **Task name:** Logging failure resilience tests
- **Purpose:** Prove diagnostic logging failures never interrupt plugin initialization or hook execution and never change hook return values or delegate error propagation.
- **Files to create / modify / test:**
  - Modify: `src/__tests__/hook-diagnostics.test.ts`
  - Exercises: `src/hooks/hook-diagnostics.ts`, `src/index.ts`
- **Concrete steps:**
  1. Use env mutation helpers that restore the prior `SUPERCODE_DEBUG_HOOKS` value with `try/finally` or equivalent guaranteed cleanup.
  2. Add a test where diagnostics are enabled and `client.app.log` throws synchronously; assert `SupercodePlugin` still resolves and returns hooks.
  3. Add a test where diagnostics are enabled and `client.app.log` returns a rejected Promise; assert a representative hook call still resolves to the same value it would return when its delegate normally resolves, including `undefined` for current void hooks.
  4. Add a test or assertion that if `tool.execute.before` delegate throws its normal TODO enforcement error, that error still propagates unchanged; only logging errors are swallowed.
  5. Avoid global unhandled rejection leaks by awaiting hook calls and using controlled rejected promises from fake `app.log`.
  6. Run these tests before production failure-swallowing implementation and confirm they fail for expected escaping log errors or missing safe logging, not unrelated setup issues.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/hook-diagnostics.test.ts`.
  - Confirm failure-swallowing tests fail if `client.app.log` errors escape.
  - Confirm behavior-preservation assertion fails if the helper swallows non-logging hook errors.
- **Expected result:**
  - Success criterion 7 is covered without masking real hook behavior, changing hook return values, or changing delegate error propagation.
- **Dependency notes:**
  - Red-test authoring depends on T1 helper availability only where helper imports are needed; final green depends on T2 production wiring.
- **Parallel eligibility:**
  - Serial. Do not run or edit in parallel with T3/T4 because they share `src/__tests__/hook-diagnostics.test.ts` and mutate `SUPERCODE_DEBUG_HOOKS`; final green depends on T2.

### T6 — Full verification and regression pass

- **Task id:** T6
- **Task name:** Full QA verification
- **Purpose:** Confirm focused diagnostics work and the repository remains type-safe and regression-free.
- **Files to create / modify / test:**
  - Test: all changed files and full repository test suite.
- **Concrete steps:**
  1. Run focused diagnostics tests: `bun test src/__tests__/hook-diagnostics.test.ts`.
  2. Run existing plugin integration tests: `bun test src/__tests__/plugin-mcp.test.ts`.
  3. Run full test suite: `bun test`.
  4. Run typecheck: `bunx tsc --noEmit`.
  5. Run LSP diagnostics for changed TypeScript files:
     - `src/hooks/hook-diagnostics.ts`
     - `src/index.ts`
     - `src/__tests__/hook-diagnostics.test.ts`
  6. Review changed code for forbidden diagnostic content: no raw prompt text, user message text, tool args, tool outputs, environment variables, or large payloads in logged `extra` values.
  7. Review diagnostics tests to confirm every diagnostic log assertion checks the exact `extra` key set, not only presence of required fields.
- **Explicit QA / verification:**
  - All commands above must pass.
  - If any command fails, fix only within this work’s scope and rerun the failing command, then rerun full `bun test` and `bunx tsc --noEmit`.
- **Expected result:**
  - Success criterion 8 is satisfied.
  - Implementation is ready for final review.
- **Dependency notes:**
  - Depends on T1 through T5 completion.
- **Parallel eligibility:**
  - Not parallel; final sequential verification task.

## QA Standard

- Focused tests must cover:
  - Disabled diagnostics emit no debug logs.
  - Enabled diagnostics emit plugin initialization with required fields.
  - Enabled diagnostics emit entry logs for all four hook paths.
  - Every diagnostic log assertion checks exact `extra` keys so redaction regressions fail.
  - Env gate exactness: only `1`, `true`, and `yes` enable diagnostics.
  - Logging failures are swallowed.
  - Hook return values are unchanged and hook delegate errors still propagate normally.
- Test sequencing requirements:
  - Initialization diagnostics, hook-entry diagnostics, and failure-swallowing diagnostics must be written and run as red tests before the production implementation that satisfies them.
  - Diagnostics test tasks are serial because they share `src/__tests__/hook-diagnostics.test.ts` and mutate `SUPERCODE_DEBUG_HOOKS`.
  - Any helper that mutates `SUPERCODE_DEBUG_HOOKS` must restore prior state with `try/finally` or equivalent guaranteed cleanup.
- Required commands before completion:
  - `bun test src/__tests__/hook-diagnostics.test.ts`
  - `bun test src/__tests__/plugin-mcp.test.ts`
  - `bun test`
  - `bunx tsc --noEmit`
- Required static checks before completion:
  - LSP diagnostics on all changed TypeScript files.
  - Manual inspection of diagnostic payloads for redaction/sanitization compliance.
- Completion requires all success criteria from the source spec to be demonstrably covered by tests or verification output.

## Revisions

- 2026-04-25: Initial execution-ready plan for env-gated hook diagnostics only.
- 2026-04-25: Revised for challenger risks: added red-test gates, serial diagnostics test sequencing, exact `extra` key assertions, guaranteed env restoration, and clarified log-failure swallowing preserves hook returns and delegate error propagation.
