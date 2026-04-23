import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentDefinition } from "../types"

const promptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prompt-text", "orchestrator-prompt.md")

export const orchestratorAgent: AgentDefinition = {
  name: "orchestrator",
  description:
    "Primary coordination agent for decomposing user requests, sequencing dependent work, parallelizing independent work, and synthesizing results.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "primary",
  defaults: {
    color: "#6A5CFF",
    permission: {
      question: "allow",
      apply_patch: "deny",
    },
  },
}

export default orchestratorAgent
