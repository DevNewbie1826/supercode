import { describe, expect, it } from "bun:test"
import type { SessionRole } from "../hooks/session-role-resolver"
import { createSessionRoleResolver } from "../hooks/session-role-resolver"
import { CONTINUATION_PROMPT } from "../hooks/todo-continuation-enforcer/constants"
import { createTodoContinuationEnforcer } from "../hooks/todo-continuation-enforcer"

/**
 * Tests for idle continuation enforcement.
 *
 * Production surface under test:
 *   - createTodoContinuationEnforcer(ctx, options) → { handler }
 *   - options.getRole: (sessionID: string) => SessionRole
 *   - options.countdownSeconds?: number (default 120)
 *   - options.timer?: { setTimeout, clearTimeout } — deterministic seam
 *
 * Session ID contract (matches shared resolver rules + EasyCode parity):
 *   - Top-level `sessionID` and `session_id` are always valid.
 *   - `properties.sessionID` and `properties.session_id` are valid for
 *     session.idle / session.status events.
 *   - `properties.info.id` is valid as a session.idle fallback (EasyCode parity).
 *   - `properties.sessionID` is NOT an approved extraction path for
 *     non-session events.
 *   - `properties.info.id` is NOT valid for non-session-scoped events.
 *
 * Timer control contract:
 *   - The enforcer accepts an injected `timer` seam for deterministic testing.
 *   - Default countdown is 120 seconds when countdownSeconds is omitted.
 *   - `countdownSeconds: 0` executes immediately without timer scheduling.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fake timer system for deterministic timer control.
 *
 * Implements the `timer` contract the enforcer consumes plus test utilities
 * for asserting and advancing timer state without wall-clock waiting.
 * Records the delay and ID of each setTimeout call.
 */
function createFakeTimers() {
  const timers = new Map<number, () => void>()
  const clearedIds = new Set<number>()
  const scheduledDelays: Array<number> = []
  let nextId = 1
  let lastId: number | undefined

  return {
    setTimeout(cb: () => void, ms: number): number {
      const id = nextId++
      lastId = id
      scheduledDelays.push(ms)
      timers.set(id, cb)
      return id
    },

    clearTimeout(id: unknown): void {
      if (typeof id === "number") {
        clearedIds.add(id)
        timers.delete(id)
      }
    },

    /** Fire all non-cleared pending timers, awaiting any async results. */
    async firePending(): Promise<void> {
      const snapshot = [...timers.values()]
      timers.clear()
      for (const cb of snapshot) {
        await cb()
      }
    },

    /** Number of timers currently pending (not cleared, not yet fired). */
    pendingCount(): number {
      return timers.size
    },

    /** Whether clearTimeout was called for a given timer ID. */
    wasCleared(id: number): boolean {
      return clearedIds.has(id)
    },

    /** Delay in ms passed to the most recent setTimeout call. */
    lastScheduledDelayMs(): number | undefined {
      return scheduledDelays.length > 0
        ? scheduledDelays[scheduledDelays.length - 1]
        : undefined
    },

    /** Timer ID returned by the most recent setTimeout call. */
    lastScheduledId(): number | undefined {
      return lastId
    },
  }
}

/** Build a ctx stub shaped as { client: { session: { todo(), prompt() } } } */
function makeCtx(todos: Array<{ content: string; status: string }>) {
  const prompts: Array<{ sessionID: string; text: string }> = []
  const todoCalls: Array<{ path: { id: string } }> = []
  const ctx = {
    client: {
      session: {
        todo: (input: { path: { id: string } }) => {
          todoCalls.push(input)
          return Promise.resolve(todos)
        },
        prompt: (payload: { sessionID: string; text: string }) => {
          prompts.push(payload)
          return Promise.resolve()
        },
      },
    },
  }
  return { ctx, prompts, todos, todoCalls }
}

