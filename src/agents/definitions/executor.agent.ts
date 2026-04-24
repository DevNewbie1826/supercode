import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "executor-prompt.md",
);

export const executorAgent: AgentDefinition = {
  name: "executor",
  description:
    "Use to implement one assigned task inside the isolated worktree using todo-sync, test-driven-development, AST/LSP-aware editing, scoped code changes, and task verification.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.2,
    permission: {
      apply_patch: "deny",
      edit: "allow",
      todowrite: "allow",
    },
  },
};

export default executorAgent;
