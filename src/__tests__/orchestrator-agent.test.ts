import { afterEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadSupercodeConfig } from "../supercode-config"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function createDirectoryWithSupercodeConfig(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), "supercode-agent-config-"))
  const configDirectory = join(directory, ".opencode")
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(join(configDirectory, "supercode.json"), content)
  tempDirs.push(directory)
  return directory
}

describe("loadSupercodeConfig orchestrator parsing", () => {
  it("parses orchestrator model bindings and enabled flag", () => {
    const directory = createDirectoryWithSupercodeConfig(
      JSON.stringify({
        agent: {
          orchestrator: {
            enabled: false,
            model: "gpt-5",
            variant: "fast",
            color: "#123456",
            temperature: 0.4,
            permission: {
              question: "allow",
              apply_patch: "deny",
            },
          },
        },
      }),
    )

    expect(loadSupercodeConfig(directory)).toEqual({
      agent: {
        orchestrator: {
          enabled: false,
          model: "gpt-5",
          variant: "fast",
          color: "#123456",
          temperature: 0.4,
          permission: {
            question: "allow",
            apply_patch: "deny",
          },
        },
      },
    })
  })

  it("gives local config higher precedence than global for orchestrator fields", () => {
    const directory = createDirectoryWithSupercodeConfig(
      JSON.stringify({
        agent: {
          orchestrator: {
            model: "local-model",
          },
        },
      }),
    )
    const globalRoot = mkdtempSync(join(tmpdir(), "supercode-agent-global-"))
    tempDirs.push(globalRoot)
    const globalConfigPath = join(globalRoot, "supercode.json")
    writeFileSync(
      globalConfigPath,
      JSON.stringify({
        agent: {
          orchestrator: {
            model: "global-model",
            variant: "smart",
          },
        },
      }),
    )

    expect(loadSupercodeConfig(directory, { globalConfigPath })).toEqual({
      agent: {
        orchestrator: {
          model: "local-model",
        },
      },
    })
  })

  it("parses explorer and librarian bindings too", () => {
    const directory = createDirectoryWithSupercodeConfig(
      JSON.stringify({
        agent: {
          explorer: {
            enabled: false,
            model: "explore-model",
          },
          librarian: {
            model: "librarian-model",
            variant: "fast",
          },
        },
      }),
    )

    expect(loadSupercodeConfig(directory)).toEqual({
      agent: {
        explorer: {
          enabled: false,
          model: "explore-model",
        },
        librarian: {
          model: "librarian-model",
          variant: "fast",
        },
      },
    })
  })
})
