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

Outcome contract: execution is successful only when each assigned task has artifact-backed completion evidence, required review gates have passed, verification has run, and the worktree is ready for an independent `final-review` without relying on executor narrative.

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

The executor completion report is an official evidence artifact for downstream reviewers. It must be concise, artifact-focused, and supported by changed paths, diagnostics status, and verification output rather than effort narrative.

At minimum report:
- completed tasks
- changed files
- verification run
- LSP diagnostics status
- whether execution-level final verification passed
- research used and unresolved unchecked scope, if any
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
- minimal evidence returned through `research-delegation`, if required

### `code-quality-reviewer` may receive only:
- approved spec
- approved plan
- the assigned task definition
- changed files or diff
- relevant verification output
- relevant LSP diagnostics summary
- the minimum surrounding code context needed to judge quality
- minimal evidence returned through `research-delegation`, if required

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

## Evidence Packet Behavior

Before dispatching each executor, the orchestrator should provide a task Evidence Packet when discovery is likely needed.

The task Evidence Packet should include:
- assigned files
- related tests
- call sites
- similar implementations
- project conventions
- impact radius
- external behavior, if relevant

The executor should use this packet first and use `research-delegation` directly for a bounded evidence request if broader discovery is still required.

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
- research results returned through `research-delegation`
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

## Conditional Product-Completeness Rule

For user-facing product, UI, or UX tasks, the executor must implement the product-complete outcome described by the approved spec and plan.

Do not satisfy such tasks with bare text, placeholder UI, disconnected components, or function presence when the approved artifacts imply an integrated user-visible result.

For those tasks, preserve scope while checking the planned user-visible path, relevant states, and existing UI/product patterns.

Do not apply this rule to internal, prompt, config-only, tooling-only, or backend-only work unless the approved spec or plan makes product completeness part of scope.

This rule does not weaken TDD, AST/LSP, review, or verification requirements.

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

## Reviewer Session Freshness Rule

`code-spec-reviewer` and `code-quality-reviewer` must use fresh reviewer sessions by default for each task review pass.

Do not reuse a reviewer session if it:
- received executor reasoning, effort narrative, trial-and-error history, or self-justification
- reviewed a prior rejected attempt and cannot cleanly judge the current artifact only
- proposed or performed implementation changes
- performed research or otherwise left the read-only reviewer role

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
13. Known exact paths may be read directly; if additional discovery or external reference evidence is needed, route it through `research-delegation`.
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

- `research-delegation`
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

Use the Evidence Packet provided by the orchestrator before deciding whether more research is needed.

Known exact path reads are not research.

Agents may directly inspect files, diffs, artifacts, exact known paths, and evidence explicitly provided in their assigned context.

If the Evidence Packet and assigned context are insufficient, and additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, call-site discovery, related-test discovery, impact-radius discovery, or external reference evidence is required, the agent must use `research-delegation` directly for a bounded evidence request.

Research delegation gathers evidence only. It does not let executors change batching, gates, final routing, or approved scope.

Mandatory research triggers:
- the agent would need to inspect more than 2 unprovided files to make the decision safely
- file ownership, related tests, call sites, import/export paths, or project conventions are unclear
- a claim about repository behavior is not supported by provided evidence
- external library, framework, API, or version behavior affects the decision
- PASS / APPROVED / READY / completion would rely on guessing

Research requests must state the evidence type, precise question, why the evidence is needed, and the judgment or action blocked until it arrives.

Use this boundary:
- Known exact path or provided artifact -> direct read / inspect
- Unknown scope, broad discovery, implementation tracing, project convention discovery, or external evidence -> use `research-delegation` directly with a bounded evidence request

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

## Phase 2 Artifact Lifecycle

This section defines the Phase 2 artifact lifecycle for workflow stages. Artifacts are stored under `docs/supercode/<work_id>/` and include `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/<task_id>.json`.

The public stage chain remains: `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`.

### Canonical Artifact Lifecycle Matrix

