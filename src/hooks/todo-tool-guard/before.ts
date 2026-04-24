import { normalizeTodos, buildSnapshot } from "../todo-state"
import { BLOCK_MESSAGE } from "./constants"
import type { RoleResolver, BeforeInput, BeforeOutput } from "./types"

export interface GuardCtx {
  client: {
    session: {
      todo: (input: { path: { id: string } }) => Promise<unknown>
    }
  }
}

export interface PendingSnapshotEntry {
  snapshot: string
  createdAt: number
}

/**
 * Returns true if the tool call is exempt from TODO-first blocking.
 *
 * Exempt tools:
 * - `todowrite` — always allowed
 * - `skill` when called with `{ name: "todo-sync" }` — always allowed
 */
export function isExempt(tool: string, args: unknown): boolean {
  if (tool === "todowrite") return true
  if (tool === "skill") {
    if (args != null && typeof args === "object") {
      const a = args as Record<string, unknown>
      if (a.name === "todo-sync") return true
    }
  }
  return false
}

export function createBeforeHandler(
  ctx: GuardCtx,
  roleResolver: RoleResolver,
  pendingSnapshots: Map<string, PendingSnapshotEntry>,
  now: () => number,
  ttlMs: number,
) {
  function prunePendingSnapshots(): void {
    const cutoff = now() - ttlMs
    for (const [key, entry] of pendingSnapshots) {
      if (entry.createdAt < cutoff) {
        pendingSnapshots.delete(key)
      }
    }
  }

  return async function before(
    input: BeforeInput,
    output: BeforeOutput,
  ): Promise<void> {
    const role = roleResolver.getRole(input.sessionID)

    // Only orchestrator sessions are blocked
    if (role !== "orchestrator") return

    // For todowrite: capture pre-call snapshot for same-call comparison in after-hook
    if (input.tool === "todowrite") {
      prunePendingSnapshots()
      const raw = await ctx.client.session.todo({ path: { id: input.sessionID } })
      const todos = normalizeTodos(raw)
      const snapshot = buildSnapshot(todos)
      pendingSnapshots.set(`${input.sessionID}:${input.callID}`, { snapshot, createdAt: now() })
      return
    }

    // Exempt tools always pass (but don't capture snapshot)
    if (isExempt(input.tool, output.args)) return

    // Fetch TODO state
    const raw = await ctx.client.session.todo({ path: { id: input.sessionID } })
    const todos = normalizeTodos(raw)

    // Block when no TODO state exists
    if (todos.length === 0) {
      throw new Error(BLOCK_MESSAGE)
    }
  }
}
