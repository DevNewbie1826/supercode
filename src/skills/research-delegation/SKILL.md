---
name: research-delegation
description: Delegate missing internal or external research to explorer and librarian agents with scoped budgets, evidence requirements, and no recursive delegation.
---

## Purpose

`research-delegation` defines how Supercode routes missing evidence to specialized research agents without letting implementation, planning, or review agents broaden their own scope.

Use it to obtain specific evidence needed for a decision, task, review, or verification while preserving context isolation, budget limits, and traceable sources.

## When to Use

Use this skill when assigned context and direct reads of known exact paths are insufficient and the next safe step requires:

- internal repository discovery, implementation tracing, related-test discovery, call-site discovery, ownership checks, or convention discovery
- external documentation, API, framework, library, version, migration, or best-practice evidence
- both internal and external evidence for the same decision

Known exact path reads are not research delegation. Read explicitly assigned files, artifacts, diffs, and previously returned source paths directly.

When both internal and external evidence are needed, delegate internal research first so external lookup can compare official guidance against the repository's actual usage.

## Research Agents

### explorer

Use `explorer` for internal repository research:

- file and symbol discovery
- implementation tracing
- call sites and references
- related tests and fixtures
- configs, hooks, generated indexes, and internal docs
- project conventions and impact radius

### librarian

Use `librarian` for external reference research:

- official documentation
- API behavior
- package, framework, or tool version behavior
- migration notes and changelogs
- authoritative examples or source references
- best-practice comparisons when external evidence is required

### Internal-first combined flow

When a request needs both agents:

1. Send the internal question to `explorer` first.
2. Use the explorer result to narrow the external question.
3. Send only the external portion to `librarian`.
4. Keep sources and unresolved uncertainty separated by internal vs external evidence.

## Delegation Contract

Every delegated research request must include these fields:

```text
TASK: The workflow task or decision the evidence supports.
QUESTION: The precise question to answer.
WHY NEEDED: Why the evidence is required before continuing safely.
SCOPE: The allowed repository area, artifact set, library, API, or documentation boundary.
REQUIRED SOURCES: Required paths, source categories, official docs, or source quality expectations.
BUDGET: Maximum files (max_files), searches (max_searches), sources/references (max_sources), tool calls (max_calls), time, or result count.
STOP CONDITION: The evidence threshold or blocker condition that ends the research.
EXPECTED OUTPUT: The exact evidence format needed by the caller.
```

Delegation requests must be narrow enough that the agent can answer without guessing what decision will be made from the evidence.

## Budget Rules

Budgets are **binding maximums**, not advisory, not optional, not suggestions, and not soft guidance. A research agent must never exceed its caller-provided budget and must not treat the budget as expandable after the fact.

- Set an explicit budget before delegation begins.
- Prefer the smallest budget that can answer the question safely.
- Start with one focused research call.
- Parallelize only when questions are independent and their scopes do not overlap.
- Do not ask duplicate questions across agents or repeated rounds.
- For internal research, budget by file count, directory scope, search count, or maximum call-site samples.
- For external research, budget by official source priority, maximum documents, version scope, or reference count.
- **Stop before exceeding the budget.** If the budget is insufficient to complete the research, the agent must stop before exceeding it and report checked scope, unchecked scope, unresolved uncertainty, and additional budget needed.
- Do not expand the budget silently. If the budget is exhausted before the stop condition is met, return unresolved uncertainty.
- Do not ask a research agent to perform open-ended exploration when a narrower contract can answer the decision.
- Stop after two unproductive rounds.
- Stop when evidence is sufficient for the task-scoped decision.
- Any agent-specific instruction to parallelize, broaden discovery, or satisfy completeness applies only within TASK, SCOPE, REQUIRED SOURCES, BUDGET, and STOP CONDITION. Budget overrides completeness when they conflict.

Suggested defaults when no stricter task budget is provided:

- internal: up to 5 files or 3 focused searches
- external: up to 3 authoritative sources, preferring official documentation
- combined: internal defaults first, then external defaults narrowed by the internal result

### Budget Outcomes

Every research result must report one of three outcomes:

1. **Within-budget success**: The question was answered within the budget. `budget_followed: true`. `if_exceeded: null`. `additional_budget_needed: null`.
2. **Insufficient-budget stop**: The budget was not enough to fully answer the question, but the agent stopped before exceeding it. `budget_followed: true`. The agent reports checked scope, unchecked scope, unresolved uncertainty, and `additional_budget_needed` with a concrete estimate.
3. **Scope blocker**: The requested SCOPE was discovered to be wrong, unsafe, or inaccessible. The agent reports the blocker and returns to the caller for a new delegation contract.

