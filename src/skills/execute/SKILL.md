---
name: execute
description: Use when an approved plan and execution alignment exist and the workflow must implement tasks with maximum safe parallelism while forcing every task through TDD, AST/LSP checks, spec review, quality review, and verification.
---

## Purpose

The `execute` skill implements the approved plan inside the prepared isolated worktree.

Its job is to:
- execute the aligned task set
- maximize safe parallelism where allowed
- require TDD discipline for behavior-changing work
- require AST/LSP-aware implementation discipline when available
- force every task through the implementation-and-review loop
- prevent downstream completion claims without passing verification
- run an execution-level final verification gate before handoff to `final-review`

This skill is the execution engine of the workflow.

---

## Primary Agents

- `executor`
- `code-spec-reviewer`
- `code-quality-reviewer`

The orchestrator owns the stage and dispatches these agents.

### executor
- write-enabled
- the only agent allowed to modify code
- executes one assigned task at a time
- follows task boundaries exactly
- must use `test-driven-development` for behavior-changing implementation
- must use AST-aware and LSP-aware tooling when available

### code-spec-reviewer
- fully read-only
- checks whether the implemented task matches the approved spec and plan
- blocks progression if task compliance fails
- must review from isolated artifact-focused context

### code-quality-reviewer
- fully read-only
- checks implementation quality after spec compliance passes
- blocks progression if code quality is not acceptable
- must review from isolated artifact-focused context

Do not collapse these roles into one blended response.

---

## Inputs

This skill requires:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- active isolated worktree
- execution alignment package from `pre-execute-alignment`
- task execution order
- execution batches
- per-task verification expectations
- dependency constraints
- conflict warnings

---

## Output

This skill must produce:
- completed implementation for the active task set
- per-task loop results
- AST/LSP check status for changed files when available
- execution-level final verification result
- a status suitable for handoff to `final-review`

At minimum report:
- completed tasks
- changed files
- verification run
- LSP diagnostics status
- whether execution-level final verification passed
- any remaining concerns worth surfacing

---

## Core Principle

Parallelism is allowed at the batch level.

Review loops are mandatory at the task level.

TDD is mandatory for behavior-changing work.

AST/LSP checks are required when available.

That means:
- multiple tasks may execute in parallel only if alignment marked them safe
- each task must still pass its own full loop
- behavior-changing work must go through `test-driven-development`
- structural code changes should use AST-aware inspection or edits when available
- changed files should be checked with LSP diagnostics when available
- no task may be considered complete until it has passed all required review and verification gates
- no batch may advance incomplete tasks by averaging or pooling review results

Parallel execution is a throughput optimization.
It is never a substitute for task-level correctness.

---


## AST and LSP Ownership

AST/LSP work belongs to `executor`.

The orchestrator must require each executor to use AST/LSP-aware tools when available and to report diagnostics status.

The orchestrator does not run LSP diagnostics directly during normal execution.

The executor is responsible for:
- AST/symbol-aware inspection before structural edits
- LSP diagnostics after code edits
- resolving or classifying diagnostics before review
- reporting diagnostics status in the task completion report

Reviewers may use the diagnostics summary as evidence, but they do not run or fix diagnostics.

## Reviewer Isolation Rule

Reviewers must not receive executor narrative context.

### `code-spec-reviewer` may receive only:
- approved spec
- approved plan
- the assigned task definition
- changed files or diff
- relevant verification output
- relevant LSP diagnostics summary
- the minimum surrounding code context needed to judge compliance
- minimal evidence returned through `orchestrator-mediated-research`, if required

### `code-quality-reviewer` may receive only:
- approved spec
- approved plan
- the assigned task definition
- changed files or diff
- relevant verification output
- relevant LSP diagnostics summary
- the minimum surrounding code context needed to judge quality
- minimal evidence returned through `orchestrator-mediated-research`, if required

