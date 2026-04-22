import { relative } from "node:path"
import { fileURLToPath } from "node:url"
import type { Diagnostic, DocumentSymbol, Location } from "./types"
import { SEVERITY_MAP, SYMBOL_KIND_MAP } from "./types"

export function uriToPath(uri: string): string {
  try {
    return fileURLToPath(uri)
  } catch {
    return uri
  }
}

export function formatLocation(location: Location, root?: string): string {
  const filePath = uriToPath(location.uri)
  const base = root ?? process.cwd()
  let relPath = relative(base, filePath)
  if (relPath.startsWith("..") || relPath === filePath) relPath = filePath
  return `${relPath}:${location.range.start.line + 1}:${location.range.start.character + 1}`
}

export function formatSymbol(symbol: DocumentSymbol, filePath?: string): string {
  const kind = SYMBOL_KIND_MAP[symbol.kind] ?? "?"
  return `${filePath ? `${filePath}:` : ""}${symbol.range.start.line + 1}  ${kind}  ${symbol.name}`
}

export function formatDiagnostic(diagnostic: Diagnostic, filePath: string): string {
  const severity = SEVERITY_MAP[diagnostic.severity ?? 1] ?? "error"
  const code = diagnostic.code ? ` [${diagnostic.code}]` : ""
  const source = diagnostic.source ? ` (${diagnostic.source})` : ""
  return `${filePath}:${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1} ${severity}${code}${source}: ${diagnostic.message}`
}

export function flatSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {
  const flattened: DocumentSymbol[] = []
  const visit = (items: DocumentSymbol[]) => {
    for (const item of items) {
      flattened.push(item)
      if (item.children?.length) visit(item.children)
    }
  }
  visit(symbols)
  return flattened
}
