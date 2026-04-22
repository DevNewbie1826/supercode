import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export type SupercodeConfig = {
  mcp?: {
    websearch?: {
      apiKey?: string
    }
  }
}

export type LoadSupercodeConfigOptions = {
  globalConfigPath?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeSupercodeConfig(value: unknown): SupercodeConfig {
  if (!isRecord(value)) return {}

  const websearch = isRecord(value.mcp) && isRecord((value.mcp as Record<string, unknown>).websearch)
    ? (value.mcp as Record<string, unknown>).websearch as Record<string, unknown>
    : undefined

  if (!websearch || typeof websearch.apiKey !== "string") {
    return {}
  }

  return {
    mcp: {
      websearch: {
        apiKey: websearch.apiKey,
      },
    },
  }
}

export function getDefaultGlobalSupercodeConfigPath(): string {
  return join(homedir(), ".config", "opencode", "supercode.json")
}

export function loadSupercodeConfig(
  directories: string | readonly string[],
  options: LoadSupercodeConfigOptions = {},
): SupercodeConfig {
  const globalConfigPath = options.globalConfigPath ?? getDefaultGlobalSupercodeConfigPath()
  const allDirectories = Array.isArray(directories) ? [...directories] : [directories]

  let globalConfig: SupercodeConfig = {}
  if (existsSync(globalConfigPath)) {
    try {
      globalConfig = normalizeSupercodeConfig(JSON.parse(readFileSync(globalConfigPath, "utf8")))
    } catch {
      globalConfig = {}
    }
  }

  for (const directory of allDirectories) {
    const configPath = join(directory, ".opencode", "supercode.json")
    if (!existsSync(configPath)) continue
    try {
      const localConfig = normalizeSupercodeConfig(JSON.parse(readFileSync(configPath, "utf8")))
      return Object.keys(localConfig).length > 0 ? localConfig : globalConfig
    } catch {
      return globalConfig
    }
  }

  return globalConfig
}