### Reviewers must not receive:
- executor reasoning
- executor self-justification
- executor effort narrative
- trial-and-error history
- “why I did it this way” prose
- previous failed attempts unless the orchestrator provides a minimal, necessary issue statement
- prior reviewer summaries unless the orchestrator explicitly decides a narrow subset is required

Reviewers judge artifacts, not effort.

---

## Executor Context Rule

The `executor` may receive richer task context than reviewers.

The executor may receive:
- approved spec
- approved plan
- aligned task definition
- relevant file targets
- dependency context
- verification expectations
- conflict warnings
- research results returned through `orchestrator-mediated-research`
- relevant prior failure findings for the same task
- review findings that must be addressed

This is allowed because the executor is producing changes, not judging them.

---

## TDD Requirement

For any behavior-changing task, the executor must use the `test-driven-development` skill.

Behavior-changing work includes:
- new features
- bug fixes
- refactors that preserve behavior
- regression fixes
- changes after review feedback when behavior or production code is affected

The executor must follow:
1. RED
2. VERIFY RED
3. GREEN
4. VERIFY GREEN
5. REFACTOR
6. VERIFY STILL GREEN

If TDD is not practical for a task, the executor must explicitly report why.
The orchestrator decides whether the exception is acceptable.

If mocks, stubs, spies, fakes, fixtures, or test utilities are involved, the executor must also follow the `testing-anti-patterns.md` reference from the `test-driven-development` skill.

---

## AST and LSP Requirement

The executor must actively use AST-aware and LSP-aware tools when available.

Before editing:
- use AST or symbol-aware navigation to understand definitions, references, call sites, and structural relationships when relevant
- prefer structural understanding over blind text replacement
- use LSP hover, definition, references, symbol lookup, or type information when available
- inspect relevant call sites before changing public behavior or shared interfaces

When editing:
- prefer AST-aware edits for structural code changes when available
- avoid broad regex or blind string replacement when the change depends on syntax, symbols, types, imports, or call structure
- keep edits scoped to the assigned task
- avoid large mechanical rewrites unless explicitly required by the task

After editing:
- require the executor to run LSP diagnostics for changed files or affected workspace scope when available
- resolve syntax errors, type errors, missing imports, unresolved symbols, and obvious diagnostics before claiming completion
- if diagnostics remain, explicitly report whether they are pre-existing, unrelated, non-blocking, or blocking
- do not send work to review while new blocking LSP diagnostics remain unresolved

This requirement is intended to catch obvious syntax, type, import, and symbol errors before review.

---

## Required Loop

Every task must pass this exact loop:

1. `executor`
2. TDD validation when behavior or production code is affected
3. AST/LSP inspection and diagnostics check when available
4. `code-spec-reviewer`
5. if spec review fails -> return findings to `executor`
6. once spec review passes -> `code-quality-reviewer`
7. if quality review fails -> return findings to `executor`
8. once both reviews pass -> run task verification if not already completed
9. mark the task complete only after verification succeeds

Do not move a task to complete status before this loop passes.

---

## Executor Reuse Rule

By default, the same `executor` session continues the task across revisions.

Do not replace the executor automatically after every failed review.

The orchestrator may replace the current executor with a fresh executor only when:
- the same mistake is repeated
- review findings are repeatedly misunderstood
- the loop becomes non-productive
- the executor context appears polluted or stuck
- repeated retries are degrading rather than improving output

Fresh executor replacement is an escalation tool, not the default behavior.

---

## Hard Rules

1. Only `executor` may modify code.
2. `code-spec-reviewer` is read-only.
3. `code-quality-reviewer` is read-only.
4. Never skip TDD for behavior-changing work unless the exception is explicitly accepted.
5. Never skip AST/LSP checks when available.
6. Never skip spec review.
7. Never skip code quality review.
8. Never skip task verification.
9. Never let one task’s success justify another task’s incomplete state.
10. Never let reviewers modify files.
11. Never bypass the aligned execution batches.
12. If a bug, regression, failing test, or unexpected behavior appears, route through `systematic-debugging` before attempting a fix.
13. Known exact paths may be read directly; if additional discovery or external reference evidence is needed, route it through `orchestrator-mediated-research`.
14. Do not begin execution in the main working tree.
15. Require the isolated worktree prepared by `worktree`.
16. Respect the approved spec and approved plan. Do not silently expand scope.

