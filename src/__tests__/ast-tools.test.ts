import { afterEach, describe, expect, it } from "bun:test"
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ast_grep_replace, ast_grep_search, resolveExecutionRoot } from "../tools/ast"

const tempDirs: string[] = []

function writeMockSg(dir: string, stdout: string): void {
  const binDir = join(dir, "node_modules", ".bin")
  mkdirSync(binDir, { recursive: true })
  const sgPath = join(binDir, process.platform === "win32" ? "sg.cmd" : "sg")

  if (process.platform === "win32") {
    writeFileSync(sgPath, `@echo off\r\necho ${stdout}\r\n`, "utf-8")
    return
  }

  writeFileSync(sgPath, `#!/bin/sh\nprintf '%s\\n' '${stdout}'\n`, "utf-8")
  chmodSync(sgPath, 0o755)
}

function buildLargeReplaceFixture(count: number): { source: string; output: string; json: string } {
  const sourceLines: string[] = []
  const outputLines: string[] = []
  const matches: string[] = []

  let offset = 0
  for (let i = 0; i < count; i++) {
    const sourceLine = `const value${i} = a + b\n`
    const outputLine = `const value${i} = b + a\n`
    const exprStart = sourceLine.indexOf("a + b")
    matches.push(
      `{"file":"many.ts","range":{"start":{"line":${i},"column":${exprStart}}},"text":"a + b","replacement":"b + a","replacementOffsets":{"start":${offset + exprStart},"end":${offset + exprStart + 5}}}`,
    )
    sourceLines.push(sourceLine)
    outputLines.push(outputLine)
    offset += sourceLine.length
  }

  return {
    source: sourceLines.join(""),
    output: outputLines.join(""),
    json: `[${matches.join(",")}]`,
  }
}

function countVisibleMatches(output: string): number {
  return [...output.matchAll(/^\d+\. /gm)].length
}

function countVisibleReplacements(output: string): number {
  return [...output.matchAll(/ - replaced:/g)].length
}

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe("resolveExecutionRoot", () => {
  it("prefers worktree over directory", () => {
    expect(resolveExecutionRoot({ directory: "/tmp/dir", worktree: "/tmp/worktree" })).toBe("/tmp/worktree")
  })
})

