# Supercode Hook System Design

## Goal

Investigate EasyCode's hook behavior and define a `supercode`-native hook system that can absorb the useful behavior without copying EasyCode's implementation directly.

## Scope

This design covers the first hook wave:

- skill bootstrap injection
- todo tool guard
- todo continuation enforcer
- a shared session role resolver used by current and future hooks

## Non-Goals

- Do not copy EasyCode hook code or prompt text verbatim.
- Do not implement broad session-wide enforcement for every subagent.
- Do not add user-facing configuration for the first version unless a hook needs a hard safety escape hatch later.
- Do not design a fully generic event framework beyond current plugin needs.

## EasyCode Findings

### 1. Skill bootstrap

EasyCode injects a synthetic bootstrap block into the first user message via `experimental.chat.messages.transform`.
Its purpose is to force skill-first behavior early in the session.

Useful idea to keep:

- prepend one synthetic guidance block to the first real user message only

What should not be copied directly:

- exact bootstrap wording
- EasyCode-specific instruction ordering and workflow wording

### 2. Todo tool guard

EasyCode uses `tool.execute.before` and `tool.execute.after` to enforce TODO-first behavior.
Before tool execution, it blocks non-exempt tools if the session has no todo list.
After execution, it tracks todo snapshot changes and adds stale reminders if todowrite has not been updated recently.

Useful ideas to keep:

- hard block before non-exempt tool execution when todo state is missing
- reminder when tool usage continues without todo updates
- keep guard state per session with TTL cleanup

What should be changed for Supercode:

- apply only to the main orchestrator session, not every session
- exempt only the minimal tools needed to establish or maintain todo state
- align error text with Supercode workflow language

### 3. Todo continuation enforcer

EasyCode watches idle/status events and re-prompts a session if incomplete todos remain after a countdown.

Useful ideas to keep:

- idle-triggered delayed continuation
- fetch current todos at prompt time, not schedule time
- cancel timers when sessions disappear

What should be changed for Supercode:

- apply only to orchestrator and executor sessions
- continuation message should reflect Supercode workflow discipline, not EasyCode wording
- role targeting should come from shared role resolution instead of ad-hoc hook logic

### 4. Session role resolver

EasyCode has a small session role resolver that infers role from runtime events and stores role state with TTL-based cleanup.

This is the right architectural direction for Supercode because more hooks are expected later.
The resolver should become the shared policy input for deciding whether a hook applies to a session.

## Proposed Architecture

### Overview

Add a hook subsystem under `src/hooks/` with four units:

- `session-role-resolver/`
- `skill-bootstrap/`
- `todo-tool-guard/`
- `todo-continuation-enforcer/`

And one small shared utility:

- `tool-output-shape.ts`

### 1. Shared role layer

Create a reusable `session-role-resolver` rather than letting each hook infer roles independently.

Initial supported classifications:

- `orchestrator`
- `executor`
- `other`
- `unknown`

Initial responsibilities:

- observe runtime events
- infer a session role from event fields such as agent name, mode, and parent session linkage
- store role state by session ID
- expose `getRole(sessionID)`
- expose TTL-based pruning and disposal

Why this is the chosen design:

- future hooks will need the same targeting logic
- it avoids duplicate event parsing logic across hooks
- it gives a clean extension point for future roles like planner or reviewer

### 2. Skill bootstrap hook

Create `src/hooks/skill-bootstrap/`.

Behavior:

- run on `experimental.chat.messages.transform`
- prepend one synthetic text part to the first user message only
- never duplicate the bootstrap if already present

Supercode-specific content goals:

- remind the session to check applicable skills first
- reinforce workflow gates instead of generic “just use skills” wording
- keep text shorter than EasyCode's version
- avoid contradicting system and orchestrator rules

Bootstrap content ownership rule:

- the bootstrap markdown content is user-authored
- initial implementation may leave the markdown intentionally blank or temporarily use reference text only as a placeholder during local testing
- final bootstrap wording should not be treated as plugin-authored canonical text
- when content is ready to be supplied, update `src/hooks/skill-bootstrap/skill-bootstrap.md`

### 3. Todo tool guard hook

Create `src/hooks/todo-tool-guard/`.

Behavior:

