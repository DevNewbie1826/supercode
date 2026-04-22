# Tool Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public `easycode` tool surface inside `supercode` with the same tool names and equivalent behavior, while rewriting the implementation to fit the new plugin package.

**Architecture:** Convert `supercode` from a minimal JavaScript scaffold into a TypeScript-based OpenCode plugin package. Recreate the public tool registry first, then implement `current_time`, AST-aware `ast_grep_*`, and LSP-backed `lsp_*` tools behind small focused modules. Use tests to lock in public names, argument validation, summary messages, and key safety behavior before each implementation step.

**Tech Stack:** TypeScript, Bun/Node, `@opencode-ai/plugin`, `zod`, `which`, `cross-spawn`

---

## File Structure

Create or modify these files:

- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `src/tools/index.ts`
- Create: `src/tools/current-time/index.ts`
- Create: `src/tools/ast/index.ts`
- Create: `src/tools/ast/sg.ts`
- Create: `src/tools/lsp/index.ts`
- Create: `src/tools/lsp/client.ts`
- Create: `src/tools/lsp/errors.ts`
- Create: `src/tools/lsp/format.ts`
- Create: `src/tools/lsp/jsonrpc.ts`
- Create: `src/tools/lsp/registry.ts`
- Create: `src/tools/lsp/types.ts`
- Create: `src/tools/lsp/workspace.ts`
- Create: `src/tools/lsp/workspace-edit.ts`
- Create: `src/__tests__/tools-index.test.ts`
- Create: `src/__tests__/current-time-tool.test.ts`
- Create: `src/__tests__/ast-tools.test.ts`
- Create: `src/__tests__/lsp-tools.test.ts`
- Remove or stop using: `.opencode/plugins/supercode.js`
- Remove or stop using: `test/my-plugin.test.js`

### Task 1: Convert Package To TypeScript Plugin Layout

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`

- [ ] **Step 1: Write the failing package-layout test**

Create `src/__tests__/package-layout.test.ts` asserting:

```ts
import { describe, expect, it } from "bun:test"
import pkg from "../../package.json"

