## Objective

Create the missing agent definition files in `src/agents/definitions/` so that every existing prompt document in `src/agents/prompt-text/` has a corresponding definition artifact, without changing any prompt text.

## Current State

The repository already contains prompt documents for multiple agent roles under `src/agents/prompt-text/`.

Existing definition files are present only for `explorer`, `librarian`, and `orchestrator` in `src/agents/definitions/`.

The following prompt files currently do not have matching definition files:

- `planner-prompt.md`
- `executor-prompt.md`
- `spec-author-prompt.md`
- `spec-reviewer-prompt.md`
- `plan-checker-prompt.md`
- `plan-challenger-prompt.md`
- `final-reviewer-prompt.md`
- `systematic-debugger-prompt.md`
- `task-compliance-checker-prompt.md`
- `code-spec-reviewer-prompt.md`
- `code-quality-reviewer-prompt.md`
- `completion-verifier-prompt.md`

Existing definitions follow a consistent convention:

- file name format: `{name}.agent.ts`
- prompt loading from `../prompt-text/{name}-prompt.md`
- prompt content read via `readFileSync(promptPath, 'utf8').trim()`
- exported object shape includes `name`, `description`, `prompt`, `mode`, and `defaults`

Definition discovery is file-based. `src/agents/registry.ts` scans `src/agents/definitions/` for `*.agent.ts` files, and `src/__tests__/agent-registry.test.ts` confirms that only files matching that pattern are loaded. No index file or manual registry entry is required for new agent definitions.

`orchestrator` remains the only `primary` agent. All twelve missing roles are expected to be `subagent` definitions.

Existing repository convention also includes `defaults` on agent definitions. Existing subagents use `defaults` with `color`, `temperature: 0.1`, and a restrictive `permission` block.

## Desired Outcome

The repository includes one new definition file for each orphan prompt document, and each new definition matches the established file naming, prompt loading, exported object, and `defaults` conventions already used by existing agent definitions.

Each new definition uses the exact hyphenated role name implied by its prompt file, assigns the concrete role description provided by this spec, sets `mode: 'subagent'`, and includes `defaults` aligned with existing subagent conventions while preserving the current automatic registry discovery behavior.

## Scope

Add definition files in `src/agents/definitions/` for these agent names:

- `planner`
- `executor`
- `spec-author`
- `spec-reviewer`
- `plan-checker`
- `plan-challenger`
- `final-reviewer`
- `systematic-debugger`
- `task-compliance-checker`
- `code-spec-reviewer`
- `code-quality-reviewer`
- `completion-verifier`

Each definition must:

- load its matching prompt file from `src/agents/prompt-text/`
- use `readFileSync(promptPath, 'utf8').trim()`
- export an `AgentDefinition` with the expected fields
- use the exact hyphenated agent name for both the file name and exported `name`
- set `mode` to `subagent`
- include `defaults` aligned with existing subagent conventions, including `color`, `temperature: 0.1`, and a restrictive `permission` block unless prompt evidence discovered during implementation clearly requires an exception
- use these descriptions verbatim or with only minimal wording changes that preserve the same meaning:
- `planner`: Converts an approved `spec.md` into an execution-ready `plan.md` with narrowly-scoped, independently-verifiable tasks.
- `executor`: Implements one assigned task using strict TDD-oriented discipline, modifying only the specified files for the assigned task.
- `spec-author`: Transforms rough user intent and repository evidence into a precise, bounded, planning-ready `spec.md`.
- `spec-reviewer`: Acts as a read-only planning-readiness gate for `spec.md`, issuing a PASS or FAIL verdict with blocking issues.
- `plan-checker`: Acts as a read-only execution-readiness gate for `plan.md`, blocking plans that are unsafe, vague, or under-verified.
- `plan-challenger`: Stress-tests `plan.md` to expose hidden risks, brittle sequencing, unrealistic verification, and scope creep.
- `final-reviewer`: Issues the final PASS or FAIL verdict for completed work based solely on fresh evidence, `spec.md`, and `plan.md`.
- `systematic-debugger`: Diagnoses unclear failure root causes by systematically eliminating hypotheses with evidence when called by the orchestrator.
- `task-compliance-checker`: Confirms a single task is fully understood and executable before the executor begins, rejecting ambiguous tasks.
- `code-spec-reviewer`: Verifies that a task implementation complies with the spec, plan, and assigned scope, reporting compliance issues.
- `code-quality-reviewer`: Reviews task implementation for correctness, maintainability, test sufficiency, and consistency with project conventions.
- `completion-verifier`: Independently verifies work completion by gathering fresh evidence against `spec.md` and `plan.md` without trusting prior claims.
- rely on automatic registry discovery by filename pattern; no registry or index file edits are required

This work includes only the documentation/specification needed to plan that implementation.

## Non-Goals

- Editing any existing prompt text in `src/agents/prompt-text/`
- Changing behavior of existing `explorer`, `librarian`, or `orchestrator` definitions
- Redesigning the `AgentDefinition` type or registry architecture
- Editing `src/agents/registry.ts`, adding a definitions index, or making any manual registration change for the new agents
- Renaming prompt files or definition files beyond the established naming convention
- Implementing broader agent behavior changes unrelated to adding missing definitions
- Creating `plan.md` or implementation code as part of this specification task

## Constraints

- Use the existing naming convention: `{name}.agent.ts` loads `../prompt-text/{name}-prompt.md`
- Preserve current loading and registry conventions already established in `src/agents/definitions/`
- Do not add or modify any manual registry or index wiring because discovery is handled automatically by scanning `*.agent.ts` files in `src/agents/definitions/`
- Do not modify prompt document contents
- Keep the work bounded to adding missing matching definition artifacts
- Treat all twelve missing roles as `subagent`; do not introduce any new `primary` agent
- Include `defaults` for every new definition, aligned with existing subagent conventions unless prompt evidence clearly requires otherwise
- Use the hyphenated role names already established by the prompt files and requested agent names
- Use the provided role descriptions as the planning baseline rather than inventing new descriptions during planning
- Base planning only on the repository evidence bundle provided for this task

## Success Criteria

- A planner can identify exactly which definition files need to be added
- The spec clearly states the conventions each new definition must follow
- The spec makes explicit that prompt text must remain unchanged
- The spec bounds the work to missing definitions and excludes unrelated agent-system refactors
- The spec makes explicit that no registry or index file edits are required because `src/agents/registry.ts` discovers `src/agents/definitions/*.agent.ts` automatically
- The spec makes explicit that all twelve new definitions are `subagent` definitions and that `orchestrator` remains the sole `primary` agent
- The spec requires each new definition to include `defaults` aligned with existing subagent conventions
- The spec provides concrete per-role description expectations sufficient for planning without further role-definition discovery
- Acceptance assumes registry discovery succeeds when the new files are added with the `*.agent.ts` naming pattern
- The document is concrete enough to support creation of an implementation plan without additional discovery

## Risks / Unknowns

- The evidence establishes planning expectations for `description`, `mode`, registry discovery, and `defaults`, but implementation should still verify those choices remain consistent with the actual prompt text for each role
- Existing subagent conventions are described functionally, but exact `color` values and restrictive `permission` structure will need to be copied from repository precedent during implementation rather than invented in planning
