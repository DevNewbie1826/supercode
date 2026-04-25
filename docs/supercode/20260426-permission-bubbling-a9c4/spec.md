# Work ID

20260426-permission-bubbling-a9c4

# Objective

Enable Supercode to surface permission approval requests raised by nested subagent sessions, including grandchild sessions, in the main/root user-facing TUI context so the user can approve or reject the original request without manually navigating into child sessions.

# Current State

- Supercode is an OpenCode plugin package using `@opencode-ai/plugin` and `@opencode-ai/sdk` version `1.14.25`.
- The server plugin in `src/index.ts` currently registers config, tools, event handling, chat transform, and tool guard hooks only.
- The current event handler observes session role information and todo continuation events, but does not handle permission requests.
- `src/hooks/session-role-resolver/index.ts` records whether a session has a `parentID`, but does not preserve the parent chain or expose a root-session lookup.
- The installed plugin API exposes a server-side `permission.ask` hook that can set `output.status` to `ask`, `deny`, or `allow`.
- The installed TUI plugin API exposes session permission state through `state.session.permission(sessionID)`, UI dialogs through `ui.dialog`, and permission responses through `client.permission.reply(...)`.
- The SDK v2 event model includes `permission.asked` / `permission.replied` events and `Session.parentID` / `Session.permission` fields.
- No local implementation currently bubbles permission approval requests from child or grandchild sessions to the root TUI context.

# Desired Outcome

When an OpenCode permission request is raised from a nested subagent session:

- Supercode detects the request.
- Supercode determines the requesting session's root/main session by following `parentID` relationships.
- If the request originates from a non-root session, Supercode presents an approval dialog in the active user-facing TUI rather than requiring the user to navigate into the child session.
- The dialog clearly identifies that the request came from a nested session and shows enough request metadata for a safe user decision.
- The user's decision is sent back to the original permission request, not to the root session.
- Direct/root session permission behavior remains compatible with OpenCode's existing behavior.

# Scope

In scope:

- Add session hierarchy tracking sufficient to resolve any known session to its root ancestor.
- Add or extend event handling for OpenCode permission request and reply events.
- Add a Supercode TUI plugin entry point if needed to display a custom approval dialog.
- Use SDK permission reply APIs to answer the original pending permission request.
- Avoid duplicate dialogs for the same pending permission request.
- Add focused tests for root resolution, nested permission request routing state, and duplicate suppression where the logic is testable without a live TUI.
- Preserve existing todo continuation, role resolution, config generation, tool guard, and agent behavior.

Out of scope:

- Modifying OpenCode core source code.
- Replacing OpenCode's native permission system.
- Changing default allow/deny policy for secret files, external directories, tools, or agents.
- Automatically approving permission requests.
- Adding a web UI or non-TUI approval surface.
- Implementing generic question bubbling beyond permission approval requests.

# Non-Goals

- Do not weaken `.env` or sensitive-file protection.
- Do not let child or grandchild sessions gain permissions that the original OpenCode permission system would deny.
- Do not make unattended workflow execution auto-approve interactive security decisions.
- Do not introduce persistent permission allow rules beyond the existing OpenCode `always` reply behavior.

# Constraints

- The implementation must stay within this repository and package boundaries; it must not patch files under `node_modules` or require an OpenCode fork.
- The root-session lookup must tolerate events arriving before all ancestor sessions have been observed; unresolved relationships must fail safely without auto-approval.
- Permission decisions must target the original `requestID` / permission request identifier.
- The UI must avoid showing multiple dialogs for the same permission request.
- If the TUI plugin cannot render or cannot resolve enough data, the request must remain under OpenCode's normal `ask` behavior rather than being silently allowed.
- Existing tests and typecheck must continue to pass.
- New code should match the existing TypeScript style and plugin architecture.

# Success Criteria

- A nested session permission request can be detected from local event/state inputs and associated with its root session.
- A permission request from a child or grandchild session is presented through a Supercode-controlled TUI dialog.
- Selecting approve once, approve always, or reject invokes the SDK permission reply endpoint for the original request.
- Duplicate `permission.asked` events or repeated state observations for the same request do not create duplicate dialogs.
- Root-session permission requests are not unnecessarily rerouted or broken.
- Unit tests cover session parent-chain resolution, grandchild root resolution, unknown-parent behavior, and pending-permission duplicate tracking.
- `bun test` and `bun run typecheck` pass.

# Risks / Unknowns

- The exact runtime shape and timing of OpenCode TUI plugin loading may require adapting the implementation to the plugin API constraints.
- OpenCode's built-in permission UI may still display its own prompt for root-session requests; the Supercode dialog should focus on nested-session requests to minimize UI conflicts.
- Some permission requests may arrive before parent session events are cached; the implementation must not approve or reject those automatically.
- The server-side `permission.ask` hook can observe permission decisions but cannot itself display TUI dialogs, so a TUI plugin path is likely required for the full desired UX.

# Revisions

- 2026-04-26: Initial unattended-mode spec drafted from local repository and installed SDK/plugin evidence.
