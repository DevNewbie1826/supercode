import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createConfigHandler } from "../config-handler"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createDirectoryWithSupercodeConfig(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), "supercode-config-handler-"))
  const configDirectory = join(directory, ".opencode")
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(join(configDirectory, "supercode.json"), content)
  tempDirs.push(directory)
  return directory
}

describe("createConfigHandler", () => {
  it("injects builtin MCP defaults when config.mcp is empty", async () => {
    const config: Record<string, unknown> = { mcp: {} }

    await createConfigHandler("/test/directory")(config)

    expect(config.mcp).toEqual({
      context7: {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      },
      grep_app: {
        type: "remote",
        url: "https://mcp.grep.app",
      },
      sequential_thinking: {
        type: "local",
        command: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
      },
      websearch: {
        type: "remote",
        url: "https://mcp.exa.ai/mcp",
      },
    })
  })

  it("adds the configured websearch api key from local supercode.json", async () => {
    const directory = createDirectoryWithSupercodeConfig(JSON.stringify({ mcp: { websearch: { apiKey: "exa key?/=" } } }))
    const config: Record<string, unknown> = { mcp: {} }

    await createConfigHandler(directory)(config)

    expect((config.mcp as Record<string, unknown>).websearch).toEqual({
      type: "remote",
      url: "https://mcp.exa.ai/mcp?exaApiKey=exa%20key%3F%2F%3D",
    })
  })

  it("keeps existing config.mcp entries at highest precedence", async () => {
    const config: Record<string, unknown> = {
      mcp: {
        websearch: {
          type: "local",
          command: ["bunx", "custom-websearch"],
        },
      },
    }

    await createConfigHandler("/test/directory")(config)

    expect((config.mcp as Record<string, unknown>).websearch).toEqual({
      type: "local",
      command: ["bunx", "custom-websearch"],
    })
  })
})
