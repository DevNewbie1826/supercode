# Work ID

20260426-default-orchestrator-d4f2

# Goal

Set OpenCode's top-level `default_agent` to `"orchestrator"` through Supercode's existing config hook when it is safe to do so, so newly loaded Supercode installations start in the Supercode orchestrator agent by default.

# Source Spec

`/Volumes/storage/workspace/supercode/.worktrees/20260426-default-orchestrator-d4f2/docs/supercode/20260426-default-orchestrator-d4f2/spec.md`

# Architecture / Design Strategy

- Keep the change localized to `src/config-handler.ts`, the existing startup-time config mutation path registered by `src/index.ts`.
- Add focused tests in the existing config-handler agent test file before changing production code.
- Derive the default-agent decision from the post-merge built-in agent map after `buildBuiltinAgentEntries(...)` and after the built-in disable-policy loop have both completed, because that is where the orchestrator entry and any Supercode-driven disable state are visible.
- Set `config.default_agent = "orchestrator"` only when all of these are true:
  - `config.default_agent` is missing, a blank string, or not a string.
  - `config.agent.orchestrator` exists after built-in registration and passes `isRecord(...)` or an equivalent object guard before reading `mode` or `disable`.
  - `config.agent.orchestrator.mode === "primary"`.
  - `config.agent.orchestrator.disable !== true`.
- Preserve any existing non-empty string `config.default_agent`, even if it names another agent or an agent disabled elsewhere.
- If the orchestrator is disabled, do not set `default_agent` to `"orchestrator"`; leave any existing blank, missing, or invalid value unchanged.

# Scope

In scope:
- Tests for new `default_agent` behavior in `src/__tests__/config-handler-agent.test.ts`.
- A small production change in `src/config-handler.ts`.
- Running targeted and full verification commands defined in `package.json`.

Out of scope:
- Orchestrator prompt, workflow, name, color, permissions, or mode changes.
- OpenCode default-agent policy rewrites beyond setting the top-level config key.
- Installer, postinstall, documentation-only setup, or file-writing setup changes.
- Built-in agent registry architecture changes.
- Changes to `src/index.ts`, unless verification proves the config hook is no longer wired as documented by the spec evidence.

# Assumptions

- `@opencode-ai/plugin` in the current dependency range supports top-level `default_agent`.
- Existing tests use Bun and can be run with `bun test`; type checking uses `bun run typecheck` or `tsc --noEmit` through the package script.
- The orchestrator's built-in definition remains named `"orchestrator"` and has `mode: "primary"`.
- Supercode disables an agent by producing an agent entry with `disable: true`, as covered by existing tests.

# Source Spec Alignment

- Empty config success criterion: covered by a new test expecting `config.default_agent === "orchestrator"` and existing coverage that `config.agent.orchestrator.mode === "primary"`.
- Preserve explicit user default: covered by a new test where a non-empty string default remains unchanged.
- Missing, blank, or invalid non-string default handling: covered by new tests that allow assignment to `"orchestrator"` when the orchestrator is safe.
- Disabled orchestrator constraint: covered by one new empty-config test using `preloadedConfig.agent.orchestrator.enabled = false` and asserting `default_agent` remains absent/`undefined`, plus one new test proving an existing non-empty string `default_agent` is still preserved when the orchestrator is disabled.
- Existing behavior preservation: covered by existing config-handler tests plus full test and typecheck verification.

# Execution Policy

- Follow TDD strictly for behavior changes:
  1. Add/update tests first.
  2. Run the targeted test file and confirm the new default-agent assertions fail for the missing production behavior.
  3. Implement the smallest production change.
  4. Re-run targeted tests, then full tests and typecheck.
- Do not modify implementation code during the test-writing task.
- Do not broaden scope if unrelated failures or unrelated design issues are found; report them separately.
- Preserve existing user configuration unless the spec explicitly allows replacement.
- Prefer a small helper in `src/config-handler.ts` if it makes the default-agent eligibility rules explicit and testable through the public handler behavior.

# File Structure

```text
src/
  config-handler.ts
  __tests__/
    config-handler-agent.test.ts
docs/
  supercode/
    20260426-default-orchestrator-d4f2/
      spec.md
      plan.md
package.json
```

# File Responsibilities

