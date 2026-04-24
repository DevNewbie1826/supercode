# Hook System Spec

## Work ID

`20260424-hook-system-b7f1`

## Objective

Add a reusable hook subsystem to `supercode` that introduces skill bootstrap injection, orchestrator-focused TODO enforcement, orchestrator/executor continuation enforcement, and a shared session role resolver for future hook expansion.

## Current State

- `supercode` currently exposes `config` and `tool` from `src/index.ts`.
- There is no `src/hooks/` subsystem yet.
- There is no shared session role targeting layer for hook behavior.
- There is no bootstrap transform, no TODO tool guard, and no continuation enforcer.
- The approved design and plan already exist under `docs/superpowers/specs/2026-04-24-supercode-hook-system-design.md` and `docs/superpowers/plans/2026-04-24-supercode-hook-system.md`.

## Desired Outcome

- `supercode` exposes hook handlers in addition to config and tools.
- A shared `session-role-resolver` classifies sessions at least as `orchestrator`, `executor`, `other`, or `unknown`.
- A `skill-bootstrap` transform prepends a synthetic bootstrap block to the first user message only.
- A `todo-tool-guard` enforces TODO-first behavior for the main orchestrator session with hard blocking for non-exempt tools.
- A `todo-continuation-enforcer` re-prompts idle orchestrator and executor sessions when incomplete TODOs remain.
- Hook behavior is verified with focused tests and a full regression pass.

## Scope

In scope:

- add `src/hooks/` subsystem and related helper files
- add shared session role resolution for hook targeting
- wire plugin-level hook exports from `src/index.ts`
- implement bootstrap transform loading `src/hooks/skill-bootstrap/skill-bootstrap.md`
- implement orchestrator-only TODO guard before/after hooks
- implement orchestrator/executor continuation enforcement via event hook
- add focused tests for hook wiring and hook behavior
- run full test suite and typecheck

Out of scope:

- broad enforcement for explorer, librarian, reviewer, planner, or other bounded sessions
- user-facing configuration for first-version hook behavior
- a generic event framework beyond current plugin needs
- final authored bootstrap prompt content beyond placeholder file creation

## Non-Goals

- copying EasyCode hook code or prompt text verbatim
- applying TODO enforcement to every session role
- auto-resuming all subagents globally
- redesigning unrelated plugin systems

## Constraints

- easycode is reference-only; implementation must be re-authored for `supercode`
- hook targeting must be centralized rather than duplicated in each hook
- `todo-tool-guard` must hard block orchestrator non-exempt tool use before TODO state exists
- `todo-continuation-enforcer` must target only orchestrator and executor sessions
- `skill-bootstrap.md` is user-owned content and may remain intentionally blank during implementation
- structured tool outputs must not be corrupted when reminders are attached

Operational definitions:

- TODO state source: session TODO state is read from `ctx.client.session.todo({ path: { id: sessionID } })`
- TODO exists: a session has TODO state when the normalized todo response is an array with at least one item
- Incomplete TODO: a todo item is incomplete when its `status` is neither `completed` nor `cancelled`
- First real user message: the first message in transform output where `message.info.role === "user"`
- Exempt tools for the orchestrator guard in the first version:
  - `todowrite`
  - `skill` only when the requested skill name is `todo-sync`
- Non-exempt tool use by the orchestrator must be blocked when no TODO exists
- Session role resolution contract:
  - identify session ID from runtime event properties using top-level `sessionID`, top-level `session_id`, or `properties.info.id` only for clearly session-scoped runtime events
  - first-version session-scoped fallback for `properties.info.id` is limited to `session.deleted` and `session.status`
  - classify as `orchestrator` when event data positively indicates the main workflow driver via `agent === "orchestrator"` or `mode === "main"` or `mode === "primary"`
  - classify as `executor` when event data positively indicates `agent === "executor"`
  - classify as `other` when a session is positively identified but does not match orchestrator or executor targeting rules
  - classify as `unknown` when event shape is insufficient for safe positive classification
  - strict guard/continuation behavior applies only to positive target classifications, never to `unknown`
  - resolver state must be bounded via TTL-based pruning and explicit disposal support
  - TTL enforcement must apply both when observing new events and when later hooks read role state through lookup paths
- Idle trigger for continuation enforcement:
  - direct `session.idle` events
  - or normalized `session.status` events where `status.type === "idle"`
- Initial continuation countdown: 120 seconds by default with no first-version user-facing config surface
- Continuation prompt behavior:
  - use `ctx.client.session.prompt(...)` to inject one text prompt when the timer fires and incomplete todos remain
  - timers are replaced on reschedule and cleared on session deletion
  - future idle events may schedule a new continuation prompt if incomplete todos still remain
- TODO snapshot comparison rule:
  - build a deterministic snapshot from the todo array in existing response order
  - each item contributes only stable user-visible fields used by guard behavior: `content`, `status`, and `priority`
  - snapshot change means the full normalized snapshot string before and after `todowrite` is different
- TODO stale reminder behavior:
  - stale reminder attaches after every 20 non-`todowrite` tool calls without a todo snapshot change
  - if tool output is plain non-JSON text, append reminder text to output
  - otherwise ensure `output.metadata` is an object and set `output.metadata.todoToolGuardReminder` to the reminder text
- Role meanings:
  - `orchestrator`: main workflow-driving session
  - `executor`: implementation-driving execution session
  - `other`: positively identified non-target session role
  - `unknown`: event data insufficient for safe positive identification
- Bootstrap session tracking behavior:
  - session-level bootstrap deduplication state must be bounded via TTL-based pruning or equivalent bounded cleanup
  - duplicate detection must identify only Supercode's own bootstrap part, not any unrelated synthetic text part

## Success Criteria

1. `SupercodePlugin` returns `tool.execute.before`, `tool.execute.after`, `event`, and `experimental.chat.messages.transform` in addition to existing hooks.
2. First-user bootstrap injection prepends at most one synthetic bootstrap part to the first real user message for a session.
3. Orchestrator sessions are blocked from non-exempt tool use when session TODO state is absent.
4. Non-orchestrator sessions are not blocked by the TODO guard.
5. Orchestrator and executor sessions with incomplete TODOs are re-prompted after idle plus the configured countdown.
6. Non-target roles are skipped by continuation enforcement.
7. Stale reminders are attached safely without corrupting structured tool outputs.
8. Full `bun test` and `bunx tsc --noEmit` pass.

## Risks / Unknowns

1. Runtime event payload shape may vary, so session role resolution and idle normalization must fail safely.
2. Exception allowlist for TODO guard may initially be too narrow or too broad.
3. Bootstrap file content is intentionally user-owned, so implementation must tolerate empty content safely.

## Revisions

- 2026-04-24: Initial workflow spec created from approved hook-system design and implementation plan.
