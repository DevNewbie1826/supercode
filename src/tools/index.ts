import type { ToolDefinition } from "@opencode-ai/plugin"
import { ast_grep_replace, ast_grep_search } from "./ast"
import { current_time } from "./current-time"
import {
  lsp_diagnostics,
  lsp_find_references,
  lsp_goto_definition,
  lsp_prepare_rename,
  lsp_rename,
  lsp_symbols,
} from "./lsp"

function createPlaceholderTool(description: string): ToolDefinition {
  return {
    description,
    args: {},
    async execute() {
      return "Not implemented."
    },
  } as ToolDefinition
}

export function createTools(): Record<string, ToolDefinition> {
  return {
    ast_grep_replace,
    ast_grep_search,
    current_time,
    lsp_diagnostics,
    lsp_find_references,
    lsp_goto_definition,
    lsp_prepare_rename,
    lsp_rename,
    lsp_symbols,
  }
}