describe("package layout", () => {
  it("points main to the TypeScript plugin entry", () => {
    expect(pkg.main).toBe("./src/index.ts")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/package-layout.test.ts`
Expected: FAIL because `package.json` still points to `.opencode/plugins/supercode.js`

- [ ] **Step 3: Write minimal package conversion**

Update `package.json` to:

```json
{
  "name": "supercode",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts"
    }
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.1.8",
    "which": "^2.0.2",
    "cross-spawn": "^7.0.6"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "^1.3.10",
    "bun-types": "^1.3.11",
    "typescript": "^5.8.3"
  }
}
```

Create `tsconfig.json` with Bun + ESM settings.

Create `src/index.ts` exporting:

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { createTools } from "./tools"

export const SupercodePlugin: Plugin = async () => {
  return {
    tool: createTools(),
  }
}

export default SupercodePlugin
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/package-layout.test.ts`
Expected: PASS

### Task 2: Lock The Public Tool Registry Contract

**Files:**
- Create: `src/__tests__/tools-index.test.ts`
- Create: `src/tools/index.ts`

- [ ] **Step 1: Write the failing registry test**

Create `src/__tests__/tools-index.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { createTools } from "../tools"

describe("createTools", () => {
  it("returns the full public tool registry", () => {
    expect(Object.keys(createTools()).sort()).toEqual([
      "ast_grep_replace",
      "ast_grep_search",
      "current_time",
      "lsp_diagnostics",
      "lsp_find_references",
      "lsp_goto_definition",
      "lsp_prepare_rename",
      "lsp_rename",
      "lsp_symbols",
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/tools-index.test.ts`
Expected: FAIL because `createTools` does not exist yet

- [ ] **Step 3: Write minimal registry implementation**

Create `src/tools/index.ts` exporting `createTools()` and placeholder tool definitions for all nine public names.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/tools-index.test.ts`
Expected: PASS

### Task 3: Implement `current_time`

**Files:**
- Create: `src/__tests__/current-time-tool.test.ts`
- Create: `src/tools/current-time/index.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write the failing tool test**

Add tests for:
- successful `Date.prototype.toLocaleString()` passthrough
- thrown formatter error becoming `Error: <message>`

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/current-time-tool.test.ts`
Expected: FAIL because placeholder tool does not match behavior

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/current-time/index.ts` with a real `tool()` definition named `current_time`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/current-time-tool.test.ts`
Expected: PASS

### Task 4: Implement AST Tool Execution Helpers

**Files:**
- Create: `src/tools/ast/sg.ts`
- Create: `src/__tests__/ast-tools.test.ts`

- [ ] **Step 1: Write failing AST helper tests**

Cover these contract points:
- execution root prefers `worktree` over `directory`
- local `node_modules/.bin/sg` resolves before `PATH`
- search output truncates visible matches to 100 but keeps total count
- replace defaults to dry-run
- replace refuses writes outside execution root
- replace rolls back earlier file updates when a later replacement is invalid

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/ast-tools.test.ts`
Expected: FAIL because AST helpers are missing

- [ ] **Step 3: Write minimal AST helper implementation**

Create `src/tools/ast/sg.ts` with:
- `LANGS`
- `MAX_FORMATTED_MATCHES`
- `resolveExecutionRoot(context)`
- `buildRunArgs(args, cwd)`
- `runSg(cmdArgs, cwd)`
- `parseSgJson(stdout)`
- `applyReplacements(result, cwd)`

Keep replacement writes transactional by preparing all file edits first and only writing after all ranges validate.

- [ ] **Step 4: Run tests to verify helper behavior passes**

Run: `bun test src/__tests__/ast-tools.test.ts`
Expected: partial PASS or remaining failures only in missing public tool definitions

### Task 5: Implement Public AST Tools

**Files:**
- Create: `src/tools/ast/index.ts`
- Modify: `src/tools/index.ts`
- Modify: `src/__tests__/ast-tools.test.ts`

- [ ] **Step 1: Add failing public-tool assertions**

Extend `src/__tests__/ast-tools.test.ts` to assert:
- `ast_grep_search` returns `No matches found.` when no matches exist
- `ast_grep_replace` returns `No changes made.` or `No matches to replace.` in the right branch
- timeout messages match the public strings
- successful replacements format summary text the same way as `easycode`

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/ast-tools.test.ts`
Expected: FAIL in public formatting or missing tool behavior

- [ ] **Step 3: Write minimal public AST tool implementation**

Create `src/tools/ast/index.ts` exporting real `ast_grep_search` and `ast_grep_replace` tool definitions. Reuse helpers from `sg.ts`; do not shell-format strings inside the helper layer.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/ast-tools.test.ts`
Expected: PASS

### Task 6: Implement LSP Support Modules

**Files:**
- Create: `src/tools/lsp/errors.ts`
- Create: `src/tools/lsp/types.ts`
- Create: `src/tools/lsp/jsonrpc.ts`
- Create: `src/tools/lsp/client.ts`
- Create: `src/tools/lsp/registry.ts`
- Create: `src/tools/lsp/workspace.ts`
- Create: `src/tools/lsp/workspace-edit.ts`
- Create: `src/tools/lsp/format.ts`

- [ ] **Step 1: Write failing support-module tests**

Create focused tests for:
- invalid `line`/`character` input messages
- file-not-found errors
- missing server errors
- workspace edit application formatting

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/lsp-tools.test.ts`
Expected: FAIL because support modules and public tools are missing

- [ ] **Step 3: Write minimal LSP support implementation**

Implement:
- JSON-RPC framing/parsing
- `LspClient` start/stop/request helpers
- server registry by extension
- workspace root detection
- workspace edit application
- formatting helpers for diagnostics, symbols, and locations

- [ ] **Step 4: Run tests to verify support behavior passes**

Run: `bun test src/__tests__/lsp-tools.test.ts`
Expected: remaining failures only in public LSP tool definitions

### Task 7: Implement Public LSP Tools

**Files:**
- Create: `src/tools/lsp/index.ts`
- Modify: `src/tools/index.ts`
- Modify: `src/__tests__/lsp-tools.test.ts`

- [ ] **Step 1: Add failing public LSP tests**

Lock these behaviors:
- all six public LSP tools are exported
- invalid position input returns `Error: line must be an integer >= 1` or `Error: character must be an integer >= 0`
- missing definitions/references/symbols/diagnostics use the same empty-result messages as `easycode`
- rename uses workspace edit formatting output

- [ ] **Step 2: Run tests to verify it fails**

Run: `bun test src/__tests__/lsp-tools.test.ts`
Expected: FAIL because public LSP tool behavior is incomplete

- [ ] **Step 3: Write minimal public LSP tool implementation**

Create `src/tools/lsp/index.ts` exporting:
- `lsp_goto_definition`
- `lsp_find_references`
- `lsp_symbols`
- `lsp_diagnostics`
- `lsp_prepare_rename`
- `lsp_rename`

Use a small client manager to reuse live LSP processes by workspace root and server id.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/lsp-tools.test.ts`
Expected: PASS

### Task 8: Wire Plugin Entry To The Final Tool Registry

**Files:**
- Modify: `src/index.ts`
- Modify: `src/__tests__/package-layout.test.ts`

- [ ] **Step 1: Write the failing plugin-entry test**

Assert that `SupercodePlugin()` returns hooks with a `tool` registry containing all nine public names.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/package-layout.test.ts src/__tests__/tools-index.test.ts`
Expected: FAIL because `src/index.ts` does not fully wire the final registry yet

- [ ] **Step 3: Write minimal plugin entry implementation**

Update `src/index.ts` so the plugin returns:

```ts
export const SupercodePlugin: Plugin = async () => {
  return {
    tool: createTools(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/package-layout.test.ts src/__tests__/tools-index.test.ts`
Expected: PASS

### Task 9: Full Verification

**Files:**
- Modify as needed: any files touched above

- [ ] **Step 1: Run the full automated verification**

Run: `bun test && bun run typecheck`
Expected: all tests pass and TypeScript exits 0

- [ ] **Step 2: Clean up obsolete scaffold files**

Remove the legacy scaffold test and JS plugin entry only after the TypeScript entry is already covered by tests.

- [ ] **Step 3: Run verification again**

Run: `bun test && bun run typecheck`
Expected: all tests pass and no legacy files are required