| Stage | Responsible actor | Artifact action | Minimum ledger event | State fields updated |
|---|---|---|---|---|
| `spec` | spec/orchestrator | create/update `evidence.md`; initialize artifact set when `work_id` is stable | `artifact_initialized` or `evidence_captured` | `work_id`, `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated` |
| `worktree` | worktree/orchestrator | carry artifact path convention into isolated worktree; documentation-only preservation guidance | `stage_transition` or `gate_decision` | `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated` |
| `plan` | planner/orchestrator | read/update `evidence.md`; write `plan.md`; update `state.json` snapshot; append events to `ledger.jsonl` | planning started or completed; stage transition or gate decision | `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated` |
| `pre-execute-alignment` | alignment/orchestrator | record execution order, blockers, and route; update `state.json` and append to `ledger.jsonl` | `alignment_decision` or `gate_decision` | `active_stage`, `active_gate_or_status`, `active_task`, `blockers`, `next_route`, `last_updated` |
| `execute` | executor/orchestrator | append task events to `ledger.jsonl`; write/update `verification/<task_id>.json`; update `state.json` from `todowrite` snapshot | `task_started`, `task_completed`, or `task_blocked` | `active_stage`, `active_gate_or_status`, `active_task`, `completed_tasks`, `blockers`, `next_route`, `last_updated` |
| `final-review` | final reviewer/orchestrator | inspect `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/<task_id>.json`; write `final-review.md`; may add reviewer outcome references | `final_review_decision` or `routed_return` | `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated` |
| `finish` | finisher/orchestrator | documentation-only preservation of artifacts; no new cleanup or copy runtime behavior | `finish_ready` or route to `finish` | `active_stage`, `active_gate_or_status`, `next_route`, `last_updated` |

### Execute Stage: Artifact Responsibilities

The `execute` stage has specific Phase 2 artifact responsibilities:

- **Task verification records**: For each task, the executor writes/updates `docs/supercode/<work_id>/verification/<task_id>.json`. The executor owns the commands, results, diagnostics_status, and unresolved_concerns fields. The reviewer_outcomes field remains nullable, null, empty, or pending until the reviewer-owned `final-review` stage supplies them.
- **State updates**: At task start, completion, and blockage, update `docs/supercode/<work_id>/state.json`. State snapshots must be derived from active workflow and `todowrite` reality rather than treated as authoritative on their own.
- **Ledger events**: Append task lifecycle events to `docs/supercode/<work_id>/ledger.jsonl`. The ledger is append-only: append one JSON object per line; do not rewrite, reorder, or delete historical lines during normal workflow progress.
- **Artifact validation**: When updating artifacts, update records first, then run targeted current-docs artifact validation. Command results included in the same task record should note a later validation command rather than claiming impossible final self-inclusion.
- **Terminal handoff validation**: Before handing off to `final-review`, the final repository and artifact state must be validated after the final artifact write. The final validation evidence may live in orchestration or final verification evidence and does not need to self-record in the same artifact if doing so would require another write.

### Canonical Field Definitions

#### state.json Canonical Fields

`docs/supercode/<work_id>/state.json` must include these canonical JSON keys:

| Canonical key | Meaning |
|---|---|
| `work_id` | Stable work item id |
| `active_stage` | Current public workflow stage |
| `active_gate_or_status` | Meaningful workflow gate/status string such as `planning`, `aligned`, `executing`, `blocked`, `verification_passed`, `final_review_pending`, or `routed_return` |
| `active_task` | Current task id or `null` when no task is active |
| `completed_tasks` | Array of task status objects; each entry includes `task_id`, `status`, and `verification_record_status` |
| `blockers` | Current blockers or empty array; each entry includes `summary` and `route_or_status` |
| `next_route` | Next workflow route/stage decision |
| `last_updated` | ISO-like timestamp string for the state snapshot update |

Each `completed_tasks` entry must include at least `task_id`, `status`, and `verification_record_status`. Use narrow task `status` values: `pending`, `in_progress`, `completed`, `blocked`, or `skipped`. Use narrow `verification_record_status` values: `verified`, `pending`, `not_applicable`, `pre_adoption_unavailable`, or `failed`. This prevents backfilled state from implying structured verification records exist for tasks unless files actually exist.

Each `blockers` entry must include at least `summary` and `route_or_status` so blockers are actionable rather than opaque strings.

#### ledger.jsonl Canonical Event Fields

