import { describe, expect, it } from "bun:test"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createConfigHandler } from "../config-handler"

const definitionsDirectory = join(dirname(fileURLToPath(import.meta.url)), "../agents/definitions")

function getExpectedBuiltinAgentNames(): string[] {
  return readdirSync(definitionsDirectory)
    .filter((fileName) => fileName.endsWith(".agent.ts"))
    .map((fileName) => fileName.replace(/\.agent\.ts$/, ""))
    .sort((left, right) => left.localeCompare(right))
}

function getFreshBuiltInAgentSnapshot(): Array<{
  name: string
  present: boolean
  descriptionType: string
  promptType: string
}> {
  const script = `
    import { createConfigHandler } from "./src/config-handler"
    import { readdirSync } from "node:fs"

    const config = {}
    await createConfigHandler("/test/directory")(config)

    const builtinAgentNames = readdirSync("./src/agents/definitions")
      .filter((fileName) => fileName.endsWith(".agent.ts"))
      .map((fileName) => fileName.replace(/\\.agent\\.ts$/, ""))
      .sort((left, right) => left.localeCompare(right))

    const snapshot = builtinAgentNames.map((name) => ({
      name,
      present: Object.prototype.hasOwnProperty.call(config.agent ?? {}, name),
      descriptionType: typeof config.agent?.[name]?.description,
      promptType: typeof config.agent?.[name]?.prompt,
    }))

    process.stdout.write(JSON.stringify(snapshot))
  `
  const result = Bun.spawnSync({
    cmd: ["bun", "-e", script],
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  })

  if (result.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(result.stderr))
  }

  return JSON.parse(new TextDecoder().decode(result.stdout)) as Array<{
    name: string
    present: boolean
    descriptionType: string
    promptType: string
  }>
}

describe("createConfigHandler orchestrator agent registration", () => {
  it("registers the built-in orchestrator agent by default", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler("/test/directory")(config)

    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      description: expect.any(String),
      prompt: expect.any(String),
      mode: "primary",
      color: "#6A5CFF",
      permission: {
        question: "allow",
        apply_patch: "deny",
      },
    })
  })

  it("binds model and variant from supercode.json onto orchestrator", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: {
            orchestrator: {
              model: "gpt-5",
              variant: "fast",
            },
          },
        },
      },
    )(config)

    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      model: "gpt-5",
      variant: "fast",
    })
  })

  it("converts enabled false into disable true", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: {
            orchestrator: {
              enabled: false,
            },
          },
        },
      },
    )(config)

    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      disable: true,
    })
  })

  it("preserves existing custom fields on orchestrator entries", async () => {
    const config: Record<string, unknown> = {
      agent: {
        orchestrator: {
          customField: "keep-me",
        },
      },
    }

    await createConfigHandler("/test/directory")(config)

    expect((config.agent as Record<string, Record<string, unknown>>).orchestrator).toMatchObject({
      customField: "keep-me",
      mode: "primary",
    })
  })

  it("registers explorer and librarian with config-driven overrides", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: {
            explorer: {
              enabled: false,
              model: "explore-model",
            },
            librarian: {
              model: "library-model",
              variant: "high",
            },
          },
        },
      },
    )(config)

    expect((config.agent as Record<string, Record<string, unknown>>).explorer).toMatchObject({
      mode: "subagent",
      model: "explore-model",
      disable: true,
    })
    expect((config.agent as Record<string, Record<string, unknown>>).librarian).toMatchObject({
      mode: "subagent",
      model: "library-model",
      variant: "high",
    })
  })

  it("registers the full built-in agent inventory by default", async () => {
    const builtinAgentNames = getExpectedBuiltinAgentNames()
    const snapshot = getFreshBuiltInAgentSnapshot()

    expect(snapshot.map((entry) => entry.name)).toEqual(builtinAgentNames)
    for (const entry of snapshot) {
      expect(entry.present).toBeTrue()
      expect(entry.descriptionType).toBe("string")
      expect(entry.promptType).toBe("string")
    }
  })

  it("applies model and variant bindings across the full built-in inventory", async () => {
    const builtinAgentNames = getExpectedBuiltinAgentNames()
    const preloadedBindings = Object.fromEntries(
      builtinAgentNames.map((name) => [name, { model: "openai/gpt-5.4", variant: "medium" }]),
    )
    const config: Record<string, unknown> = {}

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: preloadedBindings,
        },
      },
    )(config)

    const agentConfig = config.agent as Record<string, Record<string, unknown>>

    for (const agentName of builtinAgentNames) {
      expect(agentConfig[agentName]).toMatchObject({
        model: "openai/gpt-5.4",
        variant: "medium",
      })
    }
  })

  it("disables conflicting OpenCode default agents by policy", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler("/test/directory")(config)

    expect((config.agent as Record<string, Record<string, unknown>>).explore).toMatchObject({
      disable: true,
    })
    expect((config.agent as Record<string, Record<string, unknown>>).build).toMatchObject({
      disable: true,
    })
    expect((config.agent as Record<string, Record<string, unknown>>).plan).toMatchObject({
      disable: true,
    })
    expect((config.agent as Record<string, Record<string, unknown>>).general).toEqual({
      disable: false,
    })
  })

  it("preserves existing custom fields on disabled OpenCode default agents", async () => {
    const config: Record<string, unknown> = {
      agent: {
        explore: {
          customField: "keep-me",
        },
      },
    }

    await createConfigHandler("/test/directory")(config)

    expect((config.agent as Record<string, Record<string, unknown>>).explore).toMatchObject({
      customField: "keep-me",
      disable: true,
    })
  })

  it("preserves an existing disabled general agent", async () => {
    const config: Record<string, unknown> = {
      agent: {
        general: {
          disable: true,
          customField: "keep-me",
        },
      },
    }

    await createConfigHandler("/test/directory")(config)

    expect((config.agent as Record<string, Record<string, unknown>>).general).toMatchObject({
      disable: true,
      customField: "keep-me",
    })
  })
})

