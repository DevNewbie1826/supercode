import type { SessionRole } from "./types"

export type { SessionRole } from "./types"

export interface SessionRoleResolver {
  observe(event: unknown): void
  getRole(sessionID: string): SessionRole
  getRootSessionID(sessionID: string): string | undefined
  extractSessionID(event: unknown): string | undefined
  dispose(): void
}

export interface SessionRoleResolverOptions {
  ttlMs?: number
  now?: () => number
}

/** Default TTL: 1 hour. Keeps resolver state bounded in long-running processes. */
const DEFAULT_TTL_MS = 60 * 60 * 1000

/**
 * Extract an approved session ID from an event object.
 *
 * Extraction paths (in priority order):
 * 1. Top-level `sessionID` — always valid
 * 2. Top-level `session_id` — always valid
 * 3. `properties.sessionID` — valid for event types that carry it
 *    directly on properties (session.status, session.idle)
 * 4. `properties.info.sessionID` — valid for `message.updated` events
 *    (AssistantMessage carries sessionID)
 * 5. `properties.info.id` — valid ONLY for session-scoped event types
 *    (session.created, session.updated, session.deleted)
 *
 * Shared by session-role-resolver and continuation enforcer to avoid
 * duplicating the extraction contract.
 */
export function extractSessionID(event: unknown): string | undefined {
  if (event == null || typeof event !== "object") return undefined
  const e = event as Record<string, unknown>
  // 1. Top-level sessionID
  if (typeof e.sessionID === "string") return e.sessionID
  // 2. Top-level session_id
  if (typeof e.session_id === "string") return e.session_id
  // 3. properties.sessionID for session.status / session.idle
  if (typeof e.type === "string" && PROPERTIES_SESSION_ID_EVENT_TYPES.has(e.type)) {
    const props = e.properties
    if (props != null && typeof props === "object") {
      const sid = (props as Record<string, unknown>).sessionID
      if (typeof sid === "string") return sid
    }
  }
  // 4. properties.info.sessionID for message.updated events
  if (typeof e.type === "string" && MESSAGE_SESSION_ID_EVENT_TYPES.has(e.type)) {
    const props = e.properties
    if (props != null && typeof props === "object") {
      const info = (props as Record<string, unknown>).info
      if (info != null && typeof info === "object") {
        const sid = (info as Record<string, unknown>).sessionID
        if (typeof sid === "string") return sid
      }
    }
  }
  // 5. properties.info.id — only for session-scoped event types
  if (typeof e.type === "string" && SESSION_SCOPED_EVENT_TYPES.has(e.type)) {
    const props = e.properties
    if (props != null && typeof props === "object") {
      const info = (props as Record<string, unknown>).info
      if (info != null && typeof info === "object") {
        const id = (info as Record<string, unknown>).id
        if (typeof id === "string") return id
      }
    }
  }
  return undefined
}

/** Event types where properties.sessionID is the session identifier. */
export const PROPERTIES_SESSION_ID_EVENT_TYPES = new Set([
  "session.status",
  "session.idle",
])

/** Event types where properties.info.id is a valid session identifier. */
export const SESSION_SCOPED_EVENT_TYPES = new Set([
  "session.created",
  "session.updated",
  "session.deleted",
])

/** Event types where properties.info.sessionID is the session identifier. */
export const MESSAGE_SESSION_ID_EVENT_TYPES = new Set(["message.updated"])