If an agent accidentally exceeds its budget despite the binding rule, it must report the violation explicitly: `budget_followed: false`, explain `if_exceeded` what exceeded the budget and why, and state whether the evidence should still be trusted despite the violation.

## Stop Rules

Stop research when any of these occurs:

- the QUESTION is answered with cited evidence
- the STOP CONDITION is satisfied
- the BUDGET is exhausted
- the requested SCOPE is discovered to be wrong or unsafe
- required evidence does not exist or cannot be accessed
- continuing would require a broader task, plan, or user decision

Research agents should not continue gathering extra examples after enough evidence exists for the assigned decision.

## Evidence Rules

- Use returned evidence before asking for more research.
- Evidence must cite exact repository paths, line references when available, or external URLs/document names.
- Separate facts from interpretation.
- Identify checked scope and unchecked scope.
- State unresolved uncertainty explicitly; do not hide gaps.
- Prefer primary sources: repository artifacts for internal behavior and official documentation for external behavior.
- Do not treat unsourced memory, assumptions, or model knowledge as evidence.
- Do not use research results outside their stated SCOPE without a new delegation contract.

## Output Expectations

Research results should be concise and source-focused:

```markdown
### Research Result
- task: [TASK]
- question: [QUESTION]
- answer: [direct answer or blocker]
- evidence:
  - [path:line or URL] — [fact]
- checked_scope:
  - [what was checked]
- unchecked_scope:
  - [what was not checked]
- unresolved_uncertainty:
  - [remaining uncertainty or None.]
- stop_reason: [why research stopped]

### Budget
- calls_used: [number of tool calls consumed]
- files_or_sources_used: [number of files or sources read]
- budget_limit: [the caller-provided budget maximum]
- budget_followed: true | false
- if_exceeded: [null, or explanation of what exceeded the budget and why]
- additional_budget_needed: [null, or concrete estimate of extra budget required]
```

The caller must use the result only for the task or decision named in the contract.

## Recursive Delegation Prohibition

Research delegation is not recursive.

- `explorer` must not delegate to another research agent.
- `librarian` must not delegate to another research agent.
- A research agent must not ask another research agent to complete part of its assignment.
- If a research agent cannot answer within SCOPE and BUDGET, it returns the blocker and unresolved uncertainty to the caller.

Only the orchestrating caller may issue a new delegation contract after reviewing the returned evidence.

## Agent-Specific Use Notes

### Orchestrators

- Act as workflow gatekeeper and supervisor for research delegation boundaries.
- Use research delegation for the orchestrator's own workflow-stage evidence needs.
- Audit or supervise research results when a workflow gate depends on evidence quality, source scope, or unresolved uncertainty.
- Do not act as the ordinary research broker for subagents; subagents directly call `explorer` or `librarian` for their own bounded evidence needs.
- Preserve internal-first ordering when supervising a combined internal and external evidence request.

### Executors

- Read assigned files and provided evidence first.
- Directly call `explorer` or `librarian` only when safe implementation would otherwise require bounded internal discovery or external evidence.
- Do not implement, approve, or claim completion based on missing evidence.

### Planners and reviewers

- Directly call `explorer` or `librarian` when approval, rejection, PASS, FAIL, or routing would otherwise rely on unsupported bounded evidence needs.
- Keep the QUESTION tied to the exact planning or review decision.

### Research agents

- Stay inside TASK, SCOPE, REQUIRED SOURCES, BUDGET, and STOP CONDITION.
- Return evidence, checked scope, unchecked scope, uncertainty, budget used, and stop reason.
- Do not perform recursive delegation.

## Completion Criteria

This skill has been applied successfully when:

- the correct research agent was selected (`explorer`, `librarian`, or internal-first combined use)
- the delegation contract contained TASK, QUESTION, WHY NEEDED, SCOPE, REQUIRED SOURCES, BUDGET, STOP CONDITION, and EXPECTED OUTPUT
- research stayed within budget and stopped according to the stop rules
- returned evidence included sources, checked scope, unchecked scope, and unresolved uncertainty
- no recursive delegation occurred
- the caller can make the next task-scoped decision without guessing
