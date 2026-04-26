# Work ID

20260426-permission-bubbling-a9c4

# Goal

Enable Supercode to surface OpenCode permission approval requests raised by nested subagent sessions, including grandchildren, in the main/root TUI context while replying to the original permission request ID and preserving existing root-session permission behavior.

# Source Spec

- Approved spec: `docs/supercode/20260426-permission-bubbling-a9c4/spec.md`
- Planning context supplied by requester:
  - Server plugin entry: `src/index.ts`
  - Session-role resolver: `src/hooks/session-role-resolver/index.ts`
  - Existing resolver tests: `src/__tests__/session-role-resolver.test.ts`
  - No TUI plugin currently exists.
  - `@opencode-ai/plugin` exposes `TuiPluginModule` in `dist/tui.d.ts` with `api.event.on`, `api.ui.dialog`, `state.session.permission(sessionID)`, and client permission APIs.
  - SDK v2 `PermissionRequest` has `id`, `sessionID`, `permission`, `patterns`, `metadata`, `always`, and `tool`.
  - SDK v2 events include `EventPermissionAsked` and `EventPermissionReplied`.
  - Client permission replies must target the original request ID using the SDK permission reply API, not a root session.

# Architecture / Design Strategy

Implement permission bubbling as two narrow layers:

1. **Shared, unit-testable state utilities**
   - Extend the existing session resolver to preserve `sessionID -> parentID` facts and expose root lookup for known parent chains.
   - Add a dedicated permission-bubbling state module that tracks pending nested permission requests, root routing metadata, and duplicate suppression by original permission request ID.
   - Keep unresolved parent chains safe: unknown ancestors must return unresolved/unknown and must not auto-approve, auto-reject, or force a custom dialog.

2. **Plugin integration surfaces**
   - Server plugin (`src/index.ts`) and TUI plugin state are independent unless implementation proves a shared state path is required by the local plugin runtime. Do not assume server-observed session hierarchy is visible to the TUI plugin.
   - Add a TUI plugin entry point that listens for permission asked/replied events and/or session permission state changes, resolves nested requests to a known root session, displays a Supercode approval dialog only for non-root nested requests, and replies through the SDK client permission reply API using the original request ID.
   - Root-session requests are not rerouted by Supercode's custom dialog path.

Before deep implementation, perform an explicit TUI integration feasibility gate. Static/type checks must confirm the local `@opencode-ai/plugin` and SDK v2 types support a TUI module, event subscription, dialog invocation, state lookup, package export path, and `client.permission.reply({ requestID, reply })`. Static mocks can prove planned wiring and handler behavior only; they must not be treated as proof of real OpenCode runtime loader discoverability or real root-context event visibility. A separate runtime smoke gate is mandatory before claiming the feature complete. If that runtime smoke cannot be executed in the environment, execution must produce the exact documented smoke procedure/evidence fields and mark runtime proof as pending for final review rather than claiming verification. Legacy `respond`-style APIs are not preferred and must not be used unless the local SDK lacks the v2 reply API and planning is revised.

The implementation must not patch `node_modules` or OpenCode core and must not change default permission allow/deny policy. All security-sensitive decisions remain explicit user choices or OpenCode-native behavior.

# Scope

In scope:

- Session parent-chain tracking and root-session lookup for known sessions.
- Permission request state extraction/routing for nested sessions.
- Duplicate suppression for repeated observations of the same pending permission request.
- A Supercode TUI plugin entry that displays nested-session approval dialogs.
- SDK v2 permission replies for approve once, approve always, and reject via `client.permission.reply({ requestID, reply })` against the original request ID.
- Focused unit tests for resolver root lookup, grandchild lookup, unknown-parent safety, routing state, and duplicate suppression.
- Preservation of existing todo continuation, role resolution, config generation, tool guard, and agent behavior.

Out of scope:

- Patching `node_modules` or OpenCode core.
- Replacing OpenCode's native permission system.
- Changing default allow/deny policies for files, tools, or agents.
- Auto-approving permission requests.
- Adding web UI or non-TUI approval surfaces.
- Generic question bubbling beyond permission approval requests.

# Assumptions

- The TUI plugin can be exported from this package without replacing the existing server plugin default export.
- A TUI plugin module can subscribe to permission events through `api.event.on` and can query current pending permission state through `state.session.permission(sessionID)`.
- Nested child and grandchild `permission.asked` events are observable from the active/root TUI context. If local evidence shows these events are not visible from the root TUI context, stop for re-planning instead of implementing a speculative workaround.
- The SDK v2 client permission reply API accepts `client.permission.reply({ requestID, reply })`, where `requestID` is `PermissionRequest.id` and `reply` maps an explicit user choice to approve once, approve always, or reject. Legacy `respond` APIs are not the intended integration path.
- If a nested request cannot be associated with a fully known root chain, Supercode should suppress its custom bubbling path and leave OpenCode's normal `ask` behavior intact.
- If parent lifecycle events were missed before plugin load, execution must either implement a bounded safe parent-chain backfill using available local session client/state APIs or document evidence that lifecycle events reliably precede nested permission events in the TUI runtime. If neither is possible, unresolved chains remain safe fallback no-dialog cases and the issue must be routed back for re-planning before claiming nested bubbling complete.
- Existing package test commands remain `bun test` and `bun run typecheck`.

