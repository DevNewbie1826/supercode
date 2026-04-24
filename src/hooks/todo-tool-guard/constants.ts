/** Guard constants per spec. */

/** Number of non-todowrite calls before a stale reminder is attached. */
export const STALE_REMINDER_INTERVAL = 20

/** Default TTL for guard session state and pending snapshots: 1 hour. */
export const DEFAULT_STATE_TTL_MS = 60 * 60 * 1000

/** Error message thrown when orchestrator non-exempt tools are blocked. */
export const BLOCK_MESSAGE =
  "Blocked: orchestrator must create a TODO list before using other tools. Use `todowrite` or `skill` with `todo-sync` first."

/** Reminder text attached when stale TODO state is detected. */
export const STALE_REMINDER_TEXT =
  "\n\n[TODO Reminder] Your TODO list may be stale. Consider reviewing and updating it with `todowrite`."
