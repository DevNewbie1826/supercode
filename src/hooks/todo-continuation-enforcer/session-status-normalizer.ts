/**
 * Session-status idle normalization for the continuation enforcer.
 *
 * Re-exports the shared `extractSessionID` from session-role-resolver
 * to avoid duplicating the session ID extraction contract, and provides
 * the enforcer-specific `isSessionStatusIdle` helper.
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
