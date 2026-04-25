import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createBootstrapTransform } from "../hooks/skill-bootstrap"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createBootstrapDir(content: string): string {
  const outer = mkdtempSync(join(tmpdir(), "supercode-bootstrap-test-"))
  // Nest two levels deep so candidate 3/4 paths resolve within outer, not shared tmpdir
  const dir = join(outer, "a", "b")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "skill-bootstrap.md"), content)
  tempDirs.push(outer)
  return dir
}

describe("SkillBootstrap transform", () => {
  describe("first-user injection", () => {
    it("prepends a synthetic bootstrap part to the first real user message", async () => {
      const dir = createBootstrapDir("## Bootstrap Guidance\nDo the thing.")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "sys-1", sessionID: "sess-1", role: "system" } as any,
            parts: [{ type: "text", text: "system prompt" }],
          },
          {
            info: { id: "msg-1", sessionID: "sess-1", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "sess-1", messageID: "msg-1", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // The user message parts should have the bootstrap part prepended
      const userParts = output.messages[1].parts
      expect(userParts.length).toBe(2)
      expect((userParts[0] as any).text).toContain("Bootstrap Guidance")
      expect((userParts[0] as any).synthetic).toBe(true)
      // Original part remains
      expect((userParts[1] as any).text).toBe("Hello")
    })

    it("does not inject into non-user messages", async () => {
      const dir = createBootstrapDir("Bootstrap content")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "asst-1", sessionID: "sess-1", role: "assistant" } as any,
            parts: [{ type: "text", text: "Response" }],
          },
        ],
      }

      await transform({}, output)

      // No user message found, no injection
      expect(output.messages[0].parts.length).toBe(1)
      expect((output.messages[0].parts[0] as any).text).toBe("Response")
    })
  })

  describe("single-injection semantics", () => {
    it("does not prepend duplicate bootstrap part on repeated transforms for the same session", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)

      const output1 = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "sess-dup", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "sess-dup", messageID: "msg-1", type: "text", text: "First call" }],
          },
        ],
      }

      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2) // bootstrap + original

      // Second call with same session ID
      const output2 = {
        messages: [
          {
            info: { id: "msg-2", sessionID: "sess-dup", role: "user" } as any,
            parts: [{ id: "p-2", sessionID: "sess-dup", messageID: "msg-2", type: "text", text: "Second call" }],
          },
        ],
      }

      await transform({}, output2)
      // No duplicate injection
      expect(output2.messages[0].parts.length).toBe(1) // only original, no bootstrap
    })

    it("skips injection when a preexisting bootstrap part is already present on the first user message", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-pre", sessionID: "sess-preexist", role: "user" } as any,
            parts: [
              // Already has a synthetic bootstrap part from a prior injection (id ends in -supercode-bootstrap)
              { id: "msg-pre-supercode-bootstrap", sessionID: "sess-preexist", messageID: "msg-pre", type: "text", text: "## Guidance", synthetic: true },
              { id: "p-orig", sessionID: "sess-preexist", messageID: "msg-pre", type: "text", text: "Real message" },
            ],
          },
        ],
      }

      await transform({}, output)

      // No additional bootstrap part added
      expect(output.messages[0].parts.length).toBe(2)
      expect((output.messages[0].parts[0] as any).synthetic).toBe(true)
      expect((output.messages[0].parts[1] as any).text).toBe("Real message")
    })

    it("unrelated synthetic text parts do not suppress bootstrap injection", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-unrelated", sessionID: "sess-unrelated", role: "user" } as any,
            parts: [
              // An unrelated synthetic text part (id does NOT end in -bootstrap)
              { id: "p-sys", sessionID: "sess-unrelated", messageID: "msg-unrelated", type: "text", text: "System reminder", synthetic: true },
              { id: "p-orig", sessionID: "sess-unrelated", messageID: "msg-unrelated", type: "text", text: "Real message" },
            ],
          },
        ],
      }

      await transform({}, output)

      // Bootstrap IS injected despite the unrelated synthetic part
      expect(output.messages[0].parts.length).toBe(3)
      // Bootstrap part is first
      const bootstrapPart = output.messages[0].parts[0] as Record<string, unknown>
      expect(bootstrapPart.synthetic).toBe(true)
      expect((bootstrapPart.id as string).endsWith("-supercode-bootstrap")).toBe(true)
      expect(bootstrapPart.text).toBe("## Guidance")
      // Unrelated synthetic and original still present
      expect((output.messages[0].parts[1] as any).text).toBe("System reminder")
      expect((output.messages[0].parts[2] as any).text).toBe("Real message")
    })

    it("preexisting bootstrap part marks the session so later transforms for the same session stay no-op", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)

      // First call: message already has a preexisting bootstrap part
      const output1 = {
        messages: [
          {
            info: { id: "msg-a", sessionID: "sess-mark", role: "user" } as any,
            parts: [
              { id: "msg-a-supercode-bootstrap", sessionID: "sess-mark", messageID: "msg-a", type: "text", text: "## Guidance", synthetic: true },
              { id: "p-orig-a", sessionID: "sess-mark", messageID: "msg-a", type: "text", text: "Message A" },
            ],
          },
        ],
      }
      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2) // unchanged

      // Second call: same session, fresh message without bootstrap part
      const output2 = {
        messages: [
          {
            info: { id: "msg-b", sessionID: "sess-mark", role: "user" } as any,
            parts: [
              { id: "p-orig-b", sessionID: "sess-mark", messageID: "msg-b", type: "text", text: "Message B" },
            ],
          },
        ],
      }
      await transform({}, output2)
      // No injection — session was marked by preexisting bootstrap detection
      expect(output2.messages[0].parts.length).toBe(1)
      expect((output2.messages[0].parts[0] as any).text).toBe("Message B")
    })
  })

  describe("blank content tolerance", () => {
    it("is a safe no-op when skill-bootstrap.md is blank", async () => {
      const dir = createBootstrapDir("")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "sess-blank", role: "user" } as any,
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // No injection for blank content
      expect(output.messages[0].parts.length).toBe(1)
      expect((output.messages[0].parts[0] as any).text).toBe("Hello")
    })

    it("is a safe no-op when skill-bootstrap.md is whitespace-only", async () => {
      const dir = createBootstrapDir("   \n  \t  \n  ")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "sess-ws", role: "user" } as any,
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      expect(output.messages[0].parts.length).toBe(1)
      expect((output.messages[0].parts[0] as any).text).toBe("Hello")
    })
  })

  describe("TTL-based bounded cleanup", () => {
    it("prunes bootstrapped session entries older than TTL", async () => {
      let currentTime = 0
      const ttlMs = 5000
      const dir = createBootstrapDir("## Bootstrap")
      const transform = createBootstrapTransform(dir, {
        ttlMs,
        now: () => currentTime,
      })

      // At t=0, inject for session-a
      currentTime = 0
      const output1 = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "session-a", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "session-a", messageID: "msg-1", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2) // bootstrap injected

      // At t=3000, inject for session-b
      currentTime = 3000
      const output2 = {
        messages: [
          {
            info: { id: "msg-2", sessionID: "session-b", role: "user" } as any,
            parts: [{ id: "p-2", sessionID: "session-b", messageID: "msg-2", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output2)
      expect(output2.messages[0].parts.length).toBe(2) // bootstrap injected

      // At t=8000 (session-a expired: 0+5000=5000 < 8000), session-a should be pruned
      // so session-a can get a fresh injection
      currentTime = 8000
      const output3 = {
        messages: [
          {
            info: { id: "msg-3", sessionID: "session-a", role: "user" } as any,
            parts: [{ id: "p-3", sessionID: "session-a", messageID: "msg-3", type: "text", text: "Hello again" }],
          },
        ],
      }
      await transform({}, output3)
      // session-a was pruned, so bootstrap should be injected again
      expect(output3.messages[0].parts.length).toBe(2)
      expect((output3.messages[0].parts[0] as any).synthetic).toBe(true)
    })

    it("does not prune sessions within TTL", async () => {
      let currentTime = 1000
      const ttlMs = 5000
      const dir = createBootstrapDir("## Bootstrap")
      const transform = createBootstrapTransform(dir, {
        ttlMs,
        now: () => currentTime,
      })

      currentTime = 1000
      const output1 = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "session-x", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "session-x", messageID: "msg-1", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2)

      // Still within TTL (1000 + 5000 = 6000 > 4000)
      currentTime = 4000
      const output2 = {
        messages: [
          {
            info: { id: "msg-2", sessionID: "session-x", role: "user" } as any,
            parts: [{ id: "p-2", sessionID: "session-x", messageID: "msg-2", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output2)
      // session-x still tracked, no re-injection
      expect(output2.messages[0].parts.length).toBe(1)
    })
  })

  describe("Supercode-specific bootstrap marker", () => {
    it("uses a Supercode-specific marker suffix on injected parts", async () => {
      const dir = createBootstrapDir("## Bootstrap")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-marker", sessionID: "sess-marker", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "sess-marker", messageID: "msg-marker", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output)
      const part = output.messages[0].parts[0] as Record<string, unknown>
      expect((part.id as string).endsWith("-supercode-bootstrap")).toBe(true)
    })

    it("an unrelated synthetic part ending in generic '-bootstrap' does NOT suppress injection", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-fp", sessionID: "sess-fp", role: "user" } as any,
            parts: [
              // A generic -bootstrap suffix from some other plugin — should NOT suppress
              { id: "msg-fp-bootstrap", sessionID: "sess-fp", messageID: "msg-fp", type: "text", text: "Other plugin bootstrap", synthetic: true },
              { id: "p-orig", sessionID: "sess-fp", messageID: "msg-fp", type: "text", text: "Real message" },
            ],
          },
        ],
      }

      await transform({}, output)

      // Supercode bootstrap IS injected — the generic -bootstrap part should not suppress it
      expect(output.messages[0].parts.length).toBe(3)
      const supercodePart = output.messages[0].parts[0] as Record<string, unknown>
      expect(supercodePart.synthetic).toBe(true)
      expect((supercodePart.id as string).endsWith("-supercode-bootstrap")).toBe(true)
    })

    it("a preexisting Supercode-specific bootstrap part DOES suppress injection", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-pre2", sessionID: "sess-pre2", role: "user" } as any,
            parts: [
              { id: "msg-pre2-supercode-bootstrap", sessionID: "sess-pre2", messageID: "msg-pre2", type: "text", text: "## Guidance", synthetic: true },
              { id: "p-orig2", sessionID: "sess-pre2", messageID: "msg-pre2", type: "text", text: "Real message" },
            ],
          },
        ],
      }

      await transform({}, output)

      // No additional bootstrap part added
      expect(output.messages[0].parts.length).toBe(2)
      expect((output.messages[0].parts[1] as any).text).toBe("Real message")
    })
  })

  describe("default bounded TTL", () => {
    it("transform created without options still prunes stale sessions (uses default TTL)", async () => {
      let currentTime = 0
      const dir = createBootstrapDir("## Bootstrap")
      const transform = createBootstrapTransform(dir, { now: () => currentTime })

      // At t=0, inject for session
      currentTime = 0
      const output1 = {
        messages: [
          {
            info: { id: "msg-1", sessionID: "sess-def-ttl", role: "user" } as any,
            parts: [{ id: "p-1", sessionID: "sess-def-ttl", messageID: "msg-1", type: "text", text: "Hello" }],
          },
        ],
      }
      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2)

      // Advance past default TTL (2 hours)
      currentTime = 0 + 1000 * 60 * 60 * 2
      const output2 = {
        messages: [
          {
            info: { id: "msg-2", sessionID: "sess-def-ttl", role: "user" } as any,
            parts: [{ id: "p-2", sessionID: "sess-def-ttl", messageID: "msg-2", type: "text", text: "Hello again" }],
          },
        ],
      }
      await transform({}, output2)
      // Session was pruned, so bootstrap should be re-injected
      expect(output2.messages[0].parts.length).toBe(2)
      expect((output2.messages[0].parts[0] as any).synthetic).toBe(true)
    })
  })

  describe("synthetic part shape", () => {
    it("inserted part carries stable identity fields from the target user message", async () => {
      const dir = createBootstrapDir("## Bootstrap Content")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            info: { id: "msg-shape", sessionID: "sess-shape", role: "user" } as any,
            parts: [{ id: "p-orig", sessionID: "sess-shape", messageID: "msg-shape", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      const bootstrap = output.messages[0].parts[0] as Record<string, unknown>
      // Must carry stable identity from the target user message
      expect(bootstrap.type).toBe("text")
      expect(bootstrap.sessionID).toBe("sess-shape")
      expect(bootstrap.messageID).toBe("msg-shape")
      expect(typeof bootstrap.id).toBe("string")
      expect(bootstrap.id).toBeTruthy()
      expect(bootstrap.synthetic).toBe(true)
      expect(bootstrap.text).toBe("## Bootstrap Content")
    })
  })

  describe("EasyCode parity — ordered candidate path resolution", () => {
    it("finds skill-bootstrap.md at copied-plugin layout via candidate 3 (<moduleDir>/../src/hooks/skill-bootstrap/)", async () => {
      // Simulate a copied plugin layout where moduleDir has no local skill-bootstrap.md
      // but the file exists at the relative path used by copied .opencode/plugins layouts
      const base = mkdtempSync(join(tmpdir(), "supercode-parity-copied-"))
      tempDirs.push(base)
      const moduleDir = join(base, "copied-plugin")
      mkdirSync(moduleDir, { recursive: true })
      // Create the file at candidate 3 resolution: moduleDir/../src/hooks/skill-bootstrap/skill-bootstrap.md
      const candidateDir = join(base, "src", "hooks", "skill-bootstrap")
      mkdirSync(candidateDir, { recursive: true })
      writeFileSync(join(candidateDir, "skill-bootstrap.md"), "## Copied Plugin Bootstrap")

      const transform = createBootstrapTransform(moduleDir)
      const output = {
        messages: [
          {
            info: { id: "msg-copied", sessionID: "sess-copied", role: "user" } as any,
            parts: [{ id: "p-copied", sessionID: "sess-copied", messageID: "msg-copied", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // Should inject bootstrap from the copied-plugin layout candidate
      expect(output.messages[0].parts.length).toBe(2)
      const bootstrap = output.messages[0].parts[0] as Record<string, unknown>
      expect(bootstrap.synthetic).toBe(true)
      expect(bootstrap.text).toBe("## Copied Plugin Bootstrap")
    })

    it("prefers candidate 1 (<moduleDir>/skill-bootstrap.md) over later candidates", async () => {
      const base = mkdtempSync(join(tmpdir(), "supercode-parity-order-"))
      tempDirs.push(base)
      // Place moduleDir inside base so candidate 3 resolves within base (not /tmp)
      const moduleDir = join(base, "module")
      mkdirSync(moduleDir, { recursive: true })

      // Candidate 1: <moduleDir>/skill-bootstrap.md
      writeFileSync(join(moduleDir, "skill-bootstrap.md"), "## First Candidate")

      // Candidate 3: moduleDir/../src/hooks/skill-bootstrap/skill-bootstrap.md = base/src/hooks/.../skill-bootstrap.md
      const candidate3Dir = join(base, "src", "hooks", "skill-bootstrap")
      mkdirSync(candidate3Dir, { recursive: true })
      writeFileSync(join(candidate3Dir, "skill-bootstrap.md"), "## Third Candidate")

      const transform = createBootstrapTransform(moduleDir)
      const output = {
        messages: [
          {
            info: { id: "msg-order", sessionID: "sess-order", role: "user" } as any,
            parts: [{ id: "p-order", sessionID: "sess-order", messageID: "msg-order", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      expect(output.messages[0].parts.length).toBe(2)
      const bootstrap = output.messages[0].parts[0] as Record<string, unknown>
      expect(bootstrap.text).toBe("## First Candidate")
    })

    it("uses candidate 4 (<moduleDir>/../../src/hooks/skill-bootstrap/) when earlier candidates absent", async () => {
      // moduleDir is nested two levels deep, no candidates 1-3 exist
      const base = mkdtempSync(join(tmpdir(), "supercode-parity-c4-"))
      tempDirs.push(base)
      const moduleDir = join(base, "a", "b")
      mkdirSync(moduleDir, { recursive: true })

      // Candidate 4: moduleDir/../../src/hooks/skill-bootstrap/skill-bootstrap.md = base/src/hooks/skill-bootstrap/skill-bootstrap.md
      const candidateDir = join(base, "src", "hooks", "skill-bootstrap")
      mkdirSync(candidateDir, { recursive: true })
      writeFileSync(join(candidateDir, "skill-bootstrap.md"), "## Fourth Candidate")

      const transform = createBootstrapTransform(moduleDir)
      const output = {
        messages: [
          {
            info: { id: "msg-c4", sessionID: "sess-c4", role: "user" } as any,
            parts: [{ id: "p-c4", sessionID: "sess-c4", messageID: "msg-c4", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      expect(output.messages[0].parts.length).toBe(2)
      const bootstrap = output.messages[0].parts[0] as Record<string, unknown>
      expect(bootstrap.text).toBe("## Fourth Candidate")
    })

    it("safe no-op when no candidate file exists at any path", async () => {
      const base = mkdtempSync(join(tmpdir(), "supercode-parity-noop-"))
      tempDirs.push(base)
      // Nest two levels deep so candidate 3/4 stay within base
      const moduleDir = join(base, "a", "b")
      mkdirSync(moduleDir, { recursive: true })

      const transform = createBootstrapTransform(moduleDir)
      const output = {
        messages: [
          {
            info: { id: "msg-noop", sessionID: "sess-noop", role: "user" } as any,
            parts: [{ id: "p-noop", sessionID: "sess-noop", messageID: "msg-noop", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // No injection — no candidate exists
      expect(output.messages[0].parts.length).toBe(1)
    })

    it("no-ops when first existing candidate is blank — does not fall through to later candidates", async () => {
      const base = mkdtempSync(join(tmpdir(), "supercode-parity-blank1-"))
      tempDirs.push(base)
      const moduleDir = join(base, "module")
      mkdirSync(moduleDir, { recursive: true })

      // Candidate 1: exists but is blank
      writeFileSync(join(moduleDir, "skill-bootstrap.md"), "   \n  ")

      // Candidate 3: exists with real content (would be found if fallthrough occurs)
      const candidate3Dir = join(base, "src", "hooks", "skill-bootstrap")
      mkdirSync(candidate3Dir, { recursive: true })
      writeFileSync(join(candidate3Dir, "skill-bootstrap.md"), "## Third Candidate Should Not Be Used")

      const transform = createBootstrapTransform(moduleDir)
      const output = {
        messages: [
          {
            info: { id: "msg-blank1", sessionID: "sess-blank1", role: "user" } as any,
            parts: [{ id: "p-blank1", sessionID: "sess-blank1", messageID: "msg-blank1", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // No injection — first existing candidate was blank, must NOT fall through
      expect(output.messages[0].parts.length).toBe(1)
    })
  })

  describe("EasyCode parity — no-sessionID injection", () => {
    it("injects bootstrap into first user message even without sessionID", async () => {
      const dir = createBootstrapDir("## No Session Bootstrap")
      const transform = createBootstrapTransform(dir)
      const output = {
        messages: [
          {
            // No sessionID on this message — EasyCode still injects, Supercode should too
            info: { id: "msg-nosid", role: "user" } as any,
            parts: [{ id: "p-nosid", messageID: "msg-nosid", type: "text", text: "Hello" }],
          },
        ],
      }

      await transform({}, output)

      // Bootstrap part should be injected
      expect(output.messages[0].parts.length).toBe(2)
      const bootstrap = output.messages[0].parts[0] as Record<string, unknown>
      expect(bootstrap.synthetic).toBe(true)
      expect(bootstrap.text).toBe("## No Session Bootstrap")
      expect(bootstrap.type).toBe("text")
      expect(bootstrap.messageID).toBe("msg-nosid")
      expect(typeof bootstrap.id).toBe("string")
      expect((bootstrap.id as string).endsWith("-supercode-bootstrap")).toBe(true)
    })

    it("does not inject duplicate bootstrap when no sessionID — second call is no-op", async () => {
      const dir = createBootstrapDir("## Guidance")
      const transform = createBootstrapTransform(dir)

      // First call: no sessionID — should inject
      const output1 = {
        messages: [
          {
            info: { id: "msg-dup-nosid-1", role: "user" } as any,
            parts: [{ id: "p-dup1", messageID: "msg-dup-nosid-1", type: "text", text: "First" }],
          },
        ],
      }
      await transform({}, output1)
      expect(output1.messages[0].parts.length).toBe(2)

      // Second call: same message id — should NOT inject duplicate
      const output2 = {
        messages: [
          {
            info: { id: "msg-dup-nosid-1", role: "user" } as any,
            parts: [{ id: "p-dup2", messageID: "msg-dup-nosid-1", type: "text", text: "Second" }],
          },
        ],
      }
      await transform({}, output2)
      expect(output2.messages[0].parts.length).toBe(1) // only original part, no bootstrap
    })
  })
})
