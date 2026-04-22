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