- `src/config-handler.ts`: Build and apply MCP and agent config entries; add localized default-agent assignment after `buildBuiltinAgentEntries(...)` and after the built-in disable-policy loop, before or alongside `config.agent = mergedAgent`.
- `src/__tests__/config-handler-agent.test.ts`: Existing integration-style tests for `createConfigHandler`; add default-agent behavior tests here using the same Bun test style and handler invocation patterns.
- `package.json`: Source of verification commands only; do not modify.
- `docs/supercode/20260426-default-orchestrator-d4f2/plan.md`: This execution plan artifact only.

# Task Sections

## Task T1 — Add failing default-agent tests

**Task id:** T1

**Task name:** Add config-handler tests for orchestrator `default_agent`

**Purpose:** Capture the required default-agent behavior before production changes.

**Files to create / modify / test:**
- Modify: `src/__tests__/config-handler-agent.test.ts`
- Test: `src/__tests__/config-handler-agent.test.ts`

**Concrete steps:**
1. Add tests in the existing `describe("createConfigHandler orchestrator agent registration", ...)` block or a nearby focused `describe` in the same file.
2. Add a test for an empty config object:
   - Invoke `await createConfigHandler("/test/directory")(config)`.
   - Assert `config.default_agent === "orchestrator"`.
   - Assert `config.agent.orchestrator.mode === "primary"` remains true.
3. Add a test for preserving an existing non-empty string:
   - Start with `{ default_agent: "custom-primary" }`.
   - Assert the value remains `"custom-primary"` after the handler runs.
4. Add tests for allowed replacement inputs:
   - Blank string `default_agent: ""` becomes `"orchestrator"`.
   - Non-string `default_agent`, such as `false`, becomes `"orchestrator"`.
5. Add a disabled-orchestrator empty-config test:
   - Use `preloadedConfig: { agent: { orchestrator: { enabled: false } } }`.
   - Assert `config.agent.orchestrator.disable === true`.
   - Assert `config.default_agent` remains absent or `undefined`; do not use only `config.default_agent !== "orchestrator"` for this case.
6. Add a disabled-orchestrator preservation test:
   - Start with `{ default_agent: "custom-primary" }`.
   - Use `preloadedConfig: { agent: { orchestrator: { enabled: false } } }`.
   - Assert `config.agent.orchestrator.disable === true`.
   - Assert `config.default_agent === "custom-primary"` after the handler runs.
7. Do not change `src/config-handler.ts` in this task.

**Explicit QA / verification:**
- Run `bun test src/__tests__/config-handler-agent.test.ts` from the worktree.
- Expected TDD result before production changes: new default-agent tests fail because `config.default_agent` is not currently set.
- Existing unrelated tests in the file should still execute; any failures unrelated to the new assertions must be noted separately before proceeding.

**Expected result:**
- The test file contains clear behavioral coverage for setting, preserving, replacing blank/invalid, skipping disabled orchestrator for empty config, and preserving an existing default when orchestrator is disabled.
- At least one new test fails before production code is changed, proving the tests drive the implementation.

**Dependency notes:**
- No task dependencies.
- Must complete before T2.

**Parallel eligibility:**
- Not parallelizable with T2 because T2 must be driven by the failing tests from T1.

## Task T2 — Implement localized default-agent assignment

**Task id:** T2

**Task name:** Set `default_agent` to orchestrator when safe

**Purpose:** Implement the smallest config-handler change needed to satisfy the new tests and spec constraints.

**Files to create / modify / test:**
- Modify: `src/config-handler.ts`
- Test: `src/__tests__/config-handler-agent.test.ts`

**Concrete steps:**
1. In `src/config-handler.ts`, add a small local helper or inline guarded assignment at the explicit insertion point: after `const mergedAgent = buildBuiltinAgentEntries(...)` and after the `for (const [name, disable] of Object.entries(builtinAgentDisablePolicy)) { ... }` loop, before or alongside `config.agent = mergedAgent`.
2. Use `mergedAgent.orchestrator` as the source of truth for whether the built-in orchestrator is present and safe.
3. Before reading `mode` or `disable`, guard `mergedAgent.orchestrator` with the existing `isRecord(...)` helper or an equivalent object-record check.
4. Treat `config.default_agent` as user-preserved when it is a string whose `.trim()` is not empty.
5. Treat missing, blank string, and non-string values as eligible for replacement only if the guarded orchestrator entry is present, primary, and not disabled.
6. Set `config.default_agent = "orchestrator"` only when eligible.
7. Do not alter MCP merging, skill registration, built-in agent registration, existing custom field preservation, or the default OpenCode agent disable policy.
8. Keep constants/helpers local to `src/config-handler.ts` unless TypeScript or linting requires otherwise; do not introduce a new module for this small behavior.

