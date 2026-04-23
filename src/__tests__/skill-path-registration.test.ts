import { describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, normalize } from "node:path"
import { registerSkillPath, resolvePluginSkillPath } from "../skills/path-registration"

function createPackagedPluginLayout() {
  const sandboxDir = mkdtempSync(join(tmpdir(), "supercode-skill-layout-"))
  const pluginDir = join(sandboxDir, "plugin")
  const moduleDir = join(pluginDir, "dist")
  const skillPath = normalize(join(pluginDir, "src/skills"))

  mkdirSync(moduleDir, { recursive: true })

  return { sandboxDir, moduleDir, skillPath }
}

function createCopiedPluginLayout() {
  const sandboxDir = mkdtempSync(join(tmpdir(), "supercode-copied-skill-layout-"))
  const moduleDir = join(sandboxDir, ".opencode", "plugins")
  const skillPath = normalize(join(sandboxDir, "src/skills"))

  mkdirSync(moduleDir, { recursive: true })

  return { sandboxDir, moduleDir, skillPath }
}

describe("resolvePluginSkillPath", () => {
  it("returns the packaged plugin ../src/skills path when directory exists", () => {
    const { moduleDir, sandboxDir, skillPath } = createPackagedPluginLayout()
    mkdirSync(skillPath, { recursive: true })

    try {
      expect(resolvePluginSkillPath(moduleDir)).toBe(skillPath)
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true })
    }
  })

  it("returns the copied plugin ../../src/skills path when directory exists", () => {
    const { moduleDir, sandboxDir, skillPath } = createCopiedPluginLayout()
    mkdirSync(skillPath, { recursive: true })

    try {
      expect(resolvePluginSkillPath(moduleDir)).toBe(skillPath)
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true })
    }
  })

  it("returns undefined when path missing", () => {
    const { moduleDir, sandboxDir } = createPackagedPluginLayout()

    try {
      expect(resolvePluginSkillPath(moduleDir)).toBeUndefined()
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true })
    }
  })

  it("returns undefined when target is not a directory", () => {
    const { moduleDir, sandboxDir, skillPath } = createPackagedPluginLayout()
    mkdirSync(normalize(join(skillPath, "..")), { recursive: true })
    writeFileSync(skillPath, "not a directory")

    try {
      expect(resolvePluginSkillPath(moduleDir)).toBeUndefined()
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true })
    }
  })
})

describe("registerSkillPath", () => {
  it("initializes config.skills.paths and appends path", () => {
    const config: Record<string, unknown> = {}

    registerSkillPath(config, "/plugin/src/skills")

    expect(config.skills).toEqual({
      paths: ["/plugin/src/skills"],
    })
  })

  it("does not append duplicate path", () => {
    const config: Record<string, unknown> = { skills: { paths: ["/plugin/src/skills"] } }

    registerSkillPath(config, "/plugin/src/skills")

    expect(config.skills).toEqual({
      paths: ["/plugin/src/skills"],
    })
  })

  it("preserves existing user paths", () => {
    const config: Record<string, unknown> = { skills: { paths: ["/user/skills"] } }

    registerSkillPath(config, "/plugin/src/skills")

    expect(config.skills).toEqual({
      paths: ["/user/skills", "/plugin/src/skills"],
    })
  })

  it("coerces non-array paths to a new array", () => {
    const config: Record<string, unknown> = { skills: { paths: "/user/skills" } }

    registerSkillPath(config, "/plugin/src/skills")

    expect(config.skills).toEqual({
      paths: ["/plugin/src/skills"],
    })
  })

  it("coerces non-object skills config to object", () => {
    const config: Record<string, unknown> = { skills: true }

    registerSkillPath(config, "/plugin/src/skills")

    expect(config.skills).toEqual({
      paths: ["/plugin/src/skills"],
    })
  })

  it("does nothing when skillPath is missing", () => {
    const config: Record<string, unknown> = { skills: { paths: ["/user/skills"] } }

    registerSkillPath(config)

    expect(config.skills).toEqual({
      paths: ["/user/skills"],
    })
  })
})
