import { tool, type ToolDefinition } from "@opencode-ai/plugin"

export const current_time: ToolDefinition = tool({
  description: "Return the current local time string",
  args: {},
  async execute() {
    try {
      return new Date().toLocaleString()
    } catch (error: any) {
      return `Error: ${error.message}`
    }
  },
})
