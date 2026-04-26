# TUI Feasibility — Work ID 20260426-permission-bubbling-a9c4

## Static Evidence

### Package Export / TUI Entry Discoverability

**Local `package.json` (supercode):**
- Current `exports`:
  ```json
  {
    ".": {
      "import": "./src/index.ts"
    }
  }
  ```
- `"main": "./src/index.ts"` — server plugin default export.
- No `./tui` export exists yet.

**`@opencode-ai/plugin` package exports:**
```json
{
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./tool": {
    "import": "./dist/tool.js",
    "types": "./dist/tool.d.ts"
  },
  "./tui": {
    "import": "./dist/tui.js",
    "types": "./dist/tui.d.ts"
  }
}
```

**Finding:** `@opencode-ai/plugin` exports a `./tui` entry with both runtime and type definitions. OpenCode's plugin loader is expected to look for a `./tui` export in each installed plugin package (or for a package entry with a `tui` field in the exported module). The supercode package must add `exports["./tui"]` pointing to `./src/tui.ts` to be discoverable by the OpenCode TUI plugin loader.

**TUI entry module shape required:**
```typescript
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"

export const SupercodeTuiPlugin: TuiPluginModule = {
  id: "supercode",
  tui: async (api, options, meta) => { /* ... */ },
  server: undefined, // mutually exclusive
}
```

The `PluginModule` type (server plugin) has `server?: never` on the `tui` field, and `TuiPluginModule` has `server?: never`, confirming they are mutually exclusive module shapes. The package can export both `.` (server) and `./tui` (TUI) independently.

**Package export change required:** Add to `package.json`:
```json
"./tui": {
  "import": "./src/tui.ts"
}
```

This does not replace the existing `"."` export.

### TUI Plugin API Shape

All types confirmed from `@opencode-ai/plugin/dist/tui.d.ts`:

| API Surface | Type | Available | Notes |
|---|---|---|---|
| `api.event.on` | `TuiEventBus.on<Type>(type: Type, handler: (event) => void) => () => void` | Yes | Type-safe event subscription with dispose function |
| `api.ui.dialog` | `TuiDialogStack` with `replace(render, onClose?)`, `clear()`, `open`, `depth`, `size` | Yes | Stack-based dialog system using JSX render functions |
| `api.ui.DialogConfirm` | `(props: TuiDialogConfirmProps) => JSX.Element` | Yes | Confirm dialog with `title`, `message`, `onConfirm`, `onCancel` |
| `api.ui.DialogSelect` | `(props: TuiDialogSelectProps) => JSX.Element` | Yes | Select dialog with `title`, `options`, `onSelect` |
| `api.state.session.permission` | `(sessionID: string) => ReadonlyArray<PermissionRequest>` | Yes | Returns pending permission requests for a session |
| `api.client` | `OpencodeClient` | Yes | Full SDK v2 client with `permission.reply(...)` |
| `api.lifecycle` | `TuiLifecycle` with `signal: AbortSignal`, `onDispose(fn)` | Yes | Plugin lifecycle management |

**TuiPlugin type:**
```typescript
type TuiPlugin = (
  api: TuiPluginApi,
  options: PluginOptions | undefined,
  meta: TuiPluginMeta
) => Promise<void>
```

**TuiPluginModule type:**
```typescript
type TuiPluginModule = {
  id?: string
  tui: TuiPlugin
  server?: never
}
```

### SDK v2 Permission Reply API

**Confirmed from `@opencode-ai/sdk/dist/v2/gen/sdk.gen.d.ts`:**

`OpencodeClient.permission.reply` method:
```typescript
reply<ThrowOnError extends boolean = false>(parameters: {
  requestID: string
  directory?: string
  workspace?: string
  reply?: "once" | "always" | "reject"
  message?: string
}, options?: ...) => RequestResult<...>
```

**Legacy `respond` method exists but is marked `@deprecated`:**
```typescript
/** @deprecated */
respond<ThrowOnError extends boolean = false>(parameters: {
  sessionID: string
  permissionID: string
  response?: "once" | "always" | "reject"
  ...
}) => RequestResult<...>
```

**Conclusion:** The v2 `reply` API is available, takes `requestID` (not session-scoped), and supports `"once" | "always" | "reject"` reply values. The legacy `respond` API is deprecated and should not be used.