describe("ast_grep_search", () => {
  it("uses tool context root when paths are omitted", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-root-"))
    tempDirs.push(dir)
    const filePath = join(dir, "ctx.ts")
    writeFileSync(filePath, "export const sentinel = 123\n", "utf-8")
    writeMockSg(dir, '[{"file":"ctx.ts","range":{"start":{"line":0,"column":0}},"text":"export const sentinel = 123"}]')

    const result = String(
      await (ast_grep_search.execute as any)(
        {
          pattern: "export const sentinel = 123",
          lang: "typescript",
          globs: ["*.ts"],
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("ctx.ts")
  })

  it("truncates displayed matches to 100 while keeping the full summary count", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-search-many-"))
    tempDirs.push(dir)
    const matches = Array.from({ length: 101 }, (_, i) => {
      return `{"file":"ctx.ts","range":{"start":{"line":${i},"column":0}},"text":"match ${i}"}`
    }).join(",")
    writeMockSg(dir, `[${matches}]`)

    const result = String(
      await (ast_grep_search.execute as any)(
        {
          pattern: "$MATCH",
          lang: "typescript",
          paths: [dir],
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("101 match(es) found")
    expect(result).toContain("output truncated to 100")
    expect(countVisibleMatches(result)).toBe(100)
  })
})

describe("ast_grep_replace", () => {
  it("updates files when dryRun is false", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-rewrite-"))
    tempDirs.push(dir)
    const filePath = join(dir, "math.ts")
    writeFileSync(filePath, "export function add(a, b) {\n  return a + b\n}\n", "utf-8")
    writeMockSg(dir, `[{"file":"${filePath}","range":{"start":{"line":1,"column":2}},"text":"return a + b","replacement":"return b + a","replacementOffsets":{"start":30,"end":42}}]`)

    const result = String(
      await (ast_grep_replace.execute as any)(
        {
          pattern: "return $A + $B",
          rewrite: "return $B + $A",
          lang: "typescript",
          paths: [filePath],
          dryRun: false,
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("were made")
    expect(readFileSync(filePath, "utf-8")).toContain("return b + a")
  })

  it("refuses to modify files outside the execution root", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-outside-root-"))
    const outsideDir = mkdtempSync(join(tmpdir(), "ast-outside-target-"))
    tempDirs.push(dir, outsideDir)
    const insideFile = join(dir, "inside.ts")
    const outsideFile = join(outsideDir, "outside.ts")
    writeFileSync(insideFile, "const inside = a + b\n", "utf-8")
    writeFileSync(outsideFile, "const outside = a + b\n", "utf-8")
    writeMockSg(dir, `[{"file":"${outsideFile}","range":{"start":{"line":0,"column":0}},"text":"a + b","replacement":"b + a","replacementOffsets":{"start":16,"end":21}}]`)

    const result = String(
      await (ast_grep_replace.execute as any)(
        {
          pattern: "$A + $B",
          rewrite: "$B + $A",
          lang: "typescript",
          paths: [insideFile],
          dryRun: false,
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("outside the execution root")
    expect(readFileSync(outsideFile, "utf-8")).toContain("a + b")
  })

  it("does not leave earlier files modified when a later file rewrite is invalid", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-transactional-"))
    tempDirs.push(dir)
    const firstFile = join(dir, "first.ts")
    const secondFile = join(dir, "second.ts")
    writeFileSync(firstFile, "const first = a + b\n", "utf-8")
    writeFileSync(secondFile, "const second = a + b\n", "utf-8")
    writeMockSg(
      dir,
      `[{"file":"first.ts","range":{"start":{"line":0,"column":0}},"text":"a + b","replacement":"b + a","replacementOffsets":{"start":14,"end":19}},{"file":"second.ts","range":{"start":{"line":0,"column":0}},"text":"a + b","replacement":"b + a","replacementOffsets":{"start":15,"end":999}}]`,
    )

    const result = String(
      await (ast_grep_replace.execute as any)(
        {
          pattern: "$A + $B",
          rewrite: "$B + $A",
          lang: "typescript",
          paths: [firstFile, secondFile],
          dryRun: false,
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("Invalid replacement range")
    expect(readFileSync(firstFile, "utf-8")).toContain("a + b")
    expect(readFileSync(secondFile, "utf-8")).toContain("a + b")
  })

  it("applies all matches even when output is truncated to 100 items", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-many-matches-"))
    tempDirs.push(dir)
    const filePath = join(dir, "many.ts")
    const fixture = buildLargeReplaceFixture(101)
    writeFileSync(filePath, fixture.source, "utf-8")
    writeMockSg(dir, fixture.json)

    const result = String(
      await (ast_grep_replace.execute as any)(
        {
          pattern: "$A + $B",
          rewrite: "$B + $A",
          lang: "typescript",
          paths: [filePath],
          dryRun: false,
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toContain("101 change(s) were made")
    expect(result).toContain("output truncated to 100")
    expect(countVisibleReplacements(result)).toBe(100)
    expect(readFileSync(filePath, "utf-8")).toBe(fixture.output)
  })

  it("resolves local sg before PATH", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-local-sg-"))
    tempDirs.push(dir)
    writeMockSg(dir, "[]")

    const result = String(
      await (ast_grep_search.execute as any)(
        {
          pattern: "export const missing = 1",
          lang: "typescript",
          paths: [dir],
        },
        {
          directory: dir,
          worktree: dir,
        },
      ),
    )

    expect(result).toBe("No matches found.")
  })
})
