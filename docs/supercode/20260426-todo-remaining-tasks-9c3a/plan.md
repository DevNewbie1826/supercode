# Work ID

20260426-todo-remaining-tasks-9c3a

# Goal

Update `todo-continuation-enforcer` so continuation prompts sent for idle sessions with incomplete TODOs preserve the existing Supercode directive and append a deterministic `Remaining tasks:` section containing the fresh incomplete TODOs that caused the prompt.

# Source Spec

- Approved spec: `docs/supercode/20260426-todo-remaining-tasks-9c3a/spec.md`
- Primary source files identified by spec/context:
  - `src/hooks/todo-continuation-enforcer/index.ts`
  - `src/hooks/todo-continuation-enforcer/constants.ts`
  - `src/hooks/todo-state.ts`
  - `src/__tests__/todo-continuation-enforcer.test.ts`

# Architecture / Design Strategy

- Keep scheduling, idle detection, deletion cancellation, session ID normalization, timer behavior, and in-flight cancellation unchanged.
- Keep `CONTINUATION_PROMPT` as the existing static Supercode directive text.
- Build the dynamic prompt at execution time after `ctx.client.session.todo({ path: { id: sessionID } })` is re-read and normalized.
- Reuse existing incomplete semantics: a TODO is incomplete when its status is neither `completed` nor `cancelled`.
- Derive `incompleteTodos` once from the normalized TODO array and use that same array for both the prompt/no-prompt decision and the displayed remaining-task lines, so decision and list cannot diverge.
- Append exactly one blank line after the existing directive, then `Remaining tasks:`, then one line per incomplete TODO formatted as `- [<status>] <content>`.
- Avoid new crash paths when formatting unexpected TODO values by converting missing/non-string display values deterministically instead of assuming valid strings.
- Do not introduce special multiline content policy; deterministic string coercion is sufficient. If content contains newlines, preserve the coerced string rather than sanitizing/truncating, and keep tests unambiguous by constructing expected text from the same explicit values.
- Prefer a small local helper in `src/hooks/todo-continuation-enforcer/index.ts` unless implementation discovers an existing shared helper is already appropriate; do not introduce new modules for this bounded change.

# Scope

In scope:
- Add tests proving dynamic continuation prompt content.
- Add mixed-state coverage proving completed and cancelled TODOs are excluded while other statuses remain included.
- Implement prompt-building behavior in the continuation enforcer execution path.
- Run relevant verification commands.

Out of scope:
- Changing prompt authority wording or role rules.
- Changing countdown defaults, timer scheduling, idle-event handling, deletion behavior, in-flight cancellation, or session normalization.
- Changing TODO guard behavior, UI, CLI, or configuration.
- Adding truncation or broader EasyCode parity beyond this prompt section.
- Changing incomplete semantics to treat `blocked` or `deleted` as terminal.

# Assumptions

- `normalizeTodos()` remains the normalization source for the enforcer.
- The continuation enforcer may stop calling `hasIncompleteTodo()` directly if it derives `incompleteTodos` once and uses `incompleteTodos.length > 0` for the prompt decision while preserving identical completed/cancelled semantics.
- Display formatting can use simple deterministic coercion for non-string/missing `status` and `content` values to satisfy the no-crash constraint without expanding product behavior; no new sanitization, truncation, or multiline policy is required.
- Existing tests use `makeCtx()` and `prompts` capture as the behavioral surface for prompt assertions.

# Source Spec Alignment

- Existing directive preservation: implementation must include `CONTINUATION_PROMPT` verbatim as the leading text.
- Fresh TODO state: dynamic section must be built only after the execution-time `session.todo()` call, not from schedule-time event data.
- Incomplete filtering: prompt decision and listed TODOs must come from the same derived `incompleteTodos` collection or a single centralized predicate, matching existing semantics and excluding only `completed` and `cancelled` terminal statuses.
- Deterministic order: listed TODOs must follow normalized TODO order.
- Current behavior preservation: if no incomplete TODOs remain, no prompt is sent.
- Safety: formatting unexpected TODO values must not escape the existing catch/error-swallowing model by introducing synchronous throws outside the protected execution path.

# Execution Policy

- Use TDD: add/adjust tests first and confirm they fail for the missing dynamic `Remaining tasks:` behavior before changing production code.
- Keep edits limited to the files listed in this plan unless a compile error proves a type-only adjustment is required in an already referenced file.
- Do not alter unrelated tests or implementation behavior to make assertions pass.
- Do not commit changes unless explicitly requested by the user.
- Verification commands are required before completion:
  - `bun test src/__tests__/todo-continuation-enforcer.test.ts`
  - `bun test`
  - `bun run typecheck`

