# Work ID

20260502-agent-permission-prompts-f4a9

# Objective

Prepare and begin an isolated Supercode work item for semi-manual updates to agent permission defaults and agent prompt guidance, informed by the prior comparison between Supercode and oh-my-openagent (OMO).

The first implementation change applied the `explorer` agent permission policy. The second implementation change applied the `librarian` agent permission policy. The next approved implementation change is limited to aligning remaining built-in agents with OMO by removing explicit `bash: "deny"` entries only. Prompt edits and `external_directory` changes for those remaining agents are still deferred for user-led follow-up.

# Current State

- Supercode defines agent permissions in `src/agents/definitions/*.agent.ts` and accepts root permission keys including `doom_loop` and `external_directory` in `src/supercode-config.ts`.
- The `explorer` permission change has already been applied in this worktree: explicit `bash: "deny"` was removed, non-writing OMO-like permissions were added, and `.env` read rules were made explicit.
- The `librarian` permission change has already been applied in this worktree: explicit `bash: "deny"` was removed, non-writing OMO-like permissions were added, and `.env` read rules were made explicit.
- Remaining built-in agents still need a bash-only alignment pass if their default permission objects contain explicit `bash: "deny"`.
- `external_directory` policy for remaining built-in agents is intentionally undecided and out of scope for the next change.
- OpenCode default read permission asks for `*.env` and `*.env.*` while allowing `*.env.example`; in nested/subagent contexts, permission asks may not reliably surface to the main user session and can appear to hang.
- OMO does not solve nested permission asks by forwarding approval UI. It avoids many hangs by making child agents leaf nodes, disabling question/task delegation, and using explicit allow/deny defaults for risky operations.
- OMO librarian is more permissive than Supercode librarian: it denies write/edit/task/call_omo_agent but does not deny bash and inherits global `external_directory: allow`.
- OMO explore is also more permissive than Supercode explorer regarding external directory/global tool defaults, while still denying write/edit/task/call_omo_agent and explicitly allowing LSP/AST search tools.

# Desired Outcome

Continue inside the already-created isolated worktree where the user and assistant can semi-manually update Supercode agent permission settings and prompt instructions without modifying the main working tree.

Continue the agreed permission changes by applying only the next bash-only alignment:

- remove explicit `bash: "deny"` from remaining built-in agents where it is currently set, matching the OMO pattern that does not directly deny bash on agents
- do not revisit already-applied `explorer` or `librarian` permission changes except to verify they remain intact

# Scope

Included:

- Preserve the evidence-backed context in this spec for later semi-manual editing.
- Treat the dedicated worktree at `.worktrees/20260502-agent-permission-prompts-f4a9/` and its baseline verification as already completed prior workflow context, not as current implementation work.
- Treat prior implemented work as context only:
  - `explorer` permission policy is already implemented and should not be reworked in the next change
  - `librarian` permission policy is already implemented and should not be reworked in the next change
- Update remaining built-in agent permission handling for the bash-only change:
  - remove explicit `bash: "deny"` wherever it remains in built-in agent definitions
  - exclude `explorer` and `librarian` from implementation targets because they already satisfy this bash requirement
  - do not add or change `external_directory` for these remaining agents
  - do not add or change `read`, `webfetch`, or `doom_loop` for these remaining agents in this change
  - preserve all existing write, edit, patch, rename, task, question, todowrite, and other non-bash permissions

Excluded:

- No permission default changes except the already-applied `explorer` and `librarian` permission policies and the next bash-only removal for remaining built-in agents.
- No prompt text changes in the next bash-only implementation change.
- No implementation of a new `call_supercode_research_agent` tool.
- No broad rewrite of the Supercode workflow stages.
- No changes to OpenCode upstream runtime behavior.
- No attempt to implement nested permission approval forwarding.
- No merge, PR, or discard decision until normal finish flow.

# Non-Goals

- Do not edit `explorer` or `librarian` permission files as part of the next bash-only change unless required to fix accidental regression.
- Do not edit remaining agent permission files except to remove explicit `bash: "deny"`.
- Do not edit agent prompt files during this work item.
- Do not grant or revoke any tool permissions beyond the already-applied `explorer` and `librarian` permission policies and the next bash-only removal for remaining built-in agents.
- Do not change production implementation code outside the approved worktree.

# Constraints

- Work must proceed in `.worktrees/20260502-agent-permission-prompts-f4a9/` after spec approval and worktree creation.
- The user wants permission and prompt updates to proceed semi-manually after the worktree exists.
- The next implementation target is only removal of explicit `bash: "deny"` from remaining built-in agents. It does not decide `external_directory` policy for the remaining agents, final executor/reviewer non-bash policies, or prompt text.
- Later edits should use the captured evidence as context but require explicit user direction before changing files.
- Do not change `read`, `webfetch`, `doom_loop`, `external_directory`, prompt text, or non-bash permissions for remaining built-in agents in the next bash-only implementation change.

# Success Criteria

- The revised spec for the bash-only change is reviewed, approved, and committed before planning/execution continues.
- Work remains inside the existing `.worktrees/20260502-agent-permission-prompts-f4a9/` worktree.
- Previously implemented `explorer` permissions remain intact:
  - `bash: "deny"` is no longer set on `explorer`
  - `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` are set
  - write/delegation mutation tools remain denied
  - `.env` and `.env.*` read rules are explicit deny; `.env.example` read is allow
- Previously implemented `librarian` permissions remain intact:
  - `bash: "deny"` is no longer set on `librarian`
  - `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` are set
  - write/delegation mutation tools remain denied
  - `.env` and `.env.*` read rules are explicit deny; `.env.example` read is allow
- Remaining built-in agents no longer contain explicit `bash: "deny"` in their default permission objects.
- Existing non-bash permissions on remaining built-in agents are preserved.
- `external_directory` is not changed for remaining built-in agents as part of the bash-only change.
- `read`, `webfetch`, and `doom_loop` are not changed for remaining built-in agents as part of the bash-only change.
- Prompt files remain unchanged.
- Tests and typecheck pass after the change.

# Risks / Unknowns

- Baseline verification for the worktree has already passed earlier in this workflow; any new verification failure after the bash-only change should be treated as introduced by current work unless evidence shows otherwise.
- The exact user-preferred `external_directory` and other non-bash policies for agents other than `explorer` and `librarian` remain intentionally deferred to the later semi-manual editing phase.
- Adding `read` permission patterns may require confirming whether Supercode’s config normalization currently preserves nested read rules; if not, schema/config support must be narrowly expanded for `read`.

# Revisions

- 2026-05-02: Initial spec for permission/prompt update worktree preparation.
- 2026-05-02: Scope expanded by user request to apply the first `explorer` permission policy change; prompt edits remain deferred.
- 2026-05-02: Scope expanded by user request to apply OMO-like `librarian` permissions with `.env` read denial; prompt edits remain deferred.
- 2026-05-02: Scope expanded by user request to remove explicit `bash: "deny"` from remaining built-in agents only; `external_directory` changes remain deferred.
