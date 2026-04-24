import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { SupercodePlugin } from "../index"

// ─── Helpers ───────────────────────────────────────────────────────────

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createTempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "supercode-diag-"))
  const configDirectory = join(directory, ".opencode")
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(join(configDirectory, "supercode.json"), "{}")
  tempDirs.push(directory)
  return directory
}

/** Save and restore SUPERCODE_DEBUG_HOOKS around a callback. */
function withEnv(value: string | undefined, fn: () => Promise<void> | void): Promise<void> {
  const prev = process.env.SUPERCODE_DEBUG_HOOKS
  if (value === undefined) {
    delete process.env.SUPERCODE_DEBUG_HOOKS
  } else {
    process.env.SUPERCODE_DEBUG_HOOKS = value
  }
  const restore = () => {
    if (prev === undefined) {
      delete process.env.SUPERCODE_DEBUG_HOOKS
    } else {
      process.env.SUPERCODE_DEBUG_HOOKS = prev
    }
  }
  const result = fn()
  if (result && typeof result.then === "function") {
    return result.then(
      (v) => { restore(); return v },
      (e) => { restore(); throw e },
    )
  }
  restore()
  return Promise.resolve()
}

interface LogCall {
  body: {
    service: string
    level: string
    message: string
    extra: Record<string, unknown>
  }
}

function createFakeClient(logCalls: LogCall[]) {
  return {
    app: {
      log(opts: { body: LogCall["body"] }) {
        logCalls.push({ body: opts.body })
        return Promise.resolve()
      },
    },
    session: {
      todo: () => Promise.resolve([]),
      prompt: () => Promise.resolve(),
    },
  }
}

function createPluginInput(
  logCalls: LogCall[],
  directory: string,
  overrides?: { worktree?: string; moduleDir?: string },
): PluginInput {
  return {
    client: createFakeClient(logCalls) as unknown as PluginInput["client"],
    project: "test-project",
    directory,
    worktree: overrides?.worktree ?? directory,
    serverUrl: new URL("https://example.com"),
    $: {} as PluginInput["$"],
    experimental_workspace: { register() {} },
    ...(overrides?.moduleDir !== undefined ? { options: { moduleDir: overrides.moduleDir } } : {}),
  } as unknown as PluginInput
}

/** Build a realistic session.created event. */
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

/** Build a realistic message.updated event (assistant, primary mode). */
function assistantMessageUpdated(sessionID: string) {
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
        mode: "primary",
        path: { cwd: "/test", root: "/test" },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        time: { created: 1000 },
      },
    },
  }
}

/** Find logs by message prefix. */
function findLogs(logCalls: LogCall[], message: string): LogCall[] {
  return logCalls.filter((l) => l.body.message === message)
}

/** Forbidden keys that must never appear in diagnostic extra objects. */
const FORBIDDEN_EXTRA_KEYS = [
  "args",
  "output",
  "text",
  "prompt",
  "parts",
  "content",
  "messages",
  "environment",
  "env",
  "toolOutput",
  "toolArgs",
]

/** Assert that a diagnostic log's extra object contains none of the forbidden keys. */
function assertRedacted(log: LogCall) {
  const extraKeys = Object.keys(log.body.extra)
  const violations = extraKeys.filter((k) => FORBIDDEN_EXTRA_KEYS.includes(k))
  if (violations.length > 0) {
    expect(violations).toEqual([]) // will fail with descriptive diff
  }
}

/** Assert redaction on every log in the array. */
function assertAllRedacted(logs: LogCall[]) {
  for (const log of logs) {
    assertRedacted(log)
  }
}

/** Assert redaction on all diagnostic logs across every message type. */
function assertAllLogsRedacted(logCalls: LogCall[]) {
  assertAllRedacted(logCalls)
}

// ─── T1: Env gating for SUPERCODE_DEBUG_HOOKS ──────────────────────────