// ---------------------------------------------------------------------------
// 1. Direct session.idle — target roles
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — session.idle target prompting", () => {
  it("re-prompts an idle orchestrator session when incomplete todos remain", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Implement feature X", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-orch" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-orch")
  })

  it("re-prompts an idle executor session when incomplete todos remain", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Write tests", status: "in_progress" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "executor" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-exec" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-exec")
  })

  it("does not prompt when all todos are completed", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Done task", status: "completed" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-done" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("does not prompt when all todos are cancelled", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Cancelled task", status: "cancelled" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-cancel" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("does not prompt when todo list is empty", async () => {
    const { ctx, prompts } = makeCtx([])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-empty" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2. session.idle — approved session ID extraction paths
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — session.idle session ID extraction", () => {
  it("extracts sessionID from top-level sessionID field", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-top" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-top")
  })

  it("extracts sessionID from top-level session_id field", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", session_id: "ses-snake" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-snake")
  })

  it("extracts sessionID from properties.info.id for session.idle (EasyCode parity)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.idle",
        properties: { info: { id: "ses-info-fallback" } },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-info-fallback")
  })

  it("extracts sessionID from properties.sessionID for session.idle", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.idle",
        properties: { sessionID: "ses-props-sid" },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-props-sid")
  })

  it("extracts sessionID from properties.session_id for session.idle (EasyCode parity)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.idle",
        properties: { session_id: "ses-props-snake" },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-props-snake")
  })
})

// ---------------------------------------------------------------------------
// 3. Role targeting — all roles prompt (EasyCode parity)
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — role targeting", () => {
  it("re-prompts 'other' role sessions (EasyCode parity — no role gate)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "other" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-other" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-other")
  })

  it("now re-prompts 'unknown' role sessions (EasyCode parity)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "unknown" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-unknown" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-unknown")
  })
})

// ---------------------------------------------------------------------------
// 3b. EasyCode parity — unknown role continuation
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — EasyCode parity unknown role continuation", () => {
  it("re-prompts idle unknown-role session when incomplete todos remain", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work for unknown session", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "unknown" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-unknown-parity" },
    })
    await fake.firePending()

    // EasyCode parity: unknown/unclassified sessions should receive continuation prompts
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-unknown-parity")
  })

  it("'other' role also prompts (EasyCode parity — no role gate)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work for other session", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "other" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-other-parity" },
    })
    await fake.firePending()

    // EasyCode parity: no role gate — 'other' also receives continuation prompts
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-other-parity")
  })
})

// ---------------------------------------------------------------------------
// 4. Normalized session.status idle events (via enforcer)
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — session.status idle normalization", () => {
  it("re-prompts on session.status with status.type === 'idle' for orchestrator via top-level sessionID", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.status",
        sessionID: "ses-status-idle",
        properties: { status: { type: "idle" } },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-status-idle")
  })

  it("re-prompts on session.status idle using properties.sessionID when top-level IDs absent", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.status",
        properties: {
          sessionID: "ses-status-props",
          status: { type: "idle" },
        },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-status-props")
  })

  it("ignores session.status with non-idle status type", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.status",
        sessionID: "ses-status-active",
        properties: { status: { type: "active" } },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("prompts on session.status idle for 'other' role (EasyCode parity — no role gate)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "other" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.status",
        sessionID: "ses-status-other",
        properties: { status: { type: "idle" } },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-status-other")
  })

  it("prompts on session.status idle for unknown role (EasyCode parity)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "unknown" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: {
        type: "session.status",
        sessionID: "ses-status-unknown",
        properties: { status: { type: "idle" } },
      },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-status-unknown")
  })
})

// ---------------------------------------------------------------------------
// 5. Nonzero countdown does not prompt immediately
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — nonzero countdown does not prompt immediately", () => {
  it("schedules a timer but does not prompt until the timer fires", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-nonzero" },
    })

    expect(fake.pendingCount()).toBe(1)
    expect(prompts).toHaveLength(0)

    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-nonzero")
  })
})

// ---------------------------------------------------------------------------
// 6. Default countdown (120s) when countdownSeconds is omitted
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — default countdown", () => {
  it("defaults to 120-second countdown when countdownSeconds is omitted", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-default-cd" },
    })

    expect(fake.pendingCount()).toBe(1)
    expect(fake.lastScheduledDelayMs()).toBe(120 * 1000)
    expect(prompts).toHaveLength(0)

    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-default-cd")
  })
})

