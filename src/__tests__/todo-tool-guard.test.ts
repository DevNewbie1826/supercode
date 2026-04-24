import { describe, expect, it } from "bun:test"
import { createTodoToolGuard } from "../hooks/todo-tool-guard"
import type { SessionRole } from "../hooks/session-role-resolver"

// ─── Contract types (mirror production surface exactly) ────────────

interface TodoItem {
  content: string
  status: string
  priority: string
  [key: string]: unknown
}

interface GuardCtx {
  client: {
    session: {
      todo: () => Promise<TodoItem[]>
    }
  }
}

interface RoleResolver {
  getRole: (sessionID: string) => SessionRole
}

interface BeforeInput {
  tool: string
  sessionID: string
  callID: string
}

interface BeforeOutput {
  args: unknown
}

interface AfterInput {
  tool: string
  sessionID: string
  callID: string
  args: unknown
}

interface AfterOutput {
  title: string
  output?: unknown
  metadata?: unknown
}

// ─── Helpers ───────────────────────────────────────────────────────

const SAMPLE_TODOS: TodoItem[] = [
  { content: "task a", status: "in_progress", priority: "high" },
]

function makeCtx(todos: TodoItem[] = []): GuardCtx {
  return { client: { session: { todo: () => Promise.resolve(todos) } } }
}

function makeMutatingCtx(getTodos: () => TodoItem[]): GuardCtx {
  return { client: { session: { todo: () => Promise.resolve(getTodos()) } } }
}

function makeGuard(
  role: SessionRole,
  ctx?: GuardCtx,
): ReturnType<typeof createTodoToolGuard> {
  const roleResolver: RoleResolver = { getRole: () => role }
  return createTodoToolGuard(ctx ?? makeCtx(SAMPLE_TODOS), { roleResolver })
}

/** Snapshot an AfterOutput's output + metadata for untouched comparison. */
function snapshot(output: AfterOutput): { output: unknown; metadata: unknown } {
  return {
    output: typeof output.output === "object" && output.output !== null
      ? { ...(output.output as Record<string, unknown>) }
      : output.output,
    metadata: output.metadata != null
      ? { ...(output.metadata as Record<string, unknown>) }
      : undefined,
  }
}

/** Assert that an AfterOutput was not modified by the guard (no reminder attached). */
function expectNoReminder(
  output: AfterOutput,
  original: ReturnType<typeof snapshot>,
  outputRef?: unknown,
): void {
  // output must be exactly unchanged
  if (typeof original.output === "string") {
    expect(output.output).toBe(original.output)
  } else if (outputRef !== undefined) {
    // Object reference must be preserved — guard did not replace it
    expect(output.output).toBe(outputRef)
  }
  // metadata must be fully stable
  if (original.metadata === undefined) {
    expect(output.metadata).toBeUndefined()
  } else {
    const meta = output.metadata as Record<string, unknown> | undefined
    const origMeta = original.metadata as Record<string, unknown>
    expect(meta).toBeDefined()
    // No reminder key injected
    expect(meta!.todoToolGuardReminder).toBeUndefined()
    // All original metadata keys preserved with same values
    for (const key of Object.keys(origMeta)) {
      expect(meta![key]).toEqual(origMeta[key])
    }
  }
}

/** Narrow metadata to a record for assertions. */
function metadataOf(output: AfterOutput): Record<string, unknown> {
  return output.metadata as Record<string, unknown>
}

/** Narrow output to string for assertions. */
function textOf(output: AfterOutput): string {
  return output.output as string
}

let _primeSeq = 0

/** Drive the after hook through `count` non-todowrite calls for a given session. */
async function primeAfterCalls(
  guard: ReturnType<typeof createTodoToolGuard>,
  count: number,
  sessionID: string,
): Promise<void> {
  const prefix = `p${_primeSeq++}`
  for (let i = 0; i < count; i++) {
    await guard.after(
      { tool: "read", sessionID, callID: `${prefix}_${i}`, args: {} },
      { title: "tool result", output: `prior_${i}` },
    )
  }
}

