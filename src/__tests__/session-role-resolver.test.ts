import { describe, expect, it } from "bun:test"
import { createSessionRoleResolver } from "../hooks/session-role-resolver"

describe("SessionRoleResolver", () => {
  // ── Shared realistic event fixtures ──────────────────────────────────
  //
  // These helpers produce events matching actual @opencode-ai/sdk types.
  // Session events carry session ID at properties.info.id.
  // Message events carry session ID at properties.info.sessionID.

  function sessionCreated(sessionID: string, overrides?: { parentID?: string }) {
    return {
      type: "session.created" as const,
      properties: {
        info: {
          id: sessionID,
          projectID: "proj-test",
          directory: "/test",
          title: "Test session",
          version: "1",
          parentID: overrides?.parentID,
          time: { created: 1000, updated: 1000 },
        },
      },
    }
  }

  function sessionUpdated(sessionID: string, overrides?: { parentID?: string }) {
    return {
      type: "session.updated" as const,
      properties: {
        info: {
          id: sessionID,
          projectID: "proj-test",
          directory: "/test",
          title: "Test session",
          version: "1",
          parentID: overrides?.parentID,
          time: { created: 1000, updated: 1000 },
        },
      },
    }
  }

  function assistantMessageUpdated(sessionID: string, mode: string) {
    return {
      type: "message.updated" as const,
      properties: {
        info: {
          id: `msg-${sessionID}`,
          sessionID,
          role: "assistant" as const,
          parentID: "",
          modelID: "model-test",
          providerID: "provider-test",
          mode,
          path: { cwd: "/test", root: "/test" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 1000 },
        },
      },
    }
  }

  describe("role classification", () => {
    it("classifies orchestrator from root session + assistant mode=primary", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-1"))
      resolver.observe(assistantMessageUpdated("sess-1", "primary"))
      expect(resolver.getRole("sess-1")).toBe("orchestrator")
    })

    it("classifies executor from child session with parentID", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-2", { parentID: "parent-1" }))
      expect(resolver.getRole("sess-2")).toBe("executor")
    })

    it("returns unknown for unobserved session", () => {
      const resolver = createSessionRoleResolver()
      expect(resolver.getRole("nonexistent")).toBe("unknown")
    })

    it("returns unknown for session with only lifecycle and no primary assistant message", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-3"))
      expect(resolver.getRole("sess-3")).toBe("unknown")
    })

    it("returns unknown when assistant message has non-primary mode", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-4"))
      resolver.observe(assistantMessageUpdated("sess-4", "sub"))
      expect(resolver.getRole("sess-4")).toBe("unknown")
    })

    it("returns unknown when primary assistant message arrives without prior lifecycle", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(assistantMessageUpdated("sess-5", "primary"))
      expect(resolver.getRole("sess-5")).toBe("unknown")
    })
  })

  describe("session ID extraction", () => {
    it("extracts sessionID from top-level sessionID", () => {
      const resolver = createSessionRoleResolver()
      const event = { sessionID: "sess-top" }
      expect(resolver.extractSessionID(event)).toBe("sess-top")
    })

    it("extracts sessionID from top-level session_id", () => {
      const resolver = createSessionRoleResolver()
      const event = { session_id: "sess-snake" }
      expect(resolver.extractSessionID(event)).toBe("sess-snake")
    })

    it("extracts sessionID from properties.info.id", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.deleted",
        properties: { info: { id: "sess-info-id" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-info-id")
    })

    it("returns undefined when no session ID path exists", () => {
      const resolver = createSessionRoleResolver()
      expect(resolver.extractSessionID({ type: "unknown" })).toBeUndefined()
    })
  })

  describe("role-seeding seam", () => {
    it("observe seeds role accessible via getRole", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-seed", { parentID: "parent" }))
      expect(resolver.getRole("sess-seed")).toBe("executor")
    })

    it("multiple observes for same session update role", () => {
      const resolver = createSessionRoleResolver()
      // Seed as unknown root session
      resolver.observe(sessionCreated("sess-update"))
      expect(resolver.getRole("sess-update")).toBe("unknown")

      // Add assistant primary message → upgrade to orchestrator
      resolver.observe(assistantMessageUpdated("sess-update", "primary"))
      expect(resolver.getRole("sess-update")).toBe("orchestrator")
    })

    it("non-event hooks consume resolver state without reparsing raw events", () => {
      const resolver = createSessionRoleResolver()
      // Simulate event hook seeding the resolver
      resolver.observe(sessionCreated("sess-consume"))
      resolver.observe(assistantMessageUpdated("sess-consume", "primary"))

      // Later, a non-event hook only calls getRole
      const role = resolver.getRole("sess-consume")
      expect(role).toBe("orchestrator")

      // The resolver did not need to inspect the raw event again
      expect(resolver.getRole("sess-consume")).toBe("orchestrator")
    })
  })

  describe("extractSessionID info.id scope restriction", () => {
    it("returns undefined for properties.info.id on message.updated (not session-scoped)", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "message.updated",
        properties: { info: { id: "msg-id-not-session" } },
      }
      expect(resolver.extractSessionID(event)).toBeUndefined()
    })

    it("returns undefined for properties.info.id on message.created (not session-scoped)", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "message.created",
        properties: { info: { id: "msg-id-not-session" } },
      }
      expect(resolver.extractSessionID(event)).toBeUndefined()
    })

    it("returns undefined for properties.info.id on an event with no type", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        properties: { info: { id: "msg-id-not-session" } },
      }
      expect(resolver.extractSessionID(event)).toBeUndefined()
    })

    it("extracts properties.info.id for session.deleted", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.deleted",
        properties: { info: { id: "sess-via-info" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-via-info")
    })

    it("extracts properties.sessionID for session.status", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.status",
        properties: { sessionID: "sess-status-props", status: { type: "idle" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-status-props")
    })

    it("extracts properties.sessionID for session.idle", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.idle",
        properties: { sessionID: "sess-idle-props" },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-idle-props")
    })

    it("returns undefined for session.status with only properties.info.id (not an approved path)", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.status",
        properties: { info: { id: "sess-not-valid" } },
      }
      expect(resolver.extractSessionID(event)).toBeUndefined()
    })

    it("top-level sessionID still works for message.updated even when info.id is present", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        sessionID: "sess-top-level",
        type: "message.updated",
        properties: { info: { id: "msg-id-not-session" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-top-level")
    })

    it("top-level session_id still works for message.created even when info.id is present", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        session_id: "sess-snake-case",
        type: "message.created",
        properties: { info: { id: "msg-id-not-session" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-snake-case")
    })
  })

  describe("TTL-based pruning", () => {
    it("prunes expired entries on observe when TTL has elapsed", () => {
      let currentTime = 0
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({
        ttlMs,
        now: () => currentTime,
      })

      // At t=0, seed executor
      currentTime = 0
      resolver.observe(sessionCreated("sess-a", { parentID: "parent" }))
      expect(resolver.getRole("sess-a")).toBe("executor")

      // At t=3000, seed another executor
      currentTime = 3000
      resolver.observe(sessionCreated("sess-b", { parentID: "parent" }))
      expect(resolver.getRole("sess-b")).toBe("executor")

      // At t=8000 (past TTL for sess-a which was at t=0), observe triggers prune
      currentTime = 8000
      resolver.observe(sessionCreated("sess-c", { parentID: "parent" }))

      // sess-a should be pruned (t=0 + 5000 = 5000 < 8000)
      expect(resolver.getRole("sess-a")).toBe("unknown")
      // sess-b should survive (t=3000 + 5000 = 8000, not yet expired at t=8000)
      expect(resolver.getRole("sess-b")).toBe("executor")
      // sess-c just added
      expect(resolver.getRole("sess-c")).toBe("executor")
    })

    it("dispose clears all state", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("sess-dispose", { parentID: "parent" }))
      expect(resolver.getRole("sess-dispose")).toBe("executor")

      resolver.dispose()
      expect(resolver.getRole("sess-dispose")).toBe("unknown")
    })

    it("entries within TTL are preserved", () => {
      let currentTime = 1000
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({
        ttlMs,
        now: () => currentTime,
      })

      currentTime = 1000
      resolver.observe(sessionCreated("sess-fresh"))
      resolver.observe(assistantMessageUpdated("sess-fresh", "primary"))

      // Still within TTL
      currentTime = 4000
      resolver.observe(sessionCreated("sess-other", { parentID: "parent" }))

      expect(resolver.getRole("sess-fresh")).toBe("orchestrator")
      expect(resolver.getRole("sess-other")).toBe("executor")
    })
  })

  describe("getRole lookup-path TTL expiry", () => {
    it("getRole returns unknown for expired entry without requiring a new observe", () => {
      let currentTime = 0
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({
        ttlMs,
        now: () => currentTime,
      })

      // Seed at t=0
      currentTime = 0
      resolver.observe(sessionCreated("sess-lookup", { parentID: "parent" }))
      expect(resolver.getRole("sess-lookup")).toBe("executor")

      // Advance time past TTL without any observe
      currentTime = 6000

      // getRole itself must detect expiry and return unknown
      expect(resolver.getRole("sess-lookup")).toBe("unknown")
    })
  })

  describe("default bounded TTL", () => {
    it("resolver created without options still prunes stale entries (uses default TTL)", () => {
      let currentTime = Date.now()
      const resolver = createSessionRoleResolver({ now: () => currentTime })

      currentTime = 0
      resolver.observe(sessionCreated("sess-default-ttl"))
      resolver.observe(assistantMessageUpdated("sess-default-ttl", "primary"))
      expect(resolver.getRole("sess-default-ttl")).toBe("orchestrator")

      // Advance way past any reasonable default TTL (1 hour)
      currentTime = 0 + 1000 * 60 * 60 * 2 // 2 hours
      resolver.observe(sessionCreated("sess-other", { parentID: "parent" }))

      expect(resolver.getRole("sess-default-ttl")).toBe("unknown")
      expect(resolver.getRole("sess-other")).toBe("executor")
    })
  })

  // ── Authoritative event-shape classification ──────────────────────
  //
  // These tests use realistic SDK event shapes derived from the actual
  // @opencode-ai/sdk TypeScript definitions. The session and message
  // event types do NOT carry a top-level sessionID; the resolver must
  // extract session IDs from nested fields:
  //   - session.created/updated/deleted: properties.info.id
  //   - message.updated: properties.info.sessionID
  //
  // Classification contract:
  //   - orchestrator: root session (no parentID) + assistant message.updated with mode === "primary"
  //   - executor: child session (parentID present) from session lifecycle event
  //   - unknown: incomplete or missing evidence

  describe("Authoritative event-shape classification", () => {
    // ── Fixture helpers matching real SDK types ────────────────────────

    /** Build a realistic session.created event (no top-level sessionID). */
    function sessionCreated(
      sessionID: string,
      overrides?: { parentID?: string },
    ) {
      return {
        type: "session.created" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            parentID: overrides?.parentID,
            time: { created: 1000, updated: 1000 },
          },
        },
      }
    }

    /** Build a realistic session.updated event (no top-level sessionID). */
    function sessionUpdated(
      sessionID: string,
      overrides?: { parentID?: string },
    ) {
      return {
        type: "session.updated" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            parentID: overrides?.parentID,
            time: { created: 1000, updated: 1000 },
          },
        },
      }
    }

    /** Build a realistic message.updated event with an assistant message. */
    function assistantMessageUpdated(
      sessionID: string,
      mode: string,
    ) {
      return {
        type: "message.updated" as const,
        properties: {
          info: {
            id: `msg-${sessionID}`,
            sessionID,
            role: "assistant" as const,
            parentID: "",
            modelID: "model-test",
            providerID: "provider-test",
            mode,
            path: { cwd: "/test", root: "/test" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
            time: { created: 1000 },
          },
        },
      }
    }

    /** Build a realistic session.deleted event (no top-level sessionID). */
    function sessionDeleted(sessionID: string) {
      return {
        type: "session.deleted" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            time: { created: 1000, updated: 1000 },
          },
        },
      }
    }

    // ── Orchestrator: root session + primary assistant message ──────────

    it("root session.created + assistant primary message.updated → orchestrator", () => {
      const resolver = createSessionRoleResolver()

      // 1. Seed lifecycle: root session (no parentID)
      resolver.observe(sessionCreated("sess-root-1"))
      expect(resolver.getRole("sess-root-1")).toBe("unknown")

      // 2. Seed assistant message with mode === "primary"
      resolver.observe(assistantMessageUpdated("sess-root-1", "primary"))

      // 3. Classification complete → orchestrator
      expect(resolver.getRole("sess-root-1")).toBe("orchestrator")
    })

    it("root session.updated + assistant primary message.updated → orchestrator", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionUpdated("sess-root-2"))
      resolver.observe(assistantMessageUpdated("sess-root-2", "primary"))

      expect(resolver.getRole("sess-root-2")).toBe("orchestrator")
    })

    // ── Executor: child session with parentID ───────────────────────────

    it("child session.created with parentID → executor", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionCreated("sess-child-1", { parentID: "sess-parent" }))

      expect(resolver.getRole("sess-child-1")).toBe("executor")
    })

    it("child session.updated with parentID → executor", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionUpdated("sess-child-2", { parentID: "sess-parent" }))

      expect(resolver.getRole("sess-child-2")).toBe("executor")
    })

    // ── Unknown: incomplete evidence ────────────────────────────────────

    it("root session without assistant message stays unknown", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionCreated("sess-root-no-msg"))

      expect(resolver.getRole("sess-root-no-msg")).toBe("unknown")
    })

    it("assistant primary message without prior lifecycle stays unknown", () => {
      const resolver = createSessionRoleResolver()

      // No session.created event — no lifecycle evidence
      resolver.observe(assistantMessageUpdated("sess-no-lifecycle", "primary"))

      expect(resolver.getRole("sess-no-lifecycle")).toBe("unknown")
    })

    it("root session + non-primary assistant message stays unknown", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionCreated("sess-root-sub"))
      resolver.observe(assistantMessageUpdated("sess-root-sub", "sub"))

      expect(resolver.getRole("sess-root-sub")).toBe("unknown")
    })

    // ── session.deleted clears cached state ────────────────────────────

    it("session.deleted clears lifecycle and role for root orchestrator session", () => {
      const resolver = createSessionRoleResolver()

      // Seed orchestrator
      resolver.observe(sessionCreated("sess-del-1"))
      resolver.observe(assistantMessageUpdated("sess-del-1", "primary"))
      expect(resolver.getRole("sess-del-1")).toBe("orchestrator")

      // Delete session
      resolver.observe(sessionDeleted("sess-del-1"))

      // Role should be cleared
      expect(resolver.getRole("sess-del-1")).toBe("unknown")
    })

    it("session.deleted clears lifecycle for child executor session", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionCreated("sess-del-child", { parentID: "parent" }))
      expect(resolver.getRole("sess-del-child")).toBe("executor")

      resolver.observe(sessionDeleted("sess-del-child"))

      expect(resolver.getRole("sess-del-child")).toBe("unknown")
    })

    it("after session.deleted, re-observing a message does not restore orchestrator without lifecycle", () => {
      const resolver = createSessionRoleResolver()

      resolver.observe(sessionCreated("sess-del-restore"))
      resolver.observe(assistantMessageUpdated("sess-del-restore", "primary"))
      expect(resolver.getRole("sess-del-restore")).toBe("orchestrator")

      resolver.observe(sessionDeleted("sess-del-restore"))
      expect(resolver.getRole("sess-del-restore")).toBe("unknown")

      // Re-observe the message without the lifecycle → should stay unknown
      resolver.observe(assistantMessageUpdated("sess-del-restore", "primary"))
      expect(resolver.getRole("sess-del-restore")).toBe("unknown")
    })

    // ── Full orchestrator sequence: both pieces required ────────────────

    it("orchestrator requires BOTH lifecycle and primary assistant evidence", () => {
      const resolver = createSessionRoleResolver()

      // Only lifecycle → unknown
      resolver.observe(sessionCreated("sess-seq"))
      expect(resolver.getRole("sess-seq")).toBe("unknown")

      // Now add assistant message → orchestrator
      resolver.observe(assistantMessageUpdated("sess-seq", "primary"))
      expect(resolver.getRole("sess-seq")).toBe("orchestrator")
    })

    it("child session does not upgrade to orchestrator even with primary assistant message", () => {
      const resolver = createSessionRoleResolver()

      // Seed child session lifecycle
      resolver.observe(sessionCreated("sess-child-no-upgrade", { parentID: "parent" }))
      expect(resolver.getRole("sess-child-no-upgrade")).toBe("executor")

      // Assistant message with mode=primary should NOT upgrade child to orchestrator
      resolver.observe(assistantMessageUpdated("sess-child-no-upgrade", "primary"))
      expect(resolver.getRole("sess-child-no-upgrade")).toBe("executor")
    })

    // ── Extraction: session lifecycle events ────────────────────────────

    it("extracts session ID from properties.info.id for session.created", () => {
      const resolver = createSessionRoleResolver()
      const event = sessionCreated("sess-extract-created")
      expect(resolver.extractSessionID(event)).toBe("sess-extract-created")
    })

    it("extracts session ID from properties.info.id for session.updated", () => {
      const resolver = createSessionRoleResolver()
      const event = sessionUpdated("sess-extract-updated")
      expect(resolver.extractSessionID(event)).toBe("sess-extract-updated")
    })

    // ── Extraction: message events ──────────────────────────────────────

    it("extracts session ID from properties.info.sessionID for message.updated", () => {
      const resolver = createSessionRoleResolver()
      const event = assistantMessageUpdated("sess-extract-msg", "primary")
      expect(resolver.extractSessionID(event)).toBe("sess-extract-msg")
    })

    // ── Unchanged: existing extraction paths still work ────────────────

    it("top-level sessionID still takes priority for session.created when present", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.created",
        sessionID: "sess-top-priority",
        properties: {
          info: { id: "sess-info-fallback", projectID: "p", directory: "/", title: "t", version: "1", time: { created: 0, updated: 0 } },
        },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-top-priority")
    })
  })

  describe("nullish and malformed event safety", () => {
    it("observe does not throw on null", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.observe(null)).not.toThrow()
    })

    it("observe does not throw on undefined", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.observe(undefined)).not.toThrow()
    })

    it("observe does not throw on a number", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.observe(42)).not.toThrow()
    })

    it("observe does not throw on a string", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.observe("event")).not.toThrow()
    })

    it("observe does not throw on a boolean", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.observe(true)).not.toThrow()
    })

    it("observe does not throw when properties is null", () => {
      const resolver = createSessionRoleResolver()
      expect(() =>
        resolver.observe({ type: "test", properties: null }),
      ).not.toThrow()
    })

    it("observe does not throw when properties.info is null", () => {
      const resolver = createSessionRoleResolver()
      expect(() =>
        resolver.observe({
          type: "message.updated",
          properties: { info: null },
        }),
      ).not.toThrow()
    })

    it("extractSessionID does not throw on null", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.extractSessionID(null)).not.toThrow()
      expect(resolver.extractSessionID(null)).toBeUndefined()
    })

    it("extractSessionID does not throw on undefined", () => {
      const resolver = createSessionRoleResolver()
      expect(() => resolver.extractSessionID(undefined)).not.toThrow()
      expect(resolver.extractSessionID(undefined)).toBeUndefined()
    })

    it("extractSessionID does not throw on non-object primitives", () => {
      const resolver = createSessionRoleResolver()
      expect(resolver.extractSessionID(42)).toBeUndefined()
      expect(resolver.extractSessionID("str")).toBeUndefined()
      expect(resolver.extractSessionID(true)).toBeUndefined()
    })
  })

  // ── Root session lookup (T1: getRootSessionID) ────────────────────────
  //
  // Tests for parent-chain root resolution:
  //   - Root session (no parentID) returns itself
  //   - Child session resolves to its root parent
  //   - Grandchild session resolves to root grandparent
  //   - Unknown/unobserved parent returns undefined (safe fallback)
  //   - Deleted session returns undefined
  //   - TTL-expired session facts return undefined
  //   - Cyclic parent chains return undefined (bounded traversal)

  describe("getRootSessionID — root lookup", () => {
    // Fixture helpers (local to this describe block for clarity)
    function sessionCreated(sessionID: string, overrides?: { parentID?: string }) {
      return {
        type: "session.created" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            parentID: overrides?.parentID,
            time: { created: 1000, updated: 1000 },
          },
        },
      }
    }

    function sessionDeleted(sessionID: string) {
      return {
        type: "session.deleted" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            time: { created: 1000, updated: 1000 },
          },
        },
      }
    }

    it("root session (no parentID) returns itself", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("root-1"))
      expect(resolver.getRootSessionID("root-1")).toBe("root-1")
    })

    it("child session resolves to its root parent", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("root-2"))
      resolver.observe(sessionCreated("child-2", { parentID: "root-2" }))
      expect(resolver.getRootSessionID("child-2")).toBe("root-2")
    })

    it("grandchild session resolves to root grandparent", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("root-3"))
      resolver.observe(sessionCreated("child-3", { parentID: "root-3" }))
      resolver.observe(sessionCreated("grandchild-3", { parentID: "child-3" }))
      expect(resolver.getRootSessionID("grandchild-3")).toBe("root-3")
    })

    it("child with unobserved parent returns undefined", () => {
      const resolver = createSessionRoleResolver()
      // child-4 has parentID "unknown-parent", but we never observed "unknown-parent"
      resolver.observe(sessionCreated("child-4", { parentID: "unknown-parent" }))
      expect(resolver.getRootSessionID("child-4")).toBeUndefined()
    })

    it("unobserved session returns undefined", () => {
      const resolver = createSessionRoleResolver()
      expect(resolver.getRootSessionID("never-observed")).toBeUndefined()
    })

    it("deleted session no longer resolves as root", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("root-deleted"))
      expect(resolver.getRootSessionID("root-deleted")).toBe("root-deleted")

      resolver.observe(sessionDeleted("root-deleted"))
      expect(resolver.getRootSessionID("root-deleted")).toBeUndefined()
    })

    it("deleted ancestor no longer resolves child to root", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe(sessionCreated("root-del-anc"))
      resolver.observe(sessionCreated("child-del-anc", { parentID: "root-del-anc" }))

      expect(resolver.getRootSessionID("child-del-anc")).toBe("root-del-anc")

      // Delete the root — child chain is broken
      resolver.observe(sessionDeleted("root-del-anc"))
      expect(resolver.getRootSessionID("child-del-anc")).toBeUndefined()
    })

    it("TTL-expired session facts return undefined for root lookup", () => {
      let currentTime = 0
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({ ttlMs, now: () => currentTime })

      currentTime = 0
      resolver.observe(sessionCreated("root-ttl"))
      resolver.observe(sessionCreated("child-ttl", { parentID: "root-ttl" }))
      expect(resolver.getRootSessionID("child-ttl")).toBe("root-ttl")

      // Advance past TTL
      currentTime = 6000
      // Observe something to trigger pruning
      resolver.observe(sessionCreated("other", { parentID: "x" }))

      expect(resolver.getRootSessionID("root-ttl")).toBeUndefined()
      expect(resolver.getRootSessionID("child-ttl")).toBeUndefined()
    })

    it("TTL-expired root returns undefined even without pruning trigger", () => {
      let currentTime = 0
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({ ttlMs, now: () => currentTime })

      currentTime = 0
      resolver.observe(sessionCreated("root-ttl-direct"))
      expect(resolver.getRootSessionID("root-ttl-direct")).toBe("root-ttl-direct")

      currentTime = 6000
      expect(resolver.getRootSessionID("root-ttl-direct")).toBeUndefined()
    })

    it("cyclic parent chain returns undefined without infinite loop", () => {
      const resolver = createSessionRoleResolver()
      // A → B → A (cycle)
      resolver.observe(sessionCreated("cycle-a", { parentID: "cycle-b" }))
      resolver.observe(sessionCreated("cycle-b", { parentID: "cycle-a" }))
      expect(resolver.getRootSessionID("cycle-a")).toBeUndefined()
      expect(resolver.getRootSessionID("cycle-b")).toBeUndefined()
    })

    it("three-node cycle returns undefined without infinite loop", () => {
      const resolver = createSessionRoleResolver()
      // A → B → C → A
      resolver.observe(sessionCreated("cycle-3a", { parentID: "cycle-3c" }))
      resolver.observe(sessionCreated("cycle-3b", { parentID: "cycle-3a" }))
      resolver.observe(sessionCreated("cycle-3c", { parentID: "cycle-3b" }))
      expect(resolver.getRootSessionID("cycle-3a")).toBeUndefined()
    })

    it("session.updated also stores parentID for root lookup", () => {
      const resolver = createSessionRoleResolver()
      const sessionUpdated = (sessionID: string, overrides?: { parentID?: string }) => ({
        type: "session.updated" as const,
        properties: {
          info: {
            id: sessionID,
            projectID: "proj-test",
            directory: "/test",
            title: "Test session",
            version: "1",
            parentID: overrides?.parentID,
            time: { created: 1000, updated: 1000 },
          },
        },
      })

      resolver.observe(sessionUpdated("root-upd"))
      resolver.observe(sessionUpdated("child-upd", { parentID: "root-upd" }))
      expect(resolver.getRootSessionID("child-upd")).toBe("root-upd")
    })

    it("root lookup preserves existing role classification behavior", () => {
      const resolver = createSessionRoleResolver()
      // Root session observed + primary assistant message → orchestrator
      resolver.observe(sessionCreated("root-role"))
      resolver.observe({
        type: "message.updated" as const,
        properties: {
          info: {
            id: "msg-root-role",
            sessionID: "root-role",
            role: "assistant" as const,
            parentID: "",
            modelID: "model-test",
            providerID: "provider-test",
            mode: "primary",
            path: { cwd: "/test", root: "/test" },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            time: { created: 1000 },
          },
        },
      })

      // Root lookup still works
      expect(resolver.getRootSessionID("root-role")).toBe("root-role")
      // Role classification is unchanged
      expect(resolver.getRole("root-role")).toBe("orchestrator")
    })

    it("child with parent chain where mid-ancestor is missing returns undefined", () => {
      const resolver = createSessionRoleResolver()
      // grandchild → child (observed) → root (NOT observed, so parent chain broken)
      resolver.observe(sessionCreated("child-mid", { parentID: "root-mid-missing" }))
      resolver.observe(sessionCreated("grandchild-mid", { parentID: "child-mid" }))
      expect(resolver.getRootSessionID("grandchild-mid")).toBeUndefined()
    })
  })
})
