import { describe, expect, it } from "bun:test"
import {
  createPermissionBubblingState,
  type NormalizedPermissionRequest,
  type RoutingDecision,
} from "../hooks/permission-bubbling"

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRequest(
  overrides: Partial<NormalizedPermissionRequest> = {},
): NormalizedPermissionRequest {
  return {
    id: overrides.id ?? "req-1",
    sessionID: overrides.sessionID ?? "sess-child",
    permission: overrides.permission ?? "edit",
    patterns: overrides.patterns ?? ["src/**/*.ts"],
    metadata: overrides.metadata ?? {},
    always: overrides.always ?? [],
    tool: overrides.tool,
  }
}

/**
 * Create a getRootID mock that maps sessionIDs to root session IDs.
 * Returns the sessionID itself for root sessions, undefined for unknown.
 */
function makeRootLookup(
  map: Record<string, string | undefined>,
): (sessionID: string) => string | undefined {
  return (sessionID: string) => {
    if (sessionID in map) return map[sessionID]
    return undefined
  }
}

// ---------------------------------------------------------------------------
// T2: Permission bubbling state utility tests
// ---------------------------------------------------------------------------

describe("PermissionBubblingState", () => {
  // ── Root / native classification ────────────────────────────────────────

  describe("root-session request classification", () => {
    it("classifies root-session request as root (no reroute)", () => {
      const state = createPermissionBubblingState()
      // root-1 is a root session — getRootID returns itself
      const getRootID = makeRootLookup({ "sess-root-1": "sess-root-1" })

      const decision = state.observeAsked(
        makeRequest({ id: "req-root", sessionID: "sess-root-1" }),
        getRootID,
      )

      expect(decision.classification).toBe("root")
      expect(decision.requestID).toBe("req-root")
      expect(decision.sessionID).toBe("sess-root-1")
      expect(decision.rootSessionID).toBe("sess-root-1")
    })

    it("root request does not create long-lived duplicate suppression entry", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({ "sess-root": "sess-root" })

      state.observeAsked(makeRequest({ id: "req-root-2", sessionID: "sess-root" }), getRootID)

      // Root requests should not be tracked for duplicate suppression
      expect(state.getRequestStatus("req-root-2")).toBeUndefined()
    })
  })

  // ── Child / grandchild routable classification ──────────────────────────

  describe("child/grandchild routable classification", () => {
    it("classifies child request with known root as routable", () => {
      const state = createPermissionBubblingState()
      // child-1 is a child of root-1
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const decision = state.observeAsked(
        makeRequest({ id: "req-child", sessionID: "sess-child" }),
        getRootID,
      )

      expect(decision.classification).toBe("routable")
      expect(decision.requestID).toBe("req-child")
      expect(decision.sessionID).toBe("sess-child")
      expect(decision.rootSessionID).toBe("sess-root")
      expect(decision.request).toBeDefined()
      expect(decision.request!.id).toBe("req-child")
    })

    it("classifies grandchild request with known root as routable", () => {
      const state = createPermissionBubblingState()
      // grandchild → child → root chain is resolved
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
        "sess-grandchild": "sess-root",
      })

      const decision = state.observeAsked(
        makeRequest({ id: "req-gc", sessionID: "sess-grandchild" }),
        getRootID,
      )

      expect(decision.classification).toBe("routable")
      expect(decision.requestID).toBe("req-gc")
      expect(decision.rootSessionID).toBe("sess-root")
    })

    it("routable request stores original request ID", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeAsked(
        makeRequest({ id: "req-store", sessionID: "sess-child" }),
        getRootID,
      )

      expect(state.getRequestStatus("req-store")).toBe("pending")
    })
  })

  // ── Unresolved classification ───────────────────────────────────────────

  describe("unresolved classification", () => {
    it("classifies request with unknown parent chain as unresolved", () => {
      const state = createPermissionBubblingState()
      // child-unknown has a parentID that was never observed
      const getRootID = makeRootLookup({
        "sess-child-unresolved": undefined,
      })

      const decision = state.observeAsked(
        makeRequest({ id: "req-unresolved", sessionID: "sess-child-unresolved" }),
        getRootID,
      )

      expect(decision.classification).toBe("unresolved")
      expect(decision.requestID).toBe("req-unresolved")
      expect(decision.rootSessionID).toBeUndefined()
    })

    it("unresolved request does not become dialog-eligible", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({ "sess-unknown": undefined })

      state.observeAsked(
        makeRequest({ id: "req-unres-2", sessionID: "sess-unknown" }),
        getRootID,
      )

      // Unresolved requests should not be tracked
      expect(state.getRequestStatus("req-unres-2")).toBeUndefined()
    })

    it("unresolved classification does not create long-lived suppression entry", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({ "sess-missing-parent": undefined })

      state.observeAsked(
        makeRequest({ id: "req-no-suppress", sessionID: "sess-missing-parent" }),
        getRootID,
      )

      // No status tracked for unresolved
      expect(state.getRequestStatus("req-no-suppress")).toBeUndefined()
    })

    it("missed parent lifecycle events leave request unresolved/no-dialog", () => {
      const state = createPermissionBubblingState()
      // Simulate: session was never observed, so getRootID returns undefined
      const getRootID = makeRootLookup({})

      const decision = state.observeAsked(
        makeRequest({ id: "req-missed", sessionID: "sess-never-observed" }),
        getRootID,
      )

      expect(decision.classification).toBe("unresolved")
    })
  })

  // ── Duplicate suppression ──────────────────────────────────────────────

  describe("duplicate suppression", () => {
    it("repeated observation of same request ID is classified as duplicate", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-dup", sessionID: "sess-child" })
      const first = state.observeAsked(req, getRootID)
      expect(first.classification).toBe("routable")

      const second = state.observeAsked(req, getRootID)
      expect(second.classification).toBe("duplicate")
    })

    it("duplicate suppression is keyed by request ID, not root session", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      // First request from child
      const first = state.observeAsked(
        makeRequest({ id: "req-a", sessionID: "sess-child" }),
        getRootID,
      )
      expect(first.classification).toBe("routable")

      // Different request ID, same session — should NOT be duplicate
      const second = state.observeAsked(
        makeRequest({ id: "req-b", sessionID: "sess-child" }),
        getRootID,
      )
      expect(second.classification).toBe("routable")
    })

    it("repeated observations while dialog is open remain suppressed", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-open-dup", sessionID: "sess-child" })
      state.observeAsked(req, getRootID)

      // Mark dialog as open
      state.markDialogOpen("req-open-dup")
      expect(state.getRequestStatus("req-open-dup")).toBe("dialog-open")

      // Repeated observation while dialog is open → duplicate
      const repeated = state.observeAsked(req, getRootID)
      expect(repeated.classification).toBe("duplicate")
    })
  })

  // ── Reply / completion handling ────────────────────────────────────────

  describe("reply / completion clears state", () => {
    it("permission replied marks request completed", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeAsked(
        makeRequest({ id: "req-reply", sessionID: "sess-child" }),
        getRootID,
      )
      expect(state.getRequestStatus("req-reply")).toBe("pending")

      state.observeReplied("req-reply")
      expect(state.getRequestStatus("req-reply")).toBe("completed")
    })

    it("completed request suppresses future custom dialogs for same request ID", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-completed", sessionID: "sess-child" })
      state.observeAsked(req, getRootID)
      state.observeReplied("req-completed")

      // Re-observing same request ID after completion → completed classification
      const decision = state.observeAsked(req, getRootID)
      expect(decision.classification).toBe("completed")
    })

    it("successful reply clears pending state — no more custom dialogs", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-clear", sessionID: "sess-child" })
      state.observeAsked(req, getRootID)
      state.markDialogOpen("req-clear")
      expect(state.getRequestStatus("req-clear")).toBe("dialog-open")

      state.observeReplied("req-clear")
      expect(state.getRequestStatus("req-clear")).toBe("completed")

      // Future observation returns completed
      const decision = state.observeAsked(req, getRootID)
      expect(decision.classification).toBe("completed")
    })

    it("pre-replied request is completed after async backfill resolves", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeReplied("req-pre-replied")

      const decision = state.observeAsked(
        makeRequest({ id: "req-pre-replied", sessionID: "sess-child" }),
        getRootID,
      )

      expect(decision.classification).toBe("completed")

      // The matched preReplied entry is converted into completed tracked state,
      // so a later replay remains suppressed without relying on unbounded
      // preReplied retention.
      const replay = state.observeAsked(
        makeRequest({ id: "req-pre-replied", sessionID: "sess-child" }),
        getRootID,
      )
      expect(replay.classification).toBe("completed")
    })

    it("bounds unmatched pre-replied IDs so unrelated replies cannot grow unbounded", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      for (let i = 0; i < 1001; i++) {
        state.observeReplied(`req-untracked-${i}`)
      }

      const evicted = state.observeAsked(
        makeRequest({ id: "req-untracked-0", sessionID: "sess-child" }),
        getRootID,
      )
      expect(evicted.classification).toBe("routable")

      const retained = state.observeAsked(
        makeRequest({ id: "req-untracked-1000", sessionID: "sess-child" }),
        getRootID,
      )
      expect(retained.classification).toBe("completed")
    })
  })

  // ── Cancel / error handling ────────────────────────────────────────────

  describe("cancel / error marks dismissed", () => {
    it("dialog cancel marks request dismissed", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeAsked(
        makeRequest({ id: "req-cancel", sessionID: "sess-child" }),
        getRootID,
      )
      state.markDialogOpen("req-cancel")
      state.markDialogDismissed("req-cancel")

      expect(state.getRequestStatus("req-cancel")).toBe("dismissed")
    })

    it("dialog error marks request dismissed", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeAsked(
        makeRequest({ id: "req-error", sessionID: "sess-child" }),
        getRootID,
      )
      state.markDialogDismissed("req-error")

      expect(state.getRequestStatus("req-error")).toBe("dismissed")
    })

    it("dismissed request never opens another Supercode dialog for same request ID", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-dismissed", sessionID: "sess-child" })
      state.observeAsked(req, getRootID)
      state.markDialogDismissed("req-dismissed")

      // Re-observing same request ID after dismiss → dismissed classification
      const decision = state.observeAsked(req, getRootID)
      expect(decision.classification).toBe("dismissed")
    })

    it("dismissed request classification does not auto-approve or auto-reject", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const req = makeRequest({ id: "req-no-auto", sessionID: "sess-child" })
      state.observeAsked(req, getRootID)
      state.markDialogDismissed("req-no-auto")

      const decision = state.observeAsked(req, getRootID)
      // Dismissed is NOT completed — it specifically means no custom dialog,
      // no reply sent, and OpenCode native ask behavior remains intact
      expect(decision.classification).toBe("dismissed")
      expect(decision.classification).not.toBe("completed")
    })
  })

  // ── Safety: routing state never emits decisions ────────────────────────

  describe("routing state safety", () => {
    it("routing state never emits an allow/deny decision", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      const decision = state.observeAsked(
        makeRequest({ id: "req-safety", sessionID: "sess-child" }),
        getRootID,
      )

      // RoutingDecision should only report classification, never a reply value
      expect(decision).not.toHaveProperty("reply")
      expect(decision).not.toHaveProperty("allow")
      expect(decision).not.toHaveProperty("deny")
      // It only reports whether the TUI should ask the user
      expect(decision.classification).toBe("routable")
    })
  })

  // ── Dispose ────────────────────────────────────────────────────────────

  describe("dispose", () => {
    it("clears all tracked state", () => {
      const state = createPermissionBubblingState()
      const getRootID = makeRootLookup({
        "sess-root": "sess-root",
        "sess-child": "sess-root",
      })

      state.observeAsked(
        makeRequest({ id: "req-dispose", sessionID: "sess-child" }),
        getRootID,
      )
      expect(state.getRequestStatus("req-dispose")).toBe("pending")

      state.dispose()
      expect(state.getRequestStatus("req-dispose")).toBeUndefined()
    })
  })
})