### SDK v2 Event Types

**From `@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts`:**

`EventPermissionAsked`:
```typescript
type EventPermissionAsked = {
  type: "permission.asked"
  properties: PermissionRequest
}
```

`EventPermissionReplied`:
```typescript
type EventPermissionReplied = {
  type: "permission.replied"
  properties: {
    sessionID: string
    requestID: string
    reply: "once" | "always" | "reject"
  }
}
```

`PermissionRequest`:
```typescript
type PermissionRequest = {
  id: string
  sessionID: string
  permission: string
  patterns: Array<string>
  metadata: { [key: string]: unknown }
  always: Array<string>
  tool?: { messageID: string; callID: string }
}
```

### Session parentID

**`Session` type:**
```typescript
type Session = {
  id: string
  parentID?: string
  // ... other fields
}
```

**`EventSessionCreated` / `EventSessionUpdated`:**
Both carry `properties: { sessionID: string; info: Session }` where `info.parentID` is present.

**Session client API for backfill:**
`OpencodeClient.session.get({ sessionID })` can retrieve session info including `parentID`.

**`OpencodeClient.session.children({ sessionID })` can retrieve child sessions of a parent.**

### Reply API Mapping

| User Decision | `reply` value | Notes |
|---|---|---|
| Approve once | `"once"` | One-time approval |
| Approve always | `"always"` | Persistent approval for this permission/pattern |
| Reject | `"reject"` | Deny the request |

**Plan contract confirmed:** `client.permission.reply({ requestID: PermissionRequest.id, reply: "once" | "always" | "reject" })`. No legacy `respond` API required.

## Mock Harness Decision

**Decision: Option A — create mocked harness skeleton.**

**Rationale:**
1. All required API surfaces (`api.event.on`, `api.ui.dialog`, `api.state.session.permission`, `api.client.permission.reply`) have concrete, well-typed shapes in the local `@opencode-ai/plugin` and `@opencode-ai/sdk` type definitions.
2. The `TuiPluginModule`, `TuiPlugin`, and `TuiPluginApi` types are fully specified and can be faithfully mocked in a test harness using TypeScript interfaces.
3. Event shapes (`EventPermissionAsked`, `EventPermissionReplied`, `EventSessionCreated`, `EventSessionUpdated`) are concrete discriminated union members that can be constructed in tests.
4. The `TuiDialogStack` API (`replace`, `clear`, `open`, `depth`) can be simulated with captured render functions.
5. The `OpencodeClient.permission.reply` method signature is fully known and can be spied.
6. The plan explicitly contemplates Option A for T0 with a `tui-permission-bubbling.test.ts` file.

**File to create:** `src/__tests__/tui-permission-bubbling.test.ts`

The harness will contain:
- Fake `api.event.on` with registration capture for `permission.asked`, `permission.replied`, `session.created`, `session.updated`
- Fake `api.ui.dialog` (`TuiDialogStack`) with captured render/onClose
- Fake `state.session.permission(sessionID)` returning configurable arrays
- Spy `client.permission.reply` recording call arguments
- Type-level import checks for `TuiPluginModule` from `@opencode-ai/plugin/tui`
- Type-level import checks for `PermissionRequest`, `EventPermissionAsked`, `EventPermissionReplied` from `@opencode-ai/sdk/v2`
- TODO/failing assertions documenting intended captured-handler behavior for T3, since `src/tui.ts` does not yet exist
- The harness skeleton does not assert production plugin behavior in T0

## Runtime Smoke Procedure

The mandatory runtime smoke gate must be executed before claiming the feature complete. If it cannot be executed in the current environment, the procedure and evidence fields are documented and runtime proof is marked **pending for final review**.

### Procedure

1. **Prerequisites:**
   - OpenCode installed and running with TUI (`opencode` command).
   - Supercode plugin installed from the local package (with `./tui` export in `package.json`).
   - A workspace with at least one file that triggers a permission prompt when modified by a subagent.

2. **Setup:**
   - Start `opencode` in the target workspace.
   - Confirm the TUI loads and the supercode TUI plugin is discovered (check plugin list or startup logs).

