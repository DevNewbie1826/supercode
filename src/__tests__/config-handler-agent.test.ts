import { describe, expect, it } from "bun:test"
import { createConfigHandler } from "../config-handler"

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
})
