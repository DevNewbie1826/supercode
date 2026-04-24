# Supercode Hook System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared hook subsystem to `supercode` with session role resolution, skill bootstrap injection, orchestrator-only TODO guard enforcement, and orchestrator/executor continuation enforcement.

**Architecture:** Introduce `src/hooks/` as a composable subsystem. A shared session role resolver becomes the single source of truth for hook targeting, while `src/index.ts` composes config, tools, hook wiring, and event observation. Behavior is inspired by EasyCode at the policy level only, but reimplemented with Supercode-specific targeting, messaging, and tests.

**Tech Stack:** TypeScript, Bun test runner, `@opencode-ai/plugin`, existing plugin entry/config/tools structure

---

### Task 1: Add red tests for plugin hook wiring

**Files:**
- Modify: `src/__tests__/plugin-mcp.test.ts`
- Test: `src/__tests__/plugin-mcp.test.ts`

- [ ] **Step 1: Add a failing test that expects the new hook exports from `SupercodePlugin`**

```ts
  it("wires hook handlers alongside config and tools", async () => {
    const directory = createDirectoryWithSupercodeConfig(JSON.stringify({}))
    const hooks = await SupercodePlugin({
      client: { app: { log() { return Promise.resolve() } } },
      project: "test-project",
      directory,
      worktree: directory,
      serverUrl: new URL("https://example.com"),
      $: {} as PluginInput["$"],
    } as unknown as PluginInput)

    expect(hooks["tool.execute.before"]).toBeFunction()
    expect(hooks["tool.execute.after"]).toBeFunction()
    expect(hooks.event).toBeFunction()
    expect(hooks["experimental.chat.messages.transform"]).toBeFunction()
  })
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `bun test src/__tests__/plugin-mcp.test.ts`
Expected: FAIL because `src/index.ts` currently only returns `config` and `tool`.

- [ ] **Step 3: Add a failing test for first-user bootstrap injection**

```ts
  it("prepends bootstrap text to the first user message", async () => {
    const directory = createDirectoryWithSupercodeConfig(JSON.stringify({}))
    const hooks = await SupercodePlugin({
      client: { app: { log() { return Promise.resolve() } } },
      project: "test-project",
      directory,
      worktree: directory,
      serverUrl: new URL("https://example.com"),
      $: {} as PluginInput["$"],
    } as unknown as PluginInput, { moduleDir: directory })

    const output = {
      messages: [{
        info: { id: "msg_1", role: "user", sessionID: "ses_1" },
        parts: [{ type: "text", text: "actual request", id: "part_1", sessionID: "ses_1", messageID: "msg_1" }],
      }],
    }

    await hooks["experimental.chat.messages.transform"]?.({}, output as never)

    expect(output.messages[0]?.parts[0]).toMatchObject({
      type: "text",
      synthetic: true,
    })
  })
```

- [ ] **Step 4: Run the focused test again to verify both new tests fail**

Run: `bun test src/__tests__/plugin-mcp.test.ts`
Expected: FAIL because hook wiring and bootstrap transform do not exist yet.

### Task 2: Implement shared session role resolution and bootstrap hook

**Files:**
- Create: `src/hooks/session-role-resolver/types.ts`
- Create: `src/hooks/session-role-resolver/index.ts`
- Create: `src/hooks/skill-bootstrap/index.ts`
- Create: `src/hooks/skill-bootstrap/skill-bootstrap.md`
- Modify: `src/index.ts`
- Test: `src/__tests__/plugin-mcp.test.ts`

- [ ] **Step 1: Add the shared role type definitions**

```ts
export type SessionRole = "orchestrator" | "executor" | "other" | "unknown"