# Source Spec Alignment

- Spec lines 7 and 22-29 require nested permission requests to appear in the root user-facing TUI and reply to the original request. Tasks T0-T5 implement and verify that path.
- Spec lines 35 and 76 require parent-chain root resolution, including grandchildren and unknown-parent behavior. Task T1 covers this in resolver state and tests.
- Spec lines 36-40 require permission event/reply handling and duplicate suppression. Tasks T0, T2, and T3 cover API feasibility, state, event observation, TUI dialog flow, and duplicate tests.
- Spec lines 41, 66, and 67 require preserving existing behavior and style. Tasks T1, T4, and T5 require existing tests, typecheck, and limited integration changes.
- Spec lines 45-49 and 61 prohibit OpenCode core/node_modules patches and non-TUI surfaces. The file structure and tasks only target repository source/test files.
- Spec lines 63-65 require original request-ID replies, duplicate-dialog avoidance, and safe fallback. Tasks T0-T4 explicitly verify these constraints.

# Execution Policy

- Use test-driven development for behavior changes: each implementation task that changes behavior must first add or update failing focused tests where the behavior is testable without a live TUI.
- Keep changes narrow and file-targeted. Do not refactor unrelated hooks, tools, config generation, or agent behavior.
- Do not modify files under `node_modules` and do not require an OpenCode fork.
- Do not add automatic permission approval or persistent allow rules outside the SDK reply value for an explicit user-selected `always` decision.
- Prefer pure functions/classes for permission routing state so duplicate suppression and safety behavior are unit-testable outside the TUI runtime.
- Treat server and TUI plugin state as independent by default. Do not plan or implement cross-runtime shared memory unless local plugin evidence proves it exists and is necessary.
- Permission replies must use local SDK v2 `client.permission.reply({ requestID, reply })`, with `requestID` equal to the original `PermissionRequest.id`. Do not target the root session. Do not prefer legacy `respond` naming.
- Before deep TUI implementation, create a concrete mocked TUI test harness around `api.event.on`, `api.ui.dialog`, `state.session.permission`, and `client.permission.reply` for static/type and handler behavior. Separately, require runtime smoke verification for real OpenCode loader discoverability and real root-context child/grandchild event visibility before claiming feature complete. Runtime smoke verification must include: root TUI active, child and grandchild permission requests raised, exactly one Supercode dialog appears in the root context for each original request, the chosen decision replies to the original request ID, and duplicate events/observations do not reopen an already handled request. If runtime smoke cannot be executed, document the smoke procedure and mark runtime proof pending for final review.
- If the exact TUI dialog/client API shape differs during implementation, adapt only within the new TUI integration module and keep the state utilities/API stable.
- Stop and route back to planning/spec if implementation discovers that this package cannot register a TUI plugin entry without package/export changes not covered by this plan.

# File Structure

Existing files to modify:

- `src/index.ts`
- `src/hooks/session-role-resolver/index.ts`
- `src/__tests__/session-role-resolver.test.ts`
- `package.json` only if required to expose the TUI plugin entry from this package.
- `tsconfig.json` only if new source/test files are not already included by existing TypeScript configuration.

New files to create:

- `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md`
- `src/hooks/permission-bubbling/index.ts`
- `src/tui.ts`
- `src/__tests__/permission-bubbling.test.ts`
- `src/__tests__/tui-permission-bubbling.test.ts` only if T0 chooses mocked harness option A or T3 completes the harness.

Files not to modify:

- `node_modules/**`
- OpenCode core source outside this repository/package
- Unrelated tool, config, bootstrap, todo continuation, or guard modules except through existing public resolver behavior consumed by `src/index.ts`

# File Responsibilities

- `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md`
  - T0-owned feasibility artifact.
  - Record static evidence from local `package.json`, local `@opencode-ai/plugin` TUI types, local SDK v2 permission reply types, and any package export assumptions.
  - Record the T0 choice: option A mocked harness skeleton created, or option B mocking not faithful with exact reason.
  - Record the mandatory runtime smoke procedure and evidence fields, plus whether runtime proof is executed/pass, executed/fail, or pending for final review.
  - Record parent-chain availability strategy: reliable lifecycle-before-permission evidence, bounded safe backfill path, or re-planning blocker.

