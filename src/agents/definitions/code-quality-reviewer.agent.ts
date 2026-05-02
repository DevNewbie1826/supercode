import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "code-quality-reviewer-prompt.md",
);

export const codeQualityReviewerAgent: AgentDefinition = {
  name: "code-quality-reviewer",
  description:
    "Use to verify that an implemented task is correct, maintainable, simple, and consistent with project conventions without seeing executor reasoning.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.15,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    },
  },
};

export default codeQualityReviewerAgent;
