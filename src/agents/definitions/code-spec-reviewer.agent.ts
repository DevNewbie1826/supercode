import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "code-spec-reviewer-prompt.md",
);

export const codeSpecReviewerAgent: AgentDefinition = {
  name: "code-spec-reviewer",
  description:
    "Use to verify that an implemented task complies with the approved spec, approved plan, and assigned task without seeing executor reasoning.",
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

export default codeSpecReviewerAgent;
