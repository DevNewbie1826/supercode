export interface Position {
  line: number
  character: number
}

export interface Range {
  start: Position
  end: Position
}

export interface Location {
  uri: string
  range: Range
}

export interface LocationLink {
  targetUri: string
  targetRange: Range
  targetSelectionRange: Range
  originSelectionRange?: Range
}

export interface DocumentSymbol {
  name: string
  kind: number
  range: Range
  selectionRange: Range
  children?: DocumentSymbol[]
  uri?: string
}

export interface Diagnostic {
  range: Range
  severity?: number
  code?: string | number
  source?: string
  message: string
}

export interface TextEdit {
  range: Range
  newText: string
}

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>
  documentChanges?: Array<
    | { kind: "create" | "delete"; uri: string }
    | { kind: "rename"; oldUri: string; newUri: string }
    | { textDocument: { uri: string }; edits: TextEdit[] }
  >
}

export interface LspServerDef {
  id: string
  cmd: string[]
  exts: string[]
  hint: string
  markers?: string[]
  priority?: number
}

export const SYMBOL_KIND_MAP: Record<number, string> = {
  1: "File",
  2: "Module",
  3: "Namespace",
  4: "Package",
  5: "Class",
  6: "Method",
  7: "Property",
  8: "Field",
  9: "Constructor",
  10: "Enum",
  11: "Interface",
  12: "Function",
  13: "Variable",
  14: "Constant",
  15: "String",
  16: "Number",
  17: "Boolean",
  18: "Array",
  19: "Object",
  20: "Key",
  21: "Null",
  22: "EnumMember",
  23: "Struct",
  24: "Event",
  25: "Operator",
  26: "TypeParameter",
}

export const SEVERITY_MAP: Record<number, string> = {
  1: "error",
  2: "warning",
  3: "information",
  4: "hint",
}

const EXT_LANGUAGE_IDS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".js": "javascript",
  ".jsx": "javascriptreact",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".py": "python",
  ".pyi": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".zig": "zig",
  ".zon": "zig",
  ".cs": "csharp",
  ".fs": "fsharp",
  ".fsi": "fsharp",
  ".fsx": "fsharp",
  ".swift": "swift",
  ".c": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".sh": "shellscript",
  ".bash": "shellscript",
  ".zsh": "shellscript",
  ".java": "java",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".lua": "lua",
  ".php": "php",
  ".dart": "dart",
  ".tf": "terraform",
  ".tfvars": "terraform",
  ".prisma": "prisma",
  ".ml": "ocaml",
  ".mli": "ocaml",
  ".tex": "latex",
  ".bib": "bibtex",
  ".gleam": "gleam",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".cljc": "clojure",
  ".nix": "nix",
  ".hs": "haskell",
  ".lhs": "haskell",
  ".ex": "elixir",
  ".exs": "elixir",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".json": "json",
  ".css": "css",
  ".html": "html",
}

const FILE_LANGUAGE_IDS: Record<string, string> = {
  dockerfile: "dockerfile",
  containerfile: "dockerfile",
}

export function languageIdForPath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/")
  const base = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase()
  const dot = base.lastIndexOf(".")
  const ext = dot > 0 ? base.slice(dot) : ""
  return FILE_LANGUAGE_IDS[base] ?? EXT_LANGUAGE_IDS[ext] ?? "plaintext"
}
