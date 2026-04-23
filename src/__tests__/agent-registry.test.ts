import { describe, expect, it } from "bun:test"
import { createBuiltinAgentRegistry } from "../agents/registry"

describe("createBuiltinAgentRegistry", () => {
  it("returns all built-in definitions sorted by name", async () => {
    const registry = createBuiltinAgentRegistry()

    expect(registry.map((agent) => agent.name)).toEqual(["explorer", "librarian", "orchestrator"])
  })

  it("loads only *.agent.ts definitions from disk", () => {
    const registry = createBuiltinAgentRegistry()

    expect(registry.every((agent) => agent.name.endsWith(".ts"))).toBeFalse()
    expect(registry).toHaveLength(3)
  })
})
