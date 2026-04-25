# supercode

[한국어 README](./README.ko.md)

Supercode is an OpenCode plugin that packages a disciplined development workflow into one installable module. It bundles stage-gated agents, workflow skills, AST/LSP-aware tools, and a small default MCP surface so OpenCode sessions can coordinate planning, execution, review, and verification from repository-local code.

## Structure

```text
.
├─ src/
│  ├─ index.ts
│  ├─ agents/
│  │  ├─ definitions/
│  │  ├─ prompt-text/
│  │  └─ registry.ts
│  ├─ hooks/
│  ├─ mcp/
│  ├─ skills/
│  │  ├─ execute/
│  │  ├─ plan/
│  │  ├─ spec/
│  │  └─ todo-sync/
│  ├─ tools/
│  │  ├─ ast/
│  │  ├─ current-time/
│  │  ├─ lsp/
│  │  └─ index.ts
│  └─ __tests__/
├─ docs/
│  ├─ supercode/
│  └─ superpowers/
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

`src/index.ts` exports `SupercodePlugin`. The plugin registers:

1. a `config` hook from `src/config-handler.ts`
2. the public tool registry from `src/tools/index.ts`
3. event and tool hooks under `src/hooks/`
4. a chat message transform for skill bootstrap behavior

The config hook injects built-in MCP defaults, built-in agent entries, and the packaged skill path while preserving supported user configuration.

## Public Tools

The plugin exports these public tool names:

- `ast_grep_search`
- `ast_grep_replace`
- `current_time`
- `lsp_diagnostics`
- `lsp_find_references`
- `lsp_goto_definition`
- `lsp_prepare_rename`
- `lsp_rename`
- `lsp_symbols`

The tool registry is defined in `src/tools/index.ts`.

## Built-in Agents

Supercode bundles these built-in agents:

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

Definitions live under `src/agents/definitions/*.agent.ts` and are loaded by the built-in agent registry.

The shipped set centers on the primary `orchestrator`, implementation and research helpers such as `executor`, `explorer`, and `librarian`, and stage-gated review and verification agents such as `planner`, `plan-checker`, `plan-challenger`, `spec-reviewer`, `code-spec-reviewer`, `code-quality-reviewer`, `task-compliance-checker`, `completion-verifier`, `final-reviewer`, and `systematic-debugger`.

Notable built-in defaults:

- `orchestrator`
  - `mode: "primary"`
  - default color: `#6A5CFF`
  - default temperature: `0.2`
  - default permission:
    - `question: allow`
    - `apply_patch: deny`
- the other bundled agents are registered as `mode: "subagent"`

The plugin merges built-in agents into `config.agent`. It writes plugin-owned fields from the built-in definitions and preserves unrelated custom fields already present on existing entries.

## Built-in Skills

Supercode bundles these built-in skills:

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

The plugin appends its packaged `src/skills` directory to `config.skills.paths` when that path can be resolved.

Rules:

- existing user `skills.paths` entries are preserved
- duplicate paths are not appended twice
- packaged and copied plugin layouts are supported by the skill-path resolver

## Built-in MCP

Supercode registers these built-in MCP servers by default:

- `context7`
- `grep_app`
- `websearch`

`websearch` is always registered. If you provide an API key in `supercode.json`, Supercode injects it into the MCP URL.

Existing `config.mcp` entries keep higher precedence than built-in defaults, so custom MCP servers can still be provided through normal OpenCode config.

## supercode.json

Supercode reads configuration from these locations:

1. Local `.opencode/supercode.json`
2. Global `~/.config/opencode/supercode.json`

If local config contains supported Supercode settings, local config wins over global config. If local config is missing or has no supported settings, global config is used when present.

For built-in agents, Supercode merges plugin-owned fields from the built-in definitions (`prompt`, `description`, `mode`, and built-in defaults such as `color`, `temperature`, and `permission`) while preserving unrelated custom fields already present on the existing OpenCode agent entry.

If `agent.<name>.enabled` is set to `false`, the emitted agent config uses `disable: true`.

Supported Supercode config shape:

```json
{
  "agent": {
    "executor": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "orchestrator": {
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2
    }
  },
  "mcp": {
    "websearch": {
      "apiKey": "your-exa-api-key"
    }
  }
}
```

If the file is missing, `websearch` still uses the default keyless URL.

## Example Resulting Agent Config

With built-in definitions plus the local override example above, the emitted config includes all 14 built-in agents. For each built-in entry, plugin-owned fields come from the bundled definition and supported `supercode.json` values such as `model`, `variant`, `temperature`, `color`, and `permission` are applied when provided.

Example excerpt:

```json
{
  "agent": {
    "orchestrator": {
      "description": "Use as the main user-facing coordinator that drives the full Supercode workflow, delegates to skills and subagents, manages research routing, keeps todo state synced, asks all blocking user questions through the question tool, and enforces all gates.",
      "prompt": "<bundled orchestrator prompt>",
      "mode": "primary",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2,
      "color": "#6A5CFF",
      "permission": {
        "question": "allow",
        "apply_patch": "deny"
      }
    },
    "executor": {
      "description": "Use to implement one assigned task inside the isolated worktree using todo-sync, test-driven-development, AST/LSP-aware editing, scoped code changes, and task verification.",
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
    }
  }
}
```

The same merge pattern applies to the remaining built-in agents: `code-quality-reviewer`, `code-spec-reviewer`, `completion-verifier`, `explorer`, `final-reviewer`, `librarian`, `plan-challenger`, `plan-checker`, `planner`, `spec-reviewer`, `systematic-debugger`, and `task-compliance-checker`.

## Example Resulting MCP Config

With no custom MCP overrides, the plugin injects:

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
    "websearch": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

Custom entries remain allowed. For example, a user may provide an MCP entry named `sequential_thinking`; it is preserved as a custom config entry, but it is not registered as a built-in default.

## Local Setup And Verification

Install dependencies:

```bash
bun install
```

Run repository verification:

```bash
bun test
bun run typecheck
```

These commands correspond to the repository scripts in `package.json`.

## Customize

- Add more tools under `src/tools/` and export them from `src/tools/index.ts`
- Add more built-in skills under `src/skills/`
- Add more built-in MCP definitions under `src/mcp/`
- Add more `*.agent.ts` files under `src/agents/definitions/`
- Extend plugin hooks in `src/index.ts`
- Keep public tool names stable if external workflows depend on them