// ---------------------------------------------------------------------------
// 7. Custom countdown passes correct delay to timer
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — countdown delay", () => {
  it("passes countdownSeconds * 1000 as the timer delay", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 30,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-custom-cd" },
    })

    expect(fake.lastScheduledDelayMs()).toBe(30 * 1000)
    expect(prompts).toHaveLength(0)

    await fake.firePending()

    expect(prompts).toHaveLength(1)
  })

  it("zero-second countdown executes immediately without scheduling a timer", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-zero-cd" },
    })

    // Zero-second: no timer scheduled, prompt sent immediately
    expect(fake.lastScheduledDelayMs()).toBeUndefined()
    expect(fake.pendingCount()).toBe(0)
    expect(prompts).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 7b. EasyCode parity — zero-second countdown executes immediately
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — EasyCode parity zero-second immediate execution", () => {
  it("zero-second countdown executes immediately without timer tick", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-zero-immediate" },
    })

    // EasyCode parity: zero-second countdown executes immediately —
    // no need to advance timers or call firePending()
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-zero-immediate")
    // No timer was scheduled
    expect(fake.pendingCount()).toBe(0)
  })

  it("nonzero countdown still schedules via timer (no regression)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 5,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-nonzero-reg" },
    })

    // Nonzero countdown still schedules via timer — NOT immediate
    expect(prompts).toHaveLength(0)
    expect(fake.pendingCount()).toBe(1)
    expect(fake.lastScheduledDelayMs()).toBe(5000)

    await fake.firePending()

    expect(prompts).toHaveLength(1)
  })
})

describe("TodoContinuationEnforcer — timer replacement", () => {
  it("repeated idle events produce exactly one prompt (first timer is replaced, not accumulated)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-replace" },
    })
    expect(fake.pendingCount()).toBe(1)
    const firstTimer = fake.lastScheduledId()

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-replace" },
    })

    expect(fake.wasCleared(firstTimer!)).toBe(true)
    expect(fake.pendingCount()).toBe(1)

    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-replace")
  })
})

// ---------------------------------------------------------------------------
// 9. session.deleted cancels pending timer before it fires
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — session.deleted cancels pending timer", () => {
  it("cancels timer via top-level sessionID before countdown fires", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-top" },
    })
    expect(fake.pendingCount()).toBe(1)
    const timer = fake.lastScheduledId()

    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-del-top" },
    })

    expect(fake.pendingCount()).toBe(0)
    expect(fake.wasCleared(timer!)).toBe(true)
    await fake.firePending()
    expect(prompts).toHaveLength(0)
  })

  it("cancels timer via top-level session_id before countdown fires", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-snake" },
    })
    expect(fake.pendingCount()).toBe(1)

    await enforcer.handler({
      event: { type: "session.deleted", session_id: "ses-del-snake" },
    })

    expect(fake.pendingCount()).toBe(0)
    await fake.firePending()
    expect(prompts).toHaveLength(0)
  })

  it("cancels timer via properties.info.id (session-scoped fallback for session.deleted)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-info" },
    })
    expect(fake.pendingCount()).toBe(1)

    await enforcer.handler({
      event: {
        type: "session.deleted",
        properties: { info: { id: "ses-del-info" } },
      },
    })

    expect(fake.pendingCount()).toBe(0)
    await fake.firePending()
    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Non-session-scoped event with properties.info.id does NOT cancel timer
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — non-session-scoped event does not cancel timer", () => {
  it("a message.updated event with properties.info.id does NOT cancel a pending timer", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-neg" },
    })
    expect(fake.pendingCount()).toBe(1)
    const timer = fake.lastScheduledId()

    await enforcer.handler({
      event: {
        type: "message.updated",
        properties: { info: { id: "ses-neg" } },
      },
    })

    expect(fake.pendingCount()).toBe(1)
    expect(fake.wasCleared(timer!)).toBe(false)

    await fake.firePending()
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-neg")
  })
})