# File Structure

No new source directories or modules are planned.

Planned file changes:
- `src/__tests__/todo-continuation-enforcer.test.ts`
- `src/hooks/todo-continuation-enforcer/index.ts`

Files expected to remain unchanged unless execution proves a narrow need:
- `src/hooks/todo-continuation-enforcer/constants.ts`
- `src/hooks/todo-state.ts`

# File Responsibilities

- `src/__tests__/todo-continuation-enforcer.test.ts`: behavioral tests for prompt text, incomplete filtering, fresh execution-time TODO use, and no-prompt terminal TODO behavior.
- `src/hooks/todo-continuation-enforcer/index.ts`: construct and send the dynamic continuation prompt after fresh TODO normalization and incomplete filtering.
- `src/hooks/todo-continuation-enforcer/constants.ts`: continue to own the static Supercode directive string.
- `src/hooks/todo-state.ts`: continue to own normalization and incomplete-state semantics; no semantic change planned.

# Task Sections

## Task T1 — Add failing dynamic prompt tests

- Task id: T1
- Task name: Add continuation prompt content coverage
- Purpose: Pin the required `Remaining tasks:` behavior before implementation.
- Files to create / modify / test:
  - Modify: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
- Concrete steps:
  1. Import `CONTINUATION_PROMPT` into the test file if not already available, and add an exact or near-exact assertion that expected prompt text is `CONTINUATION_PROMPT + "\n\nRemaining tasks:\n" + <expected bullet lines>`.
  2. Add a focused mixed-state test with TODOs in this order: at least one `completed`, one `pending`, one `cancelled`, and one `in_progress` item.
  3. Assert the full prompt text equals the exact expected string, or use a near-exact assertion that compares the full suffix beginning at `\n\nRemaining tasks:\n` plus all expected bullet lines in order.
  4. Assert the expected string contains bullets for `pending` and `in_progress` only, formatted exactly as `- [pending] <content>` and `- [in_progress] <content>`.
  5. Assert the prompt text does not contain completed or cancelled task content.
  6. Keep or strengthen the existing no-prompt tests for all-completed, all-cancelled, and empty TODO lists.
  7. Add a mandatory execution-time freshness test that schedules with a nonzero countdown, mutates the backing `todos` array after scheduling but before firing the timer, and asserts the remaining-task section reflects the mutated execution-time TODO state rather than schedule-time state.
  8. Add a mandatory malformed/unexpected TODO value test using missing and/or non-string `status` and `content` values returned from `session.todo()`. Assert the handler does not throw, one prompt is sent when at least one malformed item is incomplete under existing semantics, and the prompt text contains deterministic coerced bullet text.
  9. Keep malformed-value assertions unambiguous: use explicit expected string coercion in the test, and do not introduce multiline content unless the exact expected multiline output is constructed and asserted.
- Explicit QA / verification:
  - Run the targeted test file after test edits and before production edits; it should fail because the current prompt is static and lacks `Remaining tasks:` and because freshness/malformed prompt formatting is not implemented.
  - Confirm the failure is specifically about missing dynamic prompt text, not unrelated setup breakage.
- Expected result:
  - Tests describe the required prompt content and fail against current implementation for the expected reason.
- Dependency notes:
  - Must run before production implementation to preserve TDD.
- Parallel eligibility:
  - Not parallel with T2 because T2 depends on these failing tests.

## Task T2 — Implement execution-time remaining-task prompt construction

- Task id: T2
- Task name: Build dynamic continuation prompt from normalized incomplete TODOs
- Purpose: Replace static prompt sending with prompt text that appends the fresh incomplete TODO list.
- Files to create / modify / test:
  - Modify: `src/hooks/todo-continuation-enforcer/index.ts`
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
- Concrete steps:
  1. In `executePrompt()`, keep the existing order: re-read raw TODOs, honor in-flight cancellation, then normalize todos.
  2. Derive `incompleteTodos` exactly once from normalized todos using one local predicate/helper with the same rule as current `hasIncompleteTodo()` (`status !== "completed" && status !== "cancelled"`). Use `incompleteTodos.length > 0` as the only prompt decision in this function.
  3. Add a narrow prompt-building helper in `index.ts` that accepts the already-derived `incompleteTodos` array and:
     - maps each remaining item to `- [<status>] <content>` in existing order,
     - formats non-string/missing `status` and `content` with simple deterministic string coercion that cannot throw,
     - preserves coerced content as-is, including newlines if present, without adding sanitization/truncation policy,
     - returns `${CONTINUATION_PROMPT}\n\nRemaining tasks:\n${lines.join("\n")}`.
  4. Change `ctx.client.session.prompt({ sessionID, text })` to pass the helper result instead of `CONTINUATION_PROMPT` when `incompleteTodos.length > 0`.
  5. Do not call one predicate for the prompt decision and a separate duplicated predicate for the list. If execution chooses to centralize the predicate in `todo-state.ts` instead of local derivation, both `hasIncompleteTodo()` and list building must consume the same centralized predicate without changing semantics.
  6. Do not change countdown logic, timer map handling, session extraction, deletion handling, dispose behavior, or catch/finally behavior.
  7. Avoid changing `todo-state.ts` unless centralizing the predicate or type reuse is necessary; do not alter incomplete semantics.
