import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

interface BootstrapPart {
  id: string
  sessionID?: string
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

/**
 * Ordered candidate paths for locating skill-bootstrap.md using caller-provided moduleDir.
 * Must match the EasyCode-compatible candidate set from the approved spec.
 */
const BOOTSTRAP_CANDIDATES = [
  (moduleDir: string) => join(moduleDir, "skill-bootstrap.md"),
  (moduleDir: string) => join(moduleDir, "hooks", "skill-bootstrap", "skill-bootstrap.md"),
  (moduleDir: string) => join(moduleDir, "..", "src", "hooks", "skill-bootstrap", "skill-bootstrap.md"),
  (moduleDir: string) => join(moduleDir, "..", "..", "src", "hooks", "skill-bootstrap", "skill-bootstrap.md"),
]

/**
 * Resolve bootstrap markdown content from the ordered candidate path set.
 * Selects the first existing file; if that file is blank or unreadable,
 * returns undefined (no fallthrough to later candidates).
 */
function resolveBootstrapContent(moduleDir: string): string | undefined {
  for (const candidate of BOOTSTRAP_CANDIDATES) {
    const candidatePath = candidate(moduleDir)
    if (existsSync(candidatePath)) {
      // First existing file wins — even if blank or unreadable
      try {
        const raw = readFileSync(candidatePath, "utf-8")
        if (raw.trim().length > 0) return raw
      } catch {
        // Unreadable — still stop here, no fallthrough
      }
      return undefined
    }
  }
  return undefined
}

export function createBootstrapTransform(
  bootstrapDir: string,
  options?: BootstrapTransformOptions,
) {
  const bootstrapContent = resolveBootstrapContent(bootstrapDir)

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

    // Derive stable identity fields from the target user message
    const messageID = userMsg.info.id
    const sessionID = userMsg.info.sessionID

    // Use messageID as tracking key when sessionID is absent (EasyCode parity)
    const trackingKey = sessionID ?? `msg:${messageID}`

    pruneExpired()

    // Already bootstrapped for this session/message (in-memory tracking)
    if (bootstrappedSessions.has(trackingKey)) return

    // Check for a preexisting Supercode-specific bootstrap part
    const hasExistingBootstrap = userMsg.parts.some(
      (p) =>
        p.type === "text" &&
        p.synthetic === true &&
        typeof p.id === "string" &&
        p.id.endsWith(BOOTSTRAP_MARKER_SUFFIX),
    )
    if (hasExistingBootstrap) {
      // Mark so later transforms also stay no-op
      bootstrappedSessions.set(trackingKey, now())
      return
    }

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

    bootstrappedSessions.set(trackingKey, now())
  }
}
