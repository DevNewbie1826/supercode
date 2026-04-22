import { readdirSync, statSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { LspClient, normalizeLocations, uriToPath } from "./client"
import { LspError, formatLspError, isLspError } from "./errors"
import { formatDiagnostic, flatSymbols, formatLocation, formatSymbol } from "./format"
import { lspLookupKeysForPath, selectServerForFile, SERVERS } from "./registry"
import { findFilesByExts, findWorkspaceRoot, workspaceRootMarkersForLookupKey } from "./workspace"
import { applyWorkspaceEdit } from "./workspace-edit"
import type { Diagnostic, WorkspaceEdit } from "./types"

type ManagedClient = {
  client: LspClient
  refs: number
  lastUsed: number
}

class LspManager {
  private readonly pool = new Map<string, ManagedClient>()
  private readonly pending = new Map<string, Promise<LspClient>>()
  private readonly timer: ReturnType<typeof setInterval>
  private static readonly singleton = new LspManager()

  static get(): LspManager {
    return LspManager.singleton
  }

  private constructor() {
    this.timer = setInterval(() => this.cleanup(), 60_000)
    this.timer.unref?.()
    process.on("exit", () => {
      for (const managed of this.pool.values()) {
        try {
          managed.client.killSync()
        } catch {}
      }
    })
  }

  private key(root: string, id: string): string {
    return `${root}::${id}`
  }

  async acquire(root: string, id: string, command: string[]): Promise<LspClient> {
    const key = this.key(root, id)
    const existing = this.pool.get(key)
    if (existing?.client.isAlive()) {
      existing.refs++
      existing.lastUsed = Date.now()
      return existing.client
    }

    const pending = this.pending.get(key)
    if (pending) {
      return pending.then((client) => {
        const managed = this.pool.get(key)
        if (managed) {
          managed.refs++
          managed.lastUsed = Date.now()
        }
        return client
      })
    }

    const next = (async () => {
      if (existing) {
        await existing.client.stop().catch(() => {})
        this.pool.delete(key)
      }
      const client = new LspClient(root, command)
      await client.start()
      this.pool.set(key, { client, refs: 1, lastUsed: Date.now() })
      return client
    })()

    this.pending.set(key, next)
    try {
      return await next
    } finally {
      this.pending.delete(key)
    }
  }

  release(root: string, id: string): void {
    const managed = this.pool.get(this.key(root, id))
    if (!managed) return
    managed.refs = Math.max(0, managed.refs - 1)
    managed.lastUsed = Date.now()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, managed] of this.pool) {
      if (managed.refs === 0 && now - managed.lastUsed > 300_000) {
        void managed.client.stop().catch(() => {})
        this.pool.delete(key)
      }
    }
  }
}

type LspResult<T> =
  | { ok: true; value: T; root: string }
  | { ok: false; error: LspError }

async function executeLspTool<T>(
  filePath: string,
  handler: (client: LspClient, root: string, absPath: string) => Promise<T>,
): Promise<LspResult<T>> {
  const absPath = resolve(filePath)

  try {
    if (statSync(absPath).isDirectory()) {
      return { ok: false, error: LspError.fileNotFound("Directory paths not supported. Provide a file path.") }
    }
  } catch (error: any) {
    if (error.code === "ENOENT") return { ok: false, error: LspError.fileNotFound(filePath) }
    return { ok: false, error: LspError.startFailed("fs", error.message) }
  }

  const lookupKeys = lspLookupKeysForPath(absPath)
  const root = findWorkspaceRoot(absPath, workspaceRootMarkersForLookupKey(lookupKeys[0] ?? ""))
  const server = selectServerForFile(absPath, root, lookupKeys)
  if (!server) {
    const available = Object.values(SERVERS)
      .filter((item) => lookupKeys.some((key) => item.exts.includes(key)))
      .map((item) => item.id)
    return {
      ok: false,
      error: LspError.serverNotFound(lookupKeys.join(", ") || basename(absPath), `Available: ${available.join(", ") || "none"}`),
    }
  }

  let client: LspClient
  try {
    client = await LspManager.get().acquire(root, server.id, server.cmd)
  } catch (error: any) {
    return { ok: false, error: LspError.startFailed(server.id, error.message ?? String(error)) }
  }

  try {
    const value = await handler(client, root, absPath)
    return { ok: true, value, root }
  } catch (error: any) {
    if (isLspError(error)) return { ok: false, error }
    if (String(error?.message ?? "").includes("timed out")) {
      return { ok: false, error: LspError.requestTimeout("request", 30_000) }
    }
    return { ok: false, error: LspError.startFailed(server.id, error.message ?? String(error)) }
  } finally {
    LspManager.get().release(root, server.id)
  }
}