// ---------------------------------------------------------------------------
// 11. Timer bookkeeping cleared after fire — allows re-scheduling
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — timer bookkeeping after fire", () => {
  it("allows re-scheduling after a timer fires and prompts", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-resched" },
    })
    // Zero-second: immediate execution, no firePending needed
    expect(prompts).toHaveLength(1)
    expect(fake.pendingCount()).toBe(0)

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-resched" },
    })
    // Second idle also executes immediately
    expect(prompts).toHaveLength(2)
    expect(prompts[1]!.sessionID).toBe("ses-resched")
  })
})

// ---------------------------------------------------------------------------
// 12. TODOs re-read when the timer fires
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — TODOs re-read at fire time", () => {
  it("does not prompt when todos were incomplete at schedule time but completed before fire", async () => {
    const todos = [{ content: "Work", status: "pending" }]
    const { ctx, prompts } = makeCtx(todos)
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // Schedule timer while todos are incomplete
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-reread" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Complete the todos before the timer fires
    todos[0]!.status = "completed"

    // Fire the timer — enforcer must re-read TODOs at fire time
    await fake.firePending()

    // No prompt because todos are now complete
    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 13. Multi-session timer isolation
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — multi-session timer isolation", () => {
  it("two different sessions each schedule independent timers", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-iso-a" },
    })
    expect(fake.pendingCount()).toBe(1)

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-iso-b" },
    })
    expect(fake.pendingCount()).toBe(2)

    await fake.firePending()
    expect(prompts).toHaveLength(2)
    expect(prompts.map((p) => p.sessionID).sort()).toEqual(["ses-iso-a", "ses-iso-b"])
  })

  it("deleting one session does not cancel another session's timer", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-iso-a" },
    })
    const timerA = fake.lastScheduledId()

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-iso-b" },
    })
    const timerB = fake.lastScheduledId()
    expect(fake.pendingCount()).toBe(2)

    // Delete session A — only A's timer should be cancelled
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-del-iso-a" },
    })

    expect(fake.pendingCount()).toBe(1)
    expect(fake.wasCleared(timerA!)).toBe(true)
    expect(fake.wasCleared(timerB!)).toBe(false)

    await fake.firePending()
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-del-iso-b")
  })

  it("repeated idle on one session does not replace another session's timer", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-rep-iso-a" },
    })
    const timerA = fake.lastScheduledId()

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-rep-iso-b" },
    })
    const timerB = fake.lastScheduledId()
    expect(fake.pendingCount()).toBe(2)

    // Session A goes idle again — replaces only A's timer
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-rep-iso-a" },
    })
    const timerA2 = fake.lastScheduledId()

    expect(fake.wasCleared(timerA!)).toBe(true)
    expect(fake.wasCleared(timerB!)).toBe(false)
    expect(fake.pendingCount()).toBe(2)

    await fake.firePending()
    expect(prompts).toHaveLength(2)
    expect(prompts.map((p) => p.sessionID).sort()).toEqual(["ses-rep-iso-a", "ses-rep-iso-b"])
  })
})

// ---------------------------------------------------------------------------
// 14. Prompt content — non-empty continuation text
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — prompt content", () => {
  it("sends a non-empty continuation prompt", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Incomplete task", status: "in_progress" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "executor" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-prompt" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-prompt")
    expect(typeof prompts[0]!.text).toBe("string")
    expect(prompts[0]!.text.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 15. Mixed todo states — only prompts when truly incomplete
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — mixed todo states", () => {
  it("prompts when at least one incomplete todo remains among completed ones", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Done task", status: "completed" },
      { content: "Still pending", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-mixed" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
  })

  it("does not prompt when all todos are completed or cancelled", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Done task", status: "completed" },
      { content: "Cancelled task", status: "cancelled" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-all-done" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 16. Session-scoped TODO call shape
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — session-scoped TODO call shape", () => {
  it("calls todo with { path: { id: sessionID } } immediately for zero-second countdown", async () => {
    const { ctx, prompts, todoCalls } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-call-shape" },
    })
    // Zero-second: todo called immediately during handler execution
    expect(prompts).toHaveLength(1)
    expect(todoCalls).toHaveLength(1)
    expect(todoCalls[0]).toEqual({ path: { id: "ses-call-shape" } })
  })
})

