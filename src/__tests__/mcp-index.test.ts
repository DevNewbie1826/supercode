import { describe, expect, it } from "bun:test"
import { createBuiltinMcpServers } from "../mcp"

describe("createBuiltinMcpServers", () => {
  it("returns the full public built-in MCP registry", () => {
    expect(createBuiltinMcpServers()).toEqual({
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

  it("embeds the encoded websearch api key when provided", () => {
    expect(createBuiltinMcpServers({ apiKey: "exa key?/=" }).websearch).toEqual({
      type: "remote",
      url: "https://mcp.exa.ai/mcp?exaApiKey=exa%20key%3F%2F%3D",
    })
  })
})
