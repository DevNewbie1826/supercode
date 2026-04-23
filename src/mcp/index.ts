import { createWebsearchMcp, type RemoteMcpServer, type WebsearchMcpConfig } from "./websearch"

export type LocalMcpServer = {
  type: "local"
  command: string[]
}

export type BuiltinMcpServer = RemoteMcpServer | LocalMcpServer

const builtinMcpServers = {
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
} satisfies Record<string, BuiltinMcpServer>

export function createBuiltinMcpServers(websearchConfig?: WebsearchMcpConfig): Record<string, BuiltinMcpServer> {
  return {
    ...builtinMcpServers,
    websearch: createWebsearchMcp(websearchConfig),
  }
}
