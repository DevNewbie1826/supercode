import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "explorer-prompt.md",
);

const explorerAgent: AgentDefinition = {
  name: "explorer",
  description:
    "Searches the current repository to uncover internal implementation details, structural patterns, conventions, configs, tests, and project-specific behavior.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    color: "#3B82F6",
    temperature: 0.1,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      bash: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    },
  },
};

export default explorerAgent;
