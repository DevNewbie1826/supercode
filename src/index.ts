import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { createConfigHandler } from "./config-handler"
import { createTools } from "./tools"

const defaultModuleDir = dirname(fileURLToPath(import.meta.url))

function getModuleDir(options: Record<string, unknown> | undefined): string {
  return typeof options?.moduleDir === "string" ? options.moduleDir : defaultModuleDir
}

export const SupercodePlugin: Plugin = async ({ directory, worktree }, options) => {
  const moduleDir = getModuleDir(options)

  return {
    config: createConfigHandler(worktree ?? directory, directory, { moduleDir }),
    tool: createTools(),
  }
}

export default SupercodePlugin
