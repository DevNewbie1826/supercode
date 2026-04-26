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

export const SupercodeTuiPlugin: TuiPluginModule = {
  id: "supercode",
  tui: async (api, _options, _meta) => {
    const resolver = createSessionRoleResolver()
    const bubblingState = createPermissionBubblingState()
    const disposers: (() => void)[] = []
    let disposed = false

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
      const getRootID = (sid: string) => resolver.getRootSessionID(sid)
      const decision = bubblingState.observeAsked(normalizedReq, getRootID)

      if (decision.classification !== "routable") return

      // Mark dialog open to prevent duplicates
      bubblingState.markDialogOpen(normalizedReq.id)

      const rootSessionID = decision.rootSessionID!

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
        api.ui.dialog.clear()
      }

      // -- Dismiss handler: cancel/error, no reply sent --------------------
      const handleDismiss = () => {
        bubblingState.markDialogDismissed(normalizedReq.id)
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
    // Lifecycle disposal
    // -----------------------------------------------------------------------

    api.lifecycle.onDispose(() => {
      disposed = true
      for (const dispose of disposers) dispose()
      bubblingState.dispose()
      resolver.dispose()
    })
  },
}

export default SupercodeTuiPlugin
