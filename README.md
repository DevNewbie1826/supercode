# supercode

TypeScript-based OpenCode plugin scaffold with:

- a package entrypoint that OpenCode can install from git or npm
- a plugin entry at `src/index.ts`
- a bundled example skill in `skills/`
- a rebuilt tool registry compatible with the public `easycode` tool names
- built-in MCP registration compatible with the `easycode` MCP surface

## Structure

```text
.
├─ src/
│  ├─ index.ts
│  ├─ tools/
│  │  ├─ ast/
│  │  ├─ current-time/
│  │  ├─ lsp/
│  │  └─ index.ts
│  └─ __tests__/
├─ skills/
│  └─ hello-world/
│     └─ SKILL.md
├─ docs/
│  └─ superpowers/
│     └─ plans/
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

The plugin currently exports the `easycode`-compatible public tool names:

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
  "mcp": {
    "websearch": {
      "apiKey": "your-exa-api-key"
    }
  }
}
```

If the file is missing, `websearch` still works with the default keyless URL.

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
- Add more built-in MCP definitions under `src/mcp/`
- Extend the plugin hooks in `src/index.ts`
- Replace `skills/hello-world/` with your real skills
- Keep public tool names stable if you need `easycode` compatibility
