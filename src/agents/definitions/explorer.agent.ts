import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentDefinition } from "../types"

const promptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prompt-text", "explorer-prompt.md")

const explorerAgent: AgentDefinition = {
  name: "explorer",
  description:
    "Local codebase exploration agent for finding files, tracing patterns, mapping module boundaries, and surfacing actionable implementation locations.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    color: "#3B82F6",
    temperature: 0.1,
  },
}

export default explorerAgent
