import { afterEach, describe, expect, it } from "bun:test"
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  lsp_diagnostics,
  lsp_find_references,
  lsp_goto_definition,
  lsp_prepare_rename,
  lsp_rename,
  lsp_symbols,
} from "../tools/lsp"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

function writeMockTypescriptServer(root: string): void {
  const binDir = join(root, "node_modules", ".bin")
  mkdirSync(binDir, { recursive: true })
  const serverPath = join(binDir, process.platform === "win32" ? "typescript-language-server.cmd" : "typescript-language-server")

  const serverScript = String.raw`#!/usr/bin/env node
let buffer = Buffer.alloc(0)

function send(message) {
  const body = Buffer.from(JSON.stringify(message))
  process.stdout.write(
    "Content-Length: " + body.length + "\r\n\r\n"
  )
  process.stdout.write(body)
}

function handle(message) {
  if (message.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        capabilities: {
          documentSymbolProvider: true,
          publishDiagnostics: true,
        },
      },
    })
    return
  }

  if (message.method === "initialized") return

  if (message.method === "textDocument/didOpen") {
    send({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri: message.params.textDocument.uri,
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 6 },
            },
            severity: 2,
            source: "mock-ts-server",
            message: "mock warning",
          },
        ],
      },
    })
    return
  }

  if (message.method === "textDocument/documentSymbol") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: [
        {
          name: "SupercodePlugin",
          kind: 12,
          range: {
            start: { line: 3, character: 13 },
            end: { line: 7, character: 1 },
          },
          selectionRange: {
            start: { line: 3, character: 13 },
            end: { line: 3, character: 28 },
          },
        },
      ],
    })
    return
  }

  if (message.method === "shutdown") {
    send({ jsonrpc: "2.0", id: message.id, result: null })
    return
  }

  if (message.method === "exit") {
    process.exit(0)
  }
}

function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n")
    if (headerEnd < 0) return
    const header = buffer.subarray(0, headerEnd).toString("utf8")
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      buffer = buffer.subarray(headerEnd + 4)
      continue
    }
    const contentLength = Number(match[1])
    const messageStart = headerEnd + 4
    const messageEnd = messageStart + contentLength
    if (buffer.length < messageEnd) return
    const message = JSON.parse(buffer.subarray(messageStart, messageEnd).toString("utf8"))
    buffer = buffer.subarray(messageEnd)
    handle(message)
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  processBuffer()
})
`

  if (process.platform === "win32") {
    const nodePath = process.execPath.replaceAll("\\", "\\\\")
    const jsPath = `${serverPath}.js`
    writeFileSync(jsPath, serverScript, "utf8")
    writeFileSync(serverPath, `@echo off\r\n"${nodePath}" "${jsPath}" %*\r\n`, "utf8")
    return
  }

  writeFileSync(serverPath, serverScript, "utf8")
  chmodSync(serverPath, 0o755)
}

describe("LSP tool definitions", () => {
  it("exposes all public LSP tools", () => {
    expect(lsp_goto_definition).toBeDefined()
    expect(lsp_find_references).toBeDefined()
    expect(lsp_symbols).toBeDefined()
    expect(lsp_diagnostics).toBeDefined()
    expect(lsp_prepare_rename).toBeDefined()
    expect(lsp_rename).toBeDefined()
  })

  it("validates position inputs", async () => {
    const result = String(
      await (lsp_goto_definition.execute as any)({
        filePath: "missing.ts",
        line: 0,
        character: 0,
      }),
    )

    expect(result).toContain("line must be an integer >= 1")
  })

  it("supports positive-path symbols and diagnostics on a real file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mock-lsp-"))
    tempDirs.push(dir)

    writeMockTypescriptServer(dir)

    const filePath = join(dir, "index.ts")
    writeFileSync(
      filePath,
      'export const SupercodePlugin = async () => ({ tool: {} })\n',
      "utf8",
    )
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "mock-lsp-project", type: "module" }, null, 2),
      "utf8",
    )

    const symbols = String(
      await (lsp_symbols.execute as any)(
        { filePath },
        { directory: dir, worktree: dir },
      ),
    )
    const diagnostics = String(
      await (lsp_diagnostics.execute as any)(
        { filePath },
        { directory: dir, worktree: dir },
      ),
    )

    expect(symbols).toContain("SupercodePlugin")
    expect(diagnostics).toContain("mock warning")
  })
})
