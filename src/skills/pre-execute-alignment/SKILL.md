---
name: pre-execute-alignment
description: Use when an approved plan exists and the workflow must lock execution order, safe batching, and per-task verification expectations before implementation begins.
---

## Purpose

The `pre-execute-alignment` skill turns an approved plan into an execution-ready alignment package.

Its job is to:
- validate that each planned task is clear enough to execute
- confirm dependency order
- separate serial work from parallel-safe work
- lock per-task verification expectations before implementation starts
- prevent the `execute` stage from improvising scope, order, or completion criteria

This skill is owned by the `orchestrator` and uses `task-compliance-checker` as a dedicated read-only subagent.

It must run after `plan` and before `execute`.

---

## Primary Agents

- `orchestrator`
- `task-compliance-checker`

### orchestrator
Owns the stage and is responsible for:
- reading the approved plan
- deciding execution order
- deciding serial vs parallel grouping
- locking verification expectations
- producing the alignment handoff package for `execute`

### task-compliance-checker
Acts as a strict read-only execution-readiness checker for individual tasks.

Its role is to:
- verify that each task is understandable enough to execute without guessing
- surface vague task wording
- surface missing completion criteria
- surface likely hidden dependency or conflict risk
- pressure-test whether each task is truly execution-ready

It does not rewrite the plan and does not decide the final batch structure.
It advises; the orchestrator decides.

---

## Inputs

This skill requires:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- active isolated worktree
- any accepted planning caveats or risks

---

## Output

This skill must produce an execution alignment package containing:

- `work_id`
- approved spec path
- approved plan path
- task execution order
- execution batches
- per-task verification expectations
- dependency constraints
- conflict warnings
- final alignment status: `ready` or `blocked`

This output does not need to be saved as a file unless your environment wants to persist it, but it must be explicit and reusable by `execute`.

---

## Hard Rules

1. Do not implement code.
2. Do not rewrite the plan unless the workflow is explicitly routed back to `plan`.
3. Do not begin `execute` until alignment is `ready`.
4. Do not allow execution to infer missing dependency order.
5. Do not allow execution to infer missing verification criteria.
6. Do not allow optimistic parallelism when conflicts are plausible.
7. Use conservative batching when certainty is low.
8. Known exact paths may be read directly; if additional discovery or external reference evidence is needed, route it through `orchestrator-mediated-research`.
9. Do not perform broad independent research outside that mechanism.
10. Treat hidden dependency risk as a real blocker.
11. Prefer blocking early over letting `execute` discover preventable coordination failures.
12. `task-compliance-checker` is read-only and must not rewrite the plan.
13. The orchestrator remains the decision-maker for batching and handoff.

---

## When to Use

Use this skill when:
- `plan` is approved
- the workflow is about to begin implementation
- multiple tasks exist
- task dependencies, ordering, or parallel safety matter
- per-task verification expectations need to be locked before coding begins

Do not use this skill when:
- the plan is still under review
- execution is already underway for the current plan revision unless the workflow explicitly reopens alignment
- the workflow has already produced a valid alignment package for the same plan revision

---

## Alignment Questions

For each planned task, determine:

1. Is the task understandable enough to execute without guessing?
2. Are the target files and intended result clear?
3. Is the verification explicit enough to judge completion later?
4. Does the task depend on outputs from another task?
5. Can it run in parallel without conflict?
6. Would executing it early make later tasks easier or riskier?
7. Is the QA expectation narrow and real, or broad and fake?

If any answer is too unclear, block alignment and route back to `plan`.

---

## Parallel Conflict Rules

Tasks must not be placed in the same active execution batch if they:

- depend on unfinished output from one another
- modify the same implementation file
- modify the same test file
- modify the same migration file
- modify the same build config
- modify the same package manifest
- modify the same shared entrypoint
- rely on an ordering guarantee that is not yet satisfied

When in doubt, serialize.

---

## Workflow

### Phase 0: Intake
Read:
- `docs/supercode/<work_id>/spec.md`
- `docs/supercode/<work_id>/plan.md`

If the plan is not approved, stop.

### Phase 1: Task Readiness Review
Review every task in plan order.

For each task:
1. send the task to `task-compliance-checker`
2. ask whether the task is clear enough to execute without guessing
3. ask whether:
   - purpose is clear
   - scope is clear
   - target files are clear
   - expected result is clear
   - QA / verification is usable
   - dependency notes are sufficient
   - parallel eligibility claim is believable