describe("Diagnostics env gating", () => {
  const enabledValues = ["1", "true", "yes"]
  const disabledValues = [undefined, "", "0", "false", "no", "TRUE", "Yes", "random"]

  for (const val of enabledValues) {
    it(`enables diagnostics for SUPERCODE_DEBUG_HOOKS=${JSON.stringify(val)}`, async () => {
      await withEnv(val, async () => {
        const logCalls: LogCall[] = []
        const directory = createTempDir()
        await SupercodePlugin(createPluginInput(logCalls, directory))
        // When enabled, at least the initialization log should appear
        expect(findLogs(logCalls, "Supercode plugin initialized").length).toBeGreaterThan(0)
      })
    })
  }

  for (const val of disabledValues) {
    it(`disables diagnostics for SUPERCODE_DEBUG_HOOKS=${JSON.stringify(val)}`, async () => {
      await withEnv(val, async () => {
        const logCalls: LogCall[] = []
        const directory = createTempDir()
        await SupercodePlugin(createPluginInput(logCalls, directory))
        expect(logCalls).toHaveLength(0)
      })
    })
  }
})

// ─── T3: Plugin initialization diagnostics ─────────────────────────────

describe("Plugin initialization diagnostics", () => {
  it("emits no diagnostic logs when SUPERCODE_DEBUG_HOOKS is unset", async () => {
    await withEnv(undefined, async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      await SupercodePlugin(createPluginInput(logCalls, directory))
      expect(logCalls).toHaveLength(0)
    })
  })

  it("emits initialization log with required fields when enabled", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const distinctWorktree = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory, { worktree: distinctWorktree }))

      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)

      const body = initLogs[0].body
      expect(body.service).toBe("supercode-plugin")
      expect(body.level).toBe("debug")
      expect(body.message).toBe("Supercode plugin initialized")

      const extra = body.extra
      expect(extra.directory).toBe(directory)
      expect(extra.worktree).toBe(distinctWorktree)
      expect(typeof extra.moduleDir).toBe("string")

      // hookKeys must be sorted and match actual returned hooks
      const actualKeys = Object.keys(hooks).sort()
      expect(extra.hookKeys).toEqual(actualKeys)
    })
  })

  it("extra.worktree is the exact plugin input value, not a fallback", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const distinctWorktree = createTempDir()
      await SupercodePlugin(createPluginInput(logCalls, directory, { worktree: distinctWorktree }))

      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)

      const extra = initLogs[0].body.extra
      // Must be the actual worktree input, not directory fallback
      expect(extra.worktree).toBe(distinctWorktree)
      expect(extra.worktree).not.toBe(directory)
    })
  })

  it("extra.worktree is undefined when plugin input worktree is undefined, not directory fallback", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      // Pass worktree as undefined to simulate absent worktree input
      await SupercodePlugin({
        client: createFakeClient(logCalls) as unknown as PluginInput["client"],
        project: "test-project",
        directory,
        worktree: undefined as unknown as string,
        serverUrl: new URL("https://example.com"),
        $: {} as PluginInput["$"],
        experimental_workspace: { register() {} },
      } as unknown as PluginInput)

      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)

      const extra = initLogs[0].body.extra
      // worktree must be the actual input (undefined), not directory
      expect(extra.worktree).toBeUndefined()
      expect(extra.worktree).not.toBe(directory)
    })
  })

  it("emits initialization log with exactly the required extra keys", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      await SupercodePlugin(createPluginInput(logCalls, directory))

      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)

      const extraKeys = Object.keys(initLogs[0].body.extra).sort()
      expect(extraKeys).toEqual(["directory", "hookKeys", "moduleDir", "worktree"])
    })
  })
})

// ─── T4: Hook entry diagnostics ────────────────────────────────────────

describe("Hook entry diagnostics – event", () => {
  it("logs event hook invocation with eventType and sessionID", async () => {
    await withEnv("true", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      await hooks.event!({ event: sessionCreated("sess-diag-event") })

      const eventLogs = findLogs(logCalls, "Supercode hook invoked: event")
      // Should have one log per event call
      expect(eventLogs.length).toBeGreaterThanOrEqual(1)

      const lastEventLog = eventLogs[eventLogs.length - 1]
      expect(lastEventLog.body.extra.eventType).toBe("session.created")
      expect(lastEventLog.body.extra.sessionID).toBe("sess-diag-event")

      // Exact extra keys
      const extraKeys = Object.keys(lastEventLog.body.extra).sort()
      expect(extraKeys).toEqual(["eventType", "sessionID"])
    })
  })
})