- Explicit QA / verification:
  - Re-run the targeted continuation-enforcer tests and confirm the new T1 tests pass.
  - Inspect failing assertions, if any, to ensure no existing timer/session/deletion behavior regressed.
  - Run TypeScript/LSP diagnostics on edited files if available.
- Expected result:
  - Prompt text includes the existing directive plus the deterministic `Remaining tasks:` section built from the single execution-time `incompleteTodos` collection.
- Dependency notes:
  - Depends on T1 failing tests.
- Parallel eligibility:
  - Not parallel with T1. Can be followed by T3 only after targeted tests pass.

## Task T3 — Full verification and regression check

- Task id: T3
- Task name: Verify behavior and project health
- Purpose: Prove the bounded change satisfies the spec without breaking existing coverage.
- Files to create / modify / test:
  - Modify: none. T3 is verification-only and must not edit files.
  - Test: `src/__tests__/todo-continuation-enforcer.test.ts`
  - Test command scope: repository test and typecheck scripts
- Concrete steps:
  1. Run the targeted continuation-enforcer test command: `bun test src/__tests__/todo-continuation-enforcer.test.ts`.
  2. Run `bun test`.
  3. Run `bun run typecheck`.
  4. Run `git status --short` in the worktree and review the changed-file list against this plan's allowed implementation/test files.
  5. Run `git diff --stat` in the worktree and confirm the diff footprint is limited to planned files unless a routed/approved plan revision allowed more.
  6. If any verification command fails, stop T3 and return failure evidence including the command, exit status, and relevant output. Do not guess or apply fixes in T3.
  7. Route failures caused by implementation/test defects back to T2 for focused correction; route unclear failures to systematic debugging or plan revision as appropriate.
- Explicit QA / verification:
  - `bun test src/__tests__/todo-continuation-enforcer.test.ts` exits successfully.
  - `bun test` exits successfully.
  - `bun run typecheck` exits successfully.
  - `git status --short` shows only expected planned-file changes.
  - `git diff --stat` shows no unplanned implementation footprint.
  - Existing tests for no prompt with completed/cancelled/empty TODOs still pass.
  - Existing tests for timers, session normalization, deletion, and in-flight cancellation still pass.
- Expected result:
  - All required verification commands pass, diff/status evidence is captured, and the implementation is ready for review.
- Dependency notes:
  - Depends on T2 implementation and targeted test pass.
- Parallel eligibility:
  - Not parallel; final verification must run after implementation.

# QA Standard

- Test assertions must check complete relevant prompt text behavior, not only that a prompt was sent.
- At minimum, tests must prove:
  - `CONTINUATION_PROMPT` remains the leading directive.
  - Prompt text is asserted exactly, or near-exactly with the full expected prefix/suffix, as `CONTINUATION_PROMPT + "\n\nRemaining tasks:\n" + expected bullet lines`.
  - A blank line separates directive and `Remaining tasks:`.
  - Incomplete TODOs are listed as `- [status] content`.
  - Completed and cancelled TODOs are excluded.
  - The list reflects TODO state re-read at execution time, proven by a scheduled-timer mutation test.
  - Missing/non-string `status` and `content` values do not crash prompt execution and produce deterministic coerced bullet text.
  - Existing no-incomplete behavior still sends no prompt.
  - Existing timer/session/deletion/in-flight tests remain passing.
- Verification commands required for completion:
  - `bun test src/__tests__/todo-continuation-enforcer.test.ts`
  - `bun test`
  - `bun run typecheck`
  - `git status --short`
  - `git diff --stat`

# Revisions

- Initial plan created from approved spec and known repository context.
- Revised to address plan-challenger risks: mandatory freshness and malformed-value tests, exact prompt assertion expectations, single-source incomplete derivation, and minimal deterministic multiline/coercion guidance.
- Revised T3 after task-compliance-checker feedback: made targeted Bun command explicit, made T3 verification-only with no file edits, required `git status --short` / `git diff --stat` diff evidence, and routed failures back to implementation/debugging instead of unspecified remediation.
