# Work ID

20260426-todo-remaining-tasks-9c3a

# Objective

Update Supercode's `todo-continuation-enforcer` hook so idle-session continuation prompts include an EasyCode-style `Remaining tasks:` section listing the incomplete TODO items that triggered the continuation prompt.

# Current State

- The hook is implemented in `src/hooks/todo-continuation-enforcer/index.ts`.
- The continuation text is currently a static `CONTINUATION_PROMPT` from `src/hooks/todo-continuation-enforcer/constants.ts`.
- When a session becomes idle and incomplete TODOs remain, `executePrompt()` re-reads TODO state, calls `hasIncompleteTodo(todos)`, and sends only the static prompt through `ctx.client.session.prompt({ sessionID, text: CONTINUATION_PROMPT })`.
- `src/hooks/todo-state.ts` currently treats todos as incomplete when their status is not `completed` or `cancelled`.
- External EasyCode reference formats continuation prompts by appending:

  ```text
  Remaining tasks:
  - [<status>] <content>
  ```

  for each incomplete todo.

# Desired Outcome

When Supercode's continuation enforcer prompts an idle session because TODOs remain, the prompt must preserve the existing Supercode continuation directive and append a `Remaining tasks:` section containing the currently incomplete TODOs, formatted so agents can immediately see what work remains.

# Scope

In scope:

- Add prompt-building behavior for `todo-continuation-enforcer` that appends incomplete TODO details to the existing directive.
- Ensure the appended list is generated from the fresh TODO state re-read immediately before prompting.
- Format each listed item as `- [<status>] <content>` under a `Remaining tasks:` heading.
- Keep existing continuation-enforcer timer, idle-event, deletion, in-flight cancellation, and session normalization behavior unchanged.
- Add or update tests for dynamic remaining-task prompt content, including mixed complete/incomplete TODO states.
- Keep existing tests passing and run the repository's relevant verification commands.

Out of scope:

- Changing the overall continuation directive wording except where necessary to support dynamic prompt construction.
- Changing countdown duration defaults or idle-event scheduling behavior.
- Changing role authority rules in the prompt.
- Changing todo tool guard behavior.
- Adding UI, CLI commands, or new user-facing configuration.

# Non-Goals

- Do not implement broader EasyCode parity beyond the `Remaining tasks:` continuation prompt context.
- Do not alter how sessions are identified or when prompts are scheduled.
- Do not list completed or cancelled TODOs in the remaining-task section.

# Constraints

- The continuation prompt must still include the existing Supercode-specific workflow safety guidance.
- The remaining-task list must be derived from normalized TODO data returned by `ctx.client.session.todo()` at execution time, not from stale schedule-time data.
- Only incomplete TODOs should be listed, consistent with the hook's current incomplete definition unless the implementation deliberately centralizes and preserves equivalent semantics.
- Formatting should be deterministic and simple: one line per incomplete todo in existing TODO order.
- Missing or non-string `content`/`status` values should not crash the hook; existing hook error-swallowing behavior should remain intact.
- Tests should not require network access.

# Success Criteria

- A continuation prompt sent for incomplete TODOs contains the existing directive text followed by a blank line, `Remaining tasks:`, and one bullet per incomplete TODO using `- [status] content`.
- Completed and cancelled TODOs are excluded from the `Remaining tasks:` list.
- If no incomplete TODOs remain at execution time, no continuation prompt is sent, matching current behavior.
- Existing timer/session/deletion behavior remains covered and passing.
- `bun test` passes.
- `bun run typecheck` passes.

# Risks / Unknowns

- EasyCode excludes `blocked` and `deleted` statuses as terminal; Supercode currently excludes only `completed` and `cancelled`. This work should preserve Supercode's current semantics unless planning identifies an explicit reason to align terminal-status handling separately.
- The TODO API may return unexpected values. The implementation should avoid introducing new crash paths during prompt formatting.
- Prompt length could grow with large TODO lists, but no truncation behavior is requested for this bounded change.

# Revisions

- Initial spec drafted from user request, internal repository research, and EasyCode reference behavior.