export function createSessionRoleResolver(
  options?: SessionRoleResolverOptions,
): SessionRoleResolver {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const now = options?.now ?? Date.now

  // Resolved role state keyed by sessionID
  const roles = new Map<string, { role: SessionRole; observedAt: number }>()

  // Session lifecycle facts: whether a session is a child (has parentID) and its parentID
  const sessionFacts = new Map<string, { isChild: boolean; parentID?: string; observedAt: number }>()

  function pruneExpired(): void {
    const cutoff = now() - ttlMs
    for (const [key, entry] of roles) {
      if (entry.observedAt < cutoff) {
        roles.delete(key)
      }
    }
    for (const [key, entry] of sessionFacts) {
      if (entry.observedAt < cutoff) {
        sessionFacts.delete(key)
      }
    }
  }

  function observe(event: unknown): void {
    if (event == null || typeof event !== "object") return
    pruneExpired()

    const e = event as Record<string, unknown>
    const eventType = typeof e.type === "string" ? e.type : ""

    // ── session.created / session.updated: cache lifecycle facts ────────
    if (eventType === "session.created" || eventType === "session.updated") {
      const sessionID = extractSessionID(e)
      if (!sessionID) return

      const props = e.properties
      if (props == null || typeof props !== "object") return
      const info = (props as Record<string, unknown>).info
      if (info == null || typeof info !== "object") return

      const i = info as Record<string, unknown>
      const parentID = i.parentID
      const isChild = typeof parentID === "string" && parentID !== ""

      sessionFacts.set(sessionID, { isChild, parentID: isChild ? parentID : undefined, observedAt: now() })

      // Child sessions are immediately classified as executor
      if (isChild) {
        roles.set(sessionID, { role: "executor", observedAt: now() })
      }
      return
    }

    // ── session.deleted: clear all cached state ────────────────────────
    if (eventType === "session.deleted") {
      const sessionID = extractSessionID(e)
      if (sessionID) {
        sessionFacts.delete(sessionID)
        roles.delete(sessionID)
      }
      return
    }

    // ── message.updated: upgrade root session to orchestrator ──────────
    if (eventType === "message.updated") {
      const sessionID = extractSessionID(e)
      if (!sessionID) return

      const props = e.properties
      if (props == null || typeof props !== "object") return
      const info = (props as Record<string, unknown>).info
      if (info == null || typeof info !== "object") return

      const i = info as Record<string, unknown>

      // Only assistant messages with mode === "primary" trigger upgrade
      if (i.role !== "assistant" || i.mode !== "primary") return

      // Only upgrade if we have lifecycle evidence showing this is a root session
      const facts = sessionFacts.get(sessionID)
      if (facts && !facts.isChild) {
        roles.set(sessionID, { role: "orchestrator", observedAt: now() })
      }
      return
    }
  }

  function getRole(sessionID: string): SessionRole {
    const entry = roles.get(sessionID)
    if (!entry) return "unknown"
    // Enforce TTL on the lookup path
    if (entry.observedAt < now() - ttlMs) {
      roles.delete(sessionID)
      return "unknown"
    }
    return entry.role
  }

  /**
   * Resolve the root ancestor session ID for a known session.
   *
   * Follows the parentID chain stored in sessionFacts. Returns undefined
   * if the session has never been observed, if its facts have been
   * TTL-expired or deleted, if any ancestor in the chain is missing,
   * or if a cycle is detected.
   */
  function getRootSessionID(sessionID: string): string | undefined {
    const facts = sessionFacts.get(sessionID)
    if (!facts) return undefined
    // Enforce TTL on the starting entry
    if (facts.observedAt < now() - ttlMs) {
      sessionFacts.delete(sessionID)
      return undefined
    }
    // If this is a root session (no parent), return itself
    if (!facts.isChild) return sessionID

    // Walk up the parent chain with cycle detection
    const visited = new Set<string>([sessionID])
    let current = facts.parentID
    const maxDepth = 100 // Bounded loop guard
    let depth = 0
    while (current) {
      if (visited.has(current)) return undefined // cycle detected
      if (++depth > maxDepth) return undefined // safety bound

      visited.add(current)
      const ancestorFacts = sessionFacts.get(current)
      if (!ancestorFacts) return undefined // unknown ancestor
      // Enforce TTL on ancestor
      if (ancestorFacts.observedAt < now() - ttlMs) {
        sessionFacts.delete(current)
        return undefined
      }
      if (!ancestorFacts.isChild) return current // found root
      current = ancestorFacts.parentID
    }
    return undefined // should not reach here, but safe fallback
  }

  function dispose(): void {
    roles.clear()
    sessionFacts.clear()
  }

  return { observe, getRole, getRootSessionID, extractSessionID, dispose }
}
