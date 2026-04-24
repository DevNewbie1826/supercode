# Guard Role Resolution Fix Spec

## Work ID

`20260425-guard-role-fix-a19c`

## Objective

Fix `todo-tool-guard` enforcement so orchestrator sessions are actually classified and blocked in live OpenCode runtime sessions, instead of silently bypassing on `unknown` role due to mismatched event-shape assumptions.

## Current State

- PR #4 added `session-role-resolver`, `todo-tool-guard`, and `todo-continuation-enforcer`.
- In live runtime, a new session can still read files without TODO state.
- Debugging narrowed the issue to runtime contract mismatch: current role resolution relies on event fields like `agent` and `mode` that are not present or not stable on the actual SDK event types used to seed role state.
- `tool.execute.before` input does not carry agent/role information, so the guard depends entirely on previously observed event-based role state.
- Because role state is not positively seeded, sessions likely stay `unknown` and the guard bypasses them.

## Desired Outcome

- The plugin classifies orchestrator/executor sessions using real runtime evidence available from SDK event payloads.
- In a fresh orchestrator session, attempting a non-exempt tool call before TODO state exists is blocked.
- Continuation enforcement remains correctly targeted to orchestrator/executor.
- The fix is verified with tests that reflect actual SDK event shapes and plugin-level integration of event seeding plus tool guarding.

## Scope

In scope:

- revise runtime role-resolution logic to match actual SDK event contracts
- adjust guard targeting logic only as needed to restore intended orchestrator enforcement
- add tests using realistic event payloads from current SDK types
- add plugin-level integration coverage proving event seeding enables later tool enforcement
- preserve current bootstrap, TODO guard, and continuation behaviors unless changes are required by the role-resolution fix

Out of scope:

- redesigning the entire hook subsystem
- broadening guard enforcement to all unknown sessions by default unless required and explicitly justified
- unrelated workflow prompt changes
- altering finish behavior or other completed features from PR #4 beyond what the fix requires

## Non-Goals

- copying EasyCode logic
- introducing speculative heuristics unrelated to actual SDK event structure
- broad policy expansion beyond fixing real orchestrator targeting

## Constraints

- fix must use actual SDK event shapes as the source of truth
- `tool.execute.before` still has only `{ tool, sessionID, callID }`, so role state must be seeded elsewhere
- if a main-session fallback is added, it must be justified by real runtime evidence and covered by tests
- behavior should remain bounded and fail-safe; do not introduce wide unsafe blocking without evidence
- full suite and typecheck must pass after the fix

Operational definitions:

- Live failure: a new session with no TODO can read a file instead of being blocked
- Authoritative runtime contract source for this fix:
  - installed `@opencode-ai/plugin` and `@opencode-ai/sdk` TypeScript definitions currently used by this repository
  - specifically, the event families and shapes available from those definitions, not hypothetical runtime fields
- Allowed event families for role seeding in this fix:
  - `session.created`
  - `session.updated`
  - `session.deleted`
  - `message.updated`
  - `session.status`
  - `session.idle`
- Session structure facts available from SDK types:
  - `session.created` / `session.updated` provide `properties.info: Session`
  - `Session` includes `id` and optional `parentID`
  - `message.updated` provides `properties.info: Message`
  - `AssistantMessage` includes `sessionID`, `role: "assistant"`, and `mode: string`
- Classification contract for this fix:
  - `orchestrator`: a session positively identified as a root session (`parentID` absent from cached session lifecycle info) and later associated with an assistant message whose `mode === "primary"`
  - `executor`: a session positively identified as a child session (`parentID` present from cached session lifecycle info`)
  - `other`: a positively identified non-target session that is neither orchestrator nor executor under the above rules
  - `unknown`: no positive classification supported by the authoritative event data yet
- Fallback policy:
  - this fix must not invent agent-name-based or undocumented fallback fields
  - if positive role seeding is impossible from the authoritative event families above, the session remains `unknown`
  - `unknown` continues to bypass orchestrator-specific guard enforcement in this fix
- Realistic orchestrator session event sequence for testing means:
  - a root `session.created` or `session.updated` payload with no `parentID`
  - followed by a `message.updated` payload for the same `sessionID` whose `properties.info` is an assistant message with `mode === "primary"`
  - followed by a `tool.execute.before` call for the same session
- Realistic executor session event sequence for testing means:
  - a `session.created` or `session.updated` payload whose `properties.info.parentID` is present
  - followed by guard/continuation checks for the same session
- Integration proof requires at least one plugin-level test showing event seeding followed by `tool.execute.before` blocking behavior for the same session

## Success Criteria

1. Role resolution no longer depends on undocumented `agent` fields or unsupported mode assumptions from session events.
2. A root session seeded from `session.created`/`session.updated` plus a matching `message.updated` assistant message with `mode === "primary"` is classified as `orchestrator`.
3. A child session with `parentID` present is classified as `executor`.
4. After orchestrator role seeding, `todo-tool-guard` blocks a non-exempt tool call when TODO state is missing.
5. `unknown` sessions still bypass orchestrator-specific guard enforcement in this fix.
6. Continuation targeting still correctly distinguishes orchestrator/executor from non-target roles under the revised classification rules.
7. Focused tests using SDK-type-conformant event fixtures pass.
8. Plugin-level integration coverage proves event seeding and guard enforcement cooperate through the same plugin instance.
9. `bun test` and `bunx tsc --noEmit` pass.

## Risks / Unknowns

1. Actual runtime may expose less role information than current tests assume, requiring a more conservative but evidence-based fallback.
2. Overcorrecting guard behavior could block sessions that should remain unguarded.
3. Shared resolver changes could unintentionally affect continuation enforcement if contracts drift.

## Revisions

- 2026-04-25: Initial unattended spec created from live runtime failure and debugging findings after PR #4.