Each line in `docs/supercode/<work_id>/ledger.jsonl` is one JSON object with these canonical keys:

| Canonical key | Meaning |
|---|---|
| `timestamp` | Event timestamp |
| `event_type` | Event type |
| `stage` | Public workflow stage associated with the event |
| `task_id` | Task id when applicable; nullable or omissible for stage-level events |
| `summary` | Short event summary |
| `artifact_refs` | Array of relevant artifact path references |

Minimum required `event_type` values: `artifact_initialized`, `evidence_captured`, `stage_transition`, `gate_decision`, `alignment_decision`, `task_started`, `task_completed`, `task_blocked`, `artifact_validation`, `final_review_decision`, `routed_return`, `finish_ready`.

The schema may allow additional strings for future workflow events.

#### verification/<task_id>.json Canonical Fields

`docs/supercode/<work_id>/verification/<task_id>.json` must include these canonical keys:

| Canonical key | Meaning |
|---|---|
| `task_id` | Task id for the record |
| `status` | Task verification status; uses narrow values `pending`, `in_progress`, `completed`, `blocked`, `skipped` |
| `commands` | Commands/checks run by executor; entries include command/check name, result status (`pass`, `fail`, `not_run`, `not_applicable`), summary, and timestamp when known |
| `results` | Results for commands/checks; entries include command/check name, result status (`pass`, `fail`, `not_run`, `not_applicable`), summary, and timestamp when known |
| `executor_evidence` | Executor-owned evidence and notes |
| `reviewer_outcomes` | Reviewer-owned outcomes; nullable, empty, or pending before reviewer action |
| `diagnostics_status` | Diagnostics/typecheck/lint status object including `status` and `summary` |
| `unresolved_concerns` | Remaining concerns or empty array |
| `record_status` | Provenance/status of this verification record; uses narrow values `verified`, `pending`, `not_applicable`, `pre_adoption_unavailable`, `failed` |

#### evidence.md Required Sections

`docs/supercode/<work_id>/evidence.md` must include these required sections:
- **Internal evidence**: Repository evidence supporting the workflow
- **External evidence**: External research, library docs, or third-party behavior evidence
- **Checked scope**: Evidence scope that has been directly verified
- **Unchecked scope**: Evidence scope where verification is missing or indirect
- **Unresolved uncertainty**: Risks or unknowns that could not be resolved through available evidence

### Non-Goals (Phase 2 Scope Boundary)

Phase 2 artifact/state features do not include: mailbox system, file ownership registry, per-worker worktree, parallel executor coordination beyond recording state/events, skill-embedded MCP runtime, hierarchical AGENTS.md, wiki/knowledge layer, or ultragoal mode. These Phase 3 and Phase 4 features must not be implemented as part of Phase 2.

---

## Phase 3-1 Execution Ownership Reference

This section is the canonical Phase 3-1 execution ownership reference for the execute stage. Ownership scope is a hard workflow policy: if a task modifies files outside its ownership allowance, task review or final review must fail. This is a hard workflow failure, not an advisory warning.

### Ownership Registry

- Artifact path: `docs/supercode/<work_id>/ownership.json`
- Canonical top-level fields: `work_id`, `entries`
- Canonical ownership entry fields: `entry_id`, `target`, `target_type`, `owner_task_id`, `mode`, `status`, `allowed_operations`, `policy_summary`, `conflict_notes`, `blocker_refs`
- `target_type` is `path` only for Phase 3-1; `glob` matching is deferred to Phase 3-2 and is not supported.
- Exact repo-relative path matching only; no directory-prefix expansion, no glob expansion.
- Canonical ownership modes: `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`
- Canonical ownership statuses: `active`, `released`, `blocked`, `violated`
- Canonical allowed operations: `read`, `write`, `append`, `create`, `delete`, `rename`
- Ownership mode/operation invariants are canonical per-entry constraints: `read_only` accepts only `read`; `exclusive_write` accepts `read`, `write`, `create`, `delete`, `rename` but not `append`; `shared_append` accepts only `read` and `append`; `orchestrator_owned` requires `owner_task_id: "orchestrator"`; `sequenced_write` accepts `read`, `write`, `create`, `delete`, `rename` but not `append` and requires serial batching.

