/**
 * Tool output shape detection and safe reminder attachment.
 *
 * Distinguishes plain appendable text from JSON-like strings and
 * structured objects, routing reminders correctly per spec.
 */

/**
 * Returns true when the output string looks like JSON (starts with `{` or `[`).
 */
export function isJsonLikeString(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith("{") || trimmed.startsWith("[")
}

/**
 * Attach a reminder to an output object safely.
 *
 * - Plain text: appends reminder text to `output.output`
 * - JSON-like string: preserves `output.output`, routes to `output.metadata.todoToolGuardReminder`
 * - Non-string (structured): preserves `output.output`, routes to `output.metadata.todoToolGuardReminder`
 */
export function attachReminder(
  output: {
    output?: unknown
    metadata?: unknown
  },
  reminderText: string,
): void {
  const raw = output.output

  if (typeof raw === "string") {
    if (isJsonLikeString(raw)) {
      // JSON-like string: don't modify output, route to metadata
      setMetadataReminder(output, reminderText)
    } else {
      // Plain text: append reminder
      output.output = raw + reminderText
    }
  } else {
    // Structured or undefined: preserve output, route to metadata
    setMetadataReminder(output, reminderText)
  }
}

/**
 * Safely set the `todoToolGuardReminder` key on the metadata object,
 * creating the metadata object if absent and preserving existing keys.
 */
function setMetadataReminder(
  output: { metadata?: unknown },
  reminderText: string,
): void {
  if (output.metadata == null || typeof output.metadata !== "object") {
    output.metadata = {}
  }
  ;(output.metadata as Record<string, unknown>).todoToolGuardReminder =
    reminderText
}