// ---------------------------------------------------------------------------
// 17. Error resilience — todo() and prompt() rejections are swallowed
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — error resilience", () => {
  it("swallows a todo() rejection without unhandled rejection and does not prompt", async () => {
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (_input: { path: { id: string } }) =>
            Promise.reject(new Error("todo API failed")),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-todo-err" },
    })

    // firePending completes without throwing — rejection is swallowed
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("swallows a prompt() rejection without unhandled rejection", async () => {
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (_input: { path: { id: string } }) =>
            Promise.resolve([{ content: "Work", status: "pending" }]),
          prompt: (_payload: { sessionID: string; text: string }) => {
            prompts.push(_payload)
            return Promise.reject(new Error("prompt API failed"))
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-prompt-err" },
    })

    // firePending completes without throwing — rejection is swallowed
    await fake.firePending()

    // prompt was attempted (recorded before the rejection)
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-prompt-err")
  })
})

// ---------------------------------------------------------------------------
// 18. Deletion-during-inflight — session.deleted suppresses in-flight prompt
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — deletion during inflight continuation", () => {
  it("session.deleted arriving while todo() is in-flight suppresses the prompt", async () => {
    let resolveTodo!: (value: unknown) => void
    const todoDeferred = new Promise<unknown>((resolve) => {
      resolveTodo = resolve
    })
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (_input: { path: { id: string } }) => todoDeferred,
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 1,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-race" },
    })

    // Fire timer — callback starts, suspends on await todo()
    const fireResult = fake.firePending()

    // While todo() is still pending, send session.deleted
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-race" },
    })

    // Now resolve todo with incomplete items
    resolveTodo([{ content: "Work", status: "pending" }])

    // Await fire completion
    await fireResult

    // No prompt because session was deleted during in-flight continuation
    expect(prompts).toHaveLength(0)
  })

  it("session.deleted before timer fires still cancels the timer (no regression)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 120,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-del-regression" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Delete before timer fires
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-del-regression" },
    })
    expect(fake.pendingCount()).toBe(0)

    await fake.firePending()
    expect(prompts).toHaveLength(0)
  })

  it("delete-before-fire does not suppress a later valid idle for the same session ID", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 1,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // First idle → schedule timer
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-reuse" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Delete before timer fires
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-reuse" },
    })
    expect(fake.pendingCount()).toBe(0)

    // Later, same session ID goes idle again
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-reuse" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Timer fires — prompt should succeed, no stale suppression
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("ses-reuse")
  })
})

