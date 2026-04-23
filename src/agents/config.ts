import type { AgentConfigBinding, AgentDefinition, AgentPermission, AgentPermissionRule, AgentPermissionValue } from "./types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function createSafeRecord<T extends Record<string, unknown>>(): T {
  return Object.create(null) as T
}

function cloneAgentPermissionRule(rule: AgentPermissionRule): AgentPermissionRule {
  if (typeof rule === "string") return rule

  const cloned = createSafeRecord<Record<string, AgentPermissionValue>>()
  for (const [key, value] of Object.entries(rule)) {
    cloned[key] = value
  }
  return cloned
}

function cloneAgentPermission(permission: AgentPermission): AgentPermission {
  const cloned = createSafeRecord<AgentPermission>()
  for (const [key, value] of Object.entries(permission)) {
    cloned[key] = cloneAgentPermissionRule(value)
  }
  return cloned
}

function mergePluginOwnedAgentFields(
  existingEntry: unknown,
  configEntry: AgentConfigBinding | undefined,
  ownedFields: Record<string, unknown>,
  ownedFieldNames: string[] = ["model", "variant", "color", "temperature", "permission", "disable"],
): Record<string, unknown> {
  const safeExistingEntry = isRecord(existingEntry) ? existingEntry : {}
  const preservedEntry = createSafeRecord<Record<string, unknown>>()

  for (const [key, value] of Object.entries(safeExistingEntry)) {
    if (ownedFieldNames.includes(key)) continue
    preservedEntry[key] = value
  }

  return {
    ...preservedEntry,
    ...ownedFields,
    ...(configEntry ?? {}),
  }
}

export function buildBuiltinAgentEntry(
  existingEntry: unknown,
  configEntry: AgentConfigBinding | undefined,
  agent: AgentDefinition,
): Record<string, unknown> {
  const ownedFields: Record<string, unknown> = {
    prompt: agent.prompt,
    description: agent.description,
    mode: agent.mode,
    ...(typeof agent.defaults?.color === "string" ? { color: agent.defaults.color } : {}),
    ...(typeof agent.defaults?.temperature === "number" ? { temperature: agent.defaults.temperature } : {}),
    ...(agent.defaults?.permission ? { permission: cloneAgentPermission(agent.defaults.permission) } : {}),
  }

  const merged = mergePluginOwnedAgentFields(existingEntry, configEntry, ownedFields)

  if (configEntry?.enabled === false) {
    merged.disable = true
    delete merged.enabled
  } else {
    delete merged.disable
    delete merged.enabled
  }

  return merged
}

export function buildBuiltinAgentEntries(
  existingAgentConfig: Record<string, unknown>,
  builtinRegistry: readonly AgentDefinition[],
  bindings: Record<string, AgentConfigBinding> = {},
): Record<string, unknown> {
  const mergedAgent = createSafeRecord<Record<string, unknown>>()

  for (const [name, value] of Object.entries(existingAgentConfig)) {
    mergedAgent[name] = value
  }

  for (const agent of builtinRegistry) {
    mergedAgent[agent.name] = buildBuiltinAgentEntry(mergedAgent[agent.name], bindings[agent.name], agent)
  }

  return mergedAgent
}

export function buildBuiltinAgentDisableEntry(
  existingEntry: unknown,
  disable: boolean,
): Record<string, unknown> {
  const merged = mergePluginOwnedAgentFields(existingEntry, undefined, disable ? { disable: true } : {}, ["disable"])

  if (!disable) {
    if (isRecord(existingEntry) && typeof existingEntry.disable === "boolean") {
      merged.disable = existingEntry.disable
    } else {
      merged.disable = false
    }
  }

  return merged
}
