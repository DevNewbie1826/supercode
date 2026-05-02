import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "plan-challenger-prompt.md",
);

export const planChallengerAgent: AgentDefinition = {
  name: "plan-challenger",
  description:
    "Use to stress-test the plan for hidden risk, brittle sequencing, and unnecessary complexity.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.25,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    },
  },
};

export default planChallengerAgent;
