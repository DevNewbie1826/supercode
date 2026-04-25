# Spec: Guard Unknown Main Sessions

## Work ID

`20260425-guard-unknown-main-d4e7`

## Objective

Fix Supercode's TODO guard policy so main/root sessions are protected even when runtime role seeding has not yet classified the session as `orchestrator`.

## Current State

- Supercode plugin loads and exposes hook keys for `event`, `tool.execute.before`, `tool.execute.after`, and `experimental.chat.messages.transform`.
- Supercode's TODO guard currently only enforces blocking/reminders when `roleResolver.getRole(sessionID)` returns `orchestrator`.
- If the session role is `unknown`, `tool.execute.before` allows non-exempt tool calls even when TODO state is empty.
- Direct comparison with EasyCode shows EasyCode blocks unseeded/unknown main-session tool calls and only skips known subagent sessions.
- Direct local reproduction confirmed:
  - Supercode unseeded `tool.execute.before` with empty TODOs allows a `read` call.
  - EasyCode unseeded `tool.execute.before` with empty TODOs blocks the same call.

## Desired Outcome

Supercode should treat unknown role sessions conservatively as main-session candidates for TODO guard enforcement, while continuing to exempt known executor/subagent sessions.

## Scope

In scope:

- Update TODO guard role policy for `tool.execute.before`.
- Update TODO reminder role policy for `tool.execute.after` consistently.
- Update focused tests that currently assert unseeded sessions are allowed.
- Add or adjust regression coverage proving:
  - unseeded/unknown sessions are blocked by `tool.execute.before` when TODOs are empty;
  - known executor sessions remain allowed;
  - seeded orchestrator sessions remain blocked;
  - after-hook reminders apply to unknown/main candidate sessions and remain skipped for known executors where relevant.

## Non-Goals

- Do not merge or depend on PR #6 diagnostics.
- Do not add diagnostic logging.
- Do not redesign hook registration.
- Do not change plugin config loading.
- Do not alter EasyCode code.
- Do not change skill bootstrap behavior.
- Do not broaden role resolver event parsing unless tests prove it is still necessary after the guard policy fix.

## Constraints

- Preserve existing executor/subagent exemption semantics.
- Preserve existing TODO-first block message semantics.
- Preserve existing exemptions for `todowrite` and `skill` with `name: "todo-sync"`.
- Keep the fix narrow and evidence-backed.
- Behavior-changing code must be driven by failing tests first.
- Existing full test suite and typecheck must pass.

## Success Criteria

1. A focused test demonstrates that an unseeded/unknown session with empty TODO state is blocked before non-exempt tool execution.
2. A focused test demonstrates that known executor sessions remain allowed.
3. Existing seeded orchestrator blocking behavior still passes.
4. After-hook reminder behavior is consistent with the same role policy: executor sessions are skipped, unknown/main candidate sessions are eligible.
5. `bun test` passes.
6. `bunx tsc --noEmit` passes.

## Risks / Unknowns

- The exact live event ordering can still vary, but the fix intentionally removes dependence on early orchestrator role seeding for main-session protection.
- Unknown sessions could include unusual non-main contexts; known executor detection must remain accurate enough to avoid blocking subagents.
- If OpenCode introduces additional non-main session roles later, the guard policy may need an explicit allowlist update.

## Revisions

- Initial spec created after EasyCode/Supercode comparison identified `unknown` role permissiveness as the smallest credible root cause.
