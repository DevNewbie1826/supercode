# Work ID

`20260424-agent-sync-audit-readme-c7d2`

## Objective

Bring the local Supercode agent configuration and public project documentation up to date with the current built-in workflow architecture, and audit the latest workflow-agent commit for correctness, missing verification coverage, and current build health.

## Current State

- `.opencode/supercode.json` currently defines overrides for only `orchestrator`, `explorer`, and `librarian`.
- The latest commit `35f42b5105d91779a8f0a838a52e925bd37fea25` added many workflow agent definitions and stage-gated skills.
- `src/agents/registry.ts` auto-discovers all `*.agent.ts` files under `src/agents/definitions/`.
- The repository currently contains 14 built-in agent definition files, but `src/__tests__/agent-registry.test.ts` still expects exactly 3 built-in agents.
- `README.md` still documents only three built-in agents and only two built-in skills, so it no longer reflects the current repository state.
- Current verification commands are `bun test` and `bun run typecheck`.
- Fresh verification evidence shows `bun run typecheck` passes, while `bun test` currently fails because the agent registry test is stale relative to the new built-in agent set.

## Desired Outcome

- `.opencode/supercode.json` includes the full current built-in agent list, with each agent defaulting to the same model/variant as `orchestrator` unless intentionally documented otherwise.
- The latest workflow-agent commit is reviewed within a defined audit boundary, and any confirmed in-scope problems in its shipped behavior, tests, or user-facing documentation are corrected.
- The project README accurately reflects the current built-in agents, built-in skills, configuration behavior, and local verification expectations.
- Repository verification is re-run after changes, with the resulting pass/fail state clearly recorded.

## Scope

In scope:

- Update `.opencode/supercode.json` so the agent list is fully current and defaults align with the local orchestrator override unless there is a code-backed reason not to.
- Review the latest commit's introduced workflow-agent and skill changes for immediately visible issues affecting repository correctness, consistency, or maintainability.
- Review only the latest commit's changed workflow-related surfaces: `src/agents/definitions/**`, `src/agents/prompt-text/**`, `src/skills/**`, `.opencode/supercode.json`, `README.md`, and tests or config-merging code directly exercised by those additions.
- Fix only issues discovered in that bounded audit that meet at least one of these criteria: (a) failing current verification, (b) contradiction between shipped code and shipped docs/config examples, or (c) broken or missing coverage for behavior directly affected by the commit and touched by this request.
- Add or update tests when needed to validate the corrected behavior.
- Update `README.md` so agent, skill, and configuration documentation matches the present repository state.
- Run repository verification commands needed to assess current build and test health before and after the changes.
- Record the audit findings and any intentionally unfixed out-of-scope or deferred items in `docs/supercode/20260424-agent-sync-audit-readme-c7d2/audit.md`.

Out of scope:

- Re-architecting the workflow model, agent prompt strategy, or skill contracts beyond what is necessary to resolve concrete issues found in this request.
- Adding new built-in agents or skills beyond the set already present in the repository.
- Changing remote CI infrastructure or publishing package releases.

## Non-Goals

- Do not redesign the orchestrator workflow itself.
- Do not broaden the work into unrelated refactors across the plugin.
- Do not promise green verification for concerns unrelated to this request if unrelated breakage is discovered.
- Do not treat files outside the bounded audit surfaces as required review targets unless a failure clearly traces back from those surfaces.

## Constraints

- Workflow must follow the staged Supercode process; implementation cannot begin until spec, worktree, plan, and alignment gates complete.
- The orchestrator must not directly modify implementation code; implementation changes must be delegated to executor subagents during execute.
- Reviewers must receive artifact-focused context only.
- The repository uses Bun and TypeScript; verification must at minimum consider `bun test` and `bun run typecheck`.
- User requested unattended progression after problem reporting, so once the spec is review-passing the workflow should continue automatically until the finish-choice pause.
- The local config goal is to make all agent entries default to the same `model` and `variant` as the current local `orchestrator` entry, not necessarily to overwrite code-level agent defaults like temperature, permissions, or color unless explicitly needed.
- The authoritative built-in agent inventory for this work is the sorted set of files matching `src/agents/definitions/*.agent.ts`, as loaded by `src/agents/registry.ts`.
- The authoritative built-in skill inventory for this work is the set of directories containing `src/skills/*/SKILL.md`.
- README updates should document shipped built-in assets that are user-facing in this repository, including the workflow stage-gated skills now bundled in `src/skills/`.
- The audit artifact must list: reviewed surfaces, confirmed issues, fixes applied, verification results, and any deferred items with rationale.

## Success Criteria

- `.opencode/supercode.json` contains entries for the full current built-in agent set and each entry uses the orchestrator-matching local `model`/`variant` defaults unless explicitly justified otherwise.
- `docs/supercode/20260424-agent-sync-audit-readme-c7d2/audit.md` exists and records the bounded audit results for the latest commit, including any deferred items with rationale.
- All confirmed in-scope issues found in the bounded audit are either fixed or explicitly marked deferred in the audit artifact with rationale.
- Test coverage is updated at least for any corrected behavior or stale expectation directly caused by the latest commit within the bounded audit surfaces.
- `README.md` matches the built-in agent inventory from `src/agents/definitions/*.agent.ts`, the built-in skill inventory from `src/skills/*/SKILL.md`, and the actual configuration behavior implemented in the repository.
- Verification is run after implementation, and the resulting status of `bun test` and `bun run typecheck` is reported.

## Risks / Unknowns

- The request phrase "기본값 오케스트레이터와 같음" could be interpreted as applying only to local config `model`/`variant` overrides or also to all other agent default fields; this spec constrains it to the local config override fields unless implementation evidence shows otherwise.
- The latest commit may have additional issues beyond the already observed stale registry test and stale documentation; some findings could require routing back to plan if they expand scope materially.
- Because the repository already contains many agent definitions but local config and tests lag behind, there may be additional consistency gaps in docs or expectations that are only discovered during execution.

## Revisions

- Initial spec drafted from repository evidence gathered on 2026-04-24.
- Scope refined after user clarified that the workflow should continue automatically after the initial problem report rather than pausing for a second approval between report and fixes.
