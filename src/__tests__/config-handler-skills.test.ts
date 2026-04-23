import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, normalize } from "node:path"
import { createConfigHandler } from "../config-handler"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createPackagedPluginLayout() {
  const sandboxDir = mkdtempSync(join(tmpdir(), "supercode-config-skills-"))
  const pluginDir = join(sandboxDir, "plugin")
  const moduleDir = join(pluginDir, "dist")
  const skillPath = normalize(join(pluginDir, "src/skills"))
  mkdirSync(moduleDir, { recursive: true })
  mkdirSync(skillPath, { recursive: true })
  tempDirs.push(sandboxDir)
  return { moduleDir, skillPath }
}

describe("createConfigHandler skill registration", () => {
  it("registers the resolved plugin skill path", async () => {
    const { moduleDir, skillPath } = createPackagedPluginLayout()
    const config: Record<string, unknown> = {}

    await createConfigHandler("/test/directory", undefined, { moduleDir })(config)

    expect(config.skills).toEqual({
      paths: [skillPath],
    })
  })

  it("preserves existing user skill paths", async () => {
    const { moduleDir, skillPath } = createPackagedPluginLayout()
    const config: Record<string, unknown> = {
      skills: {
        paths: ["/user/skills"],
      },
    }

    await createConfigHandler("/test/directory", undefined, { moduleDir })(config)

    expect(config.skills).toEqual({
      paths: ["/user/skills", skillPath],
    })
  })
})