- run on `tool.execute.before` and `tool.execute.after`
- apply only when `session-role-resolver` says the session role is `orchestrator`
- before execution:
  - allow `todowrite`
  - allow the minimum TODO-establishing exceptions required by the Supercode workflow
  - block other tools if the session has no todo state
- after execution:
  - track per-session tool usage count
  - snapshot todo state around `todowrite`
  - reset stale counters when todo content actually changes
  - attach reminders when the session keeps using tools without refreshing todo state

Required design constraint:

- use output-shape-safe reminder attachment so structured tool responses are not corrupted

### 4. Todo continuation enforcer hook

Create `src/hooks/todo-continuation-enforcer/`.

Behavior:

- run on `event`
- normalize runtime idle-like status events into a single internal idle signal if needed
- apply only when the resolved role is `orchestrator` or `executor`
- when a targeted session becomes idle:
  - schedule a delayed check
  - re-read current todos when the timer fires
  - if incomplete todos remain, prompt the session to continue
- clear timers when sessions are deleted or invalidated

Why not apply globally:

- explorer, librarian, and reviewer sessions are intentionally bounded and should not be endlessly resumed
- continuation enforcement is only appropriate for sessions that are expected to drive work forward continuously

## File Structure

```text
src/
  hooks/
    session-role-resolver/
      index.ts
      types.ts
    skill-bootstrap/
      index.ts
      skill-bootstrap.md
    todo-tool-guard/
      index.ts
      before.ts
      after.ts
      state.ts
      constants.ts
      types.ts
    todo-continuation-enforcer/
      index.ts
      constants.ts
      session-id.ts
      session-status-normalizer.ts
      session-todo.ts
      todo.ts
      types.ts
    tool-output-shape.ts
```

This is intentionally similar in decomposition to the responsibilities observed in EasyCode, but the content and targeting rules remain `supercode`-specific.

## Integration Plan

`src/index.ts` will stop being tool/config-only wiring and will become the plugin composition point for:

- `config`
- `tool`
- `tool.execute.before`
- `tool.execute.after`
- `event`
- `experimental.chat.messages.transform`

Wiring rules:

- initialize one shared role resolver for the plugin instance
- pass the resolver into hooks that need targeting
- have the `event` hook both feed the resolver and run continuation enforcement
- keep disposal localized if the plugin API later supports explicit teardown hooks

## Quality Filters Before Adoption

### Keep

- behavior-level ideas
- small per-hook state stores
- TTL cleanup for in-memory state
- synthetic bootstrap insertion pattern
- idle-triggered delayed continuation

### Reject or Rewrite

- EasyCode wording and policy text
- global application of enforcement logic
- any hook logic that assumes every session should behave like the main worker
- any overbroad exceptions that weaken TODO enforcement

## Risks

### Risk: Event payload instability

The resolver and idle normalization depend on runtime event fields that may vary.

Mitigation:

- centralize event parsing in the resolver and normalizer
- make unknown shapes fail closed to `unknown`
- only apply strict hook behavior to positively identified sessions

### Risk: Over-enforcement blocks valid orchestrator actions

If the exception list is too small, the orchestrator may be blocked before it can establish todo state correctly.

Mitigation:

- define a minimal allowlist intentionally
- test bootstrap path, first todowrite path, and normal post-todo tool usage

### Risk: Continuation becomes noisy or looping

Repeated prompting can become disruptive if idle detection or todo completion checks are wrong.

Mitigation:

- target only orchestrator and executor
- re-check incomplete todos at timer fire time
- clear timers on deletion and replace existing timers on reschedule

## Acceptance Criteria

1. `supercode` can inject a Supercode-specific skill bootstrap block on the first user message.
2. The main orchestrator session is blocked from non-exempt tool use until todo state exists.
3. The orchestrator receives stale TODO reminders when tool use continues without todo updates.
4. Orchestrator and executor sessions with incomplete todos receive delayed continuation prompts after idle.
5. Explorer, librarian, and reviewer sessions are not targeted by continuation enforcement.
6. Session targeting logic is centralized in a shared role resolver that future hooks can reuse.

## Recommendation

Proceed with the shared resolver architecture now rather than duplicating role inference in each hook.
Even though this is more structure up front, it is justified because the user already expects more hooks to be added later.