- `src/hooks/session-role-resolver/index.ts`
  - Continue existing role classification and session ID extraction.
  - Store `parentID` for session lifecycle events.
  - Expose a root lookup method for known session chains.
  - Prune/delete parent-chain facts consistently with existing TTL and `session.deleted` behavior.

- `src/__tests__/session-role-resolver.test.ts`
  - Preserve existing resolver tests.
  - Add focused coverage for direct root lookup, child-to-root lookup, grandchild-to-root lookup, unresolved unknown-parent behavior, cycle/invalid-chain safety if implemented defensively, and TTL/deletion cleanup where applicable.

- `src/hooks/permission-bubbling/index.ts`
  - Contain pure permission bubbling state and helpers.
  - Normalize/extract permission request data from SDK event/state shapes used by the TUI integration.
  - Decide whether a request is root, nested routable, duplicate, unresolved, or already completed.
  - Track pending/in-flight/dismissed/completed dialogs by original permission request ID.
  - Guarantee at most one Supercode dialog is ever opened for a given permission request ID; cancel/error marks the request dismissed for custom UI purposes while sending no reply.
  - Clear active pending/in-flight state on permission replied/completed events without allowing the same request ID to open another Supercode dialog.

- `src/__tests__/permission-bubbling.test.ts`
  - Test nested routing state and duplicate suppression without a live TUI.
  - Test root-session requests are not rerouted.
  - Test unresolved parent chains fail safely.
  - Test reply/completion clears duplicate-suppression state.

- `src/tui.ts`
  - Export the Supercode TUI plugin module using `TuiPluginModule` from `@opencode-ai/plugin`.
  - Be exposed through a package entry that static checks show is valid and that the mandatory runtime smoke gate proves OpenCode can actually discover/load before feature completion is claimed.
  - Subscribe to permission asked/replied events and/or observe `state.session.permission(sessionID)` where required by the API.
  - Support nested child and grandchild `permission.asked` handling in the TUI plugin; real active/root TUI observability is proven by the mandatory runtime smoke gate or marked pending for final review if the environment cannot execute it.
  - Use a bounded safe parent-chain backfill from available session client/state APIs if lifecycle events may be missed and such APIs can fetch authoritative `parentID` facts without broad inference.
  - Use resolver + permission-bubbling state to show dialogs only for nested routed requests.
  - Display request metadata sufficient for user decision: nested session ID, resolved root session ID, permission/tool information, patterns, metadata when available, and whether an `always` option is available.
  - Reply through `client.permission.reply({ requestID, reply })` using the original permission request ID.
  - Avoid duplicate dialogs for the same request ID across all repeated observations. After cancel/error, mark the request dismissed/no-custom-dialog, send no reply, and leave OpenCode native ask behavior intact; do not reopen a Supercode dialog for that request ID.
  - Leave root/unresolved requests and missed-parent-chain cases to OpenCode normal ask behavior.

- `src/__tests__/tui-permission-bubbling.test.ts`
  - If T0 option A is chosen, contain a concrete mocked TUI harness skeleton: fake `api.event.on` with registration capture, fake `api.ui.dialog`, fake `state.session.permission`, and spy `client.permission.reply`.
  - Before `src/tui.ts` exists, use a minimal placeholder contract or TODO/failing assertions documenting the intended captured-handler behavior for T3; do not assert production plugin behavior in T0.
  - Capture registrations for `permission.asked`, `session.created`, `session.updated`, and `permission.replied`; simulate child and grandchild events through captured handlers once T3 supplies the real TUI module; assert the same mocked root TUI instance receives the T3 handler callbacks.
  - Verify dialog display and `client.permission.reply({ requestID, reply })` behavior for approve once, approve always, and reject.
  - Verify duplicate asked events do not call `ui.dialog` twice.
  - Verify root/unresolved requests do not call `ui.dialog` or client reply.

- `src/index.ts`
  - Continue registering existing server plugin hooks unchanged in behavior.
  - Treat server-side permission bubbling integration as a no-op unless local evidence proves the server plugin must observe permission events for this feature.
  - Do not attempt to share in-memory permission bubbling state with the TUI plugin unless the runtime explicitly supports that sharing.

- `package.json`
  - Only add an export for `./tui` if the TUI plugin cannot otherwise be loaded from `src/tui.ts`.

# Task Sections

## T0 — Verify static TUI feasibility and define mandatory runtime smoke gate

- **id:** T0
- **name:** Verify static TUI feasibility and runtime proof requirements
- **purpose:** Prevent deep implementation against an assumed TUI/client API shape while separating static/mocked feasibility from mandatory real OpenCode runtime proof.
- **files to create / modify / test:**
  - Create/modify: `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md`
  - Optionally create/test: `src/__tests__/tui-permission-bubbling.test.ts` mocked harness skeleton with type-level checks and TODO/failing assertions for T3.
  - Inspect only: local `@opencode-ai/plugin` TUI type definitions and local SDK v2 permission client types.
  - Inspect only: local `package.json` exports/entry fields.
  - Do not modify implementation source in this task.
