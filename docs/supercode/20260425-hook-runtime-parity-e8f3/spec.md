# Spec: Hook Runtime Parity With EasyCode

## Work ID

`20260425-hook-runtime-parity-e8f3`

## Objective

Fix Supercode's `skill-bootstrap` and `todo-continuation-enforcer` runtime behavior where evidence-backed EasyCode comparisons show Supercode no-ops under runtime shapes/layouts that EasyCode handles.

## Current State

- TODO guard blocking now works in runtime after unknown main-session guard handling was fixed.
- User reports `skill-bootstrap` and `todo-continuation-enforcer` still do not work while corresponding EasyCode behavior does.
- Repository comparison and local reproductions established concrete Supercode/EasyCode behavioral differences:
  - `skill-bootstrap`:
    - Supercode only loads `skill-bootstrap.md` from one exact path derived from `join(moduleDir, "hooks", "skill-bootstrap")`.
    - EasyCode resolves bootstrap markdown across multiple runtime layouts, including copied `.opencode/plugins` layouts.
    - In a copied plugin layout reproduction, Supercode inserted no bootstrap part while EasyCode inserted one.
    - Supercode returns early when the first user message has no `info.sessionID`; EasyCode still inserts a bootstrap part.
    - In a no-`info.sessionID` reproduction, Supercode inserted no bootstrap part while EasyCode inserted one.
  - `todo-continuation-enforcer`:
    - Supercode only schedules continuation for roles in `TARGET_ROLES = { orchestrator, executor }`.
    - EasyCode continuation has no role gate.
    - In an idle + incomplete TODO + `unknown` role reproduction, Supercode sent no prompt while EasyCode sent a continuation prompt.
    - For Supercode, `orchestrator` and `executor` roles prompt; `unknown` and `other` do not.
    - For `session.idle` with `properties.info.id`, Supercode does not extract a session ID while EasyCode does.
    - Supercode schedules even zero-second countdowns through a timer callback; EasyCode executes immediately when countdown is zero.

## Desired Outcome

Supercode should match EasyCode's proven runtime tolerance for these two hooks while preserving Supercode-specific prompt content and safety semantics.

## Scope

In scope:

- Make `skill-bootstrap` locate `skill-bootstrap.md` using the exact EasyCode-compatible candidate path set listed below.
- Make `skill-bootstrap` inject into the first user message even when `info.sessionID` is absent, without breaking duplicate prevention.
- Make `todo-continuation-enforcer` continue sessions when idle events arrive for unclassified/`unknown` sessions with incomplete TODOs.
- Make `todo-continuation-enforcer` extract `sessionID` from `properties.info.id` for `session.idle` events when necessary, matching EasyCode's observed tolerance.
- Make zero-second continuation countdowns execute immediately for deterministic behavior parity with EasyCode.
- Add focused regression tests for each reproduced Supercode/EasyCode difference.

## Non-Goals

- Do not change TODO guard blocking/reminder policy from the already-working behavior.
- Do not add diagnostic logging.
- Do not redesign plugin registration or config loading.
- Do not change EasyCode.
- Do not change Supercode bootstrap prompt content except as required to support injection shape.
- Do not alter continuation prompt content beyond existing behavior unless required by existing tests.
- Do not broaden unrelated event parsing outside `skill-bootstrap` and `todo-continuation-enforcer` scope.

## Constraints

- Behavior changes must be driven by failing tests first.
- Keep changes narrow and grounded in the reproduced EasyCode/Supercode differences.
- Preserve duplicate-bootstrap prevention semantics.
- Preserve safe no-op behavior when bootstrap content is genuinely missing or blank.
- Bootstrap markdown path resolution must check these candidates, in order, using the caller-provided `moduleDir`:
  1. `<moduleDir>/skill-bootstrap.md`
  2. `<moduleDir>/hooks/skill-bootstrap/skill-bootstrap.md`
  3. `<moduleDir>/../src/hooks/skill-bootstrap/skill-bootstrap.md`
  4. `<moduleDir>/../../src/hooks/skill-bootstrap/skill-bootstrap.md`
- Bootstrap path resolution must use the first existing file from that ordered list and remain a safe no-op when none exists.
- Preserve existing `other` role exclusion for continuation unless tests/spec explicitly require otherwise; only `unknown` should be newly tolerated.
- Preserve session deletion cancellation semantics and timer cleanup behavior.
- Full test suite and TypeScript typecheck must pass.

## Success Criteria

1. Bootstrap path resolution supports the ordered candidate path set defined in Constraints and uses the first existing file.
2. A copied-plugin-layout regression using `<moduleDir>/../src/hooks/skill-bootstrap/skill-bootstrap.md` proves Supercode bootstrap now finds and injects `skill-bootstrap.md` where it previously no-oped.
3. A no-`info.sessionID` regression proves Supercode bootstrap now injects into the first user message where it previously no-oped.
4. Existing bootstrap single-injection and duplicate-prevention tests still pass.
5. A continuation regression proves `unknown` role idle sessions with incomplete TODOs now receive continuation prompts.
6. A continuation regression proves `session.idle` with `properties.info.id` can schedule/prompt.
7. A continuation regression proves zero-second countdown executes immediately without waiting for a timer tick.
8. Existing continuation deletion, reschedule, isolation, and error-swallowing tests still pass.
9. `bun test src/__tests__/skill-bootstrap.test.ts src/__tests__/todo-continuation-enforcer.test.ts` passes.
10. `bun test` passes.
11. `bunx tsc --noEmit` passes.

## Risks / Unknowns

- The exact live OpenCode event/message shape may vary by version, but this spec only targets shapes already reproduced as EasyCode-compatible and Supercode-incompatible.
- Removing the hard `sessionID` requirement from bootstrap may create bootstrap parts with undefined `sessionID`; this matches EasyCode behavior but must remain type-safe and should preserve `id`, `messageID`, `type`, `text`, and `synthetic` fields.
- Adding `unknown` continuation behavior may prompt sessions before role seeding completes; this is intentional for parity with EasyCode and mirrors the previously fixed TODO guard unknown-session issue.

## Revisions

- Initial spec created from direct EasyCode/Supercode code comparison and local reproduction evidence for `skill-bootstrap` and `todo-continuation-enforcer` runtime no-op cases.