### Ownership Violation

An ownership violation occurs when a task modifies a file outside its ownership allowance. Ownership violations are hard workflow failures: if a task modifies files outside its ownership allowance, task review or final review must fail. This is a workflow contract failure, not a soft warning.

### Ownership Evidence in Per-Task Verification Records

Each task must record `ownership_evidence` in its verification record at `docs/supercode/<work_id>/verification/<task_id>.json`. The executor must manually capture ownership evidence using these canonical fields:

- `task_start_changed_files`: array of path strings present in the worktree before the task began.
- `task_end_changed_files`: array of path strings present in the worktree after the task ended.
- `task_local_changed_files`: array of path strings attributed to the current task by the executor/reviewer.
- `preexisting_changed_files_touched`: array of path strings that were already changed before task start and were touched again by this task.
- `attribution_method`: one of `executor_edit_log`, `before_after_snapshot`, `reviewer_confirmed`, `pre_registry_bootstrap`, `not_applicable`.
- `attribution_limitations`: array of strings describing ambiguity in task-local attribution.
- `changed_files`: array of changed-file evidence entries, each with `path`, `operation`, `ownership_entry_id`, and `coverage_status`.
- `actual_changed_files_source`: string describing the manual source used to identify actual changed files.
- `actual_changed_files`: array of path strings from the inspected changed-file source.
- `notes`: array of strings for manual reviewer context.

If a task edits a file already present in `task_start_changed_files`, it must list that file in `preexisting_changed_files_touched`. Omitted or missing evidence for any `task_local_changed_files` or `preexisting_changed_files_touched` entry not present in `changed_files[]` is a task-local evidence failure, a blocker, or a route-back reason.

### Security Trigger Handling

Security triggers apply when the work changes code or workflow behavior that affects a security-sensitive risk surface. Routine executor mechanics — such as editing ordinary docs, tests, schemas, running tests/typecheck (test execution), or making non-security wording changes — do not automatically require security research unless they affect authentication_authorization, secrets_credentials_env_tokens, filesystem_mutation, shell_command_execution, git_operation, network_external_api, dependency_install_update, sandbox_worktree_permission_path, or generated_untrusted_input capabilities.

Security triggers are routed through existing research and review mechanisms, not through a new dedicated stage. Execute must handle security triggers without creating a new public stage.

Each task must record `security_trigger_evidence` in its verification record with canonical fields: `triggered_categories` (array of triggered security category values), `decision` (one of `not_triggered`, `triggered_evidence_recorded`, `route_back_required`), `evidence_refs` (array of evidence references), and `notes` (array of strings for security trigger context).

### Mailbox Records

The execute stage uses the durable mailbox artifact at `docs/supercode/<work_id>/mailbox.jsonl` for append-only, orchestrator-mediated durable records. The mailbox is not free agent-to-agent chat; runtime message broker infrastructure is explicitly excluded and not implemented. Executors may append `executor_handoff` and `status_update` messages to record durable handoffs, findings, blockers, and status changes.

### Phase 3-2 Deferrals

The following are Phase 3-2 deferred candidates and must not be implemented in Phase 3-1:

- automatic ownership validation against per-task changed files
- conflict preflight before executing parallel batches
- mailbox routing enforcement for unresolved messages and reviewer findings
- actual security reviewer/research execution subsystem
- multi-agent hyperplan challengers beyond checklist form
- structured machine-checkable completion matrix artifact
- optional AI-slop cleanup gate

Phase 3-1 exclusions: per-worker worktrees (excluded and deferred), OS-level or distributed locks (not implemented), full OMO Team Mode (excluded), raw ultrawork/ulw mode (excluded, not enabled), free agent-to-agent chat (excluded), runtime message broker infrastructure (not implemented). No new public workflow stage is introduced; the existing stages are used only.

## Common Mistakes

Never:
- treat parallelism as permission to skip review loops
- write production code before the failing test when TDD applies
- make broad structural code changes without AST/symbol understanding when available
- ignore LSP diagnostics after edits
- mark a task complete before it passes verification
- let reviewers change code
- let one task inherit another task's review result
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