export type SessionRoleResolver = {
  observe: (event: { type: string; properties?: unknown }) => void
  getRole: (sessionID: string) => SessionRole
  dispose: () => void
}
```

- [ ] **Step 2: Implement the minimal resolver with TTL-backed state**

```ts
export function createSessionRoleResolver(options: { ttlMs?: number } = {}): SessionRoleResolver {
  const ttlMs = options.ttlMs ?? 60 * 60 * 1000
  const states = new Map<string, { role: SessionRole; updatedAt: number }>()

  return {
    observe(event) {
      // parse session ID, agent, mode, and parent linkage
      // map recognized main worker to orchestrator, recognized executor to executor
      // fall back to other/unknown and prune stale state
    },
    getRole(sessionID) {
      return states.get(sessionID)?.role ?? "unknown"
    },
    dispose() {
      states.clear()
    },
  }
}
```

- [ ] **Step 3: Add the bootstrap transform that injects one synthetic part on the first user message**

```ts
export function createSkillBootstrapTransform(options: { enabled?: boolean; moduleDir?: string } = {}) {
  return async (_input, output) => {
    // load markdown from skill-bootstrap.md
    // locate first user message
    // skip when bootstrap part already exists
    // prepend one synthetic text part
  }
}
```

- [ ] **Step 4: Create an intentionally blank placeholder bootstrap markdown file**

```md

```

Note: This file is user-owned content. Leave it blank for now.

- [ ] **Step 5: Wire the resolver and bootstrap transform into `SupercodePlugin`**

```ts
  const roleResolver = createSessionRoleResolver()

  return {
    config: createConfigHandler(worktree ?? directory, directory, { moduleDir }),
    tool: createTools(),
    event: async (input) => {
      roleResolver.observe(input.event)
    },
    "experimental.chat.messages.transform": createSkillBootstrapTransform({ moduleDir }),
  }
```

- [ ] **Step 6: Run the focused test to verify hook wiring and bootstrap pass**

Run: `bun test src/__tests__/plugin-mcp.test.ts`
Expected: PASS

### Task 3: Add red tests for orchestrator-only TODO guard

**Files:**
- Create: `src/__tests__/todo-tool-guard.test.ts`
- Test: `src/__tests__/todo-tool-guard.test.ts`

- [ ] **Step 1: Add a failing test that blocks non-exempt tools without TODO state**

```ts
it("blocks orchestrator tool use before todo exists", async () => {
  const client = {
    session: {
      todo: () => Promise.resolve([]),
    },
  }

  const roleResolver = { getRole: () => "orchestrator" as const }
  const guard = createTodoToolGuard({ client } as never, { roleResolver })

  await expect(guard.before({ tool: "read", sessionID: "ses_1", callID: "call_1" }, { args: {} }))
    .rejects.toThrow(/TODO/i)
})
```

- [ ] **Step 2: Add a failing test that allows `todowrite` for orchestrator sessions**

```ts
it("allows todowrite before todo exists", async () => {
  const client = {
    session: {
      todo: () => Promise.resolve([]),
    },
  }

  const roleResolver = { getRole: () => "orchestrator" as const }
  const guard = createTodoToolGuard({ client } as never, { roleResolver })

  await expect(guard.before({ tool: "todowrite", sessionID: "ses_1", callID: "call_1" }, { args: {} }))
    .resolves.toBeUndefined()
})
```

- [ ] **Step 3: Add a failing test that skips enforcement for non-orchestrator sessions**

```ts
it("does not block other session roles", async () => {
  const client = {
    session: {
      todo: () => Promise.resolve([]),
    },
  }

  const roleResolver = { getRole: () => "executor" as const }
  const guard = createTodoToolGuard({ client } as never, { roleResolver })

  await expect(guard.before({ tool: "read", sessionID: "ses_1", callID: "call_1" }, { args: {} }))
    .resolves.toBeUndefined()
})
```

- [ ] **Step 4: Run the focused test to verify all TODO guard tests fail**

Run: `bun test src/__tests__/todo-tool-guard.test.ts`
Expected: FAIL because the guard does not exist yet.

### Task 4: Implement TODO guard and stale reminder behavior

**Files:**
- Create: `src/hooks/tool-output-shape.ts`
- Create: `src/hooks/todo-tool-guard/index.ts`
- Create: `src/hooks/todo-tool-guard/before.ts`
- Create: `src/hooks/todo-tool-guard/after.ts`
- Create: `src/hooks/todo-tool-guard/state.ts`
- Create: `src/hooks/todo-tool-guard/constants.ts`
- Create: `src/hooks/todo-tool-guard/types.ts`
- Modify: `src/index.ts`
- Test: `src/__tests__/todo-tool-guard.test.ts`

- [ ] **Step 1: Add the shared output-shape helper**

```ts
export function isJsonLikeText(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith("{") || trimmed.startsWith("[")
}