// ---------------------------------------------------------------------------
// 19. Explicit inflight tracking — no stale markers after callback completes
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — explicit inflight tracking", () => {
  it("session.deleted after callback already completed does not poison future idle cycles", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Pending work", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // First cycle: idle → timer fires → prompt sent
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-stale" },
    })
    await fake.firePending()
    expect(prompts).toHaveLength(1)

    // session.deleted arrives after callback has already completed
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-stale" },
    })

    // Later, same session ID goes idle again — must NOT be suppressed
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-stale" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(2)
    expect(prompts[1]!.sessionID).toBe("ses-stale")
  })

  it("delete during inflight + pending timer suppresses inflight and cancels pending", async () => {
    let resolveTodo!: (value: unknown) => void
    const todoDeferred = new Promise<unknown>((resolve) => {
      resolveTodo = resolve
    })
    const todoCalls: Array<string> = []
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (input: { path: { id: string } }) => {
            todoCalls.push(input.path.id)
            return todoDeferred
          },
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 1,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // First idle → timer scheduled
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-dual" },
    })

    // Fire timer — callback starts, suspends on await todo()
    const fireResult = fake.firePending()

    // While todo() is in-flight, a new idle schedules a second timer
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-dual" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Now delete — should suppress inflight AND cancel the pending timer
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-dual" },
    })
    expect(fake.pendingCount()).toBe(0)

    // Resolve the deferred todo
    resolveTodo([{ content: "Work", status: "pending" }])
    await fireResult

    // No prompt — inflight was suppressed, pending timer was cancelled
    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 20. Multi-slot inflight — overlapping same-session in-flight callbacks
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — overlapping same-session inflight callbacks", () => {
  it("session.deleted cancels both of two overlapping inflight callbacks", async () => {
    let resolveTodo1!: (value: unknown) => void
    const todoDeferred1 = new Promise<unknown>((resolve) => {
      resolveTodo1 = resolve
    })
    let resolveTodo2!: (value: unknown) => void
    const todoDeferred2 = new Promise<unknown>((resolve) => {
      resolveTodo2 = resolve
    })
    let todoCallIndex = 0
    const todoDeferrals = [todoDeferred1, todoDeferred2]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (_input: { path: { id: string } }) => {
            const deferred = todoDeferrals[todoCallIndex]
            todoCallIndex++
            return deferred
          },
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 1,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // First idle → schedule first timer
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-multi" },
    })

    // Fire first timer — callback 1 starts, suspends on await todo()
    const fire1 = fake.firePending()

    // Second idle while callback 1 is in-flight → schedule second timer
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-multi" },
    })

    // Fire second timer — callback 2 starts, suspends on await todo()
    const fire2 = fake.firePending()

    // Both callbacks are now in-flight for the same session.
    // Send session.deleted — must cancel both.
    await enforcer.handler({
      event: { type: "session.deleted", sessionID: "ses-multi" },
    })

    // Resolve both deferreds with incomplete todos
    resolveTodo1([{ content: "Work 1", status: "pending" }])
    resolveTodo2([{ content: "Work 2", status: "pending" }])

    await Promise.all([fire1, fire2])

    // Neither callback should have prompted
    expect(prompts).toHaveLength(0)
  })

  it("dispose() cancels overlapping inflight callbacks for the same session", async () => {
    let resolveTodo1!: (value: unknown) => void
    const todoDeferred1 = new Promise<unknown>((resolve) => {
      resolveTodo1 = resolve
    })
    let resolveTodo2!: (value: unknown) => void
    const todoDeferred2 = new Promise<unknown>((resolve) => {
      resolveTodo2 = resolve
    })
    let todoCallIndex = 0
    const todoDeferrals = [todoDeferred1, todoDeferred2]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: (_input: { path: { id: string } }) => {
            const deferred = todoDeferrals[todoCallIndex]
            todoCallIndex++
            return deferred
          },
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 1,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // First idle → timer 1
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-disp" },
    })
    const fire1 = fake.firePending()

    // Second idle while callback 1 in-flight → timer 2
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-disp" },
    })
    const fire2 = fake.firePending()

    // Dispose while both callbacks are in-flight
    enforcer.dispose()

    // Resolve both deferreds
    resolveTodo1([{ content: "Work 1", status: "pending" }])
    resolveTodo2([{ content: "Work 2", status: "pending" }])

    await Promise.all([fire1, fire2])

    // Neither callback should have prompted
    expect(prompts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 21. Continuation targeting with real session-role-resolver
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — real resolver integration", () => {
  /** Build a realistic session.created event. */
  function sessionCreated(sessionID: string, overrides?: { parentID?: string }) {
    return {
      type: "session.created" as const,
      properties: {
        info: {
          id: sessionID,
          projectID: "proj-test",
          directory: "/test",
          title: "Test",
          version: "1",
          parentID: overrides?.parentID,
          time: { created: 1000, updated: 1000 },
        },
      },
    }
  }

  /** Build a realistic assistant message.updated event. */
  function assistantMessageUpdated(sessionID: string, mode: string) {
    return {
      type: "message.updated" as const,
      properties: {
        info: {
          id: `msg-${sessionID}`,
          sessionID,
          role: "assistant" as const,
          parentID: "",
          modelID: "m",
          providerID: "p",
          mode,
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 1000 },
        },
      },
    }
  }

  it("continuation prompts seeded orchestrator session", async () => {
    const resolver = createSessionRoleResolver()
    // Seed orchestrator
    resolver.observe(sessionCreated("sess-cont-orch"))
    resolver.observe(assistantMessageUpdated("sess-cont-orch", "primary"))

    const prompts: Array<{ sessionID: string; text: string }> = []
    const fake = createFakeTimers()
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve([{ content: "Work", status: "pending" }]),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: (id) => resolver.getRole(id),
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "sess-cont-orch" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("sess-cont-orch")
  })

  it("continuation prompts seeded executor session", async () => {
    const resolver = createSessionRoleResolver()
    resolver.observe(sessionCreated("sess-cont-exec", { parentID: "parent" }))

    const prompts: Array<{ sessionID: string; text: string }> = []
    const fake = createFakeTimers()
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve([{ content: "Work", status: "pending" }]),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: (id) => resolver.getRole(id),
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "sess-cont-exec" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("sess-cont-exec")
  })

  it("continuation prompts unseeded (unknown) session (EasyCode parity)", async () => {
    const resolver = createSessionRoleResolver()
    // No seeding — session stays unknown

    const prompts: Array<{ sessionID: string; text: string }> = []
    const fake = createFakeTimers()
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve([{ content: "Work", status: "pending" }]),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: (id) => resolver.getRole(id),
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "sess-cont-unknown" },
    })
    await fake.firePending()

    // Unknown sessions now prompt (EasyCode parity)
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.sessionID).toBe("sess-cont-unknown")
  })
})

