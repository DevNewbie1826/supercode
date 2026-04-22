import type { Plugin } from "@opencode-ai/plugin"
import { createConfigHandler } from "./config-handler"
import { createTools } from "./tools"

export const SupercodePlugin: Plugin = async ({ directory, worktree }) => {
  return {
    config: createConfigHandler(worktree ?? directory, directory),
    tool: createTools(),
  }
}

export default SupercodePlugin
