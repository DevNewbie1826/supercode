# Work ID

20260425-mcp-readme-ko-f3a9

# Objective

Remove the unused `sequential_thinking` built-in MCP default and fully refresh the root README documentation, including a complete Korean version at `README.ko.md`.

# Current State

- `sequential_thinking` is registered as a built-in local MCP server in `src/mcp/index.ts` using `npx -y @modelcontextprotocol/server-sequential-thinking`.
- Tests currently assert that `sequential_thinking` is part of the default MCP registry:
  - `src/__tests__/mcp-index.test.ts`
  - `src/__tests__/config-handler-mcp.test.ts`
- `README.md` documents `sequential_thinking` as a built-in MCP server and includes it in the example emitted MCP config.
- `README.md` is English only.
- No Korean README variant currently exists.

# Desired Outcome

- `sequential_thinking` is no longer injected as a built-in MCP server by default.
- Users can still manually configure their own `sequential_thinking` MCP entry through normal `config.mcp` override behavior if they want it.
- `README.md` accurately reflects the current repository state and plugin surface after the MCP cleanup.
- `README.md` includes clearer product-positioning copy that communicates why Supercode is useful, without making unverifiable claims.
- A Korean README exists at `README.ko.md` as a full Korean localization of the refreshed English README.

# Scope

In scope:

- Remove `sequential_thinking` from the built-in MCP registry.
- Update tests that assert built-in MCP defaults.
- Review every existing section of the root `README.md` against current repository state and update inaccurate, stale, or unclear content.
- Remove stale `sequential_thinking` references from README documentation and emitted MCP examples.
- Improve README wording with concise, confident product-positioning language that explains Supercode's value.
- Add `README.ko.md` at the repository root as a complete Korean version of the refreshed `README.md`.
- Ensure README cross-links make the English/Korean versions discoverable.
- Run repository verification commands after implementation.

# Non-Goals

- Do not remove or block user-defined custom MCP entries named `sequential_thinking`.
- Do not add a replacement reasoning/planning MCP server.
- Do not redesign the MCP config merge behavior.
- Do not update non-root README documentation or unrelated docs outside `README.md` and `README.ko.md`.
- Do not add exaggerated, unverifiable, or misleading marketing claims.
- Do not change agent, skill, or workflow behavior unless directly required by the README accuracy update.

# Constraints

- Preserve existing custom MCP precedence: user-provided `config.mcp` entries must continue to override built-in defaults.
- Keep documentation concise and aligned between `README.md` and `README.ko.md`; `README.ko.md` should preserve the same sections, examples, and substantive content as `README.md`.
- README claims about supported tools, agents, skills, MCP servers, config behavior, and verification commands must be verifiable from repository files.
- Keep public TypeScript APIs stable except for the intentional removal of the default `sequential_thinking` MCP registry entry.
- Follow repository verification conventions documented in README: `bun test` and `bun run typecheck`.

# Success Criteria

- `createBuiltinMcpServers()` no longer returns `sequential_thinking` by default.
- Tests are updated so the expected default MCP set contains `context7`, `grep_app`, and `websearch`, but not `sequential_thinking`.
- Existing custom MCP precedence tests still pass.
- Every existing section of `README.md` has been checked against current repository state and is accurate after the update.
- `README.md` no longer documents `sequential_thinking` as a built-in MCP default.
- `README.md` contains concise value/positioning language for Supercode that is grounded in actual bundled capabilities.
- `README.ko.md` exists at the repository root and is a full Korean localization of the refreshed `README.md`.
- `README.ko.md` preserves the same examples, section coverage, and technical details as `README.md`, translated for Korean readers.
- `README.md` links to `README.ko.md`, and `README.ko.md` links back to `README.md`.
- `bun test` and `bun run typecheck` pass.

# Risks / Unknowns

- Removing a built-in MCP default is a user-visible behavior change for anyone relying on automatic `sequential_thinking` registration.
- README freshness requires checking all existing root README sections against repository state; this may reveal additional documentation-only corrections beyond the MCP list.
- The Korean README should stay synchronized with English content, but there is no existing documentation i18n automation.

# Revisions

- Initial spec created from user request to remove likely unused `sequential_thinking`, refresh README, and add `README.ko.md`.
- Revised after spec review and user clarification to bound README work as a full root README refresh plus complete Korean localization, including concise value-positioning language grounded in actual capabilities.
