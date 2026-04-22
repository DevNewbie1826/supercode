import type { Plugin } from "@opencode-ai/plugin"
import { createTools } from "./tools"

export const SupercodePlugin: Plugin = async () => {
  return {
    tool: createTools(),
  }
}

export default SupercodePlugin
