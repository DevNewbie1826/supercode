import { buildBuiltinAgentDisableEntry, buildBuiltinAgentEntries } from "./agents/config"
import { builtinAgentDisablePolicy } from "./agents/builtin-policy"
import { createBuiltinAgentRegistry } from "./agents/registry"
import { createBuiltinMcpServers, type BuiltinMcpServer } from "./mcp"
import { registerSkillPath, resolvePluginSkillPath } from "./skills/path-registration"
import { loadSupercodeConfig, type SupercodeConfig } from "./supercode-config"

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
  options: { globalConfigPath?: string; moduleDir?: string; preloadedConfig?: SupercodeConfig } = {},
) {
  return async (config: Record<string, unknown>) => {
    const directories = fallbackDirectory && fallbackDirectory !== directory ? [directory, fallbackDirectory] : directory
    const supercodeConfig = options.preloadedConfig ?? loadSupercodeConfig(
      directories,
      options.globalConfigPath ? { globalConfigPath: options.globalConfigPath } : undefined,
    )
    const builtinMcpServers = createBuiltinMcpServers(supercodeConfig.mcp?.websearch)
    const skillPath = typeof options.moduleDir === "string" ? resolvePluginSkillPath(options.moduleDir) : undefined
    const existingMcp = isRecord(config.mcp) ? config.mcp : {}
    const existingAgent = isRecord(config.agent) ? config.agent : {}
    const builtinAgentRegistry = createBuiltinAgentRegistry()
    const mergedMcp = createSafeRecord<Record<string, unknown>>()

    for (const [name, entry] of Object.entries(builtinMcpServers)) {
      mergedMcp[name] = cloneBuiltinMcpEntry(entry)
    }

    for (const [name, value] of Object.entries(existingMcp)) {
      mergedMcp[name] = value
    }

    const mergedAgent = buildBuiltinAgentEntries(existingAgent, builtinAgentRegistry, supercodeConfig.agent)

    for (const [name, disable] of Object.entries(builtinAgentDisablePolicy)) {
      mergedAgent[name] = buildBuiltinAgentDisableEntry(mergedAgent[name], disable)
    }

    const orchestratorEntry = mergedAgent.orchestrator
    if (
      isRecord(orchestratorEntry) &&
      orchestratorEntry.mode === "primary" &&
      orchestratorEntry.disable !== true
    ) {
      const currentDefault = config.default_agent
      if (typeof currentDefault !== "string" || currentDefault.trim() === "") {
        config.default_agent = "orchestrator"
      }
    }

    config.mcp = mergedMcp
    config.agent = mergedAgent
    registerSkillPath(config, skillPath)
  }
}
