import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "completion-verifier-prompt.md",
);

export const completionVerifierAgent: AgentDefinition = {
  name: "completion-verifier",
  description:
    "Use to gather fresh, artifact-based verification evidence for the completed work before final-reviewer decides PASS or FAIL.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.05,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    },
  },
};

export default completionVerifierAgent;