- **concrete steps:**
  1. Create `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` with sections: Static Evidence, Mock Harness Decision, Runtime Smoke Procedure, Runtime Smoke Status, Parent-Chain Availability, Reply API Mapping, Re-planning Blockers.
  2. Inspect local `package.json` `exports` and package entry fields to identify how a TUI entry can be exported/discovered without replacing the server plugin default export; record findings in `tui-feasibility.md`.
  3. Inspect local `@opencode-ai/plugin` TUI type definitions for `TuiPluginModule`, `api.event.on`, `api.ui.dialog`, `state.session.permission(sessionID)`, and access to `client.permission.reply`; record findings in `tui-feasibility.md`.
  4. Confirm local SDK v2 reply invocation shape is `client.permission.reply({ requestID, reply })`; record reply mapping names available in local types for approve once, approve always, and reject in `tui-feasibility.md`.
  5. Confirm no legacy `respond` API is required; if only legacy `respond` exists, stop and route back to planning because this plan is pinned to SDK v2 reply.
  6. Choose exactly one mocked-harness path and record it in `tui-feasibility.md`:
     - **Option A:** create `src/__tests__/tui-permission-bubbling.test.ts` as a mocked harness skeleton with type-level import/compile checks, fake `api.event.on` registration capture, fake `api.ui.dialog`, fake `state.session.permission`, spy `client.permission.reply`, and TODO/failing assertions for T3. Because `src/tui.ts` does not exist yet, use a minimal placeholder contract or documented intended harness callbacks; do not assert production plugin behavior in T0.
     - **Option B:** do not create the mocked harness file; instead record in `tui-feasibility.md` exactly why mocking is not faithful for this local plugin/runtime shape and provide the exact mandatory runtime smoke procedure from step 10.
  7. For option A, outline or encode the intended captured-handler harness for T3: registrations for `permission.asked`, `session.created`, `session.updated`, and `permission.replied`; simulated child and grandchild lifecycle/permission events delivered to captured handlers; assertion that T3's real plugin callbacks run in the same mocked root TUI instance. Mark these as TODO/failing until T3 supplies `src/tui.ts`.
  8. Determine parent-chain availability strategy before T3 and record it in `tui-feasibility.md`:
     - Prefer documented evidence that session lifecycle events with `parentID` reliably precede nested `permission.asked` events in the active/root TUI context.
     - If that evidence is unavailable, identify a bounded safe backfill using available session client/state APIs to fetch only the requesting session and ancestors needed to resolve `parentID` facts.
     - If neither reliable ordering nor bounded backfill is available, stop for re-planning because nested bubbling would be best-effort only.
  9. Record in `tui-feasibility.md` that static mocks/type checks do not prove real OpenCode runtime loader discoverability or real root-context event visibility.
  10. Define the mandatory runtime smoke gate in `tui-feasibility.md` for real OpenCode runtime proof. The smoke gate must be executed before claiming the feature complete. If it cannot be executed in the environment, execution must document the procedure and mark runtime proof as pending for final review, not verified. The procedure must state exact evidence fields to capture: package export path used to load TUI entry, evidence that OpenCode loaded/discovered the TUI entry, root TUI session/context identifier, registered/observed event names, child session ID and parentID, grandchild session ID and parentID, original permission request IDs, number of Supercode dialogs opened per request ID, selected decision, `client.permission.reply({ requestID, reply })` payload, duplicate event replay inputs, duplicate dialog count, and explicit pass/fail for real root-context visibility of child/grandchild permission events.
- **explicit QA / verification:**
  - `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` exists and contains the required sections and T0 option A/B decision.
  - Static evidence from local `package.json` exports/entry fields is recorded in `tui-feasibility.md`.
  - Local `@opencode-ai/plugin` TUI type and SDK v2 reply API findings are recorded in `tui-feasibility.md`.
  - If option A is chosen, `src/__tests__/tui-permission-bubbling.test.ts` exists with type-level/mocked harness skeleton and TODO/failing assertions for T3; run it and record expected failures if it intentionally fails pending T3.
  - If option B is chosen, `tui-feasibility.md` records why mocking is not faithful and includes the exact mandatory runtime smoke procedure.
  - Mandatory runtime smoke gate definition with the exact evidence fields listed in T0 step 10 is recorded. If runtime smoke is executable in the environment, execute it before feature completion. If it is not executable, document it and mark runtime proof pending for final review.
  - Evidence for reliable lifecycle-before-permission ordering or a bounded safe parent-chain backfill path, or an explicit stop for re-planning.
  - Confirm the plan's reply API contract remains `client.permission.reply({ requestID, reply })` and not `respond`.
