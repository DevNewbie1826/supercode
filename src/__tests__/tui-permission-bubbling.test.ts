/**
 * TUI Permission Bubbling — Integration Tests (T0/T3)
 *
 * T0 created the mock harness infrastructure and type-level checks.
 * T3 converts the TODO assertions into real tests that exercise the
 * SupercodeTuiPlugin through the mock harness.
 *
 * Inspectability is handled entirely in the mock: the mock DialogSelect
 * captures its call arguments and returns them as { props } so tests can
 * inspect title, options, onSelect handlers, etc. Production code never
 * fabricates a fallback object.
 */

import { afterEach, describe, it, expect } from "bun:test"
import type {
  TuiPluginModule,
  TuiPluginApi,
  TuiPluginMeta,
  TuiDialogStack,
  TuiEventBus,
  TuiState,
} from "@opencode-ai/plugin/tui"
import type {
  PermissionRequest,
  EventPermissionAsked,
  EventPermissionReplied,
  EventSessionCreated,
  EventSessionUpdated,
  Event,
} from "@opencode-ai/sdk/v2"
import type { OpencodeClient } from "@opencode-ai/sdk/v2"

// Import the real TUI plugin module (T3 target)
import { SupercodeTuiPlugin } from "../tui"

// ---------------------------------------------------------------------------
// T0 Step 1: Type-level import/compile checks (preserved from T0)
// ---------------------------------------------------------------------------