describe("Hook entry diagnostics – experimental.chat.messages.transform", () => {
  it("logs chat transform invocation with messageCount and hasUserMessage", async () => {
    await withEnv("yes", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      await hooks["experimental.chat.messages.transform"]!(
        {},
        {
          messages: [
            {
              info: {
                id: "msg-1",
                role: "user",
                sessionID: "sess-diag-chat",
                agent: "test-agent",
                model: { providerID: "provider-test", modelID: "model-test" },
                time: { created: 1000 },
              },
              parts: [],
            },
            {
              info: {
                id: "msg-2",
                role: "assistant",
                sessionID: "sess-diag-chat",
                parentID: "",
                modelID: "",
                providerID: "",
                mode: "primary",
                path: { cwd: "/test", root: "/test" },
                cost: 0,
                tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
                time: { created: 1000 },
              },
              parts: [],
            },
          ],
        },
      )

      const transformLogs = findLogs(logCalls, "Supercode hook invoked: experimental.chat.messages.transform")
      expect(transformLogs.length).toBeGreaterThanOrEqual(1)

      const lastLog = transformLogs[transformLogs.length - 1]
      expect(lastLog.body.extra.messageCount).toBe(2)
      expect(lastLog.body.extra.hasUserMessage).toBe(true)

      // Exact extra keys
      const extraKeys = Object.keys(lastLog.body.extra).sort()
      expect(extraKeys).toEqual(["hasUserMessage", "messageCount"])
    })
  })

  it("reports hasUserMessage=false when no user message is present", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      await hooks["experimental.chat.messages.transform"]!(
        {},
        {
          messages: [
            {
              info: {
                id: "msg-1",
                role: "assistant",
                sessionID: "sess-no-user",
                parentID: "",
                modelID: "",
                providerID: "",
                mode: "primary",
                path: { cwd: "/test", root: "/test" },
                cost: 0,
                tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
                time: { created: 1000 },
              },
              parts: [],
            },
          ],
        },
      )

      const transformLogs = findLogs(logCalls, "Supercode hook invoked: experimental.chat.messages.transform")
      expect(transformLogs.length).toBeGreaterThanOrEqual(1)
      const lastLog = transformLogs[transformLogs.length - 1]
      expect(lastLog.body.extra.hasUserMessage).toBe(false)
      expect(lastLog.body.extra.messageCount).toBe(1)
    })
  })
})

describe("Hook entry diagnostics – tool.execute.before", () => {
  it("logs tool before invocation with tool, sessionID, callID, and role", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      // Seed session as orchestrator
      await hooks.event!({ event: sessionCreated("sess-diag-before") })
      await hooks.event!({ event: assistantMessageUpdated("sess-diag-before") })

      // Call tool.execute.before with a non-exempt tool and enough TODO state to not block
      // (todo returns [] so orchestrator would block — use executor session instead)
      await hooks.event!({ event: sessionCreated("sess-diag-exec", { parentID: "parent-1" }) })

      await hooks["tool.execute.before"]!(
        { tool: "read", sessionID: "sess-diag-exec", callID: "call-1" },
        { args: {} },
      )

      const beforeLogs = findLogs(logCalls, "Supercode hook invoked: tool.execute.before")
      expect(beforeLogs.length).toBeGreaterThanOrEqual(1)

      const lastLog = beforeLogs[beforeLogs.length - 1]
      expect(lastLog.body.extra.tool).toBe("read")
      expect(lastLog.body.extra.sessionID).toBe("sess-diag-exec")
      expect(lastLog.body.extra.callID).toBe("call-1")
      expect(lastLog.body.extra.role).toBe("executor")

      // Exact extra keys
      const extraKeys = Object.keys(lastLog.body.extra).sort()
      expect(extraKeys).toEqual(["callID", "role", "sessionID", "tool"])
    })
  })
})

