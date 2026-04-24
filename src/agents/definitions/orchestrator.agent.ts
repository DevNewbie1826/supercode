import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "../types";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt-text",
  "orchestrator-prompt.md",
);

export const orchestratorAgent: AgentDefinition = {
  name: "orchestrator",
  description:
    "Use as the main user-facing coordinator that drives the full Supercode workflow, delegates to skills and subagents, manages research routing, keeps todo state synced, asks all blocking user questions through the question tool, and enforces all gates.",
  prompt: readFileSync(promptPath, "utf8").trim(),
  mode: "primary",
  defaults: {
    color: "#6A5CFF",
    temperature: 0.2,
    permission: {
      question: "allow",
      apply_patch: "deny",
    },
  },
};

export default orchestratorAgent;