- **expected result:** `tui-feasibility.md` is the authoritative T0 artifact. It records static/type feasibility, package export findings, SDK reply mapping, parent-chain strategy, either option A mocked harness skeleton or option B no-mock rationale, and the mandatory runtime smoke procedure/status. Runtime OpenCode loader discoverability and real root-context child/grandchild event visibility remain subject to the mandatory smoke gate; if not executed, they are marked pending for final review rather than verified.
- **dependency notes:** Must run before T2/T3. If feasibility fails, stop rather than implementing speculative TUI code.
- **parallel eligibility:** Not parallel; this is the first gate.

## T1 — Extend session resolver with root lookup

- **id:** T1
- **name:** Extend session resolver with parent-chain root lookup
- **purpose:** Provide a tested resolver API that can map known child and grandchild sessions to their root ancestor while failing safely for unknown parents.
- **files to create / modify / test:**
  - Modify: `src/hooks/session-role-resolver/index.ts`
  - Modify/test: `src/__tests__/session-role-resolver.test.ts`
- **concrete steps:**
  1. Add tests for `getRootSessionID` or equivalent public resolver method:
     - root session returns itself after lifecycle observation without `parentID`.
     - child session returns observed root parent.
     - grandchild session returns observed root grandparent.
     - child with unobserved parent returns `undefined` or an explicit unresolved result.
     - deleted or TTL-expired ancestors no longer resolve as known roots.
  2. Extend `SessionRoleResolver` interface with the root lookup method.
  3. Replace/extend `sessionFacts` so each fact preserves `parentID?: string` in addition to existing child/root classification and observation time.
  4. Update `observe` for `session.created` and `session.updated` to store parent IDs without changing existing role classification behavior.
  5. Update pruning and `session.deleted` cleanup to remove parent facts consistently.
  6. Implement root traversal with a bounded loop and visited-set guard so cycles or malformed chains fail safely rather than looping.
- **explicit QA / verification:**
  - Run `bun test src/__tests__/session-role-resolver.test.ts`.
  - Run `bun run typecheck` after implementation.
  - Confirm all pre-existing resolver tests still pass.
- **expected result:** The resolver exposes a stable root lookup API that resolves known root/child/grandchild chains and returns unresolved for incomplete/expired/deleted chains without disrupting role classification.
- **dependency notes:** Depends on T0 feasibility not blocking the feature. Later tasks depend on this root lookup API.
- **parallel eligibility:** Not parallel with T2-T4 because they depend on the root lookup API shape. Can be implemented before all other code tasks.

## T2 — Add permission bubbling state utility

- **id:** T2
- **name:** Add testable permission bubbling state and duplicate suppression
- **purpose:** Isolate routing and duplicate-dialog decisions from TUI runtime code so safety behavior is unit-testable.
- **files to create / modify / test:**
  - Create: `src/hooks/permission-bubbling/index.ts`
  - Create/test: `src/__tests__/permission-bubbling.test.ts`
- **concrete steps:**
  1. Add failing tests for permission routing decisions using mocked permission requests and mocked root lookup:
     - root-session request is classified as native/no-reroute.
     - child request with known root is classified as nested/routable and stores original request ID.
     - grandchild request with known root is classified as nested/routable.
     - request with unknown parent chain is classified unresolved and does not become dialog-eligible.
     - repeated observation of the same request ID is classified duplicate/in-flight.
     - permission replied/completed for the same request ID marks the request completed and suppresses future custom dialogs for that same request ID.
     - dialog cancel or recoverable dialog error marks the request ID dismissed/no-custom-dialog, sends no reply, leaves OpenCode native ask behavior intact, and suppresses all future Supercode dialogs for that same request ID.
     - repeated observations while a dialog is open remain suppressed.
     - missed parent lifecycle events leave the request unresolved/no-dialog even if permission request details are present.
  2. Define minimal internal types for normalized permission request fields used by the plugin: `id`, `sessionID`, `permission`, `patterns`, `metadata`, `always`, and `tool`.
  3. Implement a small state object/factory with methods such as `observeAsked`, `observeReplied`, `markDialogOpen`, and `markDialogClosed`, or equivalent names.
  4. Store duplicate-suppression keys by original permission request ID only, not by root session.
  5. Define duplicate lifecycle explicitly:
     - `pending`/`dialog-open` suppresses repeated observations for the same request ID.
     - `permission.replied` or successful reply marks the request ID completed and suppresses future custom dialogs for that same request ID.
     - dialog cancel/error marks the request ID dismissed/no-custom-dialog without recording a permission decision, sends no reply, leaves OpenCode native ask behavior intact, and suppresses all future Supercode dialogs for that same request ID.
     - unresolved/root classifications must not create long-lived duplicate suppression entries.
  6. Ensure routing state never emits an allow/deny decision by itself; it only reports whether the TUI should ask the user.
