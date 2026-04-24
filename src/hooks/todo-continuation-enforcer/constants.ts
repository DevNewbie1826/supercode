/**
 * Continuation enforcer constants.
 */

/** Default countdown before prompting an idle session (seconds). */
export const DEFAULT_COUNTDOWN_SECONDS = 120

/** Target roles that should be continuation-prompted. */
export const TARGET_ROLES: ReadonlySet<string> = new Set(["orchestrator", "executor"])

/** Continuation prompt text sent to idle sessions with incomplete work. */
export const CONTINUATION_PROMPT =
  "Continuation: you have incomplete TODO items remaining. Please continue working on the next pending task."
