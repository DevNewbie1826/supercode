/** Guard constants per spec. */

/** Number of non-todowrite calls before a stale reminder is attached. */
export const STALE_REMINDER_INTERVAL = 20;

/** Default TTL for guard session state and pending snapshots: 1 hour. */
export const DEFAULT_STATE_TTL_MS = 60 * 60 * 1000;

/** Error message thrown when orchestrator non-exempt tools are blocked. */
export const BLOCK_MESSAGE = [
  "Stop. Create or sync the TODO list before taking any action.",
  "",
  "Rules:",
  "- Even trivial lookups must be recorded first.",
  "- Opening files, searching, checking logs, and reading code count as work.",
  "- Do only the current TODO item, in order.",
  "- Update TODO state after each completed atomic unit.",
  "- Do not skip, reorder, or perform unlisted work.",
  "",
  "Use `todowrite` or the `todo-sync` skill, then proceed with the current TODO item.",
].join("\n");

/** Reminder text attached when stale TODO state is detected. */
export const STALE_REMINDER_TEXT =
  "\n\n[TODO Reminder] TODO state may be stale. Review it before continuing, update completed/current items, and keep working in TODO order.";
