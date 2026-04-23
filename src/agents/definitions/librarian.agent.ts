import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "librarian-prompt.md",
);

const librarianAgent: AgentDefinition = {
  name: "librarian",
  description:
    "Searches external documentation, OSS sources, and official references to verify third-party library behavior, APIs, best practices, and version-specific guidance.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "subagent",
  defaults: {
    color: "#8B5CF6",
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

export default librarianAgent;