---

## Parallel Execution Policy

Use the execution batches produced by `pre-execute-alignment`.

Rules:
- tasks may run in parallel only within an approved batch
- default max concurrency is 3
- if the user explicitly requested 5, max concurrency becomes 5
- if conflict risk appears during execution, the orchestrator may reduce concurrency
- do not invent new parallelism not already justified by alignment

A task may not run in parallel if:
- it depends on unfinished output from another task
- it touches conflicting files or conflict surfaces
- alignment marked it serial-only
- execution reveals hidden coupling that invalidates the earlier batch assumption

When in doubt, serialize.

---

## Supporting Skills

This skill must integrate these supporting skills:

- `todo-sync`
  - required before execution begins
  - required after each completed task
  - required at true execution completion

- `test-driven-development`
  - required for behavior-changing work
  - required before production code changes
  - required for regression fixes and refactors when practical

- `systematic-debugging`
  - required before proposing or attempting fixes for bugs, failed tests, regressions, or unexpected behavior discovered during execution

- `orchestrator-mediated-research`
  - required whenever repository or external evidence is needed

These skills constrain execution.
They do not replace it.

---

## Pre-Execution Requirements

Before any task begins, confirm:
- the active workspace is the prepared isolated worktree
- the approved spec exists
- the approved plan exists
- the alignment package exists
- execution batches are defined
- per-task verification expectations are defined

If any of these are missing in a way that blocks execution:
- stop
- report the blocker clearly
- do not begin implementation

---

## Workflow

### Phase 0: Intake
Read:
- `docs/supercode/<work_id>/spec.md`
- `docs/supercode/<work_id>/plan.md`
- the alignment package

Confirm that the active workspace is the isolated worktree.

### Phase 1: Initialize Tracking
Before the first task:
1. invoke `todo-sync`
2. confirm batch order
3. confirm task order inside each serial section
4. confirm the active verification expectations

### Phase 2: Batch Execution
For each execution batch:

#### If serial
Run tasks in order.

#### If parallel-safe
Dispatch up to the allowed concurrency limit.

For every task, the orchestrator must independently run the required task loop.
Parallelism never removes the per-task loop requirement.

### Phase 3: Task Loop
For each task, run this exact sequence:

1. dispatch `executor` with:
   - assigned task
   - task goal
   - relevant file targets
   - verification expectations
   - relevant constraints
   - dependency context
   - required use of `test-driven-development` when applicable
   - required use of AST/LSP tools when available

2. executor creates and maintains task-level todo state through `todo-sync`

3. executor applies `test-driven-development` for behavior-changing work

4. executor uses AST/LSP-aware tools when available:
   - before editing for symbol/context understanding
   - during editing for structural changes
   - after editing for diagnostics

5. when executor reports completion or partial completion:
   - ensure LSP diagnostics status is reported when available
   - dispatch `code-spec-reviewer` with isolated review context only

6. if spec review fails:
   - send findings back to `executor`
   - re-run the task
   - do not proceed to quality review yet

7. once spec review passes:
   - dispatch `code-quality-reviewer` with isolated review context only

8. if quality review fails:
   - send findings back to `executor`
   - re-run the task
   - re-run spec review if needed
   - then re-run quality review

9. once both reviews pass:
   - run the task verification expectation
   - if verification fails, route through `systematic-debugging`
   - apply targeted fixes through `executor`
   - re-run the required review gates

10. only then mark the task complete

11. invoke `todo-sync`

### Phase 4: Failure and Debug Routing
If any of the following occurs:
- verification fails
- LSP diagnostics reveal new blocking errors
- a regression appears
- a test fails unexpectedly
- runtime behavior contradicts expectations
- the integration result is inconsistent
- a supposedly parallel-safe batch reveals hidden conflict