/** Create a fresh AfterOutput for negative assertions. */
function freshOutput(text: string, metadata?: Record<string, unknown>): AfterOutput {
  return metadata
    ? { title: "result", output: text, metadata: { ...metadata } }
    : { title: "result", output: text }
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("TodoToolGuard", () => {
  // ── before guard: orchestrator with no TODO ──────────────────────

  describe("before guard – orchestrator, no TODO state", () => {
    it("blocks non-exempt tool when todo is empty array", async () => {
      const guard = makeGuard("orchestrator", makeCtx([]))
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("blocks non-exempt tool when todo returns null", async () => {
      const ctx = {
        client: { session: { todo: () => Promise.resolve(null) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("blocks non-exempt tool when todo returns undefined", async () => {
      const ctx = {
        client: { session: { todo: () => Promise.resolve(undefined) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("blocks non-exempt tool when todo returns a non-array value", async () => {
      const ctx = {
        client: { session: { todo: () => Promise.resolve("not an array") } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("allows todowrite when todo is empty", async () => {
      const guard = makeGuard("orchestrator", makeCtx([]))
      await expect(
        guard.before(
          { tool: "todowrite", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).resolves.toBeUndefined()
    })

    it("allows skill tool with name 'todo-sync' when todo is empty", async () => {
      const guard = makeGuard("orchestrator", makeCtx([]))
      await expect(
        guard.before(
          { tool: "skill", sessionID: "ses_1", callID: "c1" },
          { args: { name: "todo-sync" } },
        ),
      ).resolves.toBeUndefined()
    })

    it("blocks skill tool when name is not 'todo-sync'", async () => {
      const guard = makeGuard("orchestrator", makeCtx([]))
      await expect(
        guard.before(
          { tool: "skill", sessionID: "ses_1", callID: "c1" },
          { args: { name: "plan" } },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("blocks skill tool when args have no name field", async () => {
      const guard = makeGuard("orchestrator", makeCtx([]))
      await expect(
        guard.before(
          { tool: "skill", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })
  })

  // ── before guard: orchestrator with existing TODO ────────────────

  describe("before guard – orchestrator, existing TODO state", () => {
    it("allows non-exempt tool when todo exists", async () => {
      const guard = makeGuard("orchestrator")
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).resolves.toBeUndefined()
    })

    it("allows todowrite when todo exists", async () => {
      const guard = makeGuard("orchestrator")
      await expect(
        guard.before(
          { tool: "todowrite", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).resolves.toBeUndefined()
    })
  })

  // ── before guard: non-orchestrator roles are never blocked ───────

  describe("before guard – non-orchestrator roles not blocked", () => {
    for (const role of ["executor", "other", "unknown"] as SessionRole[]) {
      it(`does not block '${role}' session with empty todo`, async () => {
        const guard = makeGuard(role, makeCtx([]))
        await expect(
          guard.before(
            { tool: "read", sessionID: "ses_1", callID: "c1" },
            { args: {} },
          ),
        ).resolves.toBeUndefined()
      })
    }
  })

  // ── before guard: getRole receives sessionID ─────────────────────

  describe("before guard – getRole invoked with input sessionID", () => {
    it("passes sessionID from the tool input to roleResolver.getRole", async () => {
      const receivedIDs: string[] = []
      const roleResolver: RoleResolver = { getRole: (id) => { receivedIDs.push(id); return "executor" } }
      const guard = createTodoToolGuard(makeCtx([]), { roleResolver })
      await guard.before(
        { tool: "read", sessionID: "ses_target", callID: "c1" },
        { args: {} },
      )
      expect(receivedIDs).toContain("ses_target")
    })
  })

  // ── after guard: stale reminder at 20-call interval ──────────────

  describe("after guard – stale reminder every 20 non-todowrite calls", () => {
    it("does not attach reminder before 20 non-todowrite calls", async () => {
      const guard = makeGuard("orchestrator")
      for (let i = 0; i < 5; i++) {
        const out = freshOutput(`text ${i}`)
        const snap = snapshot(out)
        await guard.after(
          { tool: "read", sessionID: "ses_1", callID: `c${i}`, args: {} },
          out,
        )
        expectNoReminder(out, snap)
      }
    })

    it("attaches reminder on the 20th non-todowrite call", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      const output: AfterOutput = { title: "result", output: "text 20" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("fires reminder again on the 40th non-todowrite call without snapshot change", async () => {
      const guard = makeGuard("orchestrator")
      // 20 calls — first reminder fires
      await primeAfterCalls(guard, 20, "ses_1")

      // 19 more calls (total 39) — second reminder not yet due
      await primeAfterCalls(guard, 19, "ses_1")

      // 40th call — second reminder fires
      const output: AfterOutput = { title: "result", output: "text 40" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c40", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("isolates counters per session", async () => {
      const guard = makeGuard("orchestrator")
      // 19 calls for session A
      await primeAfterCalls(guard, 19, "ses_A")
      // 18 calls for session B (next call is 19th, not 20th)
      await primeAfterCalls(guard, 18, "ses_B")

      // 20th for session A → reminder
      const outA: AfterOutput = { title: "result", output: "sesA_20" }
      await guard.after(
        { tool: "read", sessionID: "ses_A", callID: "ca20", args: {} },
        outA,
      )
      expect(textOf(outA)).toContain("TODO")

      // 19th for session B → no reminder
      const outB = freshOutput("sesB_19")
      const snapB = snapshot(outB)
      await guard.after(
        { tool: "read", sessionID: "ses_B", callID: "cb19", args: {} },
        outB,
      )
      expectNoReminder(outB, snapB)
    })
  })

  // ── after guard: todowrite does not add reminder or advance cadence

  describe("after guard – todowrite does not trigger reminder or advance cadence", () => {
    it("todowrite does not attach a reminder even after 19 prior non-todowrite calls", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )
      const out = freshOutput("todo written")
      const snap = snapshot(out)
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("todowrite does not advance the stale counter", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      // todowrite in between — does not count
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // 20th non-todowrite call — should still trigger reminder
      const output: AfterOutput = { title: "result", output: "text 20" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })
  })

  // ── after guard: output shape handling ───────────────────────────

  describe("after guard – output shape handling", () => {
    it("appends reminder to plain text output.output string", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      const original = "plain text result"
      const output: AfterOutput = { title: "result", output: original }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      const text = textOf(output)
      // Append semantics: original text preserved at start, reminder follows
      expect(text.startsWith(original)).toBe(true)
      expect(text.length).toBeGreaterThan(original.length)
      expect(text.substring(original.length)).toContain("TODO")
    })

    it("routes reminder to metadata for JSON-like output.output string", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      const output: AfterOutput = {
        title: "result",
        output: '{"key":"value"}',
        metadata: { existing: true },
      }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(output.output).toBe('{"key":"value"}')
      const meta = metadataOf(output)
      expect(typeof meta.todoToolGuardReminder).toBe("string")
      expect(meta.todoToolGuardReminder).toContain("TODO")
      expect(meta.existing).toBe(true)
    })

    it("creates metadata object when absent for JSON-like output", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      const output: AfterOutput = {
        title: "result",
        output: '{"data":123}',
      }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(output.output).toBe('{"data":123}')
      expect(output.metadata).toBeDefined()
      const meta = metadataOf(output)
      expect(typeof meta.todoToolGuardReminder).toBe("string")
    })

    it("preserves structured object output and adds metadata reminder", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      const payload = { files: ["a.ts", "b.ts"], count: 2 }
      const output: AfterOutput = {
        title: "structured result",
        output: payload,
        metadata: { type: "search", result: payload },
      }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      // output object reference preserved
      expect(output.output).toBe(payload)
      const meta = metadataOf(output)
      expect(meta.type).toBe("search")
      expect(meta.result).toBe(payload)
      expect(typeof meta.todoToolGuardReminder).toBe("string")
    })

    it("structured object output stays untouched when reminder is not due", async () => {
      const guard = makeGuard("orchestrator")
      // Only 5 calls — well before the 20-call threshold
      await primeAfterCalls(guard, 5, "ses_1")

      const payload = { files: ["x.ts"], count: 1 }
      const out: AfterOutput = {
        title: "result",
        output: payload,
        metadata: { type: "search" },
      }
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c6", args: {} },
        out,
      )
      expectNoReminder(out, snap)
      // Object reference still intact
      expect(out.output).toBe(payload)
    })
  })

  // ── after guard: snapshot comparison contract (same-call) ──────────
  //
  // These tests verify the same-call snapshot comparison contract:
  // The before-hook captures a pre-todowrite snapshot, and the after-hook
  // compares it against the post-todowrite snapshot for that same callID.
  // The stale counter resets only when the snapshot changed during that
  // specific todowrite invocation.

  describe("after guard – same-call todowrite snapshot comparison resets counter", () => {
    it("resets stale counter when todowrite changes snapshot between before and after", async () => {
      let current: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      const guard = createTodoToolGuard(makeMutatingCtx(() => current), { roleResolver })

      await primeAfterCalls(guard, 19, "ses_1")

      // before-hook captures pre-call snapshot of current state
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Mutate state between before and after — simulates the todowrite changing TODOs
      current = [
        { content: "task a", status: "completed", priority: "high" },
        { content: "task b", status: "pending", priority: "medium" },
      ]

      // after-hook sees a different snapshot → counter resets
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter reset — next call should NOT trigger reminder
      const out = freshOutput("after reset")
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("does not reset counter when todowrite snapshot is identical between before and after", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      // before-hook captures snapshot
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // No mutation — snapshot identical

      // after-hook sees same snapshot → counter NOT reset
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter NOT reset — next non-todowrite should trigger reminder
      const output: AfterOutput = { title: "result", output: "after no-change" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("snapshot is sensitive to original item order (same-call)", async () => {
      let current: TodoItem[] = [
        { content: "task a", status: "pending", priority: "high" },
        { content: "task b", status: "pending", priority: "medium" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      const guard = createTodoToolGuard(makeMutatingCtx(() => current), { roleResolver })

      await primeAfterCalls(guard, 19, "ses_1")

      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Reorder items — same items, different order → snapshot changes
      current = [
        { content: "task b", status: "pending", priority: "medium" },
        { content: "task a", status: "pending", priority: "high" },
      ]

      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter was reset, so no reminder
      const out = freshOutput("after reorder")
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("does not reset counter when only non-contract fields change (same-call)", async () => {
      let current: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high", extra: "v1", id: "abc" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      const guard = createTodoToolGuard(makeMutatingCtx(() => current), { roleResolver })

      await primeAfterCalls(guard, 19, "ses_1")

      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Change only fields outside the content/status/priority contract
      current = [
        { content: "task a", status: "in_progress", priority: "high", extra: "v2", id: "xyz" },
      ]

      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Snapshot unchanged → counter NOT reset → next call triggers reminder
      const output: AfterOutput = { title: "result", output: "after non-contract change" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("uses before-call snapshot even when session baseline differs", async () => {
      // This tests that same-call comparison uses the pre-call snapshot,
      // not the session-level lastSnapshot baseline
      let current: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      const guard = createTodoToolGuard(makeMutatingCtx(() => current), { roleResolver })

      // Advance counter to 5
      await primeAfterCalls(guard, 5, "ses_1")

      // Change state (without todowrite — simulating external change)
      current = [
        { content: "task a", status: "completed", priority: "high" },
      ]

      // Advance counter to 10
      await primeAfterCalls(guard, 5, "ses_1")

      // Now do a todowrite that does NOT change state (before and after are identical)
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )
      // No mutation — same state
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter NOT reset (same-call showed no change) → 10 more calls = 20 total
      await primeAfterCalls(guard, 9, "ses_1")
      const output: AfterOutput = { title: "result", output: "text 20" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })
  })

  // ── after guard: skill(todo-sync) is NOT a refreshing path ────────
  // skill(todo-sync) is exempt from before-hook blocking only.
  // In the after-hook it is treated like any other non-todowrite tool:
  // it advances the stale counter and can trigger reminders.

  describe("after guard – skill(todo-sync) advances stale counter like any non-todowrite tool", () => {
    it("skill(todo-sync) advances the stale counter", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      // skill(todo-sync) — advances counter to 20, triggers reminder
      const output: AfterOutput = { title: "result", output: "skill loaded" }
      await guard.after(
        { tool: "skill", sessionID: "ses_1", callID: "cs", args: { name: "todo-sync" } },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("skill with non-todo-sync name also advances counter", async () => {
      const guard = makeGuard("orchestrator")
      await primeAfterCalls(guard, 19, "ses_1")

      // skill(plan) — advances counter to 20, triggers reminder
      const output: AfterOutput = { title: "result", output: "plan loaded" }
      await guard.after(
        { tool: "skill", sessionID: "ses_1", callID: "c20", args: { name: "plan" } },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })
  })

  // ── before guard: request-result shape { data: [...] } ────────────

  describe("before guard – request-result shape { data: [...] }", () => {
    it("allows non-exempt tool when todo returns { data: [...] } with items", async () => {
      const todos: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const ctx = {
        client: { session: { todo: () => Promise.resolve({ data: todos }) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).resolves.toBeUndefined()
    })

    it("blocks non-exempt tool when todo returns { data: [] }", async () => {
      const ctx = {
        client: { session: { todo: () => Promise.resolve({ data: [] }) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })

    it("blocks non-exempt tool when todo returns { data: null }", async () => {
      const ctx = {
        client: { session: { todo: () => Promise.resolve({ data: null }) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)
      await expect(
        guard.before(
          { tool: "read", sessionID: "ses_1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })
  })

  // ── after guard: request-result shape { data: [...] } snapshot ───

  describe("after guard – request-result shape { data: [...] } snapshot tracking", () => {
    it("tracks same-call snapshot changes through request-result shape and resets stale counter", async () => {
      let current: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      // Wrap in request-result shape
      const ctx = {
        client: { session: { todo: () => Promise.resolve({ data: current }) } },
      } as unknown as GuardCtx
      const guard = createTodoToolGuard(ctx, { roleResolver })

      await primeAfterCalls(guard, 10, "ses_1")

      // before-hook captures pre-call snapshot via request-result shape
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Mutate between before and after
      current = [
        { content: "task a", status: "completed", priority: "high" },
        { content: "task b", status: "pending", priority: "medium" },
      ]

      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter reset — next call should NOT trigger reminder
      const out = freshOutput("after request-result reset")
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("treats { data: [] } as empty and does not seed a snapshot baseline that blocks future resets", async () => {
      const todos: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const ctx = {
        client: { session: { todo: () => Promise.resolve({ data: todos }) } },
      } as unknown as GuardCtx
      const guard = makeGuard("orchestrator", ctx)

      // 20 calls should trigger reminder when snapshot never changes
      await primeAfterCalls(guard, 19, "ses_1")
      const output: AfterOutput = { title: "result", output: "text 20" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })
  })

  // ── after guard: getRole receives sessionID ──────────────────────

  describe("after guard – getRole invoked with input sessionID", () => {
    it("passes sessionID from the after input to roleResolver.getRole", async () => {
      const receivedIDs: string[] = []
      const roleResolver: RoleResolver = { getRole: (id) => { receivedIDs.push(id); return "executor" } }
      const guard = createTodoToolGuard(makeCtx(SAMPLE_TODOS), { roleResolver })

      await guard.after(
        { tool: "read", sessionID: "ses_after_target", callID: "c1", args: {} },
        { title: "result", output: "ok" },
      )
      expect(receivedIDs).toContain("ses_after_target")
    })
  })

  // ── after guard: non-orchestrator sessions not reminded ──────────

  describe("after guard – non-orchestrator sessions skipped", () => {
    for (const role of ["executor", "other", "unknown"] as SessionRole[]) {
      it(`does not attach reminders for '${role}' sessions`, async () => {
        const guard = makeGuard(role)
        for (let i = 0; i < 20; i++) {
          const out = freshOutput(`text ${i}`)
          const snap = snapshot(out)
          await guard.after(
            { tool: "read", sessionID: "ses_1", callID: `c${i}`, args: {} },
            out,
          )
          expectNoReminder(out, snap)
        }
      })
    }
  })

  // ── bounded state: TTL-based pruning ──────────────────────────────

  describe("bounded state – TTL-based pruning", () => {
    const TTL_MS = 60 * 1000 // 1 minute for readable tests

    function makeTimedGuard(
      role: SessionRole,
      ctx?: GuardCtx,
      timeMs: number = 0,
    ): {
      guard: ReturnType<typeof createTodoToolGuard>
      advanceTime: (ms: number) => void
    } {
      let currentTime = timeMs
      const advanceTime = (ms: number) => { currentTime += ms }
      const roleResolver: RoleResolver = { getRole: () => role }
      const guard = createTodoToolGuard(ctx ?? makeCtx(SAMPLE_TODOS), {
        roleResolver,
        ttlMs: TTL_MS,
        now: () => currentTime,
      })
      return { guard, advanceTime }
    }

    it("stale session state is pruned after TTL expires", async () => {
      const { guard, advanceTime } = makeTimedGuard("orchestrator")

      // Prime 19 calls — session state is created with staleCount=19
      await primeAfterCalls(guard, 19, "ses_1")

      // Advance past TTL — session state should be evicted
      advanceTime(TTL_MS + 1)

      // Next call creates fresh state — staleCount starts from 0
      // Without pruning, staleCount would be 20 and trigger reminder
      const out = freshOutput("after ttl expiry")
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "after_ttl", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("session state is NOT pruned before TTL expires", async () => {
      const { guard, advanceTime } = makeTimedGuard("orchestrator")

      // Prime 19 calls
      await primeAfterCalls(guard, 19, "ses_1")

      // Advance just short of TTL
      advanceTime(TTL_MS - 1)

      // State still alive — staleCount=19, next call is 20th → reminder
      const output: AfterOutput = { title: "result", output: "text 20" }
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c20", args: {} },
        output,
      )
      expect(textOf(output)).toContain("TODO")
    })

    it("active session state gets its TTL refreshed on access", async () => {
      const { guard, advanceTime } = makeTimedGuard("orchestrator")

      // Prime 10 calls
      await primeAfterCalls(guard, 10, "ses_1")

      // Access the session repeatedly, each time advancing almost to TTL
      for (let i = 0; i < 5; i++) {
        advanceTime(TTL_MS - 1)
        await guard.after(
          { tool: "read", sessionID: "ses_1", callID: `keepalive_${i}`, args: {} },
          { title: "keepalive", output: `ka_${i}` },
        )
      }

      // 10 + 5 = 15 total non-todowrite calls — no reminder yet
      advanceTime(TTL_MS - 1)
      const out = freshOutput("count 15")
      const snap = snapshot(out)
      await guard.after(
        { tool: "read", sessionID: "ses_1", callID: "c15", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })

    it("orphaned pending snapshots expire after TTL instead of living forever", async () => {
      const { guard, advanceTime } = makeTimedGuard("orchestrator")

      // before-hook captures a pending snapshot
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Simulate interruption: after-hook is never called for this callID.
      // Advance past TTL — the orphaned pending snapshot should expire.
      advanceTime(TTL_MS + 1)

      // A new todowrite before+after pair should work correctly.
      // The orphaned entry is pruned during the before-hook.
      await guard.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw2" },
        { args: {} },
      )

      // The after-hook for cw2 should NOT find the orphaned cw entry
      // (it was already pruned by the before-hook).
      // It should only find cw2's own pre-call snapshot.
      const out = freshOutput("after second todowrite")
      const snap = snapshot(out)
      await guard.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw2", args: {} },
        out,
      )
      // No reminder (todowrite path) and output unchanged (same snapshot → no reset)
      expectNoReminder(out, snap)
    })

    it("pending snapshot is NOT expired before TTL", async () => {
      const { guard, advanceTime } = makeTimedGuard("orchestrator")
      let current: TodoItem[] = [
        { content: "task a", status: "in_progress", priority: "high" },
      ]
      const roleResolver: RoleResolver = { getRole: () => "orchestrator" }
      let currentTime = 0
      const guardWithMutation = createTodoToolGuard(
        makeMutatingCtx(() => current),
        { roleResolver, ttlMs: TTL_MS, now: () => currentTime },
      )

      await primeAfterCalls(guardWithMutation, 19, "ses_1")

      // before-hook captures pending snapshot
      await guardWithMutation.before(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw" },
        { args: {} },
      )

      // Advance just short of TTL
      currentTime += TTL_MS - 1

      // Mutate state
      current = [
        { content: "task a", status: "completed", priority: "high" },
      ]

      // after-hook should still find the pending snapshot → detect change → reset
      await guardWithMutation.after(
        { tool: "todowrite", sessionID: "ses_1", callID: "cw", args: {} },
        { title: "wrote", output: "ok" },
      )

      // Counter reset — next call should NOT trigger reminder
      const out = freshOutput("after reset")
      const snap = snapshot(out)
      await guardWithMutation.after(
        { tool: "read", sessionID: "ses_1", callID: "c_after", args: {} },
        out,
      )
      expectNoReminder(out, snap)
    })
  })
})
