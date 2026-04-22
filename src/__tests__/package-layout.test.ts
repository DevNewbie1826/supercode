import { describe, expect, it } from "bun:test"
import pkg from "../../package.json"

describe("package layout", () => {
  it("points main to the TypeScript plugin entry", () => {
    expect(pkg.main).toBe("./src/index.ts")
  })
})