then:
1. invoke `systematic-debugging`
2. narrow the failure mode
3. identify the likely cause
4. return findings to `executor`
5. re-run the affected review gates
6. if needed, reduce batch concurrency or serialize remaining work

Do not jump straight from failure to code changes.

### Phase 5: Execution-Level Final Verification Gate
After all tasks are complete, run an execution-level final gate.

This gate must verify:
- the highest-level verification command from the plan
- the relevant test or regression suite
- review executor-reported LSP diagnostics status for changed files or affected workspace scope when available
- the final success criteria implied by execution scope
- that no obvious implementation leftovers remain

If the final gate fails:
1. invoke `systematic-debugging`
2. diagnose the likely integration or execution gap
3. apply a targeted fix through `executor`
4. re-run the relevant review gates
5. re-run the final verification gate

Do not retry indefinitely.
If the final gate fails repeatedly, escalate clearly.

### Phase 6: Finalize Tracking and Handoff
When implementation work and execution-level verification are complete:
1. invoke `todo-sync`
2. report completed tasks, changed files, LSP diagnostics status, and verification status
3. hand off to `final-review`

This skill does not make the final completion judgment for the work item.

---

## Research Rule

Known exact path reads are not research.

Agents may directly inspect files, diffs, artifacts, and evidence explicitly provided in their assigned context.

If additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, or external reference evidence is needed beyond provided context, use `orchestrator-mediated-research`.

When used by a subagent, `orchestrator-mediated-research` returns a structured `<needs_research>` XML handoff for the orchestrator to fulfill.

Required handoff shape:

```xml
<needs_research>
  <type>internal|external|both</type>
  <question>[precise research question]</question>
  <why_needed>[why this evidence is required to continue safely]</why_needed>
  <current_blocker>[the judgment or action that cannot be completed without this evidence]</current_blocker>
</needs_research>
```

Do not guess when required evidence is missing.

## Completion Standard

The `execute` skill is complete only when:
- all in-scope tasks were implemented
- every behavior-changing task used `test-driven-development`, or had an explicitly accepted exception
- changed files were inspected with AST/LSP-aware tools when relevant and available
- LSP diagnostics were checked for changed files or affected workspace scope when available
- no new blocking LSP diagnostics remain unaddressed
- every task passed the required executor -> spec review -> quality review -> verification loop
- required task verification was run
- `todo-sync` stayed current
- execution-level final verification passed
- implementation remained within approved scope
- no major unresolved blocker remains
- the result is ready for `final-review`

---

## Failure Routing

Stop and report clearly if:
- the isolated worktree is missing
- the plan is not executable
- the alignment package is missing or invalid
- required verification cannot be run
- LSP diagnostics reveal new blocking errors that cannot be resolved in scope
- repeated review loops do not converge
- execution-level final verification repeatedly fails
- implementation would require plan or spec changes beyond execution scope

If the blocker is a planning problem, return to `plan`.
If the blocker is a spec problem, return to `spec`.
If the blocker is an execution/debug problem, use `systematic-debugging`.

---

## Common Mistakes

Never:
- treat parallelism as permission to skip review loops
- write production code before the failing test when TDD applies
- make broad structural code changes without AST/symbol understanding when available
- ignore LSP diagnostics after edits
- mark a task complete before it passes verification
- let reviewers change code
- let one task inherit another task’s review result
- continue in optimistic parallel mode after hidden conflicts appear
- fix failures without first routing through `systematic-debugging`

Always:
- maximize safe parallelism only where alignment allows it
- preserve the per-task mandatory review loop
- enforce `test-driven-development` for behavior-changing work
- use AST/LSP-aware tooling when available
- keep reviewer context isolated from executor narrative
- reuse the same executor by default unless replacement is warranted
- use fresh executor replacement only as an escalation tool
- keep tracking synchronized
- run the final execution-level verification gate before handoff
