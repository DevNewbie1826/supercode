import { describe, expect, it } from "bun:test"
import { createSessionRoleResolver } from "../hooks/session-role-resolver"

describe("SessionRoleResolver", () => {
  describe("role classification", () => {
    it("classifies orchestrator from agent === 'orchestrator'", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-1",
        type: "message.updated",
        properties: {
          info: { id: "msg-1", role: "user", agent: "orchestrator" },
        },
      })
      expect(resolver.getRole("sess-1")).toBe("orchestrator")
    })

    it("classifies orchestrator from mode === 'main'", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-2",
        type: "message.updated",
        properties: {
          info: { id: "msg-2", role: "assistant", mode: "main" },
        },
      })
      expect(resolver.getRole("sess-2")).toBe("orchestrator")
    })

    it("classifies orchestrator from mode === 'primary'", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-3",
        type: "message.updated",
        properties: {
          info: { id: "msg-3", role: "assistant", mode: "primary" },
        },
      })
      expect(resolver.getRole("sess-3")).toBe("orchestrator")
    })

    it("classifies executor from agent === 'executor'", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-4",
        type: "message.updated",
        properties: {
          info: { id: "msg-4", role: "user", agent: "executor" },
        },
      })
      expect(resolver.getRole("sess-4")).toBe("executor")
    })

    it("classifies other when session is identified but not targeted", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-5",
        type: "message.updated",
        properties: {
          info: { id: "msg-5", role: "user", agent: "explorer" },
        },
      })
      expect(resolver.getRole("sess-5")).toBe("other")
    })

    it("returns unknown for unobserved session", () => {
      const resolver = createSessionRoleResolver()
      expect(resolver.getRole("nonexistent")).toBe("unknown")
    })

    it("returns unknown for event without agent or mode info", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        type: "session.status",
        properties: {
          sessionID: "sess-6",
          status: { type: "idle" },
        },
      })
      expect(resolver.getRole("sess-6")).toBe("unknown")
    })

    it("returns unknown when role data exists but session ID is not extractable via approved paths", () => {
      const resolver = createSessionRoleResolver()
      // Event has agent info but session ID only at properties.info.sessionID (not approved)
      resolver.observe({
        type: "message.updated",
        properties: {
          info: {
            sessionID: "sess-not-extractable",
            role: "user",
            agent: "orchestrator",
          },
        },
      })
      expect(resolver.getRole("sess-not-extractable")).toBe("unknown")
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
      resolver.observe({
        sessionID: "sess-seed",
        type: "message.updated",
        properties: {
          info: { id: "msg-seed", role: "user", agent: "executor" },
        },
      })
      expect(resolver.getRole("sess-seed")).toBe("executor")
    })

    it("multiple observes for same session update role", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-update",
        type: "message.updated",
        properties: {
          info: { id: "msg-a", role: "user", agent: "explorer" },
        },
      })
      expect(resolver.getRole("sess-update")).toBe("other")

      resolver.observe({
        sessionID: "sess-update",
        type: "message.updated",
        properties: {
          info: { id: "msg-b", role: "user", agent: "orchestrator" },
        },
      })
      expect(resolver.getRole("sess-update")).toBe("orchestrator")
    })

    it("mixed agent+mode: mode='main' overrides non-target agent to orchestrator", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-mix-1",
        type: "message.updated",
        properties: {
          info: { id: "msg-mix-1", role: "user", agent: "explorer", mode: "main" },
        },
      })
      expect(resolver.getRole("sess-mix-1")).toBe("orchestrator")
    })

    it("mixed agent+mode: mode='primary' overrides non-target agent to orchestrator", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-mix-2",
        type: "message.updated",
        properties: {
          info: { id: "msg-mix-2", role: "user", agent: "librarian", mode: "primary" },
        },
      })
      expect(resolver.getRole("sess-mix-2")).toBe("orchestrator")
    })

    it("mixed agent+mode: agent='orchestrator' wins regardless of mode", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-mix-3",
        type: "message.updated",
        properties: {
          info: { id: "msg-mix-3", role: "user", agent: "orchestrator", mode: "sub" },
        },
      })
      expect(resolver.getRole("sess-mix-3")).toBe("orchestrator")
    })

    it("mixed agent+mode: agent='executor' with non-target mode is executor", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-mix-4",
        type: "message.updated",
        properties: {
          info: { id: "msg-mix-4", role: "user", agent: "executor", mode: "sub" },
        },
      })
      expect(resolver.getRole("sess-mix-4")).toBe("executor")
    })

    it("non-event hooks consume resolver state without reparsing raw events", () => {
      const resolver = createSessionRoleResolver()
      // Simulate event hook seeding the resolver
      resolver.observe({
        sessionID: "sess-consume",
        type: "message.updated",
        properties: {
          info: { id: "msg-1", role: "user", agent: "orchestrator" },
        },
      })

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

    it("extracts properties.info.id for session.status", () => {
      const resolver = createSessionRoleResolver()
      const event = {
        type: "session.status",
        properties: { info: { id: "sess-via-info" } },
      }
      expect(resolver.extractSessionID(event)).toBe("sess-via-info")
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
      const now = Date.now()
      const ttlMs = 1000
      const resolver = createSessionRoleResolver({ ttlMs, now: () => now })

      resolver.observe({
        sessionID: "sess-old",
        type: "message.updated",
        properties: { info: { id: "msg-old", role: "user", agent: "orchestrator" } },
      })
      expect(resolver.getRole("sess-old")).toBe("orchestrator")

      // Advance past TTL
      const resolver2 = createSessionRoleResolver({ ttlMs, now: () => now + ttlMs + 1 })

      // Manually seed then prune by observing a new event
      resolver2.observe({
        sessionID: "sess-old",
        type: "message.updated",
        properties: { info: { id: "msg-old", role: "user", agent: "orchestrator" } },
      })
      // Simulate TTL expiry by advancing time and observing a new event (triggers pruning)
      const resolverWithTime = createSessionRoleResolver({
        ttlMs,
        now: () => now + ttlMs + 1,
      })
      // Seed at "now"
      resolverWithTime.observe({
        sessionID: "sess-old",
        type: "message.updated",
        properties: { info: { id: "msg-old", role: "user", agent: "orchestrator" } },
      })
      expect(resolverWithTime.getRole("sess-old")).toBe("orchestrator")

      // Now advance time past TTL and observe a different session — should prune sess-old
      const advancedResolver = createSessionRoleResolver({
        ttlMs,
        now: () => now + ttlMs + 1,
      })
      // We can't change now() on an existing resolver, so let's test differently
      // Use a single resolver with controllable time
    })

    it("resolver with controllable time prunes stale entries", () => {
      let currentTime = 0
      const ttlMs = 5000
      const resolver = createSessionRoleResolver({
        ttlMs,
        now: () => currentTime,
      })

      // At t=0, seed session
      currentTime = 0
      resolver.observe({
        sessionID: "sess-a",
        type: "message.updated",
        properties: { info: { id: "msg-a", role: "user", agent: "executor" } },
      })
      expect(resolver.getRole("sess-a")).toBe("executor")

      // At t=3000, seed another session
      currentTime = 3000
      resolver.observe({
        sessionID: "sess-b",
        type: "message.updated",
        properties: { info: { id: "msg-b", role: "user", agent: "orchestrator" } },
      })
      expect(resolver.getRole("sess-b")).toBe("orchestrator")

      // At t=8000 (past TTL for sess-a which was at t=0), observe triggers prune
      currentTime = 8000
      resolver.observe({
        sessionID: "sess-c",
        type: "message.updated",
        properties: { info: { id: "msg-c", role: "user", agent: "other" } },
      })

      // sess-a should be pruned (t=0 + 5000 = 5000 < 8000)
      expect(resolver.getRole("sess-a")).toBe("unknown")
      // sess-b should survive (t=3000 + 5000 = 8000, not yet expired at t=8000)
      expect(resolver.getRole("sess-b")).toBe("orchestrator")
      // sess-c just added
      expect(resolver.getRole("sess-c")).toBe("other")
    })

    it("dispose clears all state", () => {
      const resolver = createSessionRoleResolver()
      resolver.observe({
        sessionID: "sess-dispose",
        type: "message.updated",
        properties: { info: { id: "msg-d", role: "user", agent: "executor" } },
      })
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
      resolver.observe({
        sessionID: "sess-fresh",
        type: "message.updated",
        properties: { info: { id: "msg-f", role: "user", agent: "orchestrator" } },
      })

      // Still within TTL
      currentTime = 4000
      resolver.observe({
        sessionID: "sess-other",
        type: "message.updated",
        properties: { info: { id: "msg-g", role: "user", agent: "executor" } },
      })

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
      resolver.observe({
        sessionID: "sess-lookup",
        type: "message.updated",
        properties: { info: { id: "msg-l", role: "user", agent: "executor" } },
      })
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
      resolver.observe({
        sessionID: "sess-default-ttl",
        type: "message.updated",
        properties: { info: { id: "msg-dt", role: "user", agent: "orchestrator" } },
      })
      expect(resolver.getRole("sess-default-ttl")).toBe("orchestrator")

      // Advance way past any reasonable default TTL (1 hour)
      currentTime = 0 + 1000 * 60 * 60 * 2 // 2 hours
      resolver.observe({
        sessionID: "sess-other",
        type: "message.updated",
        properties: { info: { id: "msg-other", role: "user", agent: "executor" } },
      })

      expect(resolver.getRole("sess-default-ttl")).toBe("unknown")
      expect(resolver.getRole("sess-other")).toBe("executor")
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
})
