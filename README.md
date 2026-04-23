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

- `explorer`
- `librarian`
- `orchestrator`

Definitions live under `src/agents/definitions/*.agent.ts` and are auto-registered by the built-in agent registry.

Default agent roles:

- `orchestrator`
  - `mode: "primary"`
  - default color: `#6A5CFF`
  - default permission:
    - `question: allow`
    - `apply_patch: deny`
- `explorer`
  - `mode: "subagent"`
  - local codebase exploration and implementation discovery
- `librarian`
  - `mode: "subagent"`
  - external docs, open-source, and library behavior research

The plugin merges built-in agents into `config.agent` while preserving unrelated custom fields already present on existing entries.

## Built-in Skills

`supercode` currently bundles these built-in skills:

- `playwright-cli`
- `todo-sync`

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

Current supported shape:

```json
{
  "agent": {
    "orchestrator": {
      "enabled": true,
      "model": "gpt-5",
      "variant": "fast",
      "color": "#6A5CFF",
      "temperature": 0.3,
      "permission": {
        "question": "allow",
        "apply_patch": "deny"
      }
    },
    "explorer": {
      "enabled": true,
      "model": "gpt-5-mini"
    },
    "librarian": {
      "enabled": true,
      "model": "gpt-5-mini"
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
If `agent.<name>.enabled` is set to `false`, the emitted agent config is marked with `disable: true`.

## Example Resulting Agent Config

With no custom overrides, the plugin injects:

```json
{
  "agent": {
    "explorer": {
      "description": "Local codebase exploration agent for finding files, tracing patterns, mapping module boundaries, and surfacing actionable implementation locations.",
      "prompt": "<bundled explorer prompt>",
      "mode": "subagent",
      "color": "#3B82F6",
      "temperature": 0.1
    },
    "librarian": {
      "description": "External knowledge and open-source investigation agent for official docs, remote repositories, implementation examples, and library behavior research.",
      "prompt": "<bundled librarian prompt>",
      "mode": "subagent",
      "color": "#8B5CF6",
      "temperature": 0.1
    },
    "orchestrator": {
      "description": "Primary coordination agent for decomposing user requests, sequencing dependent work, parallelizing independent work, and synthesizing results.",
      "prompt": "<bundled orchestrator prompt>",
      "mode": "primary",
      "color": "#6A5CFF",
      "permission": {
        "question": "allow",
        "apply_patch": "deny"
      }
    }
  }
}
```

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

## Customize

- Add more tools under `src/tools/`
- Add more built-in skills under `src/skills/`
- Add more built-in MCP definitions under `src/mcp/`
- Add more `*.agent.ts` files under `src/agents/definitions/`
- Extend the plugin hooks in `src/index.ts`
- Keep public tool names stable if external workflows depend on them