describe("T0 feasibility — type-level imports", () => {
  it("TuiPluginModule type is available from @opencode-ai/plugin/tui", () => {
    const _moduleShape: TuiPluginModule = {
      id: "supercode",
      tui: async (_api, _options, _meta) => {},
    }
    expect(_moduleShape.id).toBe("supercode")
    expect(typeof _moduleShape.tui).toBe("function")
  })

  it("PermissionRequest has expected fields", () => {
    const req: PermissionRequest = {
      id: "req-1",
      sessionID: "sess-child",
      permission: "edit",
      patterns: ["src/**/*.ts"],
      metadata: {},
      always: [],
      tool: { messageID: "msg-1", callID: "call-1" },
    }
    expect(req.id).toBe("req-1")
    expect(req.sessionID).toBe("sess-child")
    expect(req.always).toEqual([])
  })

  it("EventPermissionAsked has expected shape", () => {
    const event: EventPermissionAsked = {
      type: "permission.asked",
      properties: {
        id: "req-1",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    }
    expect(event.type).toBe("permission.asked")
    expect(event.properties.id).toBe("req-1")
  })

  it("EventPermissionReplied has expected shape", () => {
    const event: EventPermissionReplied = {
      type: "permission.replied",
      properties: {
        sessionID: "sess-child",
        requestID: "req-1",
        reply: "once",
      },
    }
    expect(event.type).toBe("permission.replied")
    expect(event.properties.reply).toBe("once")
    expect(event.properties.requestID).toBe("req-1")
  })

  it("Session event carries parentID", () => {
    const event: EventSessionCreated = {
      type: "session.created",
      properties: {
        sessionID: "sess-child",
        info: {
          id: "sess-child",
          slug: "child-slug",
          projectID: "proj-1",
          directory: "/tmp/test",
          parentID: "sess-root",
          title: "Child session",
          version: "1",
          time: { created: Date.now(), updated: Date.now() },
        },
      },
    }
    expect(event.properties.info.parentID).toBe("sess-root")
  })
})

// ---------------------------------------------------------------------------
// T0 Step 2: Mock harness infrastructure
// ---------------------------------------------------------------------------

/** Captured event handler for a given event type. */
interface CapturedHandler {
  eventType: string
  handler: (event: unknown) => void
  dispose: () => void
}

/** Reply call recorded by the spy. */
interface PermissionReplyCall {
  requestID: string
  reply: string
  message?: string
}

/** Dialog captured by the fake dialog stack. */
interface CapturedDialog {
  render: () => unknown
  onClose?: () => void
}

/** Session data for the mock client backfill. */
interface MockSessionInfo {
  id: string
  parentID?: string
}

const activeHarnesses = new Set<ReturnType<typeof createMockHarness>>()

afterEach(() => {
  for (const harness of activeHarnesses) {
    harness.triggerDispose()
  }
  activeHarnesses.clear()
})

/**
 * Create a mock TuiPluginApi harness with captured registrations.
 *
 * The mock DialogSelect captures its props and returns them as { props }
 * so tests can inspect title, options, and onSelect handlers without
 * any production test seam.
 */
function createMockHarness(sessionDB?: Map<string, MockSessionInfo>) {
  const capturedHandlers: CapturedHandler[] = []
  const replyCalls: PermissionReplyCall[] = []
  const dialogStack: CapturedDialog[] = []
  const permissionState = new Map<string, PermissionRequest[]>()
  const kvSetCalls: Array<{ key: string; value: unknown }> = []
  let permissionListData: PermissionRequest[] = []

  const _sessionDB = sessionDB ?? new Map<string, MockSessionInfo>()

  // -- Lifecycle disposal tracking --
  let disposeFn: (() => void | Promise<void>) | undefined

  // -- fake event bus --
  const eventBus: TuiEventBus = {
    on: <T extends Event["type"]>(
      type: T,
      handler: (event: Extract<Event, { type: T }>) => void,
    ) => {
      let disposed = false
      const wrappedHandler = (event: unknown) => {
        if (!disposed) handler(event as Extract<Event, { type: T }>)
      }
      const entry: CapturedHandler = {
        eventType: type,
        handler: wrappedHandler,
        dispose: () => {
          disposed = true
        },
      }
      capturedHandlers.push(entry)
      return () => entry.dispose()
    },
  }

  // -- fake dialog stack --
  const dialog: TuiDialogStack = {
    replace: (render: () => unknown, onClose?: () => void) => {
      dialogStack.push({ render, onClose })
    },
    clear: () => {
      dialogStack.length = 0
    },
    setSize: (_size: "medium" | "large" | "xlarge") => {},
    get size(): "medium" | "large" | "xlarge" {
      return "medium"
    },
    get depth(): number {
      return dialogStack.length
    },
    get open(): boolean {
      return dialogStack.length > 0
    },
  }

  // -- fake state --
  const state: TuiState = {
    ready: true,
    config: {} as TuiState["config"],
    provider: [],
    path: {
      state: "/tmp/state",
      config: "/tmp/config",
      worktree: "/tmp/worktree",
      directory: "/tmp/dir",
    },
    vcs: undefined,
    session: {
      count: () => 0,
      diff: () => [],
      todo: () => [],
      messages: () => [],
      status: () => undefined,
      permission: (sessionID: string) => {
        return permissionState.get(sessionID) ?? []
      },
      question: () => [],
    },
    part: () => [],
    lsp: () => [],
    mcp: () => [],
  }

  // -- spy client with session backfill --
  const client: OpencodeClient = {
    permission: {
      reply: async (params: {
        requestID: string
        reply?: string
        message?: string
      }) => {
        replyCalls.push({
          requestID: params.requestID,
          reply: params.reply ?? "once",
          message: params.message,
        })
        return { data: true, error: undefined } as any
      },
      list: async () => ({ data: permissionListData, error: undefined } as any),
      respond: async () => ({ data: true, error: undefined } as any),
    },
    session: {
      get: async (params: { sessionID: string }) => {
        const info = _sessionDB.get(params.sessionID)
        return {
          data: info ?? { id: params.sessionID, parentID: undefined },
          error: undefined,
        } as any
      },
      children: async () => ({ data: [], error: undefined } as any),
    } as any,
  } as any as OpencodeClient

  // -- fake lifecycle --
  const abortController = new AbortController()
  const lifecycle = {
    signal: abortController.signal,
    onDispose: (fn: () => void | Promise<void>) => {
      disposeFn = fn
      return () => {
        disposeFn = undefined
      }
    },
  }

  // -- fake api --
  // DialogSelect captures its props and returns { props } for test inspection.
  // This is the ONLY inspectability mechanism — no production test seam.
  const DialogSelectMock = (props: any) => ({ props })

  const api: TuiPluginApi = {
    app: { version: "test" },
    command: { register: () => () => {}, trigger: () => {}, show: () => {} },
    route: {
      register: () => () => {},
      navigate: () => {},
      current: { name: "home" } as any,
    },
    ui: {
      Dialog: ((() => null) as any),
      DialogAlert: ((() => null) as any),
      DialogConfirm: ((() => null) as any),
      DialogPrompt: ((() => null) as any),
      DialogSelect: DialogSelectMock as any,
      Slot: ((() => null) as any),
      Prompt: ((() => null) as any),
      toast: () => {},
      dialog,
    },
    keybind: {
      match: () => false,
      print: () => "",
      create: () => ({ all: {}, get: () => "", match: () => false, print: () => "" }),
    },
    tuiConfig: {} as any,
    kv: { get: <V = unknown>(_key: string, fallback?: V) => fallback as V, set: (key: string, value: unknown) => { kvSetCalls.push({ key, value }) }, ready: true },
    state,
    theme: {
      current: {} as any,
      selected: "default",
      has: () => false,
      set: () => false,
      install: async () => {},
      mode: () => "dark" as const,
      ready: true,
    },
    client,
    event: eventBus,
    renderer: {} as any,
    slots: { register: () => "" } as any,
    plugins: {
      list: () => [],
      activate: async () => false,
      deactivate: async () => false,
      add: async () => false,
      install: async () => ({ ok: false, message: "test" }),
    },
    lifecycle,
  }

  // -- fake meta --
  const meta: TuiPluginMeta = {
    id: "supercode",
    source: "npm",
    spec: "supercode",
    target: "tui",
    state: "first",
    first_time: Date.now(),
    last_time: Date.now(),
    time_changed: Date.now(),
    load_count: 1,
    fingerprint: "test",
  }

  const harness = {
    capturedHandlers,
    replyCalls,
    dialogStack,
    permissionState,
    sessionDB: _sessionDB,
    eventBus,
    dialog,
    state,
    client,
    api,
    meta,
    abortController,
    kvSetCalls,
    /** Set the data returned by client.permission.list(). */
    setPermissionListData: (data: PermissionRequest[]) => {
      permissionListData = data
    },
    /** Trigger lifecycle disposal (simulates plugin unload). */
    triggerDispose: () => {
      if (disposeFn) disposeFn()
      disposeFn = undefined
    },
  }

  activeHarnesses.add(harness)
  return harness
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Helper: find a captured handler by event type.
 */
function findHandler(harness: ReturnType<typeof createMockHarness>, eventType: string) {
  return harness.capturedHandlers.find((ch) => ch.eventType === eventType)
}

/**
 * Helper: create a session.created event.
 */
function makeSessionCreatedEvent(
  sessionID: string,
  parentID?: string,
): EventSessionCreated {
  return {
    type: "session.created",
    properties: {
      sessionID,
      info: {
        id: sessionID,
        slug: sessionID,
        projectID: "proj-test",
        directory: "/tmp/test",
        parentID,
        title: `Session ${sessionID}`,
        version: "1",
        time: { created: Date.now(), updated: Date.now() },
      },
    },
  }
}

/**
 * Helper: create a permission.asked event.
 */
function makePermissionAskedEvent(
  requestID: string,
  sessionID: string,
  overrides?: Partial<PermissionRequest>,
): EventPermissionAsked {
  return {
    type: "permission.asked",
    properties: {
      id: requestID,
      sessionID,
      permission: "edit",
      patterns: ["src/**/*.ts"],
      metadata: {},
      always: [],
      ...overrides,
    },
  }
}

/**
 * Helper: create a permission.replied event.
 */
function makePermissionRepliedEvent(
  requestID: string,
  sessionID: string,
  reply: "once" | "always" | "reject",
): EventPermissionReplied {
  return {
    type: "permission.replied",
    properties: {
      sessionID,
      requestID,
      reply,
    },
  }
}

/**
 * Helper: warm up root + child sessions and return the captured dialog
 * render output for a permission request from the child.
 */
async function setupDialogForChild(
  h: ReturnType<typeof createMockHarness>,
  requestID: string,
  overrides?: Partial<PermissionRequest>,
) {
  await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

  const sessionCreatedHandler = findHandler(h, "session.created")!
  sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
  sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

  const permAskedHandler = findHandler(h, "permission.asked")!
  permAskedHandler.handler(makePermissionAskedEvent(requestID, "sess-child", overrides))

  expect(h.dialogStack.length).toBe(1)
  // The mock DialogSelect returns { props: { title, options, ... } }
  return h.dialogStack[0].render() as { props: { title: string; options: any[] } }
}

// ---------------------------------------------------------------------------
// T0 Step 3: Harness infrastructure tests (preserved from T0)
// ---------------------------------------------------------------------------

describe("T0 feasibility — mock harness infrastructure", () => {
  it("captures event handler registrations", () => {
    const h = createMockHarness()

    const dispose1 = h.eventBus.on("permission.asked", () => {})
    const dispose2 = h.eventBus.on("permission.replied", () => {})
    const dispose3 = h.eventBus.on("session.created", () => {})
    const dispose4 = h.eventBus.on("session.updated", () => {})

    expect(h.capturedHandlers.length).toBe(4)
    expect(h.capturedHandlers[0].eventType).toBe("permission.asked")
    expect(h.capturedHandlers[1].eventType).toBe("permission.replied")
    expect(h.capturedHandlers[2].eventType).toBe("session.created")
    expect(h.capturedHandlers[3].eventType).toBe("session.updated")

    dispose1()
    dispose2()
    dispose3()
    dispose4()
  })

  it("captures dialog replace calls", () => {
    const h = createMockHarness()
    h.dialog.replace(() => "mock-dialog" as any)
    expect(h.dialogStack.length).toBe(1)
    expect(h.dialog.open).toBe(true)
  })

  it("clears dialog stack", () => {
    const h = createMockHarness()
    h.dialog.replace(() => "mock-dialog" as any)
    h.dialog.clear()
    expect(h.dialogStack.length).toBe(0)
    expect(h.dialog.open).toBe(false)
  })

  it("returns configured permission state", () => {
    const h = createMockHarness()
    const req: PermissionRequest = {
      id: "req-1",
      sessionID: "sess-child",
      permission: "edit",
      patterns: ["src/**/*.ts"],
      metadata: {},
      always: [],
    }
    h.permissionState.set("sess-child", [req])

    const result = h.state.session.permission("sess-child")
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("req-1")
  })

  it("records permission reply calls", async () => {
    const h = createMockHarness()
    await h.client.permission.reply({
      requestID: "req-1",
      reply: "once",
    })
    await h.client.permission.reply({
      requestID: "req-2",
      reply: "reject",
    })

    expect(h.replyCalls.length).toBe(2)
    expect(h.replyCalls[0]).toEqual({ requestID: "req-1", reply: "once" })
    expect(h.replyCalls[1]).toEqual({ requestID: "req-2", reply: "reject" })
  })

  it("event handlers receive simulated events", () => {
    const h = createMockHarness()
    const received: unknown[] = []
    h.eventBus.on("permission.asked", (event) => {
      received.push(event)
    })

    const handler = h.capturedHandlers.find(
      (ch) => ch.eventType === "permission.asked",
    )
    expect(handler).toBeDefined()

    const simulatedEvent: EventPermissionAsked = {
      type: "permission.asked",
      properties: {
        id: "req-1",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    }
    handler!.handler(simulatedEvent)

    expect(received.length).toBe(1)
    expect((received[0] as EventPermissionAsked).properties.id).toBe("req-1")
  })

  it("dispose function prevents further handler calls", () => {
    const h = createMockHarness()
    let callCount = 0
    const dispose = h.eventBus.on("permission.asked", () => {
      callCount++
    })

    const handler = h.capturedHandlers.find(
      (ch) => ch.eventType === "permission.asked",
    )!

    handler.handler({ type: "permission.asked", properties: {} })
    expect(callCount).toBe(1)

    dispose()
    handler.handler({ type: "permission.asked", properties: {} })
    expect(callCount).toBe(1) // should not increase after dispose
  })
})

// ---------------------------------------------------------------------------
// T3: Real integration tests exercising SupercodeTuiPlugin via mock harness
// ---------------------------------------------------------------------------

describe("T3 — SupercodeTuiPlugin integration", () => {
  // ── Nested child permission routing ──────────────────────────────────────

  it("nested child permission.asked opens exactly one Supercode dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")
    expect(sessionCreatedHandler).toBeDefined()
    sessionCreatedHandler!.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler!.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")
    expect(permAskedHandler).toBeDefined()
    permAskedHandler!.handler(makePermissionAskedEvent("req-child-1", "sess-child"))

    expect(h.dialogStack.length).toBe(1)
  })

  it("grandchild permission.asked opens exactly one Supercode dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!

    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-grandchild", "sess-child"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-gc-1", "sess-grandchild"))

    expect(h.dialogStack.length).toBe(1)
  })

  // ── Root session requests ────────────────────────────────────────────────

  it("root session permission.asked does not open Supercode dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-root-1", "sess-root"))

    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })

  // ── Unresolved parent chain ──────────────────────────────────────────────

  it("unresolved parent chain does not open Supercode dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-unresolved-1", "sess-unknown"))

    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })

  // ── Duplicate suppression ────────────────────────────────────────────────

  it("duplicate permission.asked events do not open duplicate dialogs", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!

    permAskedHandler.handler(makePermissionAskedEvent("req-dup-1", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    permAskedHandler.handler(makePermissionAskedEvent("req-dup-1", "sess-child"))
    expect(h.dialogStack.length).toBe(1)
  })

  // ── One-at-a-time: distinct events while dialog is open ─────────────────

  it("distinct permission.asked while dialog open does not replace the current dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!

    // First request opens a dialog (distinct patterns to identify it)
    permAskedHandler.handler(makePermissionAskedEvent("req-oat-first", "sess-child", {
      patterns: ["src/first/**/*.ts"],
    }))
    expect(h.dialogStack.length).toBe(1)

    // Verify the open dialog is for the first request (by patterns)
    let rendered = h.dialogStack[0].render() as { props: { options: any[] } }
    let desc: string = rendered.props.options[0].description
    expect(desc).toContain("src/first/**/*.ts")

    // Second distinct request arrives while dialog is open — must NOT replace
    permAskedHandler.handler(makePermissionAskedEvent("req-oat-second", "sess-child", {
      patterns: ["src/second/**/*.ts"],
    }))

    // Still exactly one dialog, still for the first request
    expect(h.dialogStack.length).toBe(1)
    rendered = h.dialogStack[0].render() as { props: { options: any[] } }
    desc = rendered.props.options[0].description
    expect(desc).toContain("src/first/**/*.ts")
    expect(desc).not.toContain("src/second/**/*.ts")

    // No auto-approval of either request
    expect(h.replyCalls.length).toBe(0)
  })

  it("distinct permission.asked while dialog open does not suppress the second request invisibly", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!

    // First request opens dialog
    permAskedHandler.handler(makePermissionAskedEvent("req-oat-deferred-1", "sess-child", {
      patterns: ["src/alpha/**/*.ts"],
    }))
    expect(h.dialogStack.length).toBe(1)

    // Second distinct request arrives — deferred, not tracked, not suppressed
    permAskedHandler.handler(makePermissionAskedEvent("req-oat-deferred-2", "sess-child", {
      patterns: ["src/beta/**/*.ts"],
    }))

    // Resolve the first request
    const rendered = h.dialogStack[0].render() as { props: { options: any[] } }
    const onceOpt = rendered.props.options.find((o: any) => o.value === "once")
    expect(onceOpt).toBeDefined()
    if (onceOpt?.onSelect) await onceOpt.onSelect()

    expect(h.replyCalls).toEqual([{ requestID: "req-oat-deferred-1", reply: "once" }])

    // The second request was NOT tracked/suppressed — a poll should surface it
    h.setPermissionListData([
      {
        id: "req-oat-deferred-2",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/beta/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // Second request now opens its own dialog
    expect(h.dialogStack.length).toBe(1)
    const rendered2 = h.dialogStack[0].render() as { props: { options: any[] } }
    const desc2: string = rendered2.props.options[0].description
    expect(desc2).toContain("src/beta/**/*.ts")

    // Reply to second request with original request ID
    const rejectOpt = rendered2.props.options.find((o: any) => o.value === "reject")
    expect(rejectOpt).toBeDefined()
    if (rejectOpt?.onSelect) await rejectOpt.onSelect()

    expect(h.replyCalls).toEqual([
      { requestID: "req-oat-deferred-1", reply: "once" },
      { requestID: "req-oat-deferred-2", reply: "reject" },
    ])
  })

  // ── Dialog cancel/error ─────────────────────────────────────────────────

  it("dialog cancel/error marks request dismissed and does not send reply", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-cancel-1", "sess-child"))

    expect(h.dialogStack.length).toBe(1)

    const onClose = h.dialogStack[0].onClose
    if (onClose) onClose()

    expect(h.replyCalls.length).toBe(0)
  })

  // ── Dismissed request never reopens ──────────────────────────────────────

  it("dismissed request never reopens another Supercode dialog for same requestID", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!

    permAskedHandler.handler(makePermissionAskedEvent("req-dismissed-1", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    const onClose = h.dialogStack[0].onClose
    if (onClose) onClose()
    h.dialogStack.length = 0

    permAskedHandler.handler(makePermissionAskedEvent("req-dismissed-1", "sess-child"))
    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })

  // ── Permission replied event ─────────────────────────────────────────────

  it("permission.replied event marks requestID completed and suppresses future dialogs", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-replied-1", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    h.dialogStack.length = 0

    const permRepliedHandler = findHandler(h, "permission.replied")!
    permRepliedHandler.handler(makePermissionRepliedEvent("req-replied-1", "sess-child", "once"))

    permAskedHandler.handler(makePermissionAskedEvent("req-replied-1", "sess-child"))
    expect(h.dialogStack.length).toBe(0)
  })

  // ── Session lifecycle warming ────────────────────────────────────────────

  it("session.created events warm parent-chain state in the resolver", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-warm-1", "sess-child"))

    expect(h.dialogStack.length).toBe(1)
  })

  // ── Bounded backfill ────────────────────────────────────────────────────

  it("bounded backfill calls client.session.get when parent chain is unknown", async () => {
    const sessionDB = new Map<string, { id: string; parentID?: string }>()
    sessionDB.set("sess-backfill-child", { id: "sess-backfill-child", parentID: "sess-backfill-root" })
    sessionDB.set("sess-backfill-root", { id: "sess-backfill-root" })

    const h = createMockHarness(sessionDB)

    const sessionGetCalls: string[] = []
    h.client.session.get = async (params: { sessionID: string }) => {
      sessionGetCalls.push(params.sessionID)
      const info = sessionDB.get(params.sessionID)
      return {
        data: info ?? { id: params.sessionID },
        error: undefined,
      } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-backfill-1", "sess-backfill-child"))

    expect(sessionGetCalls.length).toBeGreaterThanOrEqual(1)
    expect(sessionGetCalls[0]).toBe("sess-backfill-child")

    // Wait for the async backfill .then() continuation
    await new Promise((r) => setTimeout(r, 0))

    expect(h.dialogStack.length).toBe(1)
  })

  // ── Captured handlers run in same mock root TUI instance ────────────────

  it("captured handlers run in the same mock root TUI instance context", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const permAsked = findHandler(h, "permission.asked")
    const permReplied = findHandler(h, "permission.replied")
    const sessionCreated = findHandler(h, "session.created")
    const sessionUpdated = findHandler(h, "session.updated")

    expect(permAsked).toBeDefined()
    expect(permReplied).toBeDefined()
    expect(sessionCreated).toBeDefined()
    expect(sessionUpdated).toBeDefined()

    expect(permAsked).not.toBe(permReplied)
    expect(permAsked).not.toBe(sessionCreated)

    sessionCreated!.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreated!.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    permAsked!.handler(makePermissionAskedEvent("req-context-1", "sess-child"))
    expect(h.dialogStack.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// T3: Permission reply value tests
// ---------------------------------------------------------------------------

describe("T3 — permission reply values", () => {
  it("approve once calls client.permission.reply with original requestID and reply='once'", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-reply-once")

    const options = rendered.props.options
    const onceOption = options.find((o: any) => o.value === "once")
    expect(onceOption).toBeDefined()
    if (onceOption?.onSelect) await onceOption.onSelect()

    expect(h.replyCalls.length).toBe(1)
    expect(h.replyCalls[0]).toEqual({ requestID: "req-reply-once", reply: "once" })
  })

  it("approve always calls client.permission.reply with original requestID and reply='always'", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-reply-always")

    const options = rendered.props.options
    const alwaysOption = options.find((o: any) => o.value === "always")
    expect(alwaysOption).toBeDefined()
    if (alwaysOption?.onSelect) await alwaysOption.onSelect()

    expect(h.replyCalls.length).toBe(1)
    expect(h.replyCalls[0]).toEqual({ requestID: "req-reply-always", reply: "always" })
  })

  it("reject calls client.permission.reply with original requestID and reply='reject'", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-reply-reject")

    const options = rendered.props.options
    const rejectOption = options.find((o: any) => o.value === "reject")
    expect(rejectOption).toBeDefined()
    if (rejectOption?.onSelect) await rejectOption.onSelect()

    expect(h.replyCalls.length).toBe(1)
    expect(h.replyCalls[0]).toEqual({ requestID: "req-reply-reject", reply: "reject" })
  })
})