export function canAppendText(value: unknown): value is string {
  return typeof value === "string" && !isJsonLikeText(value)
}

export function isMetadataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
```

- [ ] **Step 2: Implement the state store and constants**

```ts
export const REMINDER_INTERVAL = 20
export const SESSION_TTL_MS = 60 * 60 * 1000
export const TODO_REQUIRED_BLOCK_MESSAGE = "Stop. Write the TODO first."
export const TODO_STALE_REMINDER = "TODO not updated recently. Consider updating todowrite before continuing."
```

- [ ] **Step 3: Implement the `before` guard for orchestrator-only enforcement**

```ts
export function createTodoToolGuardBefore(ctx: PluginInput, stateStore: TodoToolGuardStateStore, roleResolver: TodoGuardRoleResolver) {
  return async function before(input: { tool: string; sessionID: string; callID: string }, output: { args: unknown }) {
    // allow todowrite
    // allow todo-sync skill bootstrap path if needed
    // otherwise read session todos and hard block when empty
  }
}
```

- [ ] **Step 4: Implement the `after` guard for stale reminders and snapshot reset**

```ts
export function createTodoToolGuardAfter(ctx: PluginInput, stateStore: TodoToolGuardStateStore, roleResolver: TodoGuardRoleResolver) {
  return async function after(input, output) {
    // count non-todowrite tools
    // compare todo snapshots around todowrite
    // attach reminder safely every reminder interval
  }
}
```

- [ ] **Step 5: Compose the guard and wire it into `SupercodePlugin`**

```ts
  const todoToolGuard = createTodoToolGuard(pluginInput, { roleResolver })

  return {
    ...,
    "tool.execute.before": todoToolGuard.before,
    "tool.execute.after": todoToolGuard.after,
  }
```

- [ ] **Step 6: Run the TODO guard test to verify it passes**

Run: `bun test src/__tests__/todo-tool-guard.test.ts`
Expected: PASS

### Task 5: Add red tests for idle continuation enforcement

**Files:**
- Create: `src/__tests__/todo-continuation-enforcer.test.ts`
- Test: `src/__tests__/todo-continuation-enforcer.test.ts`

- [ ] **Step 1: Add a failing test that re-prompts an idle orchestrator with incomplete todos**

```ts
it("re-prompts idle orchestrator sessions with incomplete todos", async () => {
  const prompts: unknown[] = []
  const client = {
    session: {
      todo: () => Promise.resolve([{ content: "work", status: "pending" }]),
      prompt: (payload: unknown) => {
        prompts.push(payload)
        return Promise.resolve()
      },
    },
  }

  const enforcer = createTodoContinuationEnforcer({ client } as never, {
    countdownSeconds: 0,
    getRole: () => "orchestrator",
  })

  await enforcer.handler({ event: { type: "session.idle", properties: { sessionID: "ses_1" } } })

  expect(prompts).toHaveLength(1)
})
```

- [ ] **Step 2: Add a failing test that skips non-target roles**

```ts
it("does not re-prompt non-target session roles", async () => {
  const prompts: unknown[] = []
  const client = {
    session: {
      todo: () => Promise.resolve([{ content: "work", status: "pending" }]),
      prompt: (payload: unknown) => {
        prompts.push(payload)
        return Promise.resolve()
      },
    },
  }

  const enforcer = createTodoContinuationEnforcer({ client } as never, {
    countdownSeconds: 0,
    getRole: () => "other",
  })

  await enforcer.handler({ event: { type: "session.idle", properties: { sessionID: "ses_1" } } })

  expect(prompts).toHaveLength(0)
})
```

- [ ] **Step 3: Add a failing test that normalizes idle status events**

```ts
it("normalizes idle session status events", () => {
  expect(normalizeSessionStatusToIdle({
    event: { type: "session.status", properties: { sessionID: "ses_1", status: { type: "idle" } } },
  })).toEqual({
    event: { type: "session.idle", properties: { sessionID: "ses_1" } },
  })
})
```

- [ ] **Step 4: Run the focused continuation test to verify it fails**

Run: `bun test src/__tests__/todo-continuation-enforcer.test.ts`
Expected: FAIL because the enforcer does not exist yet.

### Task 6: Implement continuation enforcement and event integration

**Files:**
- Create: `src/hooks/todo-continuation-enforcer/index.ts`
- Create: `src/hooks/todo-continuation-enforcer/constants.ts`
- Create: `src/hooks/todo-continuation-enforcer/session-id.ts`
- Create: `src/hooks/todo-continuation-enforcer/session-status-normalizer.ts`
- Create: `src/hooks/todo-continuation-enforcer/session-todo.ts`
- Create: `src/hooks/todo-continuation-enforcer/todo.ts`
- Create: `src/hooks/todo-continuation-enforcer/types.ts`
- Modify: `src/index.ts`
- Test: `src/__tests__/todo-continuation-enforcer.test.ts`

- [ ] **Step 1: Implement the todo helpers and constants**

```ts
export const CONTINUATION_PROMPT = "Incomplete tasks remain in your todo list. Continue working on the next pending task."
export const COUNTDOWN_SECONDS = 120
```

- [ ] **Step 2: Implement idle normalization and session ID extraction**

```ts
export function normalizeSessionStatusToIdle(input: { event: { type: string; properties?: unknown } }) {
  // map session.status idle payloads to session.idle shape
}
```

- [ ] **Step 3: Implement the enforcer with targeted role checks and delayed prompting**

```ts
export function createTodoContinuationEnforcer(ctx: PluginInput, options: { countdownSeconds?: number; getRole: (sessionID: string) => SessionRole }) {
  return {
    async handler(input) {
      // normalize idle events
      // skip non-orchestrator and non-executor
      // schedule or immediately queue continuation
      // re-read todos at fire time and prompt only when incomplete todos remain
    },
    dispose() {
      // clear timers
    },
  }
}
```

- [ ] **Step 4: Extend the plugin event handler to both observe roles and enforce continuation**

```ts
  const todoContinuationEnforcer = createTodoContinuationEnforcer(pluginInput, {
    getRole: (sessionID) => roleResolver.getRole(sessionID),
  })

  return {
    ...,
    event: async (input) => {
      roleResolver.observe(input.event)
      await todoContinuationEnforcer.handler(input)
    },
  }
