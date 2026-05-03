import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "final-reviewer-prompt.md",
);

export const finalReviewerAgent: AgentDefinition = {
  name: "final-reviewer",
  description:
    "Use to independently decide whether completed work passes or fails final review based only on spec, plan, current artifacts, and fresh verification evidence.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.05,
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

export default finalReviewerAgent;