// ---------------------------------------------------------------------------
// 22. Dynamic continuation prompt — remaining-task section content
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — dynamic remaining-task prompt content", () => {
  it("appends Remaining tasks section listing only pending and in_progress items in order", async () => {
    const todos = [
      { content: "Task A", status: "completed" },
      { content: "Task B", status: "pending" },
      { content: "Task C", status: "cancelled" },
      { content: "Task D", status: "in_progress" },
    ]
    const { ctx, prompts } = makeCtx(todos)
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-dynamic-mixed" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] Task B\n" +
      "- [in_progress] Task D"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("appends single remaining task for one pending item", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Write tests", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "executor" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-dynamic-single" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] Write tests"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("appends all incomplete items when all todos are incomplete", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Task 1", status: "pending" },
      { content: "Task 2", status: "in_progress" },
      { content: "Task 3", status: "pending" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-dynamic-all-inc" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] Task 1\n" +
      "- [in_progress] Task 2\n" +
      "- [pending] Task 3"

    expect(prompts[0]!.text).toBe(expectedText)
  })
})

// ---------------------------------------------------------------------------
// 23. Execution-time freshness — remaining tasks reflect mutated TODO state
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — execution-time freshness of remaining tasks", () => {
  it("prompt reflects execution-time mutated state, not schedule-time state", async () => {
    const todos = [
      { content: "Task X", status: "pending" },
      { content: "Task Y", status: "in_progress" },
    ]
    const { ctx, prompts } = makeCtx(todos)
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 5,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    // Schedule with original incomplete state
    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-freshness" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Mutate backing todos BEFORE timer fires:
    // Task X gets completed, Task Y content changes, Task Z is added as pending
    todos[0]!.status = "completed"
    todos[1]!.content = "Task Y (updated)"
    todos[1]!.status = "pending"
    todos.push({ content: "Task Z", status: "in_progress" })

    // Fire the timer — prompt must reflect the execution-time state
    await fake.firePending()

    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] Task Y (updated)\n" +
      "- [in_progress] Task Z"

    expect(prompts[0]!.text).toBe(expectedText)
  })
})

