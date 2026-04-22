import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs"
import { isAbsolute, join, relative, resolve } from "node:path"

export const LANGS = [
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "python",
  "rust",
  "go",
  "ruby",
  "java",
  "kotlin",
  "c",
  "cpp",
  "csharp",
  "fsharp",
  "php",
  "swift",
  "scala",
  "dart",
  "lua",
  "haskell",
  "elixir",
  "erlang",
  "bash",
  "zsh",
  "html",
  "css",
  "json",
  "yaml",
  "toml",
  "sql",
  "dockerfile",
  "protobuf",
  "thrift",
  "graphql",
  "vue",
  "svelte",
  "astro",
  "ocaml",
  "rescript",
  "r",
  "racket",
  "scheme",
  "clojure",
  "nim",
  "zig",
  "julia",
  "perl",
  "make",
  "cmake",
  "terraform",
  "nix",
  "solidity",
  "beancount",
  "elm",
] as const

export type AstLang = (typeof LANGS)[number]

export type SgMatch = {
  file: string
  line: number
  column: number
  text: string
  replacement?: string
  replacementStart?: number
  replacementEnd?: number
}

export type SgResult = {
  matches: SgMatch[]
  total: number
  truncated: boolean
  error?: string
}

type SgRunArgs = {
  pattern: string
  lang: AstLang
  rewrite?: string
  context?: number
  globs?: string[]
  paths?: string[]
}

export const MAX_FORMATTED_MATCHES = 100

function findSgBinary(executionRoot: string): string | null {
  const binName = process.platform === "win32" ? "sg.cmd" : "sg"
  const local = join(executionRoot, "node_modules", ".bin", binName)
  if (existsSync(local)) return local

  const separator = process.platform === "win32" ? ";" : ":"
  for (const dir of (process.env.PATH ?? "").split(separator).filter(Boolean)) {
    const candidate = join(dir, binName)
    if (existsSync(candidate)) return candidate
  }

  return null
}

function getTimeoutMs(): number {
  const raw = Number(process.env.AST_GREP_TIMEOUT_MS ?? "60000")
  return Number.isFinite(raw) && raw > 0 ? raw : 60000
}

export function resolveExecutionRoot(context?: { directory?: string; worktree?: string }): string {
  return context?.worktree || context?.directory || process.cwd()
}

export function buildRunArgs(args: SgRunArgs, defaultRoot: string): string[] {
  const commandArgs = ["run", "-p", args.pattern]
  if (args.rewrite !== undefined) commandArgs.push("-r", args.rewrite)
  commandArgs.push("--lang", args.lang)

  if (args.context !== undefined) {
    if (!Number.isInteger(args.context) || args.context < 0) {
      throw new Error("context must be a non-negative integer")
    }
    if (args.context > 0) commandArgs.push("-C", String(args.context))
  }

  commandArgs.push("--json=compact")

  for (const glob of args.globs ?? []) {
    commandArgs.push("--globs", glob)
  }

  commandArgs.push(...(args.paths?.length ? args.paths : [defaultRoot]))
  return commandArgs
}

export async function runSg(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number; timedOut: boolean }> {
  const binary = findSgBinary(cwd)
  if (!binary) {
    throw new Error("ast-grep binary not found. Install `sg` or `@ast-grep/cli` to use ast-grep tools.")
  }

  const proc = Bun.spawn([binary, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, getTimeoutMs())

  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { stdout, stderr, code: code ?? 1, timedOut }
  } finally {
    clearTimeout(timer)
  }
}

export function parseSgJson(stdout: string): SgResult {
  const trimmed = stdout.trim()
  if (!trimmed) return { matches: [], total: 0, truncated: false }

  try {
    const parsed = JSON.parse(trimmed)
    const items = Array.isArray(parsed) ? parsed : (parsed.matches ?? parsed.results ?? [])
    const matches = items.map((item: any) => ({
      file: String(item.file ?? ""),
      line: Number(item.range?.start?.line ?? 0) + 1,
      column: Number(item.range?.start?.column ?? 0) + 1,
      text: String(item.text ?? item.lines ?? ""),
      replacement: item.replacement === undefined ? undefined : String(item.replacement),
      replacementStart:
        item.replacementOffsets?.start === undefined ? undefined : Number(item.replacementOffsets.start),
      replacementEnd: item.replacementOffsets?.end === undefined ? undefined : Number(item.replacementOffsets.end),
    }))

    return {
      matches,
      total: matches.length,
      truncated: matches.length > MAX_FORMATTED_MATCHES,
    }
  } catch {
    return {
      matches: [],
      total: 0,
      truncated: false,
      error: "Failed to parse ast-grep JSON output",
    }
  }
}

function resolveTargetFile(file: string, executionRoot: string): string {
  const candidate = resolve(executionRoot, file)
  if (!existsSync(candidate)) {
    throw new Error(`Matched file does not exist: ${file}`)
  }

  if (!statSync(candidate).isFile()) {
    throw new Error(`Matched path is not a file: ${file}`)
  }

  const realRoot = existsSync(executionRoot) ? realpathSync(executionRoot) : resolve(executionRoot)
  const realCandidate = realpathSync(candidate)
  const rel = relative(realRoot, realCandidate)
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Refusing to modify file outside the execution root: ${file}`)
  }

  return realCandidate
}

export function applyReplacements(result: SgResult, executionRoot: string): void {
  const editsPerFile = new Map<string, Array<{ start: number; end: number; replacement: string }>>()

  for (const match of result.matches) {
    if (
      !match.file ||
      match.replacement === undefined ||
      match.replacementStart === undefined ||
      match.replacementEnd === undefined
    ) {
      continue
    }

    const target = resolveTargetFile(match.file, executionRoot)
    if (!editsPerFile.has(target)) editsPerFile.set(target, [])
    editsPerFile.get(target)?.push({
      start: match.replacementStart,
      end: match.replacementEnd,
      replacement: match.replacement,
    })
  }

  const plannedWrites = new Map<string, string>()
  for (const [file, edits] of editsPerFile) {
    let nextText = readFileSync(file, "utf-8")
    for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
      if (edit.start < 0 || edit.end < edit.start || edit.end > nextText.length) {
        throw new Error(`Invalid replacement range for ${file}`)
      }
      nextText = nextText.slice(0, edit.start) + edit.replacement + nextText.slice(edit.end)
    }
    plannedWrites.set(file, nextText)
  }

  const originals = new Map<string, string>()
  const written: string[] = []

  try {
    for (const [file, nextText] of plannedWrites) {
      originals.set(file, readFileSync(file, "utf-8"))
      writeFileSync(file, nextText, "utf-8")
      written.push(file)
    }
  } catch (error) {
    for (const file of written) {
      const original = originals.get(file)
      if (original !== undefined) {
        try {
          writeFileSync(file, original, "utf-8")
        } catch {}
      }
    }
    throw error
  }
}
