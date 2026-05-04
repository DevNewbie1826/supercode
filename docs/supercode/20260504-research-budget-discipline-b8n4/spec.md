# Work ID

20260504-research-budget-discipline-b8n4

# Objective

Strengthen Supercode's direct research-delegation model so research budgets are treated as binding execution constraints rather than soft guidance.

The goal is to preserve the successful PR #20 research model while improving budget discipline, stop behavior, and reporting consistency for `explorer`, `librarian`, and the shared `research-delegation` skill.

# Current State

PR #20 successfully changed Supercode so non-research subagents can directly delegate bounded research to `explorer` and `librarian`.

Smoke tests after loading the merged code showed:

- `planner` can directly call `explorer`.
- `code-quality-reviewer` can directly call `explorer`.
- `completion-verifier` can directly call `explorer`.
- `executor` can directly call `librarian`.
- `spec-reviewer` can directly call `librarian`.
- `explorer` and `librarian` recognize their terminal-agent no-recursive-delegation role.

However, budget adherence is inconsistent:

- In one smoke test, `explorer` exceeded a requested max file-read budget while answering a broad permission inventory question.
- In another smoke test, `librarian` exceeded a requested max 2-file budget while verifying its own terminal-agent behavior.
- Some subagents report budget usage clearly, while others use ad hoc wording.

This indicates that direct delegation works, but the budget contract is still too soft.

# Desired Outcome

Research delegation should behave as follows:

```text
caller sets budget
→ research agent stays within budget
→ if budget is insufficient, research agent stops before exceeding it
→ research agent reports checked scope, unchecked scope, unresolved uncertainty, and additional budget needed
```

Budget excess should not happen silently or be justified after the fact.

If a research agent exceeds budget despite the rule, it must explicitly mark that as a violation in a standard budget report.

# Scope

In scope:

- Update `src/skills/research-delegation/SKILL.md` to state that caller budgets are binding.
- Update `src/agents/prompt-text/explorer-prompt.md` to require strict budget adherence and standardized budget reporting.
- Update `src/agents/prompt-text/librarian-prompt.md` to require strict budget adherence and standardized budget reporting.
- Update relevant prompt/content tests to verify budget-discipline wording.
- Run `bun test` and `bun run typecheck`.
- Create PR, merge it, delete the remote branch, remove the worktree, and fast-forward local `main` after merge as requested by the user.

# Non-Goals

- Do not change Supercode's public workflow stages.
- Do not change agent task permissions.
- Do not redesign `research-delegation`.
- Do not change executor/reviewer authority boundaries.
- Do not add runtime budget enforcement code unless tests or repository structure prove prompt-only enforcement cannot be expressed.
- Do not modify unrelated skill or agent prompts.

# Constraints

- Preserve direct `research-delegation` from non-research subagents to `explorer` / `librarian`.
- Preserve `explorer` and `librarian` as terminal research agents.
- Preserve all existing workflow gates and finish safety rules.
- Budget language must distinguish:
  - within-budget success;
  - budget-insufficient stop;
  - budget violation if exceeded.
- If budget is insufficient, the research agent should stop and report additional budget needed instead of continuing.
- Standard budget output should be concise and reusable by callers.

# Required Budget Report Contract

Research outputs should include a budget section equivalent to:

```text
### Budget
- calls_used:
- files_or_sources_used:
- budget_limit:
- budget_followed: true | false
- if_exceeded:
- additional_budget_needed:
```

For a normal within-budget result:

- `budget_followed: true`
- `if_exceeded: null` or equivalent
- `additional_budget_needed: null` or equivalent

For insufficient budget:

- stop before exceeding budget;
- `budget_followed: true` if budget was not exceeded;
- report unchecked scope and `additional_budget_needed`.

For an actual budget violation:

- `budget_followed: false`;
- explain what exceeded the budget and why;
- report whether the evidence should still be trusted.

# Success Criteria

- `research-delegation` skill explicitly says budgets are binding.
- `explorer` prompt explicitly says not to exceed file/search/call budget; if insufficient, stop and report unchecked scope and additional budget needed.
- `librarian` prompt explicitly says not to exceed source/search/call budget; if insufficient, stop and report unchecked scope and additional budget needed.
- Both research agent prompts include the standard budget reporting fields or an equivalent strict structure.
- Tests cover the new budget-discipline prompt requirements.
- Existing research-delegation tests still pass.
- `bun test` passes.
- `bun run typecheck` passes.

# Risks / Unknowns

- Prompt-only budget discipline cannot guarantee runtime enforcement if the underlying tool interface does not enforce budgets.
- Overly rigid budget wording could reduce useful research if agents stop too early; the spec mitigates this by requiring `additional_budget_needed` reporting.
- Tests can validate prompt text but cannot fully prove future model behavior.

# Revisions

- Initial spec created after post-merge smoke tests found direct research delegation working but budget adherence inconsistent.
