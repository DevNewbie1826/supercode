import type { RemoteMcpServer } from "./index"

export type WebsearchMcpConfig = {
  apiKey?: string
}

export function createWebsearchMcp(config?: WebsearchMcpConfig): RemoteMcpServer {
  const url = config?.apiKey
    ? `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(config.apiKey)}`
    : "https://mcp.exa.ai/mcp"

  return {
    type: "remote",
    url,
  }
}
