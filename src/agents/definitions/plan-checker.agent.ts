import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "plan-checker-prompt.md",
);

export const planCheckerAgent: AgentDefinition = {
  name: "plan-checker",
  description:
    "Use to block weak plans and decide whether the current plan is truly execution-ready.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.1,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: {
        "*": "deny",
        explorer: "allow",
        librarian: "allow",
      },
    },
  },
};

export default planCheckerAgent;
