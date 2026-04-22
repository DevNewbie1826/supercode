import { afterEach, describe, expect, it } from "bun:test"
import { current_time } from "../tools/current-time"

const originalToLocaleString = Date.prototype.toLocaleString

afterEach(() => {
  Date.prototype.toLocaleString = originalToLocaleString
})

describe("current_time", () => {
  it("returns the local formatter output on success", async () => {
    Date.prototype.toLocaleString = () => "LOCAL_TIME_SENTINEL"

    const result = await (current_time.execute as any)({}, {
      directory: process.cwd(),
      worktree: process.cwd(),
    })

    expect(result).toBe("LOCAL_TIME_SENTINEL")
  })

  it("returns an error string when Date.prototype.toLocaleString throws", async () => {
    Date.prototype.toLocaleString = (() => {
      throw new Error("clock exploded")
    }) as typeof Date.prototype.toLocaleString

    const result = await (current_time.execute as any)({}, {
      directory: process.cwd(),
      worktree: process.cwd(),
    })

    expect(result).toBe("Error: clock exploded")
  })
})
