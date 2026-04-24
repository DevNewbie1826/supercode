import { describe, expect, it } from "bun:test"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createBuiltinAgentRegistry } from "../agents/registry"

const definitionsDirectory = join(dirname(fileURLToPath(import.meta.url)), "../agents/definitions")

function getExpectedBuiltinAgentNames(): string[] {
  return readdirSync(definitionsDirectory)
    .filter((fileName) => fileName.endsWith(".agent.ts"))
    .map((fileName) => fileName.replace(/\.agent\.ts$/, ""))
    .sort((left, right) => left.localeCompare(right))
}

describe("createBuiltinAgentRegistry", () => {
  it("returns all built-in definitions sorted by name", async () => {
    const registry = createBuiltinAgentRegistry()

    expect(registry.map((agent) => agent.name)).toEqual(getExpectedBuiltinAgentNames())
  })

  it("loads only *.agent.ts definitions from disk", () => {
    const registry = createBuiltinAgentRegistry()
    const expectedBuiltinAgentNames = getExpectedBuiltinAgentNames()

    expect(registry.every((agent) => agent.name.endsWith(".ts"))).toBeFalse()
    expect(registry).toHaveLength(expectedBuiltinAgentNames.length)
  })
})