```

- [ ] **Step 5: Run the continuation enforcement test to verify it passes**

Run: `bun test src/__tests__/todo-continuation-enforcer.test.ts`
Expected: PASS

### Task 7: Run the hook regression suite and pause for user-owned bootstrap content

**Files:**
- Test: `src/__tests__/plugin-mcp.test.ts`
- Test: `src/__tests__/todo-tool-guard.test.ts`
- Test: `src/__tests__/todo-continuation-enforcer.test.ts`
- Test: `src/index.ts`
- Modify later by user: `src/hooks/skill-bootstrap/skill-bootstrap.md`

- [ ] **Step 1: Run the focused hook regression suite**

Run: `bun test src/__tests__/plugin-mcp.test.ts src/__tests__/todo-tool-guard.test.ts src/__tests__/todo-continuation-enforcer.test.ts`
Expected: PASS

- [ ] **Step 2: Ask the user to edit the bootstrap content file when ready**

Request exactly:

```text
Please update `src/hooks/skill-bootstrap/skill-bootstrap.md` with the bootstrap guidance you want, then tell me when it's ready.
```

- [ ] **Step 3: After the user confirms the file is ready, rerun the focused hook regression suite**

Run: `bun test src/__tests__/plugin-mcp.test.ts src/__tests__/todo-tool-guard.test.ts src/__tests__/todo-continuation-enforcer.test.ts`
Expected: PASS

### Task 8: Full verification

**Files:**
- Test: `src/__tests__/plugin-mcp.test.ts`
- Test: `src/__tests__/todo-tool-guard.test.ts`
- Test: `src/__tests__/todo-continuation-enforcer.test.ts`
- Test: `src/__tests__/package-layout.test.ts`
- Test: `src/__tests__/tools-index.test.ts`

- [ ] **Step 1: Run the full test suite**

Run: `bun test`
Expected: PASS with `0 fail`

- [ ] **Step 2: Run type checking**

Run: `bunx tsc --noEmit`
Expected: exit code `0`

- [ ] **Step 3: Verify final working tree state**

Run: `git status --short`
Expected: only intended hook-system changes remain.
