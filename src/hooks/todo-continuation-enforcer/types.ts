import type { SessionRole } from "../session-role-resolver"

/**
 * Timer seam for deterministic testing.
 *
 * Matches the built-in setTimeout/clearTimeout contract but allows
 * injection of a fake for test control.
 */
export interface TimerSeam {
  setTimeout(cb: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

/**
 * Context passed to the continuation enforcer.
 *
 * Provides access to the TODO API and the prompt API.
 */
export interface EnforcerCtx {
  client: {
    session: {
      todo: (input: { path: { id: string } }) => Promise<unknown>
      prompt: (payload: { sessionID: string; text: string }) => Promise<void>
    }
  }
}

/**
 * Options for creating the continuation enforcer.
 */
export interface EnforcerOptions {
  /** Resolve the role of a session by ID. */
  getRole: (sessionID: string) => SessionRole
  /** Countdown in seconds before prompting. Defaults to 120. */
  countdownSeconds?: number
  /** Deterministic timer seam. Defaults to global setTimeout/clearTimeout. */
  timer?: TimerSeam
}

/**
 * Event shape received by the enforcer handler.
 */
export interface EnforcerEvent {
  event: Record<string, unknown>
}

/**
 * The enforcer instance returned by the factory.
 */
export interface TodoContinuationEnforcer {
  handler: (input: EnforcerEvent) => Promise<void>
  dispose: () => void
}