describe("Hook entry diagnostics – tool.execute.after", () => {
  it("logs tool after invocation with tool, sessionID, and callID", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      // Seed executor session
      await hooks.event!({ event: sessionCreated("sess-diag-after", { parentID: "parent-2" }) })

      await hooks["tool.execute.after"]!(
        { tool: "bash", sessionID: "sess-diag-after", callID: "call-2", args: {} },
        { title: "ran bash", output: "ok", metadata: null },
      )

      const afterLogs = findLogs(logCalls, "Supercode hook invoked: tool.execute.after")
      expect(afterLogs.length).toBeGreaterThanOrEqual(1)

      const lastLog = afterLogs[afterLogs.length - 1]
      expect(lastLog.body.extra.tool).toBe("bash")
      expect(lastLog.body.extra.sessionID).toBe("sess-diag-after")
      expect(lastLog.body.extra.callID).toBe("call-2")

      // Exact extra keys
      const extraKeys = Object.keys(lastLog.body.extra).sort()
      expect(extraKeys).toEqual(["callID", "sessionID", "tool"])
    })
  })
})

// ─── T5: Logging failure swallowing ────────────────────────────────────

describe("Logging failure resilience", () => {
  it("plugin initialization still resolves when client.app.log throws synchronously", async () => {
    await withEnv("1", async () => {
      const directory = createTempDir()
      const hooks = await SupercodePlugin({
        client: {
          app: {
            log() {
              throw new Error("sync log failure")
            },
          },
          session: {
            todo: () => Promise.resolve([]),
            prompt: () => Promise.resolve(),
          },
        },
        project: "test-project",
        directory,
        worktree: directory,
        serverUrl: new URL("https://example.com"),
        $: {} as PluginInput["$"],
        experimental_workspace: { register() {} },
      } as unknown as PluginInput)

      // Plugin should still return hooks
      expect(hooks).toBeDefined()
      expect(hooks.event).toBeFunction()
    })
  })

  it("hook calls still resolve when client.app.log returns a rejected promise", async () => {
    await withEnv("1", async () => {
      const directory = createTempDir()
      const hooks = await SupercodePlugin({
        client: {
          app: {
            log() {
              return Promise.reject(new Error("async log failure"))
            },
          },
          session: {
            todo: () => Promise.resolve([]),
            prompt: () => Promise.resolve(),
          },
        },
        project: "test-project",
        directory,
        worktree: directory,
        serverUrl: new URL("https://example.com"),
        $: {} as PluginInput["$"],
        experimental_workspace: { register() {} },
      } as unknown as PluginInput)

      // Hook calls should still resolve, not reject
      await expect(
        hooks.event!({ event: sessionCreated("sess-resilient") }),
      ).resolves.toBeUndefined()
    })
  })

  it("tool.execute.before delegate errors still propagate when logging fails", async () => {
    await withEnv("1", async () => {
      const directory = createTempDir()
      const hooks = await SupercodePlugin({
        client: {
          app: {
            log() {
              throw new Error("log failure")
            },
          },
          session: {
            todo: () => Promise.resolve([]),
            prompt: () => Promise.resolve(),
          },
        },
        project: "test-project",
        directory,
        worktree: directory,
        serverUrl: new URL("https://example.com"),
        $: {} as PluginInput["$"],
        experimental_workspace: { register() {} },
      } as unknown as PluginInput)

      // Seed orchestrator session
      await hooks.event!({ event: sessionCreated("sess-err") })
      await hooks.event!({ event: assistantMessageUpdated("sess-err") })

      // The delegate should still throw its TODO enforcement error
      await expect(
        hooks["tool.execute.before"]!(
          { tool: "read", sessionID: "sess-err", callID: "call-err" },
          { args: {} },
        ),
      ).rejects.toThrow(/TODO/i)
    })
  })
})

// ─── T6: this-binding preservation ─────────────────────────────────────

