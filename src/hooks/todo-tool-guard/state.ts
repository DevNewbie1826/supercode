import { STALE_REMINDER_INTERVAL, DEFAULT_STATE_TTL_MS } from "./constants"

export interface SessionState {
  staleCount: number
  lastSnapshot: string
}

interface SessionStateEntry {
  state: SessionState
  observedAt: number
}

export interface GuardStateOptions {
  ttlMs?: number
  now?: () => number
}

export interface GuardState {
  getState(sessionID: string): SessionState
  incrementStale(sessionID: string): number
  resetStale(sessionID: string, snapshot: string): void
  getStaleCount(sessionID: string): number
  getLastSnapshot(sessionID: string): string
  shouldTriggerReminder(sessionID: string): boolean
}

export function createGuardState(options?: GuardStateOptions) {
  const ttlMs = options?.ttlMs ?? DEFAULT_STATE_TTL_MS
  const now = options?.now ?? Date.now
  const sessions = new Map<string, SessionStateEntry>()

  function pruneExpired(): void {
    const cutoff = now() - ttlMs
    for (const [key, entry] of sessions) {
      if (entry.observedAt < cutoff) {
        sessions.delete(key)
      }
    }
  }

  function getState(sessionID: string): SessionState {
    pruneExpired()
    let entry = sessions.get(sessionID)
    if (!entry) {
      entry = { state: { staleCount: 0, lastSnapshot: "" }, observedAt: now() }
      sessions.set(sessionID, entry)
    }
    entry.observedAt = now()
    return entry.state
  }

  function incrementStale(sessionID: string): number {
    const state = getState(sessionID)
    state.staleCount += 1
    return state.staleCount
  }

  function resetStale(sessionID: string, snapshot: string): void {
    const state = getState(sessionID)
    state.staleCount = 0
    state.lastSnapshot = snapshot
  }

  function getStaleCount(sessionID: string): number {
    return getState(sessionID).staleCount
  }

  function getLastSnapshot(sessionID: string): string {
    return getState(sessionID).lastSnapshot
  }

  function shouldTriggerReminder(sessionID: string): boolean {
    return getStaleCount(sessionID) >= STALE_REMINDER_INTERVAL
  }

  return { getState, incrementStale, resetStale, getStaleCount, getLastSnapshot, shouldTriggerReminder }
}
