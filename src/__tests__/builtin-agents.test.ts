import { describe, expect, it } from "bun:test"
import { getBuiltinAgentByName } from "../agents/registry"

describe("builtin agent definitions", () => {
  it("defines explorer as a subagent for local codebase search", () => {
    const explorer = getBuiltinAgentByName("explorer")

    expect(explorer).toMatchObject({
      name: "explorer",
      mode: "subagent",
      description: expect.any(String),
      prompt: expect.any(String),
    })
  })

  it("defines librarian as a subagent for external documentation and source research", () => {
    const librarian = getBuiltinAgentByName("librarian")

    expect(librarian).toMatchObject({
      name: "librarian",
      mode: "subagent",
      description: expect.any(String),
      prompt: expect.any(String),
    })
  })
})