async function preloadWorkspaceFiles(client: LspClient, root: string, absPath: string): Promise<void> {
  const server = selectServerForFile(absPath, root)
  if (!server) return
  const files = findFilesByExts(root, server.exts, 500)
    .map((file) => resolve(file))
    .filter((file) => file !== absPath)
  await client.ensureOpenMany(files)
}

function validatePositionInput(line: number, character: number): string | null {
  if (!Number.isInteger(line) || line < 1) return "line must be an integer >= 1"
  if (!Number.isInteger(character) || character < 0) return "character must be an integer >= 0"
  return null
}

function formatWorkspaceSymbolResult(symbol: { name: string; kind: number; location?: { uri: string; range?: any }; uri?: string }): string {
  if (symbol.location?.range) {
    return formatSymbol(
      {
        name: symbol.name,
        kind: symbol.kind,
        range: symbol.location.range,
        selectionRange: symbol.location.range,
      },
      symbol.uri ? uriToPath(symbol.uri) : undefined,
    )
  }
  return `${symbol.uri ? uriToPath(symbol.uri) : "(unknown)"}  ${symbol.kind}  ${symbol.name}`
}

function findBootstrapFiles(dir: string, root = dir, limit = 8): string[] {
  const results: string[] = []
  const seenServers = new Set<string>()
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "vendor", "target"])

  const visit = (current: string): boolean => {
    let entries: string[]
    try {
      entries = readdirSync(current)
    } catch {
      return false
    }

    for (const entry of entries) {
      if (skipDirs.has(entry)) continue
      const full = join(current, entry)
      let stats: ReturnType<typeof statSync>
      try {
        stats = statSync(full)
      } catch {
        continue
      }

      if (stats.isDirectory()) {
        if (visit(full)) return true
        continue
      }

      const server = selectServerForFile(full, root)
      if (!server || seenServers.has(server.id)) continue
      seenServers.add(server.id)
      results.push(full)
      if (results.length >= limit) return true
    }

    return false
  }

  visit(dir)
  return results
}

export const lsp_goto_definition: ToolDefinition = tool({
  description: "Find where a symbol is defined using the LSP server",
  args: {
    filePath: tool.schema.string(),
    line: tool.schema.number(),
    character: tool.schema.number(),
  },
  async execute(args) {
    const invalid = validatePositionInput(args.line, args.character)
    if (invalid) return `Error: ${invalid}`

    const result = await executeLspTool(args.filePath, (client, _root, absPath) => client.definition(absPath, args.line, args.character))
    if (!result.ok) return `Error: ${formatLspError(result.error)}`

    const locations = normalizeLocations(result.value)
    return locations.length ? locations.map((location) => formatLocation(location, result.root)).join("\n") : "No definition found."
  },
})

export const lsp_find_references: ToolDefinition = tool({
  description: "Find all references to a symbol using the LSP server",
  args: {
    filePath: tool.schema.string(),
    line: tool.schema.number(),
    character: tool.schema.number(),
    includeDeclaration: tool.schema.boolean().optional(),
  },
  async execute(args) {
    const invalid = validatePositionInput(args.line, args.character)
    if (invalid) return `Error: ${invalid}`

    const result = await executeLspTool(args.filePath, async (client, root, absPath) => {
      await preloadWorkspaceFiles(client, root, absPath)
      return client.references(absPath, args.line, args.character, args.includeDeclaration ?? true)
    })

    if (!result.ok) return `Error: ${formatLspError(result.error)}`

    const locations = normalizeLocations(result.value)
    return locations.length ? locations.map((location) => formatLocation(location, result.root)).join("\n") : "No references found."
  },
})