- **explicit QA / verification:**
  - Run `bun test src/__tests__/permission-bubbling.test.ts`.
  - Run `bun run typecheck`.
  - Inspect tests to confirm duplicate suppression is keyed by request ID and not root session ID.
- **expected result:** A pure permission bubbling module can decide nested/root/unresolved/duplicate request state and transition request IDs to dismissed/completed states without requiring a live TUI, while never opening more than one Supercode dialog for the same permission request ID.
- **dependency notes:** Depends on T0 and T1 root lookup API. T3 depends on this state utility. T4 should remain independent/no-op unless proven otherwise.
- **parallel eligibility:** Not parallel with T1. Can be developed in parallel with package export planning only after T1 API is fixed, but should precede TUI integration.

## T3 — Add TUI plugin entry for nested permission dialogs

- **id:** T3
- **name:** Implement Supercode TUI permission bubbling plugin
- **purpose:** Display a Supercode-controlled approval dialog for nested permission requests and reply to the original SDK permission request.
- **files to create / modify / test:**
  - Create: `src/tui.ts`
  - Create/modify/test according to T0 option: `src/__tests__/tui-permission-bubbling.test.ts` if T0 option A created the skeleton; otherwise consume `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` option B runtime smoke procedure.
  - Read/update as evidence only: `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md`
  - Modify: `package.json` only if needed to expose the TUI entry.
- **concrete steps:**
  1. Read `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` before implementation and follow its recorded T0 option.
  2. If T0 selected option A, complete the mocked TUI harness skeleton before production implementation so it tests:
     - nested request opens exactly one dialog.
     - approve once calls `client.permission.reply({ requestID, reply })` with `requestID` equal to `PermissionRequest.id` and the local SDK reply value for one-time approval.
     - approve always calls `client.permission.reply({ requestID, reply })` with the local SDK reply value for persistent/always approval.
     - reject calls `client.permission.reply({ requestID, reply })` with the local SDK reject value.
     - root and unresolved requests do not open Supercode dialogs.
     - duplicate `permission.asked` events do not open duplicate dialogs.
     - cancel/error does not call `client.permission.reply`, marks the request dismissed/no-custom-dialog, leaves OpenCode native ask behavior intact, and never opens another Supercode dialog for the same request ID.
     - missed-parent-chain requests do not open a Supercode dialog even if `state.session.permission(sessionID)` returns request details.
     Mocked harness tests are required for handler behavior but do not prove real loader discoverability or real root-context event visibility.
  3. If T0 selected option B, do not invent mocked coverage; implement against static evidence and keep the exact runtime smoke procedure from `tui-feasibility.md` as the required runtime proof path.
  4. Create `src/tui.ts` exporting a `TuiPluginModule`-compatible plugin.
  5. Wire the package export path statically validated in T0 without changing the server plugin default export.
  6. Instantiate a session resolver and permission bubbling state for the TUI plugin runtime.
  7. Subscribe to session lifecycle events to warm parent-chain state using the existing resolver `observe` method.
  8. Subscribe to `permission.asked` events and normalize the SDK `PermissionRequest` shape from event properties; real root-context observability is proven only by the mandatory runtime smoke gate or marked pending for final review.
  9. If T0 identified a bounded safe parent-chain backfill path, use it only when resolver facts are missing and only to fetch authoritative session/ancestor `parentID` facts needed for the requesting session. If T0 identified reliable lifecycle ordering instead, do not add speculative backfill.
  10. When permission event data is insufficient, consult `state.session.permission(sessionID)` only as needed and only for the requesting session.
  11. For nested/routable requests, call `api.ui.dialog` with request context including nested session ID, root session ID, permission/tool name, patterns, metadata, and available decision options.
  12. Map dialog choices to local SDK v2 `client.permission.reply({ requestID, reply })`, with `requestID` equal to `PermissionRequest.id`; do not use a root session ID and do not prefer legacy `respond` APIs.
  13. On dialog cancel/error, do not send allow/deny; mark the request ID dismissed/no-custom-dialog so no later observation can open another Supercode dialog for that request, while leaving OpenCode normal ask behavior intact. On unresolved state, do not create a dialog or reply.
  14. Subscribe to `permission.replied` events to mark request IDs completed and suppress further custom dialogs for those same IDs.
- **explicit QA / verification:**
  - Run `bun test src/__tests__/permission-bubbling.test.ts`.
  - If T0 option A created `src/__tests__/tui-permission-bubbling.test.ts`, run `bun test src/__tests__/tui-permission-bubbling.test.ts`.
  - If T0 option B was recorded, verify `tui-feasibility.md` contains the no-mock rationale and exact runtime smoke procedure before T3 is marked complete.
  - Run `bun run typecheck`.
  - Verify no `node_modules` files were modified.
  - Verify package TUI entry static export/import checks remain intact after implementation.
  - Verify child and grandchild permission requests are covered by mocks for handler behavior.
  - Verify mandatory runtime smoke was executed successfully, or document why it could not be executed and mark real loader/root-context visibility proof pending for final review.
  - Verify client permission replies use `client.permission.reply({ requestID, reply })` with original request ID from `PermissionRequest.id`.
  - Verify T3 followed the T0 option recorded in `tui-feasibility.md` and runtime smoke is either executed successfully or explicitly pending for final review with the documented procedure.