// ---------------------------------------------------------------------------
// T3: Dialog metadata assertions (spec compliance)
// ---------------------------------------------------------------------------

describe("T3 — dialog user-facing metadata", () => {
  it("dialog title includes nested session ID and root session ID", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-1")

    const title: string = rendered.props.title
    expect(title).toContain("sess-child")
    expect(title).toContain("sess-root")
  })

  it("dialog title includes permission name", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-2", {
      permission: "file-write",
    })

    const title: string = rendered.props.title
    expect(title).toContain("file-write")
  })

  it("dialog provides three decision options: once, always, reject", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-3")

    const values = rendered.props.options.map((o: any) => o.value)
    expect(values).toContain("once")
    expect(values).toContain("always")
    expect(values).toContain("reject")
    expect(values.length).toBe(3)
  })

  it("dialog option descriptions include requested patterns", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-patterns", {
      patterns: ["src/**/*.ts", "README.md"],
    })

    const description = rendered.props.options[0].description as string
    expect(description).toContain("Patterns: src/**/*.ts, README.md")
  })

  it("dialog option descriptions include tool call and message IDs", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-tool", {
      tool: { messageID: "msg-123", callID: "call-456" },
    })

    const description = rendered.props.options[0].description as string
    expect(description).toContain("Tool: call-456")
    expect(description).toContain("message: msg-123")
  })

  it("dialog option descriptions include metadata key/value details", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-kv", {
      metadata: { file: "src/tui.ts", reason: "test" },
    })

    const description = rendered.props.options[0].description as string
    expect(description).toContain("Metadata:")
    expect(description).toContain("file=src/tui.ts")
    expect(description).toContain("reason=test")
  })

  it("dialog option descriptions expose explicit always availability", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-always", {
      always: ["src/**/*.ts"],
    })

    const description = rendered.props.options[0].description as string
    expect(description).toContain("Always available for: src/**/*.ts")
  })

  it("dialog option descriptions expose when always is unavailable", async () => {
    const h = createMockHarness()
    const rendered = await setupDialogForChild(h, "req-meta-no-always", {
      always: [],
    })

    const description = rendered.props.options[0].description as string
    expect(description).toContain("No persistent approvals")
  })

  it("dialog title reflects grandchild → root resolution", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-grandchild", "sess-child"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-meta-gc", "sess-grandchild"))

    expect(h.dialogStack.length).toBe(1)
    const rendered = h.dialogStack[0].render() as { props: { title: string } }
    const title = rendered.props.title
    expect(title).toContain("sess-grandchild")
    expect(title).toContain("sess-root")
  })
})

