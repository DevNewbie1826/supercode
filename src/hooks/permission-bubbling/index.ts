/**
 * Permission Bubbling State Utility
 *
 * Pure state module for routing and duplicate-suppression decisions for
 * nested permission requests. This module has NO dependency on the TUI runtime
 * and never emits allow/deny decisions — it only reports whether the TUI
 * should present a custom approval dialog for a nested permission request.
 *
 * Duplicate suppression is keyed by original permission request ID.
 * At most one Supercode dialog is ever opened for a given request ID.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalized permission request fields consumed from SDK event/state shapes. */
export interface NormalizedPermissionRequest {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: { messageID: string; callID: string }
}

/** Classification of a permission request for routing purposes. */
export type RequestClassification =
  | "root"       // Root session request — no custom dialog needed
  | "routable"   // Nested session with known root — eligible for custom dialog
  | "unresolved" // Unknown parent chain — no custom dialog
  | "duplicate"  // Repeated observation of same request ID already tracked
  | "completed"  // Already replied/handled — no more custom dialogs
  | "dismissed"  // Cancel/error — no reply sent, no future custom dialogs

/** Status of a tracked permission request in the duplicate-suppression lifecycle. */
export type RequestStatus = "pending" | "dialog-open" | "completed" | "dismissed"

/** Maximum untracked reply IDs retained for async backfill race suppression. */
const MAX_PRE_REPLIED = 1000

/** Result of an observeAsked call. */
export interface RoutingDecision {
  classification: RequestClassification
  requestID: string
  sessionID: string
  rootSessionID?: string
  request?: NormalizedPermissionRequest
}

// ---------------------------------------------------------------------------
// Internal tracking entry
// ---------------------------------------------------------------------------

interface TrackedRequest {
  status: RequestStatus
  request: NormalizedPermissionRequest
  rootSessionID: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface PermissionBubblingState {
  /**
   * Observe a permission.asked event and classify the request.
   *
   * Uses the provided getRootID function (from session resolver) to determine
   * the root ancestor. Does NOT auto-approve or auto-reject any request.
   */
  observeAsked(
    request: NormalizedPermissionRequest,
    getRootID: (sessionID: string) => string | undefined,
  ): RoutingDecision

  /**
   * Observe a permission.replied event for a tracked request.
   * Marks the request completed and suppresses all future custom dialogs
   * for the same request ID.
   */
  observeReplied(requestID: string): void

  /**
   * Mark that a custom dialog has been opened for the given request ID.
   * Transition: pending → dialog-open. No-op if already dialog-open,
   * completed, or dismissed.
   */
  markDialogOpen(requestID: string): void

  /**
   * Mark that the custom dialog was dismissed (cancel/error).
   * Sends NO reply. Leaves OpenCode native ask behavior intact.
   * Suppresses all future Supercode dialogs for the same request ID.
   */
  markDialogDismissed(requestID: string): void

  /**
   * Get the current status of a tracked request.
   * Returns undefined for root, unresolved, and never-observed requests.
   */
  getRequestStatus(requestID: string): RequestStatus | undefined

  /** Clear all tracked state. */
  dispose(): void
}

/**
 * Create a permission bubbling state instance.
 *
 * The state tracks pending permission requests by original request ID and
 * manages the lifecycle: pending → dialog-open → completed | dismissed.
 *
 * Root and unresolved requests are NOT tracked long-term — they do not
 * create duplicate-suppression entries.
 */
export function createPermissionBubblingState(): PermissionBubblingState {
  const tracked = new Map<string, TrackedRequest>()
  /**
   * Request IDs that received a reply before they were ever observed via
   * observeAsked. This handles the async backfill race: permission.replied
   * arrives while backfill is still resolving the parent chain.
   */
  const preReplied = new Set<string>()
  const preRepliedOrder: string[] = []

  function observeAsked(
    request: NormalizedPermissionRequest,
    getRootID: (sessionID: string) => string | undefined,
  ): RoutingDecision {
    const { id, sessionID } = request

    // Check if this request ID is already tracked
    const existing = tracked.get(id)
    if (existing) {
      // Already tracked: report based on current status
      if (existing.status === "completed") {
        return {
          classification: "completed",
          requestID: id,
          sessionID,
          rootSessionID: existing.rootSessionID,
        }
      }
      if (existing.status === "dismissed") {
        return {
          classification: "dismissed",
          requestID: id,
          sessionID,
          rootSessionID: existing.rootSessionID,
        }
      }
      // pending or dialog-open → duplicate
      return {
        classification: "duplicate",
        requestID: id,
        sessionID,
        rootSessionID: existing.rootSessionID,
      }
    }

    // Resolve root session via injected lookup
    const rootSessionID = getRootID(sessionID)

    // Check pre-replied after root lookup so nested requests can transition
    // into completed tracked state, preventing a later replay from opening a
    // dialog after the preReplied entry is cleaned up.
    if (preReplied.has(id)) {
      preReplied.delete(id)
      if (rootSessionID !== undefined && rootSessionID !== sessionID) {
        tracked.set(id, {
          status: "completed",
          request,
          rootSessionID,
        })
      }
      return {
        classification: "completed",
        requestID: id,
        sessionID,
        rootSessionID,
      }
    }

    // Unresolved: no root found → no dialog, no tracking
    if (rootSessionID === undefined) {
      return {
        classification: "unresolved",
        requestID: id,
        sessionID,
      }
    }

    // Root session: session is its own root → no custom dialog, no tracking
    if (rootSessionID === sessionID) {
      return {
        classification: "root",
        requestID: id,
        sessionID,
        rootSessionID,
      }
    }

    // Nested routable: child/grandchild with known root → track as pending
    tracked.set(id, {
      status: "pending",
      request,
      rootSessionID,
    })

    return {
      classification: "routable",
      requestID: id,
      sessionID,
      rootSessionID,
      request,
    }
  }

  function observeReplied(requestID: string): void {
    const entry = tracked.get(requestID)
    if (entry) {
      entry.status = "completed"
    } else {
      // Reply arrived before observeAsked (e.g. async backfill race).
      // Record so a later observeAsked will classify as completed.
      if (!preReplied.has(requestID)) {
        preReplied.add(requestID)
        preRepliedOrder.push(requestID)
      }
      while (preRepliedOrder.length > MAX_PRE_REPLIED) {
        const oldest = preRepliedOrder.shift()
        if (oldest) preReplied.delete(oldest)
      }
    }
  }

  function markDialogOpen(requestID: string): void {
    const entry = tracked.get(requestID)
    if (entry && entry.status === "pending") {
      entry.status = "dialog-open"
    }
  }

  function markDialogDismissed(requestID: string): void {
    const entry = tracked.get(requestID)
    if (entry && entry.status !== "completed") {
      entry.status = "dismissed"
    }
  }

  function getRequestStatus(requestID: string): RequestStatus | undefined {
    return tracked.get(requestID)?.status
  }

  function dispose(): void {
    tracked.clear()
    preReplied.clear()
    preRepliedOrder.length = 0
  }

  return {
    observeAsked,
    observeReplied,
    markDialogOpen,
    markDialogDismissed,
    getRequestStatus,
    dispose,
  }
}