- **expected result:** The package has a statically valid TUI plugin entry and tested handler logic that opens at most one Supercode dialog for a routable nested permission request, sends user decisions to the original request ID, and ignores root/unresolved requests. Real OpenCode loader/root-context visibility is either proven by runtime smoke or explicitly pending for final review.
- **dependency notes:** Depends on T0, T1, and T2. Package export changes are conditional and should be kept minimal.
- **parallel eligibility:** Not parallel with T1/T2. Can be followed by T4 after the TUI event/reply shape is established.

## T4 — Keep server-side integration a no-op unless proven required

- **id:** T4
- **name:** Keep server plugin event handling compatible and no-op for permission bubbling by default
- **purpose:** Preserve existing server plugin behavior and avoid coupling server state to TUI permission bubbling unless local runtime evidence proves it is required.
- **files to create / modify / test:**
  - Modify: `src/index.ts` only if needed
  - Test existing suites affected by `src/index.ts`
- **concrete steps:**
  1. Start from the rule that TUI state is independent from server plugin state.
  2. Leave `src/index.ts` unchanged unless T0/T3 produces concrete local evidence that server plugin changes are required for loading/export wiring or non-decision observation.
  3. If server event observation is proven needed, add only non-decision observation of permission asked/replied events; do not display UI, share assumed in-memory state, or reply from the server plugin.
  4. Ensure existing event flow remains ordered: `roleResolver.observe(event)` still runs before todo continuation enforcer handling.
  5. Do not modify config, tools, chat transform, todo guard, or continuation enforcer behavior.
- **explicit QA / verification:**
  - Run `bun test`.
  - Run `bun run typecheck`.
  - Confirm existing tests for todo continuation, role resolution, config, tool guard, and agents still pass.
- **expected result:** Existing server plugin behavior remains compatible; T4 is a no-op unless a narrow, evidenced server change is required; permission bubbling does not introduce server-side auto-approval, assumed shared state, or UI responsibilities.
- **dependency notes:** Depends on T0/T3 evidence only if server changes are claimed necessary. Otherwise this task is verification-only/no-op.
- **parallel eligibility:** Can run after T1. Should not run concurrently with T3 if both modify shared exports or package wiring.

## T5 — Final verification and safety audit

- **id:** T5
- **name:** Verify full behavior, type safety, and scope boundaries
- **purpose:** Confirm the completed implementation satisfies the spec without broadening scope or weakening permission security.
- **files to create / modify / test:**
  - Test all changed source/test files:
    - `src/hooks/session-role-resolver/index.ts`
    - `src/hooks/permission-bubbling/index.ts`
    - `src/tui.ts`
    - `src/index.ts`
    - `src/__tests__/session-role-resolver.test.ts`
    - `src/__tests__/permission-bubbling.test.ts`
    - `src/__tests__/tui-permission-bubbling.test.ts` when T0 selected option A
    - `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md`
    - `package.json` if modified
- **concrete steps:**
  1. Run the focused test files for resolver, permission bubbling, and TUI integration.
  2. Run the full test suite with `bun test`.
  3. Run `bun run typecheck`.
  4. Inspect the final diff to confirm:
     - no `node_modules` or OpenCode core files changed.
     - no auto-approval path was added.
     - root-session requests are not custom-rerouted.
     - unresolved parent chains leave requests under normal OpenCode ask behavior.
     - missed parent events/unknown chains do not trigger custom dialogs.
     - permission replies call `client.permission.reply({ requestID, reply })` with original request IDs.
     - no legacy `respond` API is used unless a documented routed re-plan approved it.
     - duplicate suppression is keyed by permission request ID and never opens more than one Supercode dialog for the same request ID, including after cancel/error.
     - `src/index.ts` is unchanged or has only a narrowly evidenced no-decision change.
  5. Confirm `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` exists and T3 followed its recorded option A or option B. Separately confirm the mandatory runtime smoke gate from T0 either executed successfully or is documented as pending for final review because it could not be executed in the environment. Executed runtime smoke must show: OpenCode loaded/discovered the package TUI entry; root TUI active; child permission request raised; grandchild permission request raised; exactly one Supercode dialog appears in the root context per original request; the selected decision calls `client.permission.reply({ requestID, reply })` for the original request ID; duplicate events/observations do not reopen an already handled request.
- **explicit QA / verification:**
  - `bun test`
  - `bun run typecheck`
  - Final diff scope review against this plan and the approved spec.
