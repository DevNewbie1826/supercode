import { createBeforeHandler, type PendingSnapshotEntry } from "./before"
import { createAfterHandler } from "./after"
import { createGuardState } from "./state"
import { DEFAULT_STATE_TTL_MS } from "./constants"
import type { GuardCtx } from "./before"
import type { RoleResolver } from "./types"

export type { GuardCtx } from "./before"

interface GuardOptions {
  roleResolver: RoleResolver
  ttlMs?: number
  now?: () => number
}

export function createTodoToolGuard(ctx: GuardCtx, options: GuardOptions) {
  const ttlMs = options.ttlMs ?? DEFAULT_STATE_TTL_MS
  const now = options.now ?? Date.now
  const guardState = createGuardState({ ttlMs, now })
  const pendingSnapshots = new Map<string, PendingSnapshotEntry>()
  const before = createBeforeHandler(ctx, options.roleResolver, pendingSnapshots, now, ttlMs)
  const after = createAfterHandler(ctx, options.roleResolver, guardState, pendingSnapshots, now, ttlMs)
  return { before, after }
}
