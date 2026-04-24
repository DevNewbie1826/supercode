# Hook Diagnostics Spec

## Work ID

`20260425-hook-diagnostics-c9d2`

## Objective

Add environment-gated diagnostics that prove whether Supercode hook exports are loaded and whether each hook entrypoint is invoked by OpenCode at runtime.

## Current State

- Agents, skills, and config behavior appear to be applied in the running Supercode plugin.
- Hook behaviors appear not to be applied:
  - `experimental.chat.messages.transform` does not appear to inject skill bootstrap content.
  - `tool.execute.before` does not appear to block tool calls when TODO state is absent.
  - `tool.execute.after` reminder behavior has not been observed.
  - `event`-driven role seeding / continuation behavior is not confirmed.
- Previous fixes changed hook implementation and role resolution, but live behavior still suggests hooks are not firing or are not being invoked on the expected runtime path.
- EasyCode logs plugin initialization with `client.app.log(...)`, while Supercode currently has no equivalent runtime diagnostics.

## Desired Outcome

When diagnostics are enabled, Supercode should emit structured logs that answer these questions without guessing:

1. Was the plugin initialized?
2. Which hook keys were returned from the plugin entrypoint?
3. Was `event` invoked? With what event type and session identifier if present?
4. Was `experimental.chat.messages.transform` invoked? How many messages were seen and whether a user message was found?
5. Was `tool.execute.before` invoked? Which tool/session/call was observed, and what role was resolved?
6. Was `tool.execute.after` invoked? Which tool/session/call was observed?

## Scope

In scope:

- add an env-gated diagnostics helper
- log plugin initialization and returned hook keys
- log entry into each hook:
  - `event`
  - `experimental.chat.messages.transform`
  - `tool.execute.before`
  - `tool.execute.after`
- include enough context to identify hook path and session/call correlation
- keep logs structured through `client.app.log(...)`
- add tests proving diagnostics are off by default and enabled when requested

Out of scope:

- changing guard enforcement policy
- changing role-resolution logic
- changing hook semantics based on unverified assumptions
- adding always-on noisy logging
- copying EasyCode implementation directly

## Non-Goals

- Do not fix hook behavior speculatively before evidence is collected.
- Do not log full prompt text, full tool args, secrets, or large payloads.
- Do not make diagnostics mandatory in normal operation.

## Constraints

- Diagnostics must be gated only by `SUPERCODE_DEBUG_HOOKS`.
- `SUPERCODE_DEBUG_HOOKS` is enabled when its value is exactly one of:
  - `1`
  - `true`
  - `yes`
- Any other value, including unset, empty string, `0`, `false`, or `no`, disables diagnostics.
- Default behavior must remain quiet.
- Logs must use `client.app.log(...)` so they are visible in OpenCode’s plugin logging path.
- Log payloads must be small and structured.
- Logging failures must never break plugin behavior.
- Diagnostic tests must not require a live OpenCode process.

Diagnostic log schema:

Every diagnostic log must call `client.app.log({ body })` with this minimum body shape:

```ts
{
  service: "supercode-plugin",
  level: "debug",
  message: string,
  extra: Record<string, unknown>
}
```

Required diagnostic messages and fields:

1. Plugin initialization
   - `message`: `"Supercode plugin initialized"`
   - `extra.directory`: plugin input `directory`
   - `extra.worktree`: plugin input `worktree`
   - `extra.moduleDir`: resolved module directory
   - `extra.hookKeys`: sorted array of returned hook keys
2. Event hook entry
   - `message`: `"Supercode hook invoked: event"`
   - `extra.eventType`: event type if available
   - `extra.sessionID`: extracted session ID if available
3. Chat messages transform entry
   - `message`: `"Supercode hook invoked: experimental.chat.messages.transform"`
   - `extra.messageCount`: number of messages in output
   - `extra.hasUserMessage`: boolean
4. Tool before hook entry
   - `message`: `"Supercode hook invoked: tool.execute.before"`
   - `extra.tool`: input tool name
   - `extra.sessionID`: input session ID
   - `extra.callID`: input call ID
   - `extra.role`: role resolved from `session-role-resolver`
5. Tool after hook entry
   - `message`: `"Supercode hook invoked: tool.execute.after"`
   - `extra.tool`: input tool name
   - `extra.sessionID`: input session ID
   - `extra.callID`: input call ID

Redaction / sanitization:

- Do not log full user messages.
- Do not log tool args.
- Do not log tool outputs.
- Do not log prompt contents.
- Do not log environment variables.

## Success Criteria

1. With diagnostics disabled, plugin initialization and hook calls do not emit debug logs.
2. With diagnostics enabled, plugin initialization emits `message === "Supercode plugin initialized"` with required `directory`, `worktree`, `moduleDir`, and sorted `hookKeys` fields.
3. With diagnostics enabled, `event` hook emits `message === "Supercode hook invoked: event"` with `eventType` and optional `sessionID`.
4. With diagnostics enabled, `experimental.chat.messages.transform` emits `message === "Supercode hook invoked: experimental.chat.messages.transform"` with `messageCount` and `hasUserMessage`.
5. With diagnostics enabled, `tool.execute.before` emits `message === "Supercode hook invoked: tool.execute.before"` with `tool`, `sessionID`, `callID`, and `role`.
6. With diagnostics enabled, `tool.execute.after` emits `message === "Supercode hook invoked: tool.execute.after"` with `tool`, `sessionID`, and `callID`.
7. Diagnostics logging errors are swallowed and do not interrupt hooks.
8. Focused tests and full `bun test` / `bunx tsc --noEmit` pass.

## Risks / Unknowns

1. OpenCode may not surface `client.app.log(...)` where expected in the user’s UI; if so, logs may need to be checked in OpenCode logs rather than chat output.
2. Some hooks may not be invoked at all; diagnostics are designed to prove exactly that.
3. Environment variable propagation to plugin runtime may differ by launch method.

## Revisions

- 2026-04-25: Initial spec for evidence-driven hook diagnostics after observing that agents/skills work but hooks do not appear to fire.
