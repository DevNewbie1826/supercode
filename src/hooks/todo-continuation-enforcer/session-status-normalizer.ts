/**
 * Session-status idle normalization for the continuation enforcer.
 *
 * Re-exports the shared `extractSessionID` from session-role-resolver
 * to avoid duplicating the session ID extraction contract, and provides
 * the enforcer-specific `isSessionStatusIdle` helper and the
 * `extractIdleInfoId` fallback for session.idle EasyCode parity.
 */

export { extractSessionID } from "../session-role-resolver"

/**
 * Check whether a session.status event reports an idle state.
 *
 * Returns true only when event.type === "session.status" and
 * properties.status.type === "idle".
 */
export function isSessionStatusIdle(event: unknown): boolean {
  if (event == null || typeof event !== "object") return false
  const e = event as Record<string, unknown>
  if (e.type !== "session.status") return false

  const props = e.properties
  if (props == null || typeof props !== "object") return false
  const status = (props as Record<string, unknown>).status
  if (status == null || typeof status !== "object") return false
  return (status as Record<string, unknown>).type === "idle"
}

/**
 * Extract session ID from properties.session_id (snake_case) for session.idle events.
 *
 * EasyCode parity: EasyCode's getSessionIDFromProperties checks both
 * properties.sessionID and properties.session_id. This function provides
 * the snake_case fallback specifically for session.idle events.
 */
export function extractIdlePropertiesSnakeSessionId(event: unknown): string | undefined {
  if (event == null || typeof event !== "object") return undefined
  const e = event as Record<string, unknown>
  if (e.type !== "session.idle") return undefined

  const props = e.properties
  if (props == null || typeof props !== "object") return undefined
  const sid = (props as Record<string, unknown>).session_id
  return typeof sid === "string" ? sid : undefined
}

/**
 * Extract session ID from properties.info.id for session.idle events.
 *
 * EasyCode parity fallback: when the shared extractSessionID function
 * cannot find a session ID through its approved paths, this function
 * checks properties.info.id specifically for session.idle events.
 */
export function extractIdleInfoId(event: unknown): string | undefined {
  if (event == null || typeof event !== "object") return undefined
  const e = event as Record<string, unknown>
  if (e.type !== "session.idle") return undefined

  const props = e.properties
  if (props == null || typeof props !== "object") return undefined
  const info = (props as Record<string, unknown>).info
  if (info == null || typeof info !== "object") return undefined
  const id = (info as Record<string, unknown>).id
  return typeof id === "string" ? id : undefined
}