describe("client.app.log receiver binding is preserved", () => {
  it("works when app.log requires correct this binding (unbound method would fail)", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()

      // Create a fake client whose app.log method uses `this` to access a
      // recording channel. An unbound method reference extracted via
      // `client.app.log` would lose the receiver and throw because `this`
      // would be undefined.
      const app = {
        _channel: logCalls,
        log(this: { _channel: LogCall[] }, opts: { body: LogCall["body"] }) {
          // If `this` is lost (unbound method), `_channel` is undefined
          if (this._channel == null) {
            throw new Error("this-binding lost: _channel is undefined")
          }
          this._channel.push({ body: opts.body })
          return Promise.resolve()
        },
      }

      const hooks = await SupercodePlugin({
        client: {
          app,
          session: {
            todo: () => Promise.resolve([]),
            prompt: () => Promise.resolve(),
          },
        },
        project: "test-project",
        directory,
        worktree: directory,
        serverUrl: new URL("https://example.com"),
        $: {} as PluginInput["$"],
        experimental_workspace: { register() {} },
      } as unknown as PluginInput)

      // Initialization log should have been recorded
      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)

      // Hook calls should also work
      await hooks.event!({ event: sessionCreated("sess-bind") })
      const eventLogs = findLogs(logCalls, "Supercode hook invoked: event")
      expect(eventLogs.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ─── T7: Redaction assertions ──────────────────────────────────────────

describe("Diagnostic log redaction – no forbidden content in extra", () => {
  it("initialization log contains only approved extra keys and no forbidden content", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      await SupercodePlugin(createPluginInput(logCalls, directory))

      const initLogs = findLogs(logCalls, "Supercode plugin initialized")
      expect(initLogs).toHaveLength(1)
      assertRedacted(initLogs[0])
    })
  })

  it("event hook log contains no forbidden content", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      await hooks.event!({ event: sessionCreated("sess-redact") })

      const eventLogs = findLogs(logCalls, "Supercode hook invoked: event")
      expect(eventLogs.length).toBeGreaterThanOrEqual(1)
      assertAllRedacted(eventLogs)
    })
  })

  it("chat transform log contains no message text, parts, or other forbidden content", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      await hooks["experimental.chat.messages.transform"]!(
        {},
        {
          messages: [
            {
              info: {
                id: "msg-redact",
                role: "user",
                sessionID: "sess-redact-chat",
                agent: "test-agent",
                model: { providerID: "provider-test", modelID: "model-test" },
                time: { created: 1000 },
              },
              parts: [{ id: "part-1", sessionID: "sess-redact-chat", messageID: "msg-redact", type: "text" as const, text: "secret user message that must not be logged" }],
            },
          ],
        },
      )

      const transformLogs = findLogs(logCalls, "Supercode hook invoked: experimental.chat.messages.transform")
      expect(transformLogs.length).toBeGreaterThanOrEqual(1)
      assertAllRedacted(transformLogs)

      // Additionally assert the log body itself does not contain raw text
      const log = transformLogs[transformLogs.length - 1]
      const serialized = JSON.stringify(log.body)
      expect(serialized).not.toContain("secret user message")
    })
  })

  it("tool.before log contains no args, output, or other forbidden content", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      // Seed executor session
      await hooks.event!({ event: sessionCreated("sess-redact-before", { parentID: "parent-redact" }) })

      await hooks["tool.execute.before"]!(
        { tool: "bash", sessionID: "sess-redact-before", callID: "call-redact" },
        { args: { command: "rm -rf /secret/path" } },
      )

      const beforeLogs = findLogs(logCalls, "Supercode hook invoked: tool.execute.before")
      expect(beforeLogs.length).toBeGreaterThanOrEqual(1)
      assertAllRedacted(beforeLogs)

      // Assert the serialized log does not contain tool args
      const serialized = JSON.stringify(beforeLogs[beforeLogs.length - 1].body)
      expect(serialized).not.toContain("rm -rf")
      expect(serialized).not.toContain("/secret/path")
    })
  })

  it("tool.after log contains no args, output, or other forbidden content", async () => {
    await withEnv("1", async () => {
      const logCalls: LogCall[] = []
      const directory = createTempDir()
      const hooks = await SupercodePlugin(createPluginInput(logCalls, directory))

      // Seed executor session
      await hooks.event!({ event: sessionCreated("sess-redact-after", { parentID: "parent-redact2" }) })

      await hooks["tool.execute.after"]!(
        { tool: "bash", sessionID: "sess-redact-after", callID: "call-redact2", args: { command: "sensitive" } },
        { title: "ran bash", output: "sensitive tool output data", metadata: null },
      )

      const afterLogs = findLogs(logCalls, "Supercode hook invoked: tool.execute.after")
      expect(afterLogs.length).toBeGreaterThanOrEqual(1)
      assertAllRedacted(afterLogs)

      // Assert the serialized log does not contain tool output or args
      const serialized = JSON.stringify(afterLogs[afterLogs.length - 1].body)
      expect(serialized).not.toContain("sensitive tool output")
      expect(serialized).not.toContain("sensitive")
    })
  })
})
