# Spec: Portable OpenCode External Directory Permissions

## Work ID
20260505-portable-external-directory-permissions-k9m2

## Objective
Make Supercode's checked-in agent permission defaults explicit for portable external-directory usage by ensuring research agents allow normal reads while preserving `.env` read protection, without relying on local machine-specific OpenCode config changes.

## Current State
- OpenCode `external_directory` defaults to `ask`, so paths outside the directory where OpenCode was started can trigger approval prompts.
- Supercode workflows commonly cross root repo, `.worktrees/<work_id>/`, and `docs/supercode/<work_id>/` boundaries, which can trigger those prompts depending on launch/worktree context.
- OpenCode documentation supports `external_directory: "allow"`, object syntax, wildcards, and home expansion via `~`/`$HOME`; it does not document a dynamic current-project variable such as `$PWD`, `${workspaceRoot}`, or `${projectRoot}` for portable project-root allowlists.
- Current repo-local `.opencode/opencode.json` and `.opencode/supercode.json` are ignored local configuration files and are not the target for this PR.
- Built-in `explorer` and `librarian` already define `external_directory: "allow"` and nested read rules for `.env` denial, but the nested read rule lacks an explicit `"*": "allow"` baseline.
- Other built-in agents generally do not define a `read` permission key; absent per-agent overrides, global OpenCode read defaults apply.

## Desired Outcome
- Leave local ignored `.opencode/*` configuration unchanged.
- Ensure Supercode research agents with explicit nested `read` permission objects remain clear and non-ambiguous by including `"*": "allow"` before deny/exception rules where appropriate.
- Avoid adding broad new edit/write/bash/task powers.

## Scope
In scope:
- Update built-in `explorer` and `librarian` agent default read rules to include `"*": "allow"` before existing `.env` deny and `.env.example` allow rules.
- Add or update tests that verify the built-in research-agent read rules include the explicit read baseline and preserve `.env` protection.

Out of scope:
- Runtime permission engine changes in OpenCode itself.
- Local ignored OpenCode config changes under `.opencode/*`.
- Dynamic project-root variable support.
- Adding path-specific machine-local allowlists such as `/Volumes/storage/workspace/**`.
- Adding global OpenCode `permission.external_directory` rules in ignored local config.
- Granting new edit/write/bash permissions.
- Changing non-research agents unless tests or evidence show they need explicit read rules to avoid regression.

## Non-Goals
- Guaranteeing complete protection for every possible secret filename outside `.env` patterns.
- Removing all possible approval prompts for unrelated permissions such as destructive bash commands, git push, or tool-specific approvals.
- Changing Supercode workflow gates, agent authority, or research delegation behavior.

## Constraints
- Keep the solution portable across machines and projects; no absolute project path allowlist and no ignored local config dependency.
- Preserve `.env` and `.env.*` read denial while allowing `.env.example`.
- Respect OpenCode object rule semantics where the last matching rule wins; place `"*": "allow"` before more specific deny/allow rules.
- Do not weaken existing agent write-deny or no-recursive-delegation policies.
- Treat global/local OpenCode permission config separately from Supercode per-agent permission defaults; this PR changes only checked-in Supercode defaults/tests.

## Success Criteria
- `explorer` and `librarian` built-in permission defaults include explicit `read["*"] = "allow"` while preserving `.env` denies and `.env.example` allow.
- Existing tests pass.
- New or updated tests cover the intended OpenCode config and agent read-rule behavior.
- No new permissions beyond external-directory allow and explicit read baseline are introduced.

## Risks / Unknowns
- OpenCode documentation states defaults are permissive and `.env` reads are denied by default, but once a nested `read` object is provided, explicit `"*": "allow"` is clearer and avoids relying on implicit merge/default behavior.
- This PR will not modify ignored local `.opencode` config, so any local/global OpenCode permission behavior outside checked-in agent defaults remains the user's environment responsibility.

## Revisions
- Initial spec drafted from user request and OpenCode permissions documentation research.
- Revised scope after user clarified the change should be left as a PR in the repository, not as an ignored local config edit.
