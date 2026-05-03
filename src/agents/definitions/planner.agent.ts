import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "planner-prompt.md",
);

export const plannerAgent: AgentDefinition = {
  name: "planner",
  description:
    "Use to author and revise the execution-ready plan artifact from the approved spec.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.3,
    permission: {
      apply_patch: "deny",
      edit: "allow",
      task: {
        "*": "deny",
        explorer: "allow",
        librarian: "allow",
      },
    },
  },
};

export default plannerAgent;