3. **Evidence Fields to Capture:**

   | Field | Description |
   |---|---|
   | `tui_export_path` | Package export path used to load TUI entry (expected: `./tui`) |
   | `loader_discovery_evidence` | Evidence that OpenCode loaded/discovered the TUI entry (log output, plugin list entry, or error if not found) |
   | `root_tui_context_id` | Root TUI session/context identifier visible in the TUI |
   | `registered_event_names` | List of event names the plugin registered handlers for |
   | `child_session_id` | Child session ID created during test |
   | `child_parent_id` | `parentID` of the child session |
   | `grandchild_session_id` | Grandchild session ID created during test |
   | `grandchild_parent_id` | `parentID` of the grandchild session |
   | `permission_request_ids` | Original permission request IDs raised by child/grandchild |
   | `dialog_count_per_request` | Number of Supercode dialogs opened in root context per request ID (expected: exactly 1) |
   | `dialog_metadata` | Nested session ID, resolved root session ID, permission/tool, patterns shown in dialog |
   | `selected_decision` | User's selected decision (once/always/reject) |
   | `reply_payload` | `client.permission.reply({ requestID, reply })` payload captured |
   | `duplicate_event_replay_inputs` | Duplicate `permission.asked` events/observations replayed for the same request ID |
   | `duplicate_dialog_count` | Number of additional dialogs opened after duplicate events (expected: 0) |
   | `cancel_error_dialog_count` | Number of dialogs reopened after cancel/error (expected: 0) |
   | `root_request_no_dialog` | Whether root-session permission requests show no Supercode dialog (expected: true) |
   | `unresolved_chain_no_dialog` | Whether requests with unresolved parent chains show no Supercode dialog (expected: true) |

4. **Steps:**
   a. From the root session, issue a prompt that triggers a child subagent session.
   b. Confirm `session.created` event fires for the child with `parentID` matching the root session.
   c. From the child, trigger a permission request (e.g., file write to a restricted path).
   d. Confirm `permission.asked` event fires for the child session.
   e. Observe the root TUI context — exactly one Supercode approval dialog should appear.
   f. Record the dialog metadata (nested session ID, root session ID, permission/tool info).
   g. Select a decision (approve once / approve always / reject).
   h. Record the `client.permission.reply({ requestID, reply })` payload.
   i. Replay the same `permission.asked` event or observe a duplicate `state.session.permission` observation.
   j. Confirm zero additional dialogs appear for the same request ID.
   k. Optionally repeat with a grandchild session for deeper nesting.
   l. Trigger a root-session permission request and confirm no Supercode dialog appears.

5. **Pass Criteria:**
   - OpenCode loaded/discovered the supercode TUI plugin entry via `./tui` export.
   - Child and grandchild `permission.asked` events are visible from the root TUI context.
   - Exactly one Supercode dialog appears per original request ID in the root context.
   - The chosen decision is sent via `client.permission.reply({ requestID, reply })` targeting the original request ID.
   - Duplicate events/observations do not reopen an already handled request.
   - Root-session and unresolved-chain requests do not trigger Supercode dialogs.

### Runtime Smoke Status

**Status: NOT EXECUTED — PENDING EXTERNAL RUNTIME VERIFICATION.**

**Why not executed:** This execution environment does not contain a running OpenCode TUI instance (`opencode` command) and the supercode plugin is not installed into a live OpenCode session. The mandatory runtime smoke gate described above cannot be performed here because it requires:
1. A running OpenCode TUI with the supercode package installed.
2. The ability to trigger child/grandchild subagent sessions from the root TUI context.
3. A visible root TUI where the approval dialog would be rendered.
4. The ability to capture `client.permission.reply` payloads from a real interaction.

**Impact of not executing runtime smoke:**
- **Unverified claim:** That OpenCode's plugin loader discovers and loads the `./tui` export from `package.json`. This is assumed from the static type shape of `TuiPluginModule` and the documented `@opencode-ai/plugin/tui` export convention, but loader discovery has not been observed at runtime.
- **Unverified claim:** That child and grandchild `permission.asked` events are delivered to the root TUI plugin context. Mocked tests prove the handler wiring works when events are manually delivered, but real OpenCode event routing from child sessions to the root TUI event bus has not been observed.
- **Unverified claim:** That `session.created` events for child sessions arrive before `permission.asked` events in the root TUI event bus (lifecycle-before-permission ordering). The bounded backfill fallback exists but has not been exercised against real event timing.
- **Unverified claim:** That `api.ui.DialogSelect` renders visibly in the real OpenCode TUI when called from a TUI plugin. The mock captures the call, but real rendering has not been observed.

