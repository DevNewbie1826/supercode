import { readFileSync, realpathSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { LspError } from "./errors"
import { encodeMessage, parseMessages, type JsonRpcMessage } from "./jsonrpc"
import { languageIdForPath, type Diagnostic, type DocumentSymbol, type Location, type LocationLink, type WorkspaceEdit } from "./types"

type JsonRpcPending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

class JsonRpcClient {
  private buffer = new Uint8Array(0)
  private pending = new Map<number, JsonRpcPending>()
  private id = 0
  private closed = false
  private notificationHandler: ((method: string, params: unknown) => void) | null = null

  constructor(private readonly proc: ReturnType<typeof Bun.spawn>) {
    this.proc.exited.then((code) => {
      this.closed = true
      this.failPending(new Error(`LSP exited: ${code}`))
    }).catch(() => {})
    void this.readLoop()
  }

  setNotificationHandler(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler
  }

  async request(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    if (this.closed || this.proc.exitCode !== null) throw new Error("LSP exited")
    const id = ++this.id
    let entry!: JsonRpcPending

    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`LSP request '${method}' timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      entry = {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
        timer,
      }
      this.pending.set(id, entry)
    })

    try {
      await this.write({ jsonrpc: "2.0", id, method, params })
    } catch (error) {
      this.pending.delete(id)
      clearTimeout(entry.timer)
      throw error
    }

    return promise
  }

  async notify(method: string, params?: unknown): Promise<void> {
    await this.write({ jsonrpc: "2.0", method, params })
  }

  private async write(message: JsonRpcMessage): Promise<void> {
    const stdin = this.proc.stdin as { write?: (chunk: Uint8Array) => unknown }
    if (typeof stdin?.write !== "function") {
      throw new Error("LSP stdin is not writable")
    }
    await stdin.write(encodeMessage(message))
  }

  private failPending(error: Error): void {
    for (const [id, entry] of this.pending) {
      this.pending.delete(id)
      clearTimeout(entry.timer)
      entry.reject(error)
    }
  }

  private async readLoop(): Promise<void> {
    const stdout = this.proc.stdout
    if (!(stdout instanceof ReadableStream)) return
    const reader = stdout.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue
        const next = new Uint8Array(this.buffer.length + value.length)
        next.set(this.buffer)
        next.set(value, this.buffer.length)
        this.buffer = next
        this.processMessages()
      }
    } catch {}
  }

  private processMessages(): void {
    const parsed = parseMessages(this.buffer)
    if (parsed.consumed > 0) {
      this.buffer = new Uint8Array(this.buffer.subarray(parsed.consumed))
    }

    for (const message of parsed.messages) {
      if (typeof message.id === "number") {
        const entry = this.pending.get(message.id)
        if (!entry) continue
        this.pending.delete(message.id)
        if (message.error) entry.reject(new Error(String((message.error as any).message ?? "Unknown LSP error")))
        else entry.resolve(message.result)
        continue
      }

      if (typeof message.method === "string") {
        this.notificationHandler?.(message.method, message.params)
      }
    }
  }
}

type OpenDocument = {
  uri: string
  version: number
  text: string
}

export function uriToPath(uri: string): string {
  try {
    return new URL(uri).protocol === "file:" ? fileURLToPath(uri) : uri
  } catch {
    return uri
  }
}

export function normalizeLocations(value: unknown): Location[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value : [value]
  return raw
    .map((item: any) => {
      if (item?.uri && item?.range) return { uri: String(item.uri), range: item.range } as Location
      if (item?.targetUri && item?.targetRange) return { uri: String(item.targetUri), range: item.targetRange } as Location
      return null
    })
    .filter(Boolean) as Location[]
}

export class LspClient {
  private rpc: JsonRpcClient | null = null
  private proc: ReturnType<typeof Bun.spawn> | null = null
  private openDocs = new Map<string, OpenDocument>()
  private diagnostics = new Map<string, Diagnostic[]>()
  private capabilities: Record<string, unknown> | null = null
  private alive = false

  constructor(
    private readonly root: string,
    private readonly cmd: string[],
  ) {}

  private canonicalPath(filePath: string): string {
    const absPath = resolve(filePath)
    try {
      return realpathSync(absPath)
    } catch {
      return absPath
    }
  }

  private toUri(filePath: string): string {
    return pathToFileURL(this.canonicalPath(filePath)).href
  }

  async start(): Promise<void> {
    if (this.rpc && this.proc && this.proc.exitCode === null) return

    const pathParts = [join(this.root, "node_modules", ".bin")]
    if (process.env.PATH) pathParts.push(...process.env.PATH.split(process.platform === "win32" ? ";" : ":"))
    const env = { ...process.env, PATH: pathParts.join(process.platform === "win32" ? ";" : ":") }

    this.proc = Bun.spawn(this.cmd, {
      cwd: this.root,
      env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    })
    this.proc.unref?.()

    this.rpc = new JsonRpcClient(this.proc)
    this.rpc.setNotificationHandler((method, params: any) => {
      if (method === "textDocument/publishDiagnostics" && params?.uri) {
        this.diagnostics.set(String(params.uri), (params.diagnostics ?? []) as Diagnostic[])
      }
    })

    const rootUri = pathToFileURL(this.canonicalPath(this.root)).href
    const init = (await this.rpc.request("initialize", {
      processId: process.pid,
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: "workspace" }],
      capabilities: {
        textDocument: {
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          publishDiagnostics: {},
          rename: { prepareSupport: true, prepareSupportDefaultBehavior: 1 },
        },
        workspace: { symbol: {}, workspaceFolders: true, applyEdit: true },
      },
    })) as { capabilities?: Record<string, unknown> }

    this.capabilities = init?.capabilities ?? {}
    await this.rpc.notify("initialized")
    this.alive = true
  }

  isAlive(): boolean {
    return this.alive && this.proc !== null && this.proc.exitCode === null && this.rpc !== null
  }

  async stop(): Promise<void> {
    this.alive = false
    try {
      await this.rpc?.request("shutdown", undefined, 3_000)
    } catch {}
    try {
      await this.rpc?.notify("exit")
    } catch {}
    try {
      this.proc?.kill()
    } catch {}
    this.rpc = null
    this.proc = null
    this.openDocs.clear()
    this.diagnostics.clear()
  }

  killSync(): void {
    try {
      this.proc?.kill()
    } catch {}
  }

  private supportsMethod(method: string): boolean {
    if (!this.capabilities) return false
    switch (method) {
      case "definition":
        return Boolean((this.capabilities as any).definitionProvider)
      case "references":
        return Boolean((this.capabilities as any).referencesProvider)
      case "documentSymbol":
        return Boolean((this.capabilities as any).documentSymbolProvider)
      case "rename":
        return Boolean((this.capabilities as any).renameProvider)
      case "diagnostic":
        return Boolean((this.capabilities as any).diagnosticProvider || (this.capabilities as any).publishDiagnostics)
      default:
        return true
    }
  }

  private requireMethod(method: string): void {
    if (!this.supportsMethod(method)) throw LspError.notSupported(method)
  }

  async ensureDocumentOpen(filePath: string): Promise<void> {
    await this.start()
    const rpc = this.rpc
    if (!rpc) throw new Error("LSP client not started")
    const absPath = this.canonicalPath(filePath)
    const uri = this.toUri(absPath)
    if (this.openDocs.has(uri)) return
    const text = readFileSync(absPath, "utf-8")
    await rpc.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: languageIdForPath(absPath),
        version: 1,
        text,
      },
    })
    this.openDocs.set(uri, { uri, version: 1, text })
  }

  async ensureOpenMany(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      await this.ensureDocumentOpen(filePath)
    }
  }

  async definition(filePath: string, line: number, character: number): Promise<Location[] | LocationLink[]> {
    this.requireMethod("definition")
    await this.ensureDocumentOpen(filePath)
    return (await this.rpc!.request("textDocument/definition", {
      textDocument: { uri: this.toUri(filePath) },
      position: { line: line - 1, character },
    })) as Location[] | LocationLink[]
  }

  async references(filePath: string, line: number, character: number, includeDeclaration: boolean): Promise<Location[]> {
    this.requireMethod("references")
    await this.ensureDocumentOpen(filePath)
    return (await this.rpc!.request("textDocument/references", {
      textDocument: { uri: this.toUri(filePath) },
      position: { line: line - 1, character },
      context: { includeDeclaration },
    })) as Location[]
  }

  async documentSymbols(filePath: string): Promise<DocumentSymbol[]> {
    this.requireMethod("documentSymbol")
    await this.ensureDocumentOpen(filePath)
    const result = await this.rpc!.request("textDocument/documentSymbol", {
      textDocument: { uri: this.toUri(filePath) },
    })
    return (Array.isArray(result) ? result : []) as DocumentSymbol[]
  }

  async workspaceSymbols(query: string): Promise<Array<{ name: string; kind: number; location?: { uri: string; range?: any }; uri?: string }>> {
    const result = await this.rpc!.request("workspace/symbol", { query })
    return (Array.isArray(result) ? result : []) as Array<{ name: string; kind: number; location?: { uri: string; range?: any }; uri?: string }>
  }

  async getDiagnostics(filePath: string): Promise<Diagnostic[]> {
    await this.ensureDocumentOpen(filePath)
    await new Promise((resolve) => setTimeout(resolve, 150))
    return this.diagnostics.get(this.toUri(filePath)) ?? []
  }

  async prepareRename(filePath: string, line: number, character: number): Promise<unknown> {
    this.requireMethod("rename")
    await this.ensureDocumentOpen(filePath)
    try {
      return await this.rpc!.request("textDocument/prepareRename", {
        textDocument: { uri: this.toUri(filePath) },
        position: { line: line - 1, character },
      })
    } catch (error: any) {
      const message = String(error?.message ?? "")
      if (
        message.toLowerCase().includes("cannot rename") ||
        message.toLowerCase().includes("can't rename") ||
        message.toLowerCase().includes("invalid position") ||
        message.toLowerCase().includes("prepare rename failed")
      ) {
        return null
      }
      throw error
    }
  }

  async rename(filePath: string, line: number, character: number, newName: string): Promise<WorkspaceEdit | null> {
    this.requireMethod("rename")
    await this.ensureDocumentOpen(filePath)
    return (await this.rpc!.request("textDocument/rename", {
      textDocument: { uri: this.toUri(filePath) },
      position: { line: line - 1, character },
      newName,
    })) as WorkspaceEdit | null
  }
}