export const lsp_symbols: ToolDefinition = tool({
  description: "List symbols in a file or search workspace symbols",
  args: {
    filePath: tool.schema.string().optional(),
    query: tool.schema.string().optional(),
  },
  async execute(args, context) {
    try {
      if (args.query) {
        const searchRoot = context?.worktree || context?.directory || process.cwd()
        const candidates = args.filePath ? [args.filePath] : findBootstrapFiles(searchRoot, searchRoot)
        if (!candidates.length) return "No workspace symbols found."

        for (const filePath of candidates) {
          const result = await executeLspTool(filePath, async (client) => {
            await client.ensureDocumentOpen(filePath)
            const symbols = await client.workspaceSymbols(args.query!)
            return symbols.length ? symbols.map((symbol) => formatWorkspaceSymbolResult(symbol)).join("\n") : null
          })
          if (result.ok && result.value) return result.value
        }

        return "No workspace symbols found."
      }

      if (!args.filePath) return "Error: filePath required when query not provided"

      const result = await executeLspTool(args.filePath, async (client, _root, absPath) => {
        const symbols = await client.documentSymbols(absPath)
        return symbols.length ? flatSymbols(symbols).map((symbol) => formatSymbol(symbol, args.filePath!)).join("\n") : "No symbols found."
      })

      if (!result.ok) return `Error: ${formatLspError(result.error)}`
      return String(result.value)
    } catch (error: any) {
      return `Error: ${error.message}`
    }
  },
})

export const lsp_diagnostics: ToolDefinition = tool({
  description: "Get LSP diagnostics for a file",
  args: {
    filePath: tool.schema.string(),
    severity: tool.schema.number().optional(),
  },
  async execute(args) {
    const result = await executeLspTool(args.filePath, async (client, _root, absPath) => {
      const diagnostics = await client.getDiagnostics(absPath)
      return args.severity ? diagnostics.filter((item) => item.severity === args.severity) : diagnostics
    })

    if (!result.ok) return `Error: ${formatLspError(result.error)}`

    const diagnostics = result.value as Diagnostic[]
    return diagnostics.length ? diagnostics.map((item) => formatDiagnostic(item, args.filePath)).join("\n") : "No diagnostics found."
  },
})

export const lsp_prepare_rename: ToolDefinition = tool({
  description: "Check if a symbol can be renamed at the given position",
  args: {
    filePath: tool.schema.string(),
    line: tool.schema.number(),
    character: tool.schema.number(),
  },
  async execute(args) {
    const invalid = validatePositionInput(args.line, args.character)
    if (invalid) return `Error: ${invalid}`

    const result = await executeLspTool(args.filePath, (client, _root, absPath) => client.prepareRename(absPath, args.line, args.character))
    if (!result.ok) return `Error: ${formatLspError(result.error)}`
    if (!result.value) return "Cannot rename at this position."

    if (typeof result.value === "object" && result.value && "range" in (result.value as any)) {
      const value = result.value as any
      return `Renamable: "${value.placeholder || "symbol"}" at line ${value.range.start.line + 1}`
    }

    return "Renamable"
  },
})

export const lsp_rename: ToolDefinition = tool({
  description: "Rename a symbol across the workspace using LSP",
  args: {
    filePath: tool.schema.string(),
    line: tool.schema.number(),
    character: tool.schema.number(),
    newName: tool.schema.string(),
  },
  async execute(args) {
    const invalid = validatePositionInput(args.line, args.character)
    if (invalid) return `Error: ${invalid}`

    const result = await executeLspTool(args.filePath, async (client, root, absPath) => {
      await preloadWorkspaceFiles(client, root, absPath)
      return client.rename(absPath, args.line, args.character, args.newName)
    })

    if (!result.ok) return `Error: ${formatLspError(result.error)}`
    return applyWorkspaceEdit(result.value as WorkspaceEdit | null, result.root)
  },
})
