import { readFileSync } from "node:fs"
import { join } from "node:path"

interface BootstrapPart {
  id: string
  sessionID: string
  messageID: string
  type: "text"
  text: string
  synthetic: true
}

export interface BootstrapTransformOptions {
  ttlMs?: number
  now?: () => number
}

/** Supercode-specific marker suffix used to identify bootstrap parts injected by this plugin. */
const BOOTSTRAP_MARKER_SUFFIX = "-supercode-bootstrap"

/** Default TTL: 1 hour. Keeps bootstrap tracking bounded in long-running processes. */
const DEFAULT_TTL_MS = 60 * 60 * 1000

export function createBootstrapTransform(
  bootstrapDir: string,
  options?: BootstrapTransformOptions,
) {
  let bootstrapContent: string | undefined
  try {
    const raw = readFileSync(join(bootstrapDir, "skill-bootstrap.md"), "utf-8")
    if (raw.trim().length > 0) {
      bootstrapContent = raw
    }
  } catch {
    // File doesn't exist or unreadable — safe no-op
  }

  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const now = options?.now ?? Date.now
  const bootstrappedSessions = new Map<string, number>()

  function pruneExpired(): void {
    const cutoff = now() - ttlMs
    for (const [key, timestamp] of bootstrappedSessions) {
      if (timestamp < cutoff) {
        bootstrappedSessions.delete(key)
      }
    }
  }

  return async function bootstrapTransform(
    _input: Record<string, unknown>,
    output: {
      messages: {
        info: { id: string; role: string; sessionID?: string }
        parts: { id?: string; type: string; text?: string; synthetic?: boolean }[]
      }[]
    },
  ): Promise<void> {
    if (!bootstrapContent) return

    // Find first real user message
    const userMsg = output.messages.find((m) => m.info.role === "user")
    if (!userMsg) return

    // Get session identifier
    const sessionID = userMsg.info.sessionID
    if (!sessionID) return

    pruneExpired()

    // Already bootstrapped for this session (in-memory tracking)
    if (bootstrappedSessions.has(sessionID)) return

    // Check for a preexisting Supercode-specific bootstrap part
    const hasExistingBootstrap = userMsg.parts.some(
      (p) =>
        p.type === "text" &&
        p.synthetic === true &&
        typeof p.id === "string" &&
        p.id.endsWith(BOOTSTRAP_MARKER_SUFFIX),
    )
    if (hasExistingBootstrap) {
      // Mark session so later transforms also stay no-op
      bootstrappedSessions.set(sessionID, now())
      return
    }

    // Derive stable identity fields from the target user message
    const messageID = userMsg.info.id

    // Prepend synthetic bootstrap part matching the real plugin message-part contract
    const bootstrapPart: BootstrapPart = {
      id: `${messageID}${BOOTSTRAP_MARKER_SUFFIX}`,
      sessionID,
      messageID,
      type: "text",
      text: bootstrapContent,
      synthetic: true,
    }
    userMsg.parts.unshift(bootstrapPart)

    bootstrappedSessions.set(sessionID, now())
  }
}
