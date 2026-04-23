import { createRequire } from "node:module"
import { readdirSync, statSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentDefinition } from "./types"

type AgentModule = {
  default: AgentDefinition
}

function isAgentDefinition(value: unknown): value is AgentDefinition {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.name === "string"
    && typeof candidate.description === "string"
    && typeof candidate.prompt === "string"
    && (candidate.mode === "primary" || candidate.mode === "subagent")
}

function loadAgentModule(module: unknown, path: string): AgentDefinition {
  if (
    typeof module !== "object"
    || module === null
    || !("default" in module)
    || !isAgentDefinition((module as AgentModule).default)
  ) {
    throw new Error(`Invalid agent module: ${path}`)
  }

  return (module as AgentModule).default
}

const require = createRequire(import.meta.url)
const defaultModuleDir = dirname(fileURLToPath(import.meta.url))

function resolveBuiltinAgentDefinitionsPath(moduleDir: string): string | undefined {
  const candidatePaths = [
    resolve(join(moduleDir, "definitions")),
    resolve(join(moduleDir, "../src/agents/definitions")),
    resolve(join(moduleDir, "../../src/agents/definitions")),
  ]

  for (const candidatePath of candidatePaths) {
    try {
      if (statSync(candidatePath).isDirectory()) {
        return candidatePath
      }
    } catch {
      continue
    }
  }

  return undefined
}

const definitionsPath = resolveBuiltinAgentDefinitionsPath(defaultModuleDir)

const builtinAgentModules = definitionsPath
  ? readdirSync(definitionsPath)
      .filter((fileName) => fileName.endsWith(".agent.ts"))
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => [join(definitionsPath, fileName), require(join(definitionsPath, fileName))] as const)
  : []

const builtinAgentRegistry = builtinAgentModules
  .map(([path, module]) => loadAgentModule(module, path))
  .sort((left, right) => left.name.localeCompare(right.name))

for (let index = 1; index < builtinAgentRegistry.length; index += 1) {
  if (builtinAgentRegistry[index - 1]?.name === builtinAgentRegistry[index]?.name) {
    throw new Error(`Duplicate agent name: ${builtinAgentRegistry[index]?.name}`)
  }
}

export function createBuiltinAgentRegistry(): AgentDefinition[] {
  return builtinAgentRegistry.map((agent) => ({
    ...agent,
    defaults: agent.defaults
      ? {
          ...agent.defaults,
          permission: agent.defaults.permission ? { ...agent.defaults.permission } : undefined,
        }
      : undefined,
  }))
}

export function getBuiltinAgentByName(name: string): AgentDefinition {
  const agent = builtinAgentRegistry.find((entry) => entry.name === name)
  if (!agent) {
    throw new Error(`Unknown builtin agent: ${name}`)
  }
  return agent
}
