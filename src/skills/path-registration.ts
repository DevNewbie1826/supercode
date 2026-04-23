import { statSync } from "node:fs"
import { join, resolve } from "node:path"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function resolvePluginSkillPath(moduleDir: string): string | undefined {
  const candidatePaths = [
    resolve(join(moduleDir, "../src/skills")),
    resolve(join(moduleDir, "../../src/skills")),
  ]

  for (const skillPath of candidatePaths) {
    try {
      if (statSync(skillPath).isDirectory()) {
        return skillPath
      }
    } catch {
      continue
    }
  }

  return undefined
}

export function registerSkillPath(config: Record<string, unknown>, skillPath?: string): void {
  if (!skillPath) return

  const skills = isRecord(config.skills) ? config.skills : {}
  const existingPaths = Array.isArray(skills.paths)
    ? skills.paths.filter((path): path is string => typeof path === "string")
    : []
  const paths = existingPaths.includes(skillPath) ? existingPaths : [...existingPaths, skillPath]

  skills.paths = paths
  config.skills = skills
}
