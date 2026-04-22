import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import {
  applyReplacements,
  buildRunArgs,
  LANGS,
  MAX_FORMATTED_MATCHES,
  parseSgJson,
  resolveExecutionRoot,
  runSg,
} from "./sg"

function formatSearch(result: ReturnType<typeof parseSgJson>): string {
  if (result.error) return `Error: ${result.error}`
  if (result.matches.length === 0) return "No matches found."

  const visible = result.matches.slice(0, MAX_FORMATTED_MATCHES)
  const body = visible.map((match, index) => `${index + 1}. ${match.file}:${match.line}:${match.column}\n${match.text}`).join("\n\n")
  const summary = `\n\n${result.total} match(es) found.${result.truncated ? " (output truncated to 100)" : ""}`
  return body + summary
}

function formatReplace(result: ReturnType<typeof parseSgJson>, dryRun: boolean): string {
  if (result.error) return `Error: ${result.error}`
  if (result.matches.length === 0) return dryRun ? "No matches to replace." : "No changes made."

  const visible = result.matches.slice(0, MAX_FORMATTED_MATCHES)
  const body = visible
    .map((match) => {
      if (match.replacement !== undefined) {
        return `${match.file}:${match.line}:${match.column} - replaced:\n  - ${match.text}\n  + ${match.replacement}`
      }
      return `${match.file}:${match.line}:${match.column}: ${match.text}`
    })
    .join("\n\n")
  const summary = `\n\n${result.total} change(s) ${dryRun ? "would be" : "were"} made.${result.truncated ? " (output truncated to 100)" : ""}`
  return body + summary
}

function formatTimeoutError(mutating = false): string {
  const timeoutMs = process.env.AST_GREP_TIMEOUT_MS ?? "60000"
  return mutating
    ? `Error: ast-grep timed out after ${timeoutMs}ms during replace. Files may be partially modified.`
    : `Error: ast-grep timed out after ${timeoutMs}ms`
}

function handleRunFailure(
  stdout: string,
  stderr: string,
  code: number,
  timedOut: boolean,
  result: ReturnType<typeof parseSgJson>,
  fallback: string,
  mutating = false,
): string | null {
  if (result.error) return `Error: ${result.error}`
  if (timedOut) return formatTimeoutError(mutating)
  if (code === 0) return null
  if (!stderr.trim() && result.matches.length === 0) return null
  if (stderr.includes("No files found")) return "No files found."
  if (stderr.trim()) return `Error: ${stderr.trim()}`
  if (stdout.trim()) return `Error: ast-grep exited with code ${code}`
  return fallback
}

export { resolveExecutionRoot } from "./sg"

export const ast_grep_search: ToolDefinition = tool({
  description:
    "Search code patterns using AST-aware matching. Supports complete AST-node patterns with $VAR and $$$ placeholders.",
  args: {
    pattern: tool.schema.string(),
    lang: tool.schema.enum(LANGS),
    paths: tool.schema.array(tool.schema.string()).optional(),
    globs: tool.schema.array(tool.schema.string()).optional(),
    context: tool.schema.number().optional(),
  },
  async execute(args, context) {
    try {
      const cwd = resolveExecutionRoot(context)
      const commandArgs = buildRunArgs(args, cwd)
      const { stdout, stderr, code, timedOut } = await runSg(commandArgs, cwd)
      const result = parseSgJson(stdout)
      const failure = handleRunFailure(stdout, stderr, code, timedOut, result, "No matches found.")
      if (failure) return failure
      return formatSearch(result)
    } catch (error: any) {
      return `Error: ${error.message}`
    }
  },
})

export const ast_grep_replace: ToolDefinition = tool({
  description: "Replace code patterns using AST-aware rewriting. Dry-run by default.",
  args: {
    pattern: tool.schema.string(),
    rewrite: tool.schema.string(),
    lang: tool.schema.enum(LANGS),
    paths: tool.schema.array(tool.schema.string()).optional(),
    globs: tool.schema.array(tool.schema.string()).optional(),
    dryRun: tool.schema.boolean().optional(),
  },
  async execute(args, context) {
    try {
      const dryRun = args.dryRun !== false
      const cwd = resolveExecutionRoot(context)
      const commandArgs = buildRunArgs(args, cwd)
      const { stdout, stderr, code, timedOut } = await runSg(commandArgs, cwd)
      const result = parseSgJson(stdout)
      const failure = handleRunFailure(stdout, stderr, code, timedOut, result, "No changes made.", !dryRun)
      if (failure) return failure

      if (!dryRun && result.matches.length > 0) {
        applyReplacements(result, cwd)
      }

      return formatReplace(result, dryRun)
    } catch (error: any) {
      return `Error: ${error.message}`
    }
  },
})
