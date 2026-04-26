/**
 * Supercode TUI Permission Bubbling Plugin
 *
 * Displays a Supercode-controlled approval dialog for nested permission
 * requests (child and grandchild sessions) and replies to the original
 * SDK permission request using `client.permission.reply({ requestID, reply })`.
 *
 * Root-session, unresolved-parent-chain, and dismissed requests are left
 * under OpenCode's normal ask behavior. At most one Supercode dialog is
 * ever opened for a given permission request ID.
 *
 * A periodic fallback polls `api.client.permission.list()` to discover
 * pending permissions that were not delivered via `permission.asked` events
 * (e.g., grandchild requests whose events did not propagate to the root TUI).
 * Discovered permissions are fed through the same normalization, backfill,
 * and duplicate suppression pipeline.
 */

import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import type {
  PermissionRequest,
  EventPermissionAsked,
} from "@opencode-ai/sdk/v2"
import { createSessionRoleResolver } from "./hooks/session-role-resolver"
import {
  createPermissionBubblingState,
  type NormalizedPermissionRequest,
} from "./hooks/permission-bubbling"

/** Maximum depth for bounded parent-chain backfill via client.session.get. */
const BACKFILL_MAX_DEPTH = 10

/** Default polling interval for the pending permission fallback (ms). */
const DEFAULT_POLL_INTERVAL_MS = 5000

/** Minimum polling interval to prevent CPU abuse (ms). */
const MIN_POLL_INTERVAL_MS = 10

/** Configuration options for the Supercode TUI plugin. */
export interface SupercodeTuiPluginOptions {
  /**
   * Polling interval for the pending permission fallback in milliseconds.
   * Set to 0 or undefined to use the default (5000ms).
   * Values below MIN_POLL_INTERVAL_MS are clamped.
   */
  pollIntervalMs?: number

  /**
   * When true, emit visible runtime diagnostic toasts via api.ui.toast for
   * key plugin lifecycle events: load, polling start, immediate poll,
   * permission.list results, per-request classification, and dialog
   * open/reply/dismiss. Off by default.
   */
  debugToasts?: boolean
}