- **expected result:** All tests and typecheck pass, and final diff remains within the approved scope and security constraints.
- **dependency notes:** Depends on all implementation tasks.
- **parallel eligibility:** Not parallel; final sequential gate after T0-T4.

# QA Standard

- Every behavior change must be covered by the narrowest practical unit test before or alongside implementation.
- Required focused coverage:
  - root session returns itself in root lookup.
  - child session resolves to root.
  - grandchild session resolves to root.
  - unknown parent chain fails safely.
  - duplicate permission asked observations do not create duplicate dialogs/routing actions.
  - permission replied/completed clears pending duplicate state.
  - dialog cancel/error marks the request dismissed/no-custom-dialog, sends no reply, does not auto-approve, and leaves OpenCode native ask behavior intact.
  - repeated observations while a dialog is open or after cancel/error/reply are suppressed for that same request ID; no later observation may reopen a Supercode dialog for the same request ID.
  - root-session permission requests are not rerouted.
  - missed/unknown parent chains are safe fallback no-dialog cases.
  - nested permission decisions call `client.permission.reply({ requestID, reply })` for the original permission request ID.
- TUI verification requirement:
  - `docs/supercode/20260426-permission-bubbling-a9c4/tui-feasibility.md` is required and must be consumed by T3/T5.
  - If T0 option A is recorded, `src/__tests__/tui-permission-bubbling.test.ts` must include mocked `api.event.on`, `api.ui.dialog`, `state.session.permission`, and `client.permission.reply`; local `package.json` export-path evidence; `TuiPluginModule` type-only import/compile evidence; registration capture for `permission.asked`, `session.created`, `session.updated`, and `permission.replied`; simulated child/grandchild events delivered to captured handlers; assertion that T3 plugin logic receives them in the same mocked root TUI instance; duplicate suppression; and original request-ID replies. Mocked verification does not prove real OpenCode loader discoverability or real root-context event visibility.
  - If T0 option B is recorded, `tui-feasibility.md` must explain why mocking is not faithful and must contain the mandatory runtime smoke procedure.
  - Mandatory runtime smoke must capture: package export path used to load TUI entry, evidence that OpenCode loaded/discovered the TUI entry, root TUI active/context identifier, registered/observed event names, child session ID/parentID, grandchild session ID/parentID, original permission request IDs, one Supercode dialog in root context per request ID, decision reply payload via `client.permission.reply({ requestID, reply })`, duplicate event replay inputs, and zero reopened dialogs for duplicate/cancel/error observations. If runtime smoke cannot be executed in the environment, document this procedure in `tui-feasibility.md` and mark runtime proof pending for final review instead of claiming verified.
  - Parent-chain availability must be verified by either reliable lifecycle-before-permission evidence or a bounded safe backfill using available session client/state APIs. Unverified parent-chain availability is a re-planning blocker, not an accepted implementation caveat.
- Required commands before completion:
  - `bun test`
  - `bun run typecheck`
- Safety checks:
  - No modifications under `node_modules/**`.
  - No OpenCode core patches.
  - No auto-approval behavior.
  - No persistent allow behavior except explicit user-selected `always` reply through SDK API.
  - No legacy `respond` permission API unless re-planned.
  - Existing server plugin features continue to pass their tests.

# Revisions

- 2026-04-26: Initial execution plan written from approved spec and provided planning context.
- 2026-04-26: Revised after plan-challenger feedback to add TUI feasibility gate, independent server/TUI state rule, concrete TUI verification requirement, missed-parent safe fallback, SDK v2 reply mapping, duplicate lifecycle tightening, and no-op-by-default server task.
- 2026-04-26: Revised remaining integration risks to require package TUI entry load/discovery proof, root-context visibility for child and grandchild `permission.asked` events, parent-chain availability via reliable ordering or bounded safe backfill, and exact runtime smoke criteria when mocks are insufficient.
- 2026-04-26: Revised plan-checker blockers to make duplicate suppression one-dialog-ever per permission request ID including cancel/error, mark cancel/error dismissed without reply, and make T0 evidence concrete with package export inspection, TuiPluginModule type-only compile check, captured event registrations, simulated child/grandchild root-TUI delivery, and mandatory manual smoke evidence fields for real runtime proof.
- 2026-04-26: Revised remaining checker blockers to remove cancel/error re-dialog language, require dismissed/no-custom-dialog suppression for all future observations of the same request ID, split T0 static/mocked feasibility from mandatory real runtime smoke proof, and align T3/T5 so mocks do not claim real OpenCode loader or root-context visibility verification.
- 2026-04-26: Revised T0 task-compliance blockers to add `tui-feasibility.md` as the concrete feasibility/smoke artifact, constrain T0-created files to that artifact plus optional option-A mocked harness skeleton, avoid requiring production plugin logic before `src/tui.ts`, require explicit option A/B recording, and make later tasks consume the feasibility artifact.
