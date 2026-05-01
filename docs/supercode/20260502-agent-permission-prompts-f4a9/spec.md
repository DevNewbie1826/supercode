# Work ID

20260502-agent-permission-prompts-f4a9

# Objective

Prepare an isolated Supercode worktree for semi-manual updates to agent permission defaults and agent prompt guidance, informed by the prior comparison between Supercode and oh-my-openagent (OMO).

This work item is intentionally limited to creating the approved spec and isolated worktree. Actual permission or prompt edits are out of scope for this spec and must be performed only after the user gives follow-up instructions inside the worktree.

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

Create an isolated worktree where the user and assistant can later semi-manually update Supercode agent permission settings and prompt instructions without modifying the main working tree.

The immediate desired outcome is a ready worktree and a concise, evidence-backed policy context captured in this spec. No permission or prompt code changes are part of this work item.

# Scope

Included:

- Create a dedicated Supercode work item and isolated worktree at `.worktrees/20260502-agent-permission-prompts-f4a9/`.
- Preserve the evidence-backed context in this spec for later semi-manual editing.
- Verify the worktree baseline sufficiently to classify it as ready or blocked.

Excluded:

- No permission default changes.
- No prompt text changes.
- No implementation of a new `call_supercode_research_agent` tool.
- No broad rewrite of the Supercode workflow stages.
- No changes to OpenCode upstream runtime behavior.
- No attempt to implement nested permission approval forwarding.
- No merge, PR, or discard decision until normal finish flow.

# Non-Goals

- Do not edit agent permission files during this work item.
- Do not edit agent prompt files during this work item.
- Do not grant or revoke any tool permissions during this work item.
- Do not change production implementation code outside the approved worktree.

# Constraints

- Work must proceed in `.worktrees/20260502-agent-permission-prompts-f4a9/` after spec approval and worktree creation.
- The user wants permission and prompt updates to proceed semi-manually after the worktree exists.
- This spec must not decide the final permission policy for executor, explorer, librarian, or reviewers.
- Later edits should use the captured evidence as context but require explicit user direction before changing files.

# Success Criteria

- The approved spec is committed before worktree creation.
- A worktree exists at `.worktrees/20260502-agent-permission-prompts-f4a9/`.
- `.worktrees/` ignore safety is verified or fixed according to the worktree workflow.
- Setup/baseline verification is run according to detected project conventions.
- The worktree is classified as ready, or any degraded baseline is presented to the user for explicit acceptance.
- No agent permission or prompt file is changed as part of this work item.

# Risks / Unknowns

- Baseline verification may expose unrelated existing failures; if so, worktree readiness may require degraded baseline acceptance.
- The exact user-preferred balance between OMO parity and Supercode safety remains intentionally deferred to the later semi-manual editing phase.
- Later permission edits may require confirming whether Supercode’s config normalization preserves nested permission rules such as `read` patterns.

# Revisions

- 2026-05-02: Initial spec for permission/prompt update worktree preparation.
