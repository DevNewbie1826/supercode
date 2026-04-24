/**
 * Environment-gated diagnostic logger for Supercode hooks.
 *
 * Diagnostics are enabled only when `SUPERCODE_DEBUG_HOOKS` is exactly
 * `"1"`, `"true"`, or `"yes"`. Any other value (including unset, empty
 * string, `"0"`, `"false"`, `"no"`) disables diagnostics.
 *
 * Every diagnostic log emits a structured body via `client.app.log`:
 *   { service: "supercode-plugin", level: "debug", message, extra }
 *
 * Logging failures are swallowed so they never break plugin behavior.
 */

/** Allowed values that enable diagnostics. */
const ENABLED_VALUES = new Set(["1", "true", "yes"])

/** Check whether diagnostics are currently enabled. */
export function isDiagnosticsEnabled(): boolean {
  const val = process.env.SUPERCODE_DEBUG_HOOKS
  return typeof val === "string" && ENABLED_VALUES.has(val)
}

/**
 * Create a safe diagnostic logger bound to the given `client.app.log`.
 *
 * Returns a function that:
 * - Does nothing when diagnostics are disabled.
 * - Calls `client.app.log({ body })` with the required structured body when enabled.
 * - Catches and swallows both synchronous throws and asynchronous rejections
 *   from `client.app.log`, so logging failures never break plugin behavior.
 */
export function createDiagnosticLogger(appLog: (options?: unknown) => unknown) {
  return function logDiagnostic(message: string, extra: Record<string, unknown>): void {
    if (!isDiagnosticsEnabled()) return

    const body = {
      service: "supercode-plugin" as const,
      level: "debug" as const,
      message,
      extra,
    }

    try {
      const result = appLog({ body })
      // If app.log returns a promise, attach a no-op catch to swallow rejections
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        ;(result as Promise<unknown>).catch(() => {
          // Swallow logging rejection
        })
      }
    } catch {
      // Swallow synchronous logging errors
    }
  }
}
