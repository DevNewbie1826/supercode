import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { AgentConfigBindings } from "./agents/types"

export type SupercodeConfig = {
  agent?: AgentConfigBindings
  mcp?: {
    websearch?: {
      apiKey?: string
    }
  }
}

type AgentPermissionValue = "allow" | "ask" | "deny"
type AgentPermissionRule = AgentPermissionValue | Record<string, AgentPermissionValue>

export type LoadSupercodeConfigOptions = {
  globalConfigPath?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

const AGENT_PERMISSION_VALUES = new Set(["allow", "ask", "deny"])
const ROOT_AGENT_PERMISSION_KEYS = new Set([
  "apply_patch",
  "ast_grep_replace",
  "bash",
  "doom_loop",
  "edit",
  "external_directory",
  "lsp_rename",
  "question",
  "read",
  "task",
  "webfetch",
])

function normalizeAgentPermissionRule(value: unknown): AgentPermissionRule | undefined {
  if (typeof value === "string") {
    return AGENT_PERMISSION_VALUES.has(value) ? (value as AgentPermissionValue) : undefined
  }

  if (!isRecord(value)) return undefined

  const normalizedRule: Record<string, AgentPermissionValue> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === "string" && AGENT_PERMISSION_VALUES.has(nestedValue)) {
      normalizedRule[key] = nestedValue as AgentPermissionValue
    }
  }

  return Object.keys(normalizedRule).length > 0 || Object.keys(value).length === 0 ? normalizedRule : undefined
}

function normalizeAgentPermission(value: unknown): Record<string, AgentPermissionRule> | undefined {
  if (!isRecord(value)) return undefined

  const normalizedPermission: Record<string, AgentPermissionRule> = {}
  for (const [key, rule] of Object.entries(value)) {
    if (!ROOT_AGENT_PERMISSION_KEYS.has(key)) continue
    const normalizedRule = normalizeAgentPermissionRule(rule)
    if (normalizedRule) normalizedPermission[key] = normalizedRule
  }

  return Object.keys(normalizedPermission).length > 0 || Object.keys(value).length === 0
    ? normalizedPermission
    : undefined
}

function normalizeAgentBinding(entry: unknown) {
  if (!isRecord(entry)) return undefined

  const permission = normalizeAgentPermission(entry.permission)
  const normalizedEntry = {
    ...(typeof entry.enabled === "boolean" ? { enabled: entry.enabled } : {}),
    ...(typeof entry.model === "string" ? { model: entry.model } : {}),
    ...(typeof entry.variant === "string" ? { variant: entry.variant } : {}),
    ...(typeof entry.color === "string" ? { color: entry.color } : {}),
    ...(isFiniteNumber(entry.temperature) && entry.temperature >= 0 && entry.temperature <= 2
      ? { temperature: entry.temperature }
      : {}),
    ...(permission ? { permission } : {}),
  }

  if (Object.keys(normalizedEntry).length > 0 || Object.keys(entry).length === 0) {
    return normalizedEntry
  }

  return undefined
}

function normalizeSupercodeConfig(value: unknown): SupercodeConfig {
  if (!isRecord(value)) return {}

  const normalizedConfig: SupercodeConfig = {}

  const agent = isRecord(value.agent) ? value.agent : undefined
  if (agent) {
    const normalizedAgent: AgentConfigBindings = {}
    for (const [name, entry] of Object.entries(agent)) {
      const normalizedEntry = normalizeAgentBinding(entry)
      if (!normalizedEntry) continue
      normalizedAgent[name] = normalizedEntry
    }
    if (Object.keys(normalizedAgent).length > 0) {
      normalizedConfig.agent = normalizedAgent
    }
  }

  const websearch = isRecord(value.mcp) && isRecord((value.mcp as Record<string, unknown>).websearch)
    ? (value.mcp as Record<string, unknown>).websearch as Record<string, unknown>
    : undefined

  if (!websearch || typeof websearch.apiKey !== "string") {
    return normalizedConfig
  }

  return {
    ...normalizedConfig,
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
