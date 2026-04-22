import { createBuiltinMcpServers, type BuiltinMcpServer } from "./mcp"
import { loadSupercodeConfig } from "./supercode-config"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function createSafeRecord<T extends Record<string, unknown>>(): T {
  return Object.create(null) as T
}

function cloneBuiltinMcpEntry(entry: BuiltinMcpServer): BuiltinMcpServer {
  return entry.type === "local"
    ? { ...entry, command: [...entry.command] }
    : { ...entry }
}

export function createConfigHandler(
  directory: string,
  fallbackDirectory?: string,
  options: { globalConfigPath?: string } = {},
) {
  return async (config: Record<string, unknown>) => {
    const directories = fallbackDirectory && fallbackDirectory !== directory ? [directory, fallbackDirectory] : directory
    const supercodeConfig = loadSupercodeConfig(directories, options.globalConfigPath ? { globalConfigPath: options.globalConfigPath } : undefined)
    const builtinMcpServers = createBuiltinMcpServers(supercodeConfig.mcp?.websearch)
    const existingMcp = isRecord(config.mcp) ? config.mcp : {}
    const mergedMcp = createSafeRecord<Record<string, unknown>>()

    for (const [name, entry] of Object.entries(builtinMcpServers)) {
      mergedMcp[name] = cloneBuiltinMcpEntry(entry)
    }

    for (const [name, value] of Object.entries(existingMcp)) {
      mergedMcp[name] = value
    }

    config.mcp = mergedMcp
  }
}
