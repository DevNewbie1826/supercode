import { normalizeTodos, hasIncompleteTodo } from "../todo-state"
import { DEFAULT_COUNTDOWN_SECONDS, CONTINUATION_PROMPT } from "./constants"
import { extractSessionID, isSessionStatusIdle, extractIdleInfoId, extractIdlePropertiesSnakeSessionId } from "./session-status-normalizer"
import type { EnforcerCtx, EnforcerOptions, EnforcerEvent, TodoContinuationEnforcer, TimerSeam } from "./types"

/**
 * Create a continuation enforcer that re-prompts idle sessions
 * when incomplete TODO items remain.
 *
 * Behaviour:
 * - On `session.idle` events, schedule a countdown timer. When it fires,
 *   re-read TODOs and prompt if incomplete work exists.
 * - Zero-second countdown executes immediately without timer scheduling;
 *   nonzero countdown schedules via timer.
 * - On `session.status` events with `status.type === "idle"`, treat the same
 *   as `session.idle` (supports properties.info.id extraction).
 * - On `session.deleted`, cancel any pending timer for that session.
 * - Repeated idle events for the same session replace the previous timer.
 * - Timers are tracked per-session for multi-session isolation.
 * - No role gating — all sessions with incomplete TODOs are prompted
 *   (EasyCode parity).
 */
export function createTodoContinuationEnforcer(
  ctx: EnforcerCtx,
  options: EnforcerOptions,
): TodoContinuationEnforcer {
  const countdownSeconds = options.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS
  const timer: TimerSeam = options.timer ?? {
    setTimeout: (cb, ms) => globalThis.setTimeout(cb, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id as number),
  }

  // Per-session timer tracking: sessionID → timer ID
  const pendingTimers = new Map<string, unknown>()

  // Explicit in-flight tracking per session.
  // Each timer callback registers a mutable { cancelled } object in the set.
  // session.deleted / dispose() cancel ALL active entries for a session.
  const inflightSessions = new Map<string, Set<{ cancelled: boolean }>>()

  function clearSessionTimer(sessionID: string): void {
    const existing = pendingTimers.get(sessionID)
    if (existing !== undefined) {
      timer.clearTimeout(existing)
      pendingTimers.delete(sessionID)
    }
  }

  async function executePrompt(sessionID: string): Promise<void> {
    // Register explicit in-flight state
    const inflight = { cancelled: false }
    let set = inflightSessions.get(sessionID)
    if (!set) {
      set = new Set()
      inflightSessions.set(sessionID, set)
    }
    set.add(inflight)
    try {
      // Re-read TODOs at execution time (not at schedule time)
      const raw = await ctx.client.session.todo({ path: { id: sessionID } })
      // After the async gap — check if session was deleted while in-flight
      if (inflight.cancelled) {
        return
      }
      const todos = normalizeTodos(raw)

      if (hasIncompleteTodo(todos)) {
        await ctx.client.session.prompt({
          sessionID,
          text: CONTINUATION_PROMPT,
        })
      }
    } catch {
      // Swallow rejection — must not produce unhandled rejections.
    } finally {
      // Always remove this callback's inflight entry
      set!.delete(inflight)
      if (set!.size === 0) {
        inflightSessions.delete(sessionID)
      }
    }
  }

  async function schedulePrompt(sessionID: string): Promise<void> {
    // Replace any existing timer for this session
    clearSessionTimer(sessionID)

    // EasyCode parity: zero-second countdown executes immediately
    if (countdownSeconds <= 0) {
      await executePrompt(sessionID)
      return
    }

    const id = timer.setTimeout(async () => {
      // Remove from pending before executing (allows re-scheduling)
      pendingTimers.delete(sessionID)
      await executePrompt(sessionID)
    }, countdownSeconds * 1000)

    pendingTimers.set(sessionID, id)
  }

  async function handler(input: EnforcerEvent): Promise<void> {
    const event = input.event
    const eventType = typeof event.type === "string" ? event.type : ""

    // Handle session.deleted — cancel pending timer and suppress all in-flight callbacks
    if (eventType === "session.deleted") {
      const sessionID = extractSessionID(event)
      if (sessionID) {
        clearSessionTimer(sessionID)
        const set = inflightSessions.get(sessionID)
        if (set) {
          for (const entry of set) {
            entry.cancelled = true
          }
        }
      }
      return
    }

    // Determine if this is an idle-triggering event
    let sessionID: string | undefined
    let isIdle = false

    if (eventType === "session.idle") {
      isIdle = true
      sessionID = extractSessionID(event)
      // EasyCode parity: fall back to properties.session_id (snake_case) for session.idle
      if (!sessionID) {
        sessionID = extractIdlePropertiesSnakeSessionId(event)
      }
      // EasyCode parity: fall back to properties.info.id for session.idle when
      // higher-priority extraction paths yield nothing
      if (!sessionID) {
        sessionID = extractIdleInfoId(event)
      }
    } else if (eventType === "session.status") {
      if (isSessionStatusIdle(event)) {
        isIdle = true
        sessionID = extractSessionID(event)
      }
    }

    if (!isIdle || !sessionID) return

    await schedulePrompt(sessionID)
  }

  function dispose(): void {
    for (const id of pendingTimers.values()) {
      timer.clearTimeout(id)
    }
    pendingTimers.clear()
    // Cancel all in-flight callbacks so they bail out after their await gap
    for (const set of inflightSessions.values()) {
      for (const entry of set) {
        entry.cancelled = true
      }
    }
    inflightSessions.clear()
  }

  return { handler, dispose }
}