export const SupercodeTuiPlugin: TuiPluginModule = {
  id: "supercode",
  tui: async (api, _options, _meta) => {
    const pluginOptions = (_options ?? {}) as SupercodeTuiPluginOptions
    const pollIntervalMs = Math.max(
      MIN_POLL_INTERVAL_MS,
      pluginOptions.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    )
    const debugToasts = pluginOptions.debugToasts === true

    /** Emit a diagnostic toast when debugToasts is enabled. */
    function debugToast(message: string, variant: "info" | "success" | "warning" | "error" = "info"): void {
      if (!debugToasts) return
      try {
        api.ui.toast({ message, variant })
      } catch {
        // toast may not be available in all environments
      }
    }

    const resolver = createSessionRoleResolver()
    const bubblingState = createPermissionBubblingState()
    const disposers: (() => void)[] = []
    let disposed = false
    let pollInFlight = false
    let pollTimer: ReturnType<typeof setInterval> | undefined

    // -----------------------------------------------------------------------
    // Debug: plugin loaded toast
    // -----------------------------------------------------------------------

    if (debugToasts) {
      const metaInfo: string[] = ["supercode loaded"]
      if (_meta) {
        if ("spec" in _meta && _meta.spec) metaInfo.push(`spec=${_meta.spec}`)
        if ("target" in _meta && _meta.target) metaInfo.push(`target=${_meta.target}`)
      }
      debugToast(metaInfo.join(" "))

      // Emit plugins.list supercode status
      try {
        const plugins = api.plugins.list()
        const supercodePlugin = plugins.find((p) => p.id === "supercode")
        if (supercodePlugin) {
          debugToast(`plugin status: supercode active=${supercodePlugin.active} enabled=${supercodePlugin.enabled}`)
        } else {
          debugToast("plugin status: supercode not found in plugins.list")
        }
      } catch {
        debugToast("plugin status: plugins.list unavailable")
      }
    }

    // -----------------------------------------------------------------------
    // Bounded safe parent-chain backfill
    // -----------------------------------------------------------------------

    /**
     * Walk up the parent chain via `client.session.get` and feed synthetic
     * lifecycle events into the resolver so future lookups are fast.
     * Returns the root session ID if fully resolved, or undefined.
     */
    async function resolveWithBackfill(
      sessionID: string,
    ): Promise<string | undefined> {
      const visited = new Set<string>([sessionID])
      let currentID = sessionID

      for (let depth = 0; depth < BACKFILL_MAX_DEPTH; depth++) {
        let session: { id: string; parentID?: string }
        try {
          const result = await api.client.session.get({
            sessionID: currentID,
          })
          if (!result.data) return undefined
          session = result.data as { id: string; parentID?: string }
        } catch {
          return undefined
        }

        // Feed synthetic lifecycle event to the resolver
        resolver.observe({
          type: "session.created",
          properties: {
            sessionID: currentID,
            info: { id: currentID, parentID: session.parentID },
          },
        })

        if (!session.parentID) {
          // Reached a root session
          debugToast(`backfill resolved root: ${currentID} for session ${sessionID}`)
          return currentID
        }

        if (visited.has(session.parentID)) return undefined // cycle
        visited.add(session.parentID)
        currentID = session.parentID
      }

      return undefined // exceeded depth limit
    }

    // -----------------------------------------------------------------------
    // Process a classified permission request
    // -----------------------------------------------------------------------

    function processPermissionAsked(normalizedReq: NormalizedPermissionRequest): void {
      // One-at-a-time policy: if a Supercode dialog is already open for a
      // different request, do NOT track or suppress this one. Leaving it
      // untracked lets a later poll surface it after the current dialog
      // is resolved or dismissed. This applies to both event and poll paths.
      if (hasCustomDialogOpen()) return

      const getRootID = (sid: string) => resolver.getRootSessionID(sid)
      const decision = bubblingState.observeAsked(normalizedReq, getRootID)

      debugToast(`classification: ${decision.classification} for req ${normalizedReq.id} session ${normalizedReq.sessionID}${decision.rootSessionID ? ` root ${decision.rootSessionID}` : ""}`)

      if (decision.classification !== "routable") return

      // Mark dialog open to prevent duplicates
      bubblingState.markDialogOpen(normalizedReq.id)

      const rootSessionID = decision.rootSessionID!

      debugToast(`dialog opened: req ${normalizedReq.id} session ${normalizedReq.sessionID} → root ${rootSessionID}`)

      // -- Reply handler: send user decision to original request ID --------
      const handleReply = async (reply: "once" | "always" | "reject") => {
        try {
          await api.client.permission.reply({
            requestID: normalizedReq.id,
            reply,
          })
        } catch {
          // Best effort — the request may have been handled by another source
        }
        bubblingState.observeReplied(normalizedReq.id)
        debugToast(`dialog replied: req ${normalizedReq.id} reply=${reply}`)
        api.ui.dialog.clear()
      }

      // -- Dismiss handler: cancel/error, no reply sent --------------------
      const handleDismiss = () => {
        bubblingState.markDialogDismissed(normalizedReq.id)
        debugToast(`dialog dismissed: req ${normalizedReq.id}`)
        api.ui.dialog.clear()
      }

      // -- Build user-facing metadata visible in the dialog ----------------
      const sessionInfo = `session ${normalizedReq.sessionID} → root ${rootSessionID}`
      const patternsStr = normalizedReq.patterns.join(", ")
      const toolStr = normalizedReq.tool
        ? `Tool: ${normalizedReq.tool.callID} (message: ${normalizedReq.tool.messageID})`
        : ""
      const metaKeys = Object.keys(normalizedReq.metadata)
      const metadataStr =
        metaKeys.length > 0
          ? metaKeys
              .map((k) => `${k}=${String(normalizedReq.metadata[k])}`)
              .join(", ")
          : ""
      const alwaysAvailable = normalizedReq.always.length > 0
      const alwaysStr = alwaysAvailable
        ? `Always available for: ${normalizedReq.always.join(", ")}`
        : "No persistent approvals"

      // Context line shown as option description in the dialog
      const contextParts = [
        `Patterns: ${patternsStr}`,
      ]
      if (toolStr) contextParts.push(toolStr)
      if (metadataStr) contextParts.push(`Metadata: ${metadataStr}`)
      contextParts.push(alwaysStr)
      const description = contextParts.join(" | ")

      // -- Dialog options --------------------------------------------------
      const options = [
        {
          title: "Approve once",
          value: "once" as const,
          description,
          onSelect: () => handleReply("once"),
        },
        {
          title: "Approve always",
          value: "always" as const,
          description,
          onSelect: () => handleReply("always"),
        },
        {
          title: "Reject",
          value: "reject" as const,
          description,
          onSelect: () => handleReply("reject"),
        },
      ]

      // -- Render function for the dialog ----------------------------------
      const renderDialog = () => {
        return api.ui.DialogSelect({
          title: `Permission: ${normalizedReq.permission} (${sessionInfo})`,
          placeholder: "Select action...",
          options,
        })
      }

      api.ui.dialog.replace(renderDialog, handleDismiss)
    }

    // -----------------------------------------------------------------------
    // Observability: stats snapshot stored in kv
    // -----------------------------------------------------------------------

    function updateStats(): void {
      try {
        api.kv.set("supercode:permission-bubbling:stats", bubblingState.getStats())
      } catch {
        // kv may not be available in all environments; ignore silently
      }
    }

    function hasCustomDialogOpen(): boolean {
      return bubblingState.getStats().dialogOpen > 0
    }

    // -----------------------------------------------------------------------
    // Pending permission fallback via api.client.permission.list()
    // -----------------------------------------------------------------------

    /**
     * Poll `api.client.permission.list()` for pending permissions across all
     * sessions. Feed discovered requests through the same normalization,
     * backfill, and duplicate suppression pipeline used by permission.asked
     * events. This catches grandchild (and deeper) permission requests whose
     * `permission.asked` events did not propagate to the root TUI.
     */
    async function pollPendingPermissions(): Promise<void> {
      if (disposed) return
      if (pollInFlight) return
      pollInFlight = true

      try {
        let listed: PermissionRequest[] = []
        const result = await api.client.permission.list()
        if (result.error || !result.data) {
          debugToast(`permission.list error: ${result.error ?? "no data"}`, "warning")
          return
        }
        listed = result.data as PermissionRequest[]
        debugToast(`permission.list success: ${listed.length} pending`)

        if (disposed) return

        for (const req of listed) {
          if (disposed) return
          // One-at-a-time policy: do not observe/track additional pending
          // requests while a Supercode dialog is open. Leaving them untouched
          // lets a later poll surface them after the current request resolves.
          if (hasCustomDialogOpen()) break

          const normalizedReq: NormalizedPermissionRequest = {
            id: req.id,
            sessionID: req.sessionID,
            permission: req.permission,
            patterns: req.patterns,
            metadata: req.metadata,
            always: req.always,
            tool: req.tool,
          }

          // Try synchronous lookup first (common path after lifecycle events)
          const rootID = resolver.getRootSessionID(req.sessionID)

          if (rootID !== undefined) {
            processPermissionAsked(normalizedReq)
          } else {
            // Parent chain unknown — backfill, then process
            await resolveWithBackfill(req.sessionID)
            if (disposed) return
            if (hasCustomDialogOpen()) break
            processPermissionAsked(normalizedReq)
          }
        }
      } catch {
        // API unavailable — silently skip this poll cycle
      } finally {
        pollInFlight = false
        if (!disposed) updateStats()
      }
    }

    // -----------------------------------------------------------------------
    // Event subscriptions
    // -----------------------------------------------------------------------

    // Warm parent-chain state from session lifecycle events
    disposers.push(
      api.event.on("session.created", (event) => {
        resolver.observe(event)
      }),
    )

    disposers.push(
      api.event.on("session.updated", (event) => {
        resolver.observe(event)
      }),
    )

    // Handle permission requests
    disposers.push(
      api.event.on("permission.asked", (event) => {
        if (disposed) return
        const req = (event as EventPermissionAsked).properties as PermissionRequest
        const normalizedReq: NormalizedPermissionRequest = {
          id: req.id,
          sessionID: req.sessionID,
          permission: req.permission,
          patterns: req.patterns,
          metadata: req.metadata,
          always: req.always,
          tool: req.tool,
        }

        // Try synchronous lookup first (common path after lifecycle events)
        const rootID = resolver.getRootSessionID(req.sessionID)

        if (rootID !== undefined) {
          // Resolver has the parent chain — process synchronously
          processPermissionAsked(normalizedReq)
        } else {
          // Parent chain unknown — fire-and-forget backfill, then process.
          // The preReplied mechanism in bubbling state handles the race where
          // permission.replied arrives while backfill is in flight.
          // The disposed guard prevents dialogs after lifecycle cleanup.
          resolveWithBackfill(req.sessionID).then(() => {
            if (disposed) return
            processPermissionAsked(normalizedReq)
          })
        }
      }),
    )

    // Mark requests completed when OpenCode reports a reply
    disposers.push(
      api.event.on("permission.replied", (event) => {
        if (disposed) return
        bubblingState.observeReplied(
          (event as { properties: { requestID: string } }).properties.requestID,
        )
      }),
    )

    // -----------------------------------------------------------------------
    // Pending permission fallback: start periodic polling
    // -----------------------------------------------------------------------

    debugToast(`polling started: interval=${pollIntervalMs}ms`)

    pollTimer = setInterval(() => {
      pollPendingPermissions()
    }, pollIntervalMs)

    // Trigger one immediate poll so permissions discovered before the first
    // interval tick are handled without delay.
    debugToast("immediate poll executing")
    pollPendingPermissions()

    // -----------------------------------------------------------------------
    // Lifecycle disposal
    // -----------------------------------------------------------------------

    api.lifecycle.onDispose(() => {
      disposed = true
      if (pollTimer !== undefined) {
        clearInterval(pollTimer)
        pollTimer = undefined
      }
      for (const dispose of disposers) dispose()
      bubblingState.dispose()
      resolver.dispose()
    })
  },
}

export default SupercodeTuiPlugin