If `task-compliance-checker` reports the task as too vague or under-specified:
- stop
- mark alignment `blocked`
- route back to `plan`

### Phase 2: Dependency Pass
Build the real execution dependency graph.

For each task, determine:
- what must happen before it
- what can happen independently
- what should be forced into serial order even if the plan was optimistic

If dependency order is ambiguous:
- stop
- mark alignment `blocked`
- route back to `plan`

### Phase 3: Conflict Pass
Check all candidate parallel tasks for conflict surfaces.

Use:
- plan information
- task-compliance-checker findings
- repository evidence if needed

If parallel claims are too optimistic, reduce them.
Do not preserve optimistic batching for convenience.

### Phase 4: Verification Lock
For each task, lock the verification expectation that `execute` and downstream reviewers must use.

That means defining:
- what must be true when the task is done
- what evidence should exist
- what QA or tests matter
- what does not count as sufficient proof

This prevents `execute` from redefining “done.”

### Phase 5: Batch Construction
Create execution batches.

Each batch must be either:
- serial-only
- parallel-safe under the conflict rules

Default max concurrency is 3.
If the user explicitly requested 5, max concurrency becomes 5.

Do not exceed the active concurrency policy.

### Phase 6: Final Readiness Decision
Classify the alignment result as:

- `ready`
- `blocked`

It is `ready` only if:
- every task is understandable
- dependency order is explicit
- conflict-safe batches exist
- verification expectations are locked
- no task requires execution-time guesswork

---

## Use of task-compliance-checker

Use `task-compliance-checker` as a per-task execution-readiness auditor.

Ask it to evaluate:
- whether the task would force executor guesswork
- whether completion criteria are too vague
- whether file targeting is underspecified
- whether dependency wording is too weak
- whether the claimed parallel eligibility is suspicious

Do not use it to:
- rewrite the plan
- redesign the task structure
- decide final execution batches by itself
- substitute for orchestrator judgment

The orchestrator should treat repeated or serious `task-compliance-checker` objections as blockers.

---

## Research Rule

Known exact path reads are not research.

Agents may directly inspect files, diffs, artifacts, and evidence explicitly provided in their assigned context.

If additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, or external reference evidence is needed beyond provided context, use `orchestrator-mediated-research`.

When used by a subagent, `orchestrator-mediated-research` returns a `NEEDS_RESEARCH` handoff for the orchestrator to fulfill.

Do not guess when required evidence is missing.

---

## Alignment Standard

A valid alignment package must answer all of the following:

- What runs first?
- What can run together?
- What must not run together?
- What makes each task “done”?
- What assumptions are still in force from planning?
- Where would execution fail if batching is too optimistic?

If those answers are not explicit, alignment is not complete.

---

## Completion Gate

The `pre-execute-alignment` skill is complete only when:
- `work_id` exists
- the approved spec exists
- the approved plan exists
- every task has been checked for execution readiness
- `task-compliance-checker` findings have been resolved or accepted
- dependency order is explicit
- conflict-safe execution batches are defined
- per-task verification expectations are locked
- the alignment result is explicitly classified as `ready` or `blocked`

---

## Handoff to Next Skill

On success, hand off to `execute` with:
- `work_id`
- approved spec path
- approved plan path
- execution order
- execution batches
- per-task verification expectations
- dependency constraints
- conflict warnings
- alignment status `ready`

Do not hand off normally if alignment is `blocked`.

---

## Failure Handling

If any task is still too vague:
- stop
- route back to `plan`
- state exactly which task is unclear and why

If dependency order is unclear:
- stop
- route back to `plan`
- identify the ambiguous dependency

If parallel safety is overstated:
- reduce batching if possible
- if not possible without major replanning, route back to `plan`

If verification expectations are too weak:
- stop
- route back to `plan`
- specify which task lacks usable completion criteria

If `task-compliance-checker` repeatedly surfaces the same weakness:
- treat it as a real plan problem
- do not handwave it away
- route back to `plan` unless the orchestrator can explicitly resolve it during alignment

---

## Common Mistakes

Never:
- treat the approved plan as automatically execution-ready
- allow execution to define its own dependency order
- allow execution to decide its own verification standard
- preserve unsafe parallelism because it looks faster
- pass alignment while key tasks still require interpretation
- ignore repeated `task-compliance-checker` warnings

Always:
- check every task
- use `task-compliance-checker` to validate execution-readiness
- lock “done” conditions before code changes
- serialize when conflict confidence is low
- block early instead of paying for preventable execution mistakes
