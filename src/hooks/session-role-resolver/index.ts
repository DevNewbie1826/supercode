import type { SessionRole } from "./types"

export type { SessionRole } from "./types"

export interface SessionRoleResolver {
  observe(event: unknown): void
  getRole(sessionID: string): SessionRole
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
 * 3. `properties.info.id` — valid ONLY for session-scoped event types
 *    (session.deleted, session.status)
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
  // 3. properties.info.id — only for session-scoped event types
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

/** Event types where properties.info.id is a valid session identifier. */
export const SESSION_SCOPED_EVENT_TYPES = new Set(["session.deleted", "session.status"])

export function createSessionRoleResolver(
  options?: SessionRoleResolverOptions,
): SessionRoleResolver {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const now = options?.now ?? Date.now
  const roles = new Map<string, { role: SessionRole; observedAt: number }>()

  function classifyRole(event: unknown): SessionRole | undefined {
    if (event == null || typeof event !== "object") return undefined
    const e = event as Record<string, unknown>
    const props = e.properties
    if (props == null || typeof props !== "object") return undefined

    const info = (props as Record<string, unknown>).info
    if (info == null || typeof info !== "object") return undefined

    const i = info as Record<string, unknown>
    const agent = i.agent
    const mode = i.mode

    // Positive classification from agent — direct target matches
    if (typeof agent === "string") {
      if (agent === "orchestrator") return "orchestrator"
      if (agent === "executor") return "executor"
    }

    // Positive classification from mode — overrides non-target agent
    if (typeof mode === "string") {
      if (mode === "main" || mode === "primary") return "orchestrator"
    }

    // Either agent or mode was present but neither matched a target
    if (typeof agent === "string" || typeof mode === "string") {
      return "other"
    }

    // No positive identification data
    return undefined
  }

  function pruneExpired(): void {
    const cutoff = now() - ttlMs
    for (const [key, entry] of roles) {
      if (entry.observedAt < cutoff) {
        roles.delete(key)
      }
    }
  }

  function observe(event: unknown): void {
    pruneExpired()

    const sessionID = extractSessionID(event)
    if (!sessionID) return

    const role = classifyRole(event)
    if (role) {
      roles.set(sessionID, { role, observedAt: now() })
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

  function dispose(): void {
    roles.clear()
  }

  return { observe, getRole, extractSessionID, dispose }
}
