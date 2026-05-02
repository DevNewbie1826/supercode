import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "systematic-debugger-prompt.md",
);

export const systematicDebuggerAgent: AgentDefinition = {
  name: "systematic-debugger",
  description:
    "Use to investigate unclear failures through the systematic-debugging skill and produce evidence-backed routing guidance before execution attempts another fix.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    temperature: 0.2,
    permission: {
      apply_patch: "deny",
      edit: "deny",
      ast_grep_replace: "deny",
      lsp_rename: "deny",
      task: "deny",
    },
  },
};

export default systematicDebuggerAgent;
