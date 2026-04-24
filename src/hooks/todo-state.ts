/**
 * Shared TODO normalization and snapshot utilities.
 *
 * Used by both the TODO tool guard and the continuation enforcer so they
 * evaluate the same TODO state.
 */

export interface TodoItem {
  content: string
  status: string
  priority: string
  [key: string]: unknown
}

/**
 * Normalize a raw TODO API response into an array.
 *
 * Accepts either:
 * - A raw array of TodoItem
 * - A request-result object with `{ data: TodoItem[] }`
 *
 * Non-array, null, or undefined results are treated as "no TODO state".
 */
export function normalizeTodos(raw: unknown): TodoItem[] {
  if (Array.isArray(raw)) return raw as TodoItem[]
  // Unwrap request-result shape { data: [...] }
  if (raw != null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as TodoItem[]
  }
  return []
}

/**
 * Check whether at least one TODO is incomplete (not completed/cancelled).
 */
export function hasIncompleteTodo(todos: TodoItem[]): boolean {
  return todos.some(
    (t) => t.status !== "completed" && t.status !== "cancelled",
  )
}

/**
 * Build a deterministic snapshot string from normalized TODO items.
 *
 * Uses only `content`, `status`, and `priority` in existing response order.
 * The snapshot is a JSON string of an array of `{c, s, p}` tuples,
 * ensuring order-sensitivity and field-exclusion.
 */
export function buildSnapshot(todos: TodoItem[]): string {
  const items = todos.map((t) => ({
    c: t.content,
    s: t.status,
    p: t.priority,
  }))
  return JSON.stringify(items)
}