// ---------------------------------------------------------------------------
// 24. Malformed / unexpected TODO values — graceful coercion
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — malformed/unexpected TODO values", () => {
  it("handles missing status gracefully and sends prompt with coerced bullet text", async () => {
    const todos: Array<Record<string, unknown>> = [
      { content: "Task without status" },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-malformed-status" },
    })
    await fake.firePending()

    // Item with missing status is incomplete (not "completed" or "cancelled")
    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [undefined] Task without status"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("handles missing content gracefully and sends prompt with coerced bullet text", async () => {
    const todos: Array<Record<string, unknown>> = [
      { status: "pending" },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-malformed-content" },
    })
    await fake.firePending()

    // Item with missing content is still incomplete
    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] undefined"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("handles non-string status and content without crashing", async () => {
    const todos: Array<Record<string, unknown>> = [
      { content: 123, status: null },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-malformed-nonstring" },
    })
    await fake.firePending()

    // null status is not "completed" or "cancelled", so item is incomplete
    expect(prompts).toHaveLength(1)

    // Coerced bullet text uses String() equivalents
    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [null] 123"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("handles Symbol status and content without crashing (template interpolation would throw)", async () => {
    const symStatus = Symbol("pending")
    const symContent = Symbol("task-name")
    const todos: Array<Record<string, unknown>> = [
      { content: symContent, status: symStatus },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-malformed-symbol" },
    })
    await fake.firePending()

    // Symbol status is not "completed" or "cancelled", so item is incomplete.
    // Must NOT crash or be swallowed by the catch block.
    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      `- [Symbol(pending)] Symbol(task-name)`

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("handles hostile objects with throwing coercion without crashing", async () => {
    // Object whose toString / valueOf / [Symbol.toPrimitive] throws
    const hostile = {
      get [Symbol.toPrimitive]() {
        throw new Error("hostile coercion")
      },
      toString() {
        throw new Error("hostile toString")
      },
      valueOf() {
        throw new Error("hostile valueOf")
      },
    }
    const todos: Array<Record<string, unknown>> = [
      { content: hostile, status: hostile },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-hostile-coerce" },
    })
    await fake.firePending()

    // Hostile object status is not "completed" or "cancelled", so item is incomplete.
    // Must NOT crash; prompt is still sent with fallback text.
    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [[unrepresentable]] [unrepresentable]"

    expect(prompts[0]!.text).toBe(expectedText)
  })

  it("mixed malformed and well-formed items lists only incomplete ones with deterministic coercion", async () => {
    const todos: Array<Record<string, unknown>> = [
      { content: "Done task", status: "completed" },
      { content: undefined, status: "pending" },
      { content: "Cancelled task", status: "cancelled" },
      { content: "Normal task", status: "in_progress" },
    ]
    const prompts: Array<{ sessionID: string; text: string }> = []
    const ctx = {
      client: {
        session: {
          todo: () => Promise.resolve(todos),
          prompt: (payload: { sessionID: string; text: string }) => {
            prompts.push(payload)
            return Promise.resolve()
          },
        },
      },
    }
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-malformed-mixed" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(1)

    const expectedText =
      CONTINUATION_PROMPT +
      "\n\nRemaining tasks:\n" +
      "- [pending] undefined\n" +
      "- [in_progress] Normal task"

    expect(prompts[0]!.text).toBe(expectedText)
  })
})

// ---------------------------------------------------------------------------
// 25. No-prompt terminal behavior — dynamic prompt confirms no prompt sent
// ---------------------------------------------------------------------------

describe("TodoContinuationEnforcer — no-prompt when all todos terminal", () => {
  it("sends no prompt when all todos are completed at execution time (dynamic section would be empty)", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Done A", status: "completed" },
      { content: "Done B", status: "completed" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-all-completed-dynamic" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("sends no prompt when all todos are a mix of completed and cancelled at execution time", async () => {
    const { ctx, prompts } = makeCtx([
      { content: "Done A", status: "completed" },
      { content: "Cancelled B", status: "cancelled" },
      { content: "Done C", status: "completed" },
    ])
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 0,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-mix-terminal-dynamic" },
    })
    await fake.firePending()

    expect(prompts).toHaveLength(0)
  })

  it("sends no prompt when todos transition from incomplete to all-completed before timer fires", async () => {
    const todos = [
      { content: "Task 1", status: "pending" },
      { content: "Task 2", status: "in_progress" },
    ]
    const { ctx, prompts } = makeCtx(todos)
    const fake = createFakeTimers()

    const enforcer = createTodoContinuationEnforcer(ctx, {
      countdownSeconds: 10,
      getRole: () => "orchestrator" as SessionRole,
      timer: fake,
    })

    await enforcer.handler({
      event: { type: "session.idle", sessionID: "ses-terminal-transition" },
    })
    expect(fake.pendingCount()).toBe(1)

    // Complete all todos before timer fires
    todos[0]!.status = "completed"
    todos[1]!.status = "completed"

    await fake.firePending()

    // No prompt because no incomplete todos remain at execution time
    expect(prompts).toHaveLength(0)
  })
})
