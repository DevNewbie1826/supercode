# supercode

TypeScript-based OpenCode plugin scaffold with:

- a package entrypoint that OpenCode can install from git or npm
- a plugin entry at `src/index.ts`
- a bundled example skill in `skills/`
- a rebuilt tool registry compatible with the public `easycode` tool names

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
2. `SupercodePlugin` returns `tool: createTools()`
3. `src/tools/` contains the actual tool implementations

## Local Verification

Run:

```bash
bun test
bun run typecheck
```

## Customize

- Add more tools under `src/tools/`
- Extend the plugin hooks in `src/index.ts`
- Replace `skills/hello-world/` with your real skills
- Keep public tool names stable if you need `easycode` compatibility