**Explicit QA / verification:**
- Run `bun test src/__tests__/config-handler-agent.test.ts`.
- Confirm all tests in the targeted file pass, including the new default-agent tests and existing orchestrator/agent policy tests.
- If a helper is added, run TypeScript diagnostics or `bun run typecheck` after this task or in T3 to catch typing issues.

**Expected result:**
- Empty config gets `default_agent: "orchestrator"`.
- Existing non-empty string default is preserved.
- Blank string and non-string defaults become `"orchestrator"` when orchestrator is safe.
- Disabled orchestrator does not become the default agent for empty config, and does not overwrite an existing non-empty string default.
- Existing `config.mcp`, `config.agent`, and skill-path behavior remains unchanged.

**Dependency notes:**
- Depends on T1's failing tests.
- Must complete before T3 full verification.

**Parallel eligibility:**
- Not parallelizable with T1 or T3; it depends on T1 and must complete before final verification.

## Task T3 — Run full verification and inspect changed files

**Task id:** T3

**Task name:** Verify behavior, type safety, and scope containment

**Purpose:** Confirm the localized implementation satisfies the spec without regressing existing behavior.

**Files to create / modify / test:**
- Test: `src/__tests__/config-handler-agent.test.ts`
- Test: full repository test suite via package script
- Test: TypeScript project via package script
- Inspect: changed files from T1 and T2 only

**Concrete steps:**
1. Run the targeted test file again: `bun test src/__tests__/config-handler-agent.test.ts`.
2. Run the full test suite: `bun test` or `bun run test`.
3. Run type checking: `bun run typecheck`.
4. Inspect the final diff to verify only expected files changed:
   - `src/__tests__/config-handler-agent.test.ts`
   - `src/config-handler.ts`
   - `docs/supercode/20260426-default-orchestrator-d4f2/plan.md` from planning
5. Confirm the diff does not modify out-of-scope files such as orchestrator prompt definitions, built-in registry architecture, or `src/index.ts`.

**Explicit QA / verification:**
- `bun test src/__tests__/config-handler-agent.test.ts` passes.
- `bun test` or `bun run test` passes.
- `bun run typecheck` passes.
- Final diff shows no unrelated production changes.
- Manually map the passing tests back to all success criteria in the spec.

**Expected result:**
- The implementation is verified by targeted tests, full tests, and type checking.
- Scope remains limited to the config-handler path and its tests.
- The work is ready for final review.

**Dependency notes:**
- Depends on T2.

**Parallel eligibility:**
- Verification commands may be run sequentially for clearer failure attribution. Do not run T3 before T2 is complete.

# QA Standard

- TDD evidence is required: the targeted test command must fail after T1 and before T2 for the missing default-agent behavior.
- Final required commands:
  - `bun test src/__tests__/config-handler-agent.test.ts`
  - `bun test` or `bun run test`
  - `bun run typecheck`
- Required behavioral checks:
  - Empty config sets `default_agent` to `"orchestrator"`.
  - `config.agent.orchestrator.mode` remains `"primary"`.
  - Existing non-empty string `default_agent` is preserved.
  - Blank string and non-string defaults are replaced when the orchestrator is safe.
  - Disabled orchestrator with empty config leaves `default_agent` absent/`undefined`.
  - Disabled orchestrator with an existing non-empty string `default_agent` preserves that string.
- Required regression checks:
  - Existing MCP merge behavior remains untouched.
  - Existing built-in agent registration remains intact.
  - Existing default OpenCode agent disable policy remains intact.
  - Existing skill-path registration remains intact.

# Revisions

- Initial execution-ready plan created for spec `20260426-default-orchestrator-d4f2`.
- Revised after challenger review to strengthen disabled-orchestrator assertions, add disabled-orchestrator preservation coverage, make the config-handler insertion point explicit, and require a record guard before reading orchestrator fields.