describe("createConfigHandler default_agent for orchestrator", () => {
  it("sets default_agent to orchestrator when config is empty", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler("/test/directory")(config)

    expect(config.default_agent).toBe("orchestrator")
    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      mode: "primary",
    })
  })

  it("preserves an existing non-empty string default_agent", async () => {
    const config: Record<string, unknown> = { default_agent: "custom-primary" }

    await createConfigHandler("/test/directory")(config)

    expect(config.default_agent).toBe("custom-primary")
  })

  it("replaces a blank string default_agent with orchestrator", async () => {
    const config: Record<string, unknown> = { default_agent: "" }

    await createConfigHandler("/test/directory")(config)

    expect(config.default_agent).toBe("orchestrator")
  })

  it("replaces a whitespace-only string default_agent with orchestrator", async () => {
    const config: Record<string, unknown> = { default_agent: "   " }

    await createConfigHandler("/test/directory")(config)

    expect(config.default_agent).toBe("orchestrator")
  })

  it("replaces a non-string default_agent with orchestrator", async () => {
    const config: Record<string, unknown> = { default_agent: false }

    await createConfigHandler("/test/directory")(config)

    expect(config.default_agent).toBe("orchestrator")
  })

  it("does not set default_agent when orchestrator is disabled and config is empty", async () => {
    const config: Record<string, unknown> = {}

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: {
            orchestrator: {
              enabled: false,
            },
          },
        },
      },
    )(config)

    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      disable: true,
    })
    expect(config.default_agent).toBeUndefined()
  })

  it("preserves existing non-empty default_agent when orchestrator is disabled", async () => {
    const config: Record<string, unknown> = { default_agent: "custom-primary" }

    await createConfigHandler(
      "/test/directory",
      undefined,
      {
        preloadedConfig: {
          agent: {
            orchestrator: {
              enabled: false,
            },
          },
        },
      },
    )(config)

    expect((config.agent as Record<string, unknown>).orchestrator).toMatchObject({
      disable: true,
    })
    expect(config.default_agent).toBe("custom-primary")
  })
})
