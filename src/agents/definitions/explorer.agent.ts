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
    "Use to search the current codebase for files, symbols, implementations, patterns, references, and code flows with actionable absolute-path results.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    color: "#3B82F6",
    temperature: 0.1,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
      external_directory: "allow",
      webfetch: "allow",
      doom_loop: "deny",
      read: {
        "*": "allow",
        "*.env": "deny",
        "*.env.*": "deny",
        "*.env.example": "allow",
      },
    },
  },
};

export default explorerAgent;
