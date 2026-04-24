import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "task-compliance-checker-prompt.md",
);

export const taskComplianceCheckerAgent: AgentDefinition = {
  name: "task-compliance-checker",
  description:
    "Use to verify that an individual planned task is clear, executable, and specific enough to enter execution without downstream guesswork.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
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

export default taskComplianceCheckerAgent;
