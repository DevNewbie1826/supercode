# supercode

TypeScript-based OpenCode plugin scaffold with:

- a package entrypoint that OpenCode can install from git or npm
- a plugin entry at `src/index.ts`
- bundled built-in skills under `src/skills/`
- a rebuilt tool registry with stable public tool names
- built-in MCP registration for the bundled MCP surface
- built-in agents with automatic `*.agent.ts` registration and `supercode.json` model overrides

## Structure

```text
.
├─ src/
│  ├─ index.ts
│  ├─ skills/
│  │  ├─ path-registration.ts
│  │  ├─ playwright-cli/
│  │  └─ todo-sync/
│  ├─ tools/
│  │  ├─ ast/
│  │  ├─ current-time/
│  │  ├─ lsp/
│  │  └─ index.ts
│  └─ __tests__/
├─ docs/
│  └─ superpowers/
│     ├─ plans/
│     └─ specs/
├─ tsconfig.json
└─ package.json
```

## Install In OpenCode

Add this package to `opencode.json`:

```json
{
    "plugin": [
    "supercode@git+https://github.com/DevNewbie1826/supercode.git"
  ]
}
```

Restart OpenCode after updating config.

## What The Plugin Does

The plugin currently exports these public tool names:

- `ast_grep_search`
- `ast_grep_replace`
- `current_time`
- `lsp_goto_definition`
- `lsp_find_references`
- `lsp_symbols`
- `lsp_diagnostics`
- `lsp_prepare_rename`
- `lsp_rename`

The plugin entry itself is minimal:

1. `src/index.ts` exports `SupercodePlugin`
2. `SupercodePlugin` wires a `config` hook and `tool: createTools()`
3. `src/tools/` contains the tool implementations
4. `src/mcp/` contains the built-in MCP registry
5. `src/skills/` contains built-in skill files and skill-path registration logic
6. `src/agents/` contains built-in agent definitions, prompts, and registry logic

## Built-in Agents

`supercode` currently bundles these built-in agents:

- `code-quality-reviewer`
- `code-spec-reviewer`
- `completion-verifier`
- `executor`
- `explorer`
- `final-reviewer`
- `librarian`
- `orchestrator`
- `plan-challenger`
- `plan-checker`
- `planner`
- `spec-reviewer`
- `systematic-debugger`
- `task-compliance-checker`

Definitions live under `src/agents/definitions/*.agent.ts` and are auto-registered by the built-in agent registry.

The shipped set includes the primary `orchestrator`, implementation and research helpers such as `explorer`, `librarian`, and `executor`, plus stage-gated review and verification agents such as `planner`, `plan-checker`, `plan-challenger`, `spec-reviewer`, `code-spec-reviewer`, `code-quality-reviewer`, `task-compliance-checker`, `completion-verifier`, `final-reviewer`, and `systematic-debugger`.

Notable built-in defaults:

- `orchestrator`
  - `mode: "primary"`
  - default color: `#6A5CFF`
  - default temperature: `0.2`
  - default permission:
    - `question: allow`
    - `apply_patch: deny`
- all other built-in agents are registered as `mode: "subagent"`

The plugin merges built-in agents into `config.agent` while preserving unrelated custom fields already present on existing entries.

## Built-in Skills

`supercode` currently bundles these built-in skills:

- `execute`
- `final-review`
- `finish`
- `orchestrator-mediated-research`
- `plan`
- `playwright-cli`
- `pre-execute-alignment`
- `spec`
- `systematic-debugging`
- `test-driven-development`
- `todo-sync`
- `worktree`

The plugin automatically appends its packaged `src/skills` directory to `config.skills.paths`.

Rules:

- existing user `skills.paths` entries are preserved
- duplicate paths are not appended twice
- packaged and copied plugin layouts are both supported

## Built-in MCP

`supercode` registers these built-in MCP servers:

- `context7`
- `grep_app`
- `sequential_thinking`
- `websearch`

`websearch` is always registered. If you provide an API key in `supercode.json`, `supercode` injects it into the MCP URL.

## supercode.json

`supercode` reads configuration from these locations in order:

1. Local `.opencode/supercode.json`
2. Global `~/.config/opencode/supercode.json`

Local config wins over global config.

For built-in agents, the plugin merges plugin-owned fields from the built-in definitions (`prompt`, `description`, `mode`, and built-in defaults such as `color`, `temperature`, and `permission`) while preserving unrelated custom fields already present on the existing OpenCode agent entry.

If `agent.<name>.enabled` is set to `false`, the emitted agent config uses `disable: true`.

Current supported shape:

```json
{
  "agent": {
    "code-quality-reviewer": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "code-spec-reviewer": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "completion-verifier": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "executor": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "explorer": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "final-reviewer": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "librarian": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "orchestrator": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "plan-challenger": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "plan-checker": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "planner": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "spec-reviewer": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "systematic-debugger": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "task-compliance-checker": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    }
  },
  "mcp": {
    "websearch": {
      "apiKey": "your-exa-api-key"
    }
  }
}
```

If the file is missing, `websearch` still works with the default keyless URL.

## Example Resulting Agent Config

With built-in definitions plus the local override example above, the emitted config includes all 14 built-in agents. For each built-in entry, plugin-owned fields come from the bundled definition and `model` / `variant` come from `supercode.json` when provided.

Example excerpt:

```json
{
  "agent": {
    "orchestrator": {
      "description": "Use as the main user-facing coordinator that drives the full Supercode workflow, delegates to skills and subagents, manages research routing, keeps todo state synced, and enforces all gates.",
      "prompt": "<bundled orchestrator prompt>",
      "mode": "primary",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "color": "#6A5CFF",
      "temperature": 0.2,
      "permission": {
        "question": "allow",
        "apply_patch": "deny"
      }
    },
    "executor": {
      "description": "Use to implement one assigned task inside the isolated worktree using todo-sync, test-driven-development, scoped code changes, and task verification.",
      "prompt": "<bundled executor prompt>",
      "mode": "subagent",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2,
      "permission": {
        "apply_patch": "deny",
        "edit": "allow",
        "todowrite": "allow"
      }
    },
    "explorer": {
      "description": "Searches the current repository to uncover internal implementation details, structural patterns, conventions, configs, tests, and project-specific behavior.",
      "prompt": "<bundled explorer prompt>",
      "mode": "subagent",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "color": "#3B82F6",
      "temperature": 0.1,
      "notes": "custom fields already present on an existing agent entry are preserved"
    }
  }
}
```

The same merge pattern applies to the remaining built-in agents: `code-quality-reviewer`, `code-spec-reviewer`, `completion-verifier`, `final-reviewer`, `librarian`, `plan-challenger`, `plan-checker`, `planner`, `spec-reviewer`, `systematic-debugger`, and `task-compliance-checker`.

## Example Resulting MCP Config

With no custom overrides, the plugin injects:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    },
    "grep_app": {
      "type": "remote",
      "url": "https://mcp.grep.app"
    },
    "sequential_thinking": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "websearch": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

Existing `config.mcp` entries keep higher precedence than built-in defaults.

## Local Verification

Run:

```bash
bun test
bun run typecheck
```

These are the repository verification commands used for local validation.

## Customize

- Add more tools under `src/tools/`
- Add more built-in skills under `src/skills/`
- Add more built-in MCP definitions under `src/mcp/`
- Add more `*.agent.ts` files under `src/agents/definitions/`
- Extend the plugin hooks in `src/index.ts`
- Keep public tool names stable if external workflows depend on them
