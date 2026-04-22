import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getDefaultGlobalSupercodeConfigPath, loadSupercodeConfig } from "../supercode-config"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createDirectoryWithSupercodeConfig(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), "supercode-config-"))
  const configDirectory = join(directory, ".opencode")
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(join(configDirectory, "supercode.json"), content)
  tempDirs.push(directory)
  return directory
}

describe("loadSupercodeConfig", () => {
  it("uses local .opencode/supercode.json before global config", () => {
    const directory = createDirectoryWithSupercodeConfig(JSON.stringify({ mcp: { websearch: { apiKey: "local-key" } } }))
    const globalRoot = mkdtempSync(join(tmpdir(), "supercode-global-"))
    tempDirs.push(globalRoot)
    const globalConfigPath = join(globalRoot, "supercode.json")
    writeFileSync(globalConfigPath, JSON.stringify({ mcp: { websearch: { apiKey: "global-key" } } }))

    expect(loadSupercodeConfig(directory, { globalConfigPath })).toEqual({
      mcp: {
        websearch: {
          apiKey: "local-key",
        },
      },
    })
  })

  it("falls back to global supercode.json when local config is absent", () => {
    const directory = mkdtempSync(join(tmpdir(), "supercode-no-local-"))
    tempDirs.push(directory)
    const globalRoot = mkdtempSync(join(tmpdir(), "supercode-global-only-"))
    tempDirs.push(globalRoot)
    const globalConfigPath = join(globalRoot, "supercode.json")
    writeFileSync(globalConfigPath, JSON.stringify({ mcp: { websearch: { apiKey: "global-key" } } }))

    expect(loadSupercodeConfig(directory, { globalConfigPath })).toEqual({
      mcp: {
        websearch: {
          apiKey: "global-key",
        },
      },
    })
  })

  it("ignores invalid JSON and unknown-only shapes", () => {
    const directory = createDirectoryWithSupercodeConfig("{broken json")

    expect(loadSupercodeConfig(directory)).toEqual({})
  })

  it("returns the default global config path", () => {
    expect(getDefaultGlobalSupercodeConfigPath()).toBe(join(process.env.HOME || "", ".config", "opencode", "supercode.json"))
  })
})
