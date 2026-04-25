import { normalizeTodos, buildSnapshot } from "../todo-state"
import { attachReminder } from "../tool-output-shape"
import { STALE_REMINDER_TEXT } from "./constants"
import type { GuardState } from "./state"
import type { RoleResolver, AfterInput, AfterOutput } from "./types"

import type { GuardCtx, PendingSnapshotEntry } from "./before"

export function createAfterHandler(
  ctx: GuardCtx,
  roleResolver: RoleResolver,
  guardState: GuardState,
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

  return async function after(
    input: AfterInput,
    output: AfterOutput,
  ): Promise<void> {
    const role = roleResolver.getRole(input.sessionID)

    // Guard orchestrator and unknown (unseeded main-candidate) sessions
    if (role !== "orchestrator" && role !== "unknown") return

    if (input.tool === "todowrite") {
      // Same-call snapshot comparison:
      // The before-hook captured the pre-call snapshot keyed by sessionID:callID.
      // Compare it against the post-call snapshot to decide reset.
      prunePendingSnapshots()
      const raw = await ctx.client.session.todo({ path: { id: input.sessionID } })
      const todos = normalizeTodos(raw)
      const afterSnapshot = buildSnapshot(todos)
      const key = `${input.sessionID}:${input.callID}`
      const pendingEntry = pendingSnapshots.get(key)
      pendingSnapshots.delete(key)

      const beforeSnapshot = pendingEntry?.snapshot
      const state = guardState.getState(input.sessionID)

      if (beforeSnapshot !== undefined) {
        // Same-call comparison available — compare pre vs post for this invocation
        if (afterSnapshot !== beforeSnapshot) {
          guardState.resetStale(input.sessionID, afterSnapshot)
        } else {
          // No change — still update lastSnapshot baseline
          state.lastSnapshot = afterSnapshot
        }
      } else {
        // No pre-call snapshot (after called without before) — seed or compare against baseline
        if (state.lastSnapshot !== "") {
          if (afterSnapshot !== state.lastSnapshot) {
            guardState.resetStale(input.sessionID, afterSnapshot)
          }
        } else {
          state.lastSnapshot = afterSnapshot
        }
      }
      // todowrite never advances stale counter or attaches reminder
      return
    }

    // Non-todowrite tool: seed initial snapshot if needed
    const state = guardState.getState(input.sessionID)
    if (state.lastSnapshot === "") {
      const raw = await ctx.client.session.todo({ path: { id: input.sessionID } })
      const todos = normalizeTodos(raw)
      state.lastSnapshot = buildSnapshot(todos)
    }

    // Increment stale counter
    guardState.incrementStale(input.sessionID)

    // Check if reminder is due
    if (guardState.shouldTriggerReminder(input.sessionID)) {
      attachReminder(output, STALE_REMINDER_TEXT)

      // Reset counter after firing so next interval starts fresh
      const st = guardState.getState(input.sessionID)
      st.staleCount = 0
    }
  }
}
