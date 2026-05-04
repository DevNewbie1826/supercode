import { describe, expect, it } from "bun:test"
import { buildBuiltinAgentEntries } from "../agents/config"
import { createBuiltinAgentRegistry, getBuiltinAgentByName } from "../agents/registry"

const expectedReadEntries: [string, string][] = [
  ["*", "allow"],
  ["*.env", "deny"],
  ["*.env.*", "deny"],
  ["*.env.example", "allow"],
]

const expectedTopLevelPermissionKeys = [
  "apply_patch",
  "edit",
  "ast_grep_replace",
  "lsp_rename",
  "task",
  "external_directory",
  "webfetch",
  "doom_loop",
  "read",
]

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

    // exact top-level permission key set — no extra permissions
    expect(Object.keys(permission).sort()).toEqual([...expectedTopLevelPermissionKeys].sort())

    // nested read rules with exact ordered entries
    expect(Object.entries(permission.read as Record<string, string>)).toEqual(expectedReadEntries)
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

    // exact top-level permission key set — no extra permissions
    expect(Object.keys(permission).sort()).toEqual([...expectedTopLevelPermissionKeys].sort())

    // nested read rules with exact ordered entries
    expect(Object.entries(permission.read as Record<string, string>)).toEqual(expectedReadEntries)
  })

  it("generated built-in config preserves explorer read-entry order via buildBuiltinAgentEntries", () => {
    const registry = createBuiltinAgentRegistry()
    const generated = buildBuiltinAgentEntries({}, registry)
    const explorerConfig = generated["explorer"] as Record<string, unknown>
    const permission = explorerConfig.permission as Record<string, unknown>

    expect(Object.entries(permission.read as Record<string, string>)).toEqual(expectedReadEntries)
  })

  it("generated built-in config preserves librarian read-entry order via buildBuiltinAgentEntries", () => {
    const registry = createBuiltinAgentRegistry()
    const generated = buildBuiltinAgentEntries({}, registry)
    const librarianConfig = generated["librarian"] as Record<string, unknown>
    const permission = librarianConfig.permission as Record<string, unknown>

    expect(Object.entries(permission.read as Record<string, string>)).toEqual(expectedReadEntries)
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

describe("target non-research subagent bounded task permission policy", () => {
  const targetAgentNames = [
    "executor",
    "planner",
    "plan-checker",
    "plan-challenger",
    "code-quality-reviewer",
    "code-spec-reviewer",
    "spec-reviewer",
    "completion-verifier",
    "final-reviewer",
    "systematic-debugger",
    "task-compliance-checker",
  ] as const

  const expectedTaskPermission = {
    "*": "deny",
    explorer: "allow",
    librarian: "allow",
  }

  for (const agentName of targetAgentNames) {
    it(`gives ${agentName} a bounded nested task permission allowing only explorer and librarian`, () => {
      const agent = getBuiltinAgentByName(agentName)
      const permission = agent.defaults?.permission as Record<string, unknown>

      expect(permission.task).toEqual(expectedTaskPermission)
    })
  }

  it("keeps explorer as a terminal research agent with task deny", () => {
    const explorer = getBuiltinAgentByName("explorer")
    const permission = explorer.defaults?.permission as Record<string, unknown>

    expect(permission.task).toBe("deny")
  })

  it("keeps librarian as a terminal research agent with task deny", () => {
    const librarian = getBuiltinAgentByName("librarian")
    const permission = librarian.defaults?.permission as Record<string, unknown>

    expect(permission.task).toBe("deny")
  })

  it("does not assign the target nested task pattern to orchestrator", () => {
    const orchestrator = getBuiltinAgentByName("orchestrator")
    const permission = orchestrator.defaults?.permission as Record<string, unknown>

    // orchestrator must NOT receive the bounded nested task permission
    expect(permission.task).not.toEqual(expectedTaskPermission)
  })
})
