import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "spec-reviewer-prompt.md",
);

export const specReviewerAgent: AgentDefinition = {
  name: "spec-reviewer",
  description:
    "Use when a written spec.md must be reviewed for true planning-readiness before the workflow is allowed to proceed into plan.",
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

export default specReviewerAgent;