// ---------------------------------------------------------------------------
// T3: Reply-before-backfill race condition
// ---------------------------------------------------------------------------

describe("T3 — async race: permission.replied before backfill completes", () => {
  it("replied event arriving during backfill suppresses post-backfill dialog", async () => {
    const sessionDB = new Map<string, { id: string; parentID?: string }>()
    sessionDB.set("sess-race-child", { id: "sess-race-child", parentID: "sess-race-root" })
    sessionDB.set("sess-race-root", { id: "sess-race-root" })

    const h = createMockHarness(sessionDB)

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const permAskedHandler = findHandler(h, "permission.asked")!
    const permRepliedHandler = findHandler(h, "permission.replied")!

    // Fire permission.asked — triggers async backfill (no lifecycle events)
    permAskedHandler.handler(makePermissionAskedEvent("req-race-1", "sess-race-child"))

    // IMMEDIATELY fire permission.replied for the same request ID
    // This simulates the reply arriving while backfill is still in flight
    permRepliedHandler.handler(makePermissionRepliedEvent("req-race-1", "sess-race-child", "once"))

    // Wait for backfill to complete and processPermissionAsked to run
    await new Promise((r) => setTimeout(r, 0))

    // The post-backfill processPermissionAsked must see the request as completed
    // and NOT open a dialog
    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// T3: Lifecycle disposal
// ---------------------------------------------------------------------------

describe("T3 — lifecycle disposal", () => {
  it("disposal prevents further event handling", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    // Trigger lifecycle disposal (simulates plugin unload)
    h.triggerDispose()

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-disposed-1", "sess-child"))

    // After disposal, event handlers should be disconnected
    // (disposers set their `disposed` flag to true)
    expect(h.dialogStack.length).toBe(0)
  })

  it("disposal clears permission bubbling state", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-pre-dispose", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    // Dispose
    h.triggerDispose()

    // Clear dialog stack (simulating prior dialog close)
    h.dialogStack.length = 0

    // Re-register handlers (simulating a new plugin load — but disposers
    // from the old load should be inactive)
    // Since the disposers were called, the old handlers are now no-ops.
    // A new permission.asked should not trigger the old handlers.
    permAskedHandler.handler(makePermissionAskedEvent("req-post-dispose", "sess-child"))

    // The old handler is disposed, so no new dialog opens from it
    expect(h.dialogStack.length).toBe(0)
  })

  it("disposal while backfill is in-flight prevents post-backfill dialog", async () => {
    const h = createMockHarness()
    let resolveGet: ((value: unknown) => void) | undefined
    let getCalls = 0
    h.client.session.get = async (params: { sessionID: string }) => {
      getCalls++
      if (getCalls > 1) {
        return {
          data: { id: params.sessionID },
          error: undefined,
        } as any
      }
      return await new Promise((resolve) => {
        resolveGet = resolve
      }) as any
    }

    await SupercodeTuiPlugin.tui!(h.api, undefined, h.meta)

    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-dispose-race", "sess-backfill-child"))

    // Dispose before backfill resolves.
    h.triggerDispose()

    // Resolve the in-flight backfill with a child session. Even if the promise
    // resolves later, the disposed guard should prevent processPermissionAsked.
    resolveGet?.({
      data: { id: "sess-backfill-child", parentID: "sess-backfill-root" },
      error: undefined,
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(h.dialogStack.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// T4: Pending permission fallback via permission.list polling
// ---------------------------------------------------------------------------

/** Default poll interval for tests (ms). Short enough for fast tests. */
const TEST_POLL_INTERVAL_MS = 10

/** Wait helper for poll cycles to fire. */
function waitForPoll(ms = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

describe("T4 — pending permission fallback via permission.list polling", () => {
  it("grandchild permission discovered via polling opens exactly one dialog after backfill", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })
    sessionDB.set("sess-grandchild", { id: "sess-grandchild", parentID: "sess-child" })

    const h = createMockHarness(sessionDB)

    // Configure client.session.get for backfill
    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    // Warm session events so the resolver knows the parent chain
    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-grandchild", "sess-child"))

    // NO permission.asked event is fired — the request is only discoverable via polling
    h.setPermissionListData([
      {
        id: "req-gc-poll-1",
        sessionID: "sess-grandchild",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
        tool: { messageID: "msg-gc", callID: "call-gc" },
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(1)

    // Verify reply uses original request ID
    const rendered = h.dialogStack[0].render() as { props: { options: any[] } }
    const onceOption = rendered.props.options.find((o: any) => o.value === "once")
    expect(onceOption).toBeDefined()
    if (onceOption?.onSelect) await onceOption.onSelect()

    expect(h.replyCalls.length).toBe(1)
    expect(h.replyCalls[0].requestID).toBe("req-gc-poll-1")
    expect(h.replyCalls[0].reply).toBe("once")
  })

  it("grandchild permission via polling gets backfilled when session not yet known", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })
    sessionDB.set("sess-gc-unknown", { id: "sess-gc-unknown", parentID: "sess-child" })

    const h = createMockHarness(sessionDB)

    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    // Do NOT warm any session.created events — simulate completely unknown chain

    h.setPermissionListData([
      {
        id: "req-gc-backfill",
        sessionID: "sess-gc-unknown",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // Backfill should resolve the chain and open a dialog
    expect(h.dialogStack.length).toBe(1)
  })

  it("root session permission from polling does not open dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))

    h.setPermissionListData([
      {
        id: "req-root-poll",
        sessionID: "sess-root",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })

  it("unresolved parent chain from polling does not open dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    // No session events warmed, no session DB — parent chain cannot be resolved

    h.setPermissionListData([
      {
        id: "req-unresolved-poll",
        sessionID: "sess-unknown-chain",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(0)
    expect(h.replyCalls.length).toBe(0)
  })

  it("polling does not auto-approve any permission", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })

    const h = createMockHarness(sessionDB)

    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    h.setPermissionListData([
      {
        id: "req-no-auto-approve",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // Dialog should be open, waiting for user action — no auto-approval
    expect(h.dialogStack.length).toBe(1)
    expect(h.replyCalls.length).toBe(0)
  })

  it("disposal stops polling and prevents dialogs from in-flight poll", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })

    const h = createMockHarness(sessionDB)

    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    // Dispose before setting up poll data
    h.triggerDispose()

    h.setPermissionListData([
      {
        id: "req-post-dispose-poll",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// T4: Duplicate suppression with polling
// ---------------------------------------------------------------------------

describe("T4 — duplicate suppression with polling", () => {
  it("same request from event and poll does not open duplicate dialog", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    // Fire permission.asked event → opens first dialog
    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-dup-event-poll", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    // Poll returns the same request
    h.setPermissionListData([
      {
        id: "req-dup-event-poll",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // Still exactly one dialog — no duplicate
    expect(h.dialogStack.length).toBe(1)
    expect(h.replyCalls.length).toBe(0)
  })

  it("same request from consecutive polls does not open duplicate dialog", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })

    const h = createMockHarness(sessionDB)

    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    // Set list data — first poll will discover it
    h.setPermissionListData([
      {
        id: "req-dup-poll-poll",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(1)

    // Second poll with same data — should not open another dialog
    await waitForPoll()

    expect(h.dialogStack.length).toBe(1)
  })

  it("completed request from event suppresses polled discovery", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    // Fire permission.asked → dialog opens
    const permAskedHandler = findHandler(h, "permission.asked")!
    permAskedHandler.handler(makePermissionAskedEvent("req-completed-poll", "sess-child"))
    expect(h.dialogStack.length).toBe(1)

    // Reply to complete it
    const rendered = h.dialogStack[0].render() as { props: { options: any[] } }
    const onceOption = rendered.props.options.find((o: any) => o.value === "once")
    if (onceOption?.onSelect) await onceOption.onSelect()
    expect(h.replyCalls.length).toBe(1)

    // Clear the dialog stack to check for new dialogs
    h.dialogStack.length = 0

    // Poll returns the same completed request
    h.setPermissionListData([
      {
        id: "req-completed-poll",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // No new dialog for completed request
    expect(h.dialogStack.length).toBe(0)
  })

  it("multiple pending permissions in one poll only opens one dialog and leaves the next for a later poll", async () => {
    const h = createMockHarness()

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    h.setPermissionListData([
      {
        id: "req-multi-poll-1",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/one.ts"],
        metadata: {},
        always: [],
      },
      {
        id: "req-multi-poll-2",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/two.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(1)
    let rendered = h.dialogStack[0].render() as { props: { options: any[]; title: string } }
    expect(rendered.props.title).toContain("sess-child")
    expect(h.replyCalls.length).toBe(0)

    const firstOnce = rendered.props.options.find((o: any) => o.value === "once")
    expect(firstOnce).toBeDefined()
    if (firstOnce?.onSelect) await firstOnce.onSelect()

    expect(h.replyCalls).toEqual([{ requestID: "req-multi-poll-1", reply: "once" }])

    // Remove the completed request from the pending list; the next poll should
    // now surface the second request instead of having suppressed it invisibly.
    h.setPermissionListData([
      {
        id: "req-multi-poll-2",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/two.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    expect(h.dialogStack.length).toBe(1)
    rendered = h.dialogStack[0].render() as { props: { options: any[]; title: string } }
    const secondReject = rendered.props.options.find((o: any) => o.value === "reject")
    expect(secondReject).toBeDefined()
    if (secondReject?.onSelect) await secondReject.onSelect()

    expect(h.replyCalls).toEqual([
      { requestID: "req-multi-poll-1", reply: "once" },
      { requestID: "req-multi-poll-2", reply: "reject" },
    ])
  })

  it("slow permission.list cycles are single-flight and do not overlap", async () => {
    const h = createMockHarness()
    let activeListCalls = 0
    let maxConcurrentListCalls = 0
    const releaseListCalls: Array<() => void> = []

    h.client.permission.list = async () => {
      activeListCalls++
      maxConcurrentListCalls = Math.max(maxConcurrentListCalls, activeListCalls)
      await new Promise<void>((resolve) => releaseListCalls.push(resolve))
      activeListCalls--
      return { data: [], error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    await waitForPoll(60)

    expect(maxConcurrentListCalls).toBe(1)
    expect(activeListCalls).toBe(1)

    while (releaseListCalls.length > 0) releaseListCalls.shift()!()
    await new Promise((r) => setTimeout(r, 0))
  })

  it("disposal clears polling interval so permission.list is not called again", async () => {
    const h = createMockHarness()
    let listCalls = 0

    h.client.permission.list = async () => {
      listCalls++
      return { data: [], error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    await waitForPoll(30)
    expect(listCalls).toBeGreaterThan(0)

    h.triggerDispose()
    const callsAtDispose = listCalls

    await waitForPoll(40)

    expect(listCalls).toBe(callsAtDispose)
  })
})

// ---------------------------------------------------------------------------
// T4: Observability / status instrumentation
// ---------------------------------------------------------------------------

describe("T4 — observability/status instrumentation", () => {
  it("getStats returns correct counts from bubbling state", () => {
    const { createPermissionBubblingState } = require("../hooks/permission-bubbling")
    const state = createPermissionBubblingState()
    const getRootID = (sid: string) => {
      if (sid === "sess-root") return "sess-root"
      if (sid === "sess-child") return "sess-root"
      return undefined
    }

    // Initially all zeros
    const stats0 = state.getStats()
    expect(stats0.pending).toBe(0)
    expect(stats0.dialogOpen).toBe(0)
    expect(stats0.completed).toBe(0)
    expect(stats0.dismissed).toBe(0)
    expect(stats0.totalTracked).toBe(0)

    // Add a pending request
    state.observeAsked(
      { id: "req-s1", sessionID: "sess-child", permission: "edit", patterns: [], metadata: {}, always: [] },
      getRootID,
    )
    const stats1 = state.getStats()
    expect(stats1.pending).toBe(1)
    expect(stats1.totalTracked).toBe(1)

    // Open dialog
    state.markDialogOpen("req-s1")
    const stats2 = state.getStats()
    expect(stats2.pending).toBe(0)
    expect(stats2.dialogOpen).toBe(1)

    // Complete
    state.observeReplied("req-s1")
    const stats3 = state.getStats()
    expect(stats3.dialogOpen).toBe(0)
    expect(stats3.completed).toBe(1)
  })

  it("plugin stores stats in kv after poll cycle", async () => {
    const sessionDB = new Map<string, MockSessionInfo>()
    sessionDB.set("sess-root", { id: "sess-root" })
    sessionDB.set("sess-child", { id: "sess-child", parentID: "sess-root" })

    const h = createMockHarness(sessionDB)

    h.client.session.get = async (params: { sessionID: string }) => {
      const info = sessionDB.get(params.sessionID)
      return { data: info ?? { id: params.sessionID }, error: undefined } as any
    }

    await SupercodeTuiPlugin.tui!(h.api, { pollIntervalMs: TEST_POLL_INTERVAL_MS }, h.meta)

    const sessionCreatedHandler = findHandler(h, "session.created")!
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-root"))
    sessionCreatedHandler.handler(makeSessionCreatedEvent("sess-child", "sess-root"))

    h.setPermissionListData([
      {
        id: "req-stats-1",
        sessionID: "sess-child",
        permission: "edit",
        patterns: ["src/**/*.ts"],
        metadata: {},
        always: [],
      },
    ])

    await waitForPoll()

    // kv.set should have been called with stats
    const statsCall = h.kvSetCalls.find((c) => c.key === "supercode:permission-bubbling:stats")
    expect(statsCall).toBeDefined()
    const stats = statsCall!.value as { pending: number; dialogOpen: number; completed: number; dismissed: number; totalTracked: number }
    expect(typeof stats.pending).toBe("number")
    expect(typeof stats.dialogOpen).toBe("number")
    expect(typeof stats.completed).toBe("number")
    expect(typeof stats.dismissed).toBe("number")
    expect(typeof stats.totalTracked).toBe("number")
  })

  it("getStats is callable and returns expected shape after dispose resets", () => {
    const { createPermissionBubblingState } = require("../hooks/permission-bubbling")
    const state = createPermissionBubblingState()
    const getRootID = (sid: string) => {
      if (sid === "sess-root") return "sess-root"
      if (sid === "sess-child") return "sess-root"
      return undefined
    }

    state.observeAsked(
      { id: "req-dispose-stats", sessionID: "sess-child", permission: "edit", patterns: [], metadata: {}, always: [] },
      getRootID,
    )
    expect(state.getStats().totalTracked).toBe(1)

    state.dispose()
    const postDispose = state.getStats()
    expect(postDispose.totalTracked).toBe(0)
    expect(postDispose.pending).toBe(0)
    expect(postDispose.dialogOpen).toBe(0)
    expect(postDispose.completed).toBe(0)
    expect(postDispose.dismissed).toBe(0)
  })
})
