import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { SupercodePlugin } from "../index"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createDirectoryWithSupercodeConfig(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), "supercode-plugin-config-"))
  const configDirectory = join(directory, ".opencode")
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(join(configDirectory, "supercode.json"), content)
  tempDirs.push(directory)
  return directory
}

describe("SupercodePlugin MCP wiring", () => {
  it("wires the config hook and exposes merged MCP defaults", async () => {
    const directory = createDirectoryWithSupercodeConfig(JSON.stringify({ mcp: { websearch: { apiKey: "exa" } } }))
    const hooks = await SupercodePlugin({
      client: { app: { log() { return Promise.resolve() } } },
      project: "test-project",
      directory,
      worktree: directory,
      serverUrl: new URL("https://example.com"),
      $: {} as PluginInput["$"],
    } as unknown as PluginInput)
    const config: Record<string, unknown> = { mcp: {} }

    expect(hooks.config).toBeFunction()

    await hooks.config?.(config)

    expect((config.mcp as Record<string, unknown>).context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    })
    expect((config.mcp as Record<string, unknown>).websearch).toEqual({
      type: "remote",
      url: "https://mcp.exa.ai/mcp?exaApiKey=exa",
    })
  })
})

describe("SupercodePlugin hook wiring", () => {
  it("exposes event and experimental.chat.messages.transform hooks", async () => {
    const directory = createDirectoryWithSupercodeConfig("{}")
    const hooks = await SupercodePlugin({
      client: { app: { log() { return Promise.resolve() } } },
      project: "test-project",
      directory,
      worktree: directory,
      serverUrl: new URL("https://example.com"),
      $: {} as PluginInput["$"],
    } as unknown as PluginInput)

    expect(hooks.config).toBeFunction()
    expect(hooks.tool).toBeDefined()
    expect(hooks.event).toBeFunction()
    expect(hooks["experimental.chat.messages.transform"]).toBeFunction()
    expect(hooks["tool.execute.before"]).toBeFunction()
    expect(hooks["tool.execute.after"]).toBeFunction()
  })
})

// ── Plugin-level integration: event seeding → tool guard blocking ────────
//
// Proves that the shared resolver instance, seeded through the plugin's
// event hook, carries classification state into later tool.execute.before
// guard enforcement on the SAME plugin instance.

describe("SupercodePlugin – event seeding enables guard enforcement", () => {
  /** Build a realistic session.created event (no top-level sessionID). */
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

  /** Build a realistic message.updated event (no top-level sessionID). */
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

  it("seeded orchestrator is blocked by tool.execute.before for non-exempt tool with no TODO", async () => {
    const directory = createDirectoryWithSupercodeConfig("{}")
    const hooks = await SupercodePlugin({
      client: {
        app: { log() { return Promise.resolve() } },
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
    } as unknown as PluginInput)

    // 1. Seed root session lifecycle via event hook
    await hooks.event!({ event: sessionCreated("sess-integ-orch") })

    // 2. Seed assistant primary message via event hook
    await hooks.event!({ event: assistantMessageUpdated("sess-integ-orch", "primary") })

    // 3. Call tool.execute.before for a non-exempt tool with no TODO state
    await expect(
      hooks["tool.execute.before"]!(
        { tool: "read", sessionID: "sess-integ-orch", callID: "c1" },
        { args: {} },
      ),
    ).rejects.toThrow(/TODO/i)
  })

  it("unseeded/unknown session is blocked by tool.execute.before when TODO state is empty", async () => {
    const directory = createDirectoryWithSupercodeConfig("{}")
    const hooks = await SupercodePlugin({
      client: {
        app: { log() { return Promise.resolve() } },
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
    } as unknown as PluginInput)

    // No event seeding — session is unknown; guard must block conservatively
    await expect(
      hooks["tool.execute.before"]!(
        { tool: "read", sessionID: "sess-integ-unknown", callID: "c1" },
        { args: {} },
      ),
    ).rejects.toThrow(/TODO/i)
  })

  it("seeded executor is NOT blocked by tool.execute.before (known executor is skipped)", async () => {
    const directory = createDirectoryWithSupercodeConfig("{}")
    const hooks = await SupercodePlugin({
      client: {
        app: { log() { return Promise.resolve() } },
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
    } as unknown as PluginInput)

    // Seed child session lifecycle
    await hooks.event!({ event: sessionCreated("sess-integ-exec", { parentID: "parent" }) })

    // Executor should not be blocked (guard skips known executor)
    await expect(
      hooks["tool.execute.before"]!(
        { tool: "read", sessionID: "sess-integ-exec", callID: "c1" },
        { args: {} },
      ),
    ).resolves.toBeUndefined()
  })
})
