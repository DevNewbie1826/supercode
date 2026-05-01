# Work ID

20260502-agent-permission-prompts-f4a9

# Objective

Prepare and begin an isolated Supercode work item for semi-manual updates to agent permission defaults and agent prompt guidance, informed by the prior comparison between Supercode and oh-my-openagent (OMO).

The first implementation change in scope is limited to the `explorer` agent permission policy. Prompt edits are still deferred for user-led follow-up.

# Current State

- Supercode defines agent permissions in `src/agents/definitions/*.agent.ts` and accepts root permission keys including `doom_loop` and `external_directory` in `src/supercode-config.ts`.
- Supercode currently keeps research agents more restrictive than OMO:
  - `explorer` denies `bash`, `edit`, `apply_patch`, `ast_grep_replace`, `lsp_rename`, and `task`.
  - `librarian` denies `bash`, `edit`, `apply_patch`, `ast_grep_replace`, `lsp_rename`, and `task`.
- Supercode librarian prompt text references temporary external cloning patterns such as `${TMPDIR:-/tmp}`, but librarian permissions currently deny `bash` and do not explicitly set `external_directory`.
- OpenCode default read permission asks for `*.env` and `*.env.*` while allowing `*.env.example`; in nested/subagent contexts, permission asks may not reliably surface to the main user session and can appear to hang.
- OMO does not solve nested permission asks by forwarding approval UI. It avoids many hangs by making child agents leaf nodes, disabling question/task delegation, and using explicit allow/deny defaults for risky operations.
- OMO librarian is more permissive than Supercode librarian: it denies write/edit/task/call_omo_agent but does not deny bash and inherits global `external_directory: allow`.
- OMO explore is also more permissive than Supercode explorer regarding external directory/global tool defaults, while still denying write/edit/task/call_omo_agent and explicitly allowing LSP/AST search tools.

# Desired Outcome

Create an isolated worktree where the user and assistant can semi-manually update Supercode agent permission settings and prompt instructions without modifying the main working tree.

Apply the first agreed permission change: make `explorer` OMO-like for non-writing capabilities while explicitly denying `.env` reads to avoid hidden nested approval hangs.

# Scope

Included:

- Create a dedicated Supercode work item and isolated worktree at `.worktrees/20260502-agent-permission-prompts-f4a9/`.
- Preserve the evidence-backed context in this spec for later semi-manual editing.
- Verify the worktree baseline sufficiently to classify it as ready or blocked.
- Update only `explorer` permission handling for this first change:
  - keep write/modification permissions denied: `edit`, `apply_patch`, `ast_grep_replace`, `lsp_rename`
  - keep delegation denied: `task`
  - remove `bash: "deny"` so `explorer` follows OMO-like behavior for shell availability
  - add `external_directory: "allow"`
  - add `webfetch: "allow"`
  - add `doom_loop: "deny"`
  - ensure `read` permission rules can be preserved and applied for `*.env`, `*.env.*`, and `*.env.example`
  - add `explorer` read rules: deny `*.env`, deny `*.env.*`, allow `*.env.example`

Excluded:

- No permission default changes except the explicit `explorer` permission policy above.
- No prompt text changes in this first implementation change.
- No implementation of a new `call_supercode_research_agent` tool.
- No broad rewrite of the Supercode workflow stages.
- No changes to OpenCode upstream runtime behavior.
- No attempt to implement nested permission approval forwarding.
- No merge, PR, or discard decision until normal finish flow.

# Non-Goals

- Do not edit agent permission files other than the files required to apply the explicit `explorer` permission policy.
- Do not edit agent prompt files during this work item.
- Do not grant or revoke any tool permissions beyond the explicit `explorer` permission policy.
- Do not change production implementation code outside the approved worktree.

# Constraints

- Work must proceed in `.worktrees/20260502-agent-permission-prompts-f4a9/` after spec approval and worktree creation.
- The user wants permission and prompt updates to proceed semi-manually after the worktree exists.
- This spec decides only the first `explorer` permission policy. It does not decide final policies for executor, librarian, reviewers, or prompt text.
- Later edits should use the captured evidence as context but require explicit user direction before changing files.
- If Supercode config normalization currently drops `read` permission rules, update the allowed root permission keys narrowly so `read` rules are preserved.

# Success Criteria

- The approved spec is committed before worktree creation.
- A worktree exists at `.worktrees/20260502-agent-permission-prompts-f4a9/`.
- `.worktrees/` ignore safety is verified or fixed according to the worktree workflow.
- Setup/baseline verification is run according to detected project conventions.
- The worktree is classified as ready, or any degraded baseline is presented to the user for explicit acceptance.
- `explorer` permissions reflect the agreed policy:
  - `bash: "deny"` is no longer set on `explorer`
  - `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` are set
  - write/delegation mutation tools remain denied
  - `.env` and `.env.*` read rules are explicit deny; `.env.example` read is allow
- Prompt files remain unchanged.
- Tests and typecheck pass after the change.

# Risks / Unknowns

- Baseline verification may expose unrelated existing failures; if so, worktree readiness may require degraded baseline acceptance.
- The exact user-preferred balance for agents other than `explorer` remains intentionally deferred to the later semi-manual editing phase.
- Adding `read` permission patterns may require confirming whether Supercode’s config normalization currently preserves nested read rules; if not, schema/config support must be narrowly expanded for `read`.

# Revisions

- 2026-05-02: Initial spec for permission/prompt update worktree preparation.
- 2026-05-02: Scope expanded by user request to apply the first `explorer` permission policy change; prompt edits remain deferred.
