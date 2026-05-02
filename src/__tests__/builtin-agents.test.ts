import { describe, expect, it } from "bun:test"
import { createBuiltinAgentRegistry, getBuiltinAgentByName } from "../agents/registry"

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

  it("gives librarian OMO-like non-writing permissions with explicit .env read rules", () => {
    const librarian = getBuiltinAgentByName("librarian")
    const permission = librarian.defaults?.permission as Record<string, unknown>

    // bash must NOT be denied
    expect(permission).not.toHaveProperty("bash")

    // write/delegation tools remain denied
    expect(permission).toMatchObject({
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    })

    // OMO-like allowances and explicit deny
    expect(permission).toMatchObject({
      external_directory: "allow",
      webfetch: "allow",
      doom_loop: "deny",
    })

    // nested read rules
    expect(permission.read).toEqual({
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow",
    })
  })

  it("gives explorer OMO-like non-writing permissions with explicit .env read rules", () => {
    const explorer = getBuiltinAgentByName("explorer")
    const permission = explorer.defaults?.permission as Record<string, unknown>

    // bash must NOT be denied
    expect(permission).not.toHaveProperty("bash")

    // write/delegation tools remain denied
    expect(permission).toMatchObject({
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    })

    // OMO-like allowances and explicit deny
    expect(permission).toMatchObject({
      external_directory: "allow",
      webfetch: "allow",
      doom_loop: "deny",
    })

    // nested read rules
    expect(permission.read).toEqual({
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow",
    })
  })

  it("no built-in agent default permission object contains explicit bash deny", () => {
    const registry = createBuiltinAgentRegistry()

    const agentsWithBashDeny = registry
      .filter((agent) => {
        const permission = agent.defaults?.permission as Record<string, unknown> | undefined
        if (!permission) return false
        return Object.prototype.hasOwnProperty.call(permission, "bash") && permission.bash === "deny"
      })
      .map((agent) => agent.name)

    expect(agentsWithBashDeny).toEqual([])
  })
})
