import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentDefinition } from "../types"

const promptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prompt-text", "librarian-prompt.md")

const librarianAgent: AgentDefinition = {
  name: "librarian",
  description:
    "External knowledge and open-source investigation agent for official docs, remote repositories, implementation examples, and library behavior research.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    color: "#8B5CF6",
    temperature: 0.1,
  },
}

export default librarianAgent
