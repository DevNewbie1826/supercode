---
name: playwright-cli
description: Use when automating a browser session, inspecting page state, or running targeted Playwright CLI interactions from the terminal.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Playwright CLI

Use `playwright-cli` for browser automation tasks that are faster or clearer in a terminal session.

## Core Flow

```bash
playwright-cli open https://example.com
playwright-cli snapshot
playwright-cli click e15
playwright-cli type "search query"
playwright-cli press Enter
playwright-cli close
```

## Common Commands

```bash
playwright-cli goto https://playwright.dev
playwright-cli fill e5 "user@example.com" --submit
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli upload ./document.pdf
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli eval "document.title"
playwright-cli eval "el => el.getAttribute('data-testid')" e5
playwright-cli screenshot
playwright-cli pdf --filename=page.pdf
```

## Navigation And Tabs

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
playwright-cli tab-list
playwright-cli tab-new https://example.com/page
playwright-cli tab-select 0
playwright-cli tab-close
```

## Storage And Network

```bash
playwright-cli state-save auth.json
playwright-cli state-load auth.json
playwright-cli cookie-list
playwright-cli localstorage-list
playwright-cli sessionstorage-list
playwright-cli route "**/*.jpg" --status=404
playwright-cli route-list
playwright-cli unroute
```

## Notes

- Prefer snapshot refs like `e15` when available.
- Use `playwright-cli snapshot` after meaningful page changes.
- Use `--raw` when piping output into other tools.
- Reach for `eval` only when the needed detail is not visible in the snapshot.