**Available evidence in place of runtime smoke:**
- 312 tests pass (including 67 resolver, 23 permission-bubbling state, 39 TUI integration via mock harness).
- `tsc --noEmit` passes clean — no type errors in production code or tests.
- All safety properties (no auto-approval, root/unresolved no-dialog, original request-ID replies, no legacy `respond`, duplicate suppression including cancel/error) are verified by mocked tests that exercise the actual production handler code through a faithful mock harness.
- The mock harness faithfully implements `TuiPluginApi`, `TuiEventBus`, `TuiDialogStack`, `OpencodeClient`, and lifecycle interfaces from the local `@opencode-ai/plugin` and `@opencode-ai/sdk` type definitions.

**What must happen before claiming runtime verification passed:**
The smoke procedure above must be executed in a real OpenCode TUI session. All 18 evidence fields must be captured. Until then, this feature's runtime behavior in a real OpenCode environment is **NOT VERIFIED**. This is not a deficiency in the implementation — it is a boundary of the current execution environment.

## Parent-Chain Availability

### Strategy: Reliable lifecycle-before-permission with bounded safe backfill fallback

**Evidence from local types:**

1. **Session lifecycle events carry `parentID`:** `EventSessionCreated` and `EventSessionUpdated` both include `properties.info.parentID` on the `Session` type. When a child or grandchild session is created, a `session.created` event fires with the session's `parentID` populated.

2. **Lifecycle events should precede permission events:** In the OpenCode event model, a session must be created before it can issue tool calls that trigger permission requests. Therefore `session.created` events for child/grandchild sessions should fire before `permission.asked` events for those sessions.

3. **Bounded safe backfill available:** If lifecycle events were missed (e.g., plugin loaded after session creation), the client API provides:
   - `OpencodeClient.session.get({ sessionID })` — returns `Session` with `parentID`.
   - `OpencodeClient.session.children({ sessionID })` — returns child sessions.
   
   These can fetch authoritative `parentID` facts without broad inference. The backfill is bounded because it only needs to fetch the requesting session and walk up the parent chain (typically 1-2 hops for child/grandchild).

**Strategy:**
- **Primary:** Subscribe to `session.created` and `session.updated` events to warm parent-chain state proactively. This should cover the common case.
- **Backfill:** When a `permission.asked` event arrives for a session whose parent chain is not fully resolved, call `client.session.get({ sessionID })` for the requesting session to fetch its `parentID`. If the parent's root is still unknown, call `client.session.get` for the parent. Limit backfill depth to a reasonable bound (e.g., 10 hops) and fail safely if the chain cannot be resolved.
- **Fallback:** If neither lifecycle events nor bounded backfill can resolve the parent chain, classify the request as unresolved and leave it under OpenCode's normal ask behavior. Do not auto-approve, auto-reject, or force a custom dialog.

**This strategy does not require re-planning.** Both the reliable ordering assumption and the bounded backfill path are available from local SDK types.

## Re-planning Blockers

**None identified at T0.**

All critical static feasibility checks pass:
- `TuiPluginModule` type is available and importable from `@opencode-ai/plugin/tui`.
- `api.event.on`, `api.ui.dialog`, `state.session.permission`, `api.client` are all present on `TuiPluginApi`.
- SDK v2 `client.permission.reply({ requestID, reply })` is available and not deprecated.
- Legacy `respond` API exists but is deprecated and will not be used.
- Session `parentID` is available in lifecycle events and via client session get API.
- Package can export `./tui` independently from the existing `"."` server export.
- Mocked harness is feasible because all API shapes are concrete and well-typed.

**Remaining runtime unknowns (cannot be resolved by static analysis):**
1. Whether OpenCode's TUI plugin loader actually discovers and loads the `./tui` export from installed packages.
2. Whether child/grandchild `permission.asked` events are visible from the root TUI plugin context.
3. Whether `session.created` events for child sessions arrive before `permission.asked` events in the root TUI event bus.

These unknowns require the mandatory runtime smoke gate and cannot be resolved by static analysis or mocked tests. They do not block T1-T3 implementation but must be resolved before claiming the feature complete.
