---
name: plan
description: Use when an approved spec exists for a unique work_id in the isolated worktree and the workflow must produce a hardened, execution-ready plan.md through planner, plan-checker, and plan-challenger.
---

## Purpose

The `plan` skill turns the approved spec into a hardened, execution-ready plan.

Outcome contract: the stage is complete only when `docs/supercode/<work_id>/plan.md` gives `pre-execute-alignment` and `execute` concrete tasks, file targets, dependencies, and verification commands that can be followed without planner interpretation.

This skill is the planning gear in the workflow.
It is based on the same role split as crystallize:
- `planner` writes
- `plan-checker` blocks weak plans
- `plan-challenger` stress-tests and hardens plans

Its job is to:
- turn the approved spec into a concrete implementation plan
- pressure-test that plan through distinct review roles
- strengthen the plan until it is safe for downstream execution
- produce a plan strong enough for `pre-execute-alignment` and `execute`

It must not:
- implement code
- compensate for weak specs by inventing missing meaning
- split into multiple competing plan artifacts for the same work item
- add speculative abstractions, dependencies, documentation work, or product polish that the approved spec does not justify

---

## Primary Agents

- `planner`
- `plan-checker`
- `plan-challenger`

Responsibility split:

### planner
- writes and revises the plan
- may inspect repository context
- may use `research-delegation`
- may modify only the plan artifact

### plan-checker
- fully read-only
- execution-readiness gate
- blocking reviewer

### plan-challenger
- fully read-only
- risk and pressure reviewer
- exposes hidden dependencies, brittle sequencing, weak QA, and overengineering

Do not collapse these roles into one blended response.

---

## Input Contract

This skill expects:
- a stable `work_id`
- an approved spec at `docs/supercode/<work_id>/spec.md`
- a valid isolated worktree
- enough clarity to plan safely

The approved spec is the planning source of truth for:
- goal
- current state
- desired outcome
- scope
- constraints
- success criteria
- risks / unknowns
- accepted assumptions

If the spec is not planning-ready, do not force planning.
Return control to `spec`.

---

## Output Artifact

This skill must save the plan to:

`docs/supercode/<work_id>/plan.md`

This file is the authoritative execution plan artifact for the current work item.

Do not use a shared static path.

---

## Required Plan Structure

The plan must contain:

- Work ID
- Goal
- Source Spec
- Architecture / Design Strategy
- Scope
- Assumptions
- Source Spec Alignment
- Execution Policy
- File Structure
- File Responsibilities
- Task Sections
- QA Standard
- Revisions

Every task section must include:
- task id
- task name
- purpose
- files to create / modify / test
- concrete steps
- explicit QA / verification
- expected result
- dependency notes
- parallel eligibility

For user-facing product, UI, or UX work, task sections must also include executable integration and QA coverage for:
- the user-visible path or interaction
- relevant empty, loading, error, and success states when in scope
- alignment with existing UI/product patterns

Do not require UI/product completeness fields for internal, prompt, config-only, tooling-only, or backend-only work unless the approved spec includes them.

---

## Hard Rules

1. Do not implement code.
2. Do not produce vague “good sounding” plans.
3. Do not silently compensate for missing spec clarity by guessing.
4. Only `planner` may modify `docs/supercode/<work_id>/plan.md`.
5. `plan-checker` and `plan-challenger` are read-only.
6. `plan-checker` is the blocking gate.
7. `plan-challenger` is the strengthening pressure.
8. The plan must stay narrow and bounded.
9. The plan must include executable QA, not vague validation language.
10. Save the plan only to `docs/supercode/<work_id>/plan.md`.
11. Respect the approved spec; do not expand scope without explicit routed return.
12. Keep one evolving plan artifact per work item.
13. Routed returns to planning must update the same plan file under `Revisions`.
14. The plan must be usable by downstream batching and review without guesswork.

---

## When to Use

Use this skill when:
- `work_id` exists
- the approved spec exists at `docs/supercode/<work_id>/spec.md`
- the workflow is inside the isolated worktree
- the work is large enough to need structured planning
- the result is intended for downstream execution

Do not use this skill when:
- the spec is still vague, contradictory, unstable, or underspecified
- a validated plan already exists and no routed re-planning is required
- the work is so trivial that the workflow explicitly does not require a full plan

---

## Planning Readiness Check

Before dispatching any planning subagent, verify that the spec provides enough information to plan.

Minimum required planning inputs:
- goal
- bounded scope
- meaningful constraints
- current state
- desired outcome
- minimally usable success criteria

If any are missing in a way that blocks:
- milestone definition
- sequencing
- QA design
- file targeting
- risk reasoning

then:
- stop
- route back to `spec`
- state the exact missing input

Documented unknowns are acceptable only if they are bounded and do not block planning.

---

## Phase 2 Artifact Lifecycle

The `plan` stage reads persisted evidence and records planning state into Phase 2 artifacts.

### Plan Stage: Artifact Responsibilities

- **Responsible actor**: planner/orchestrator
- **Artifact action**: read/update `docs/supercode/<work_id>/evidence.md`; write `plan.md`; update `state.json` snapshot; append events to `ledger.jsonl`
- **Minimum ledger event**: `stage_transition` or `gate_decision`
- **State fields updated**: `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated`

The planner should read persisted `docs/supercode/<work_id>/evidence.md` when present and use it as the planning Evidence Packet source. The planning Evidence Packet should include internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty sections from the persisted evidence file.

Record planning state snapshot in `docs/supercode/<work_id>/state.json` using canonical JSON keys: `work_id`, `active_stage`, `active_gate_or_status`, `active_task`, `completed_tasks`, `blockers`, `next_route`, `last_updated`. Each `completed_tasks` entry must include `task_id`, `status`, and `verification_record_status`.

Append meaningful planning events to `docs/supercode/<work_id>/ledger.jsonl` using canonical event keys: `timestamp`, `event_type`, `stage`, `task_id`, `summary`, `artifact_refs`. Minimum required event types include `artifact_initialized`, `evidence_captured`, `stage_transition`, `gate_decision`, and `alignment_decision`.

---

## Evidence Packet Behavior

Before dispatching `planner`, the orchestrator should create a planning Evidence Packet when file targets, tests, conventions, dependencies, or external behavior may affect the plan.

The planning Evidence Packet should include:
- relevant files and call sites
- related tests
- similar implementations
- project conventions
- generated artifacts (snapshots, registries, indexes), if any
- external constraints, if any
- unresolved uncertainty

Planner, checker, and challenger should use this packet before using `research-delegation` for bounded missing evidence.

When the Evidence Packet is insufficient for safe planning, the planner must use bounded `research-delegation` or route back rather than plan on assumptions.

Plans must report checked scope, unchecked scope, and unresolved uncertainty when material to execution. Repository reality that requires evidence includes file targets, call sites, related tests, conventions, generated artifacts, import/export paths, and external behavior when those facts materially affect task boundaries. Checked scope identifies what evidence supports directly. Unchecked scope identifies where evidence is missing or indirect. Unresolved uncertainty records risks that planning could not resolve through available evidence.

Keep evidence requirements proportional for trivial changes. Do not require broad research when the plan is narrow and the affected area is well-understood.

---

## Context Gathering Rules

Before dispatching `planner`, gather enough context to avoid speculative planning.

Possible context sources:
- repository structure
- existing internal patterns
- current test conventions
- relevant configs
- project docs
- external dependency behavior

Use `research-delegation` whenever repository or external evidence is needed.

Do not gather context endlessly.
Gather enough to produce a grounded plan.

Stop context gathering when the evidence supports task boundaries, file targets, dependency order, and executable QA. If two focused research rounds do not resolve a planning blocker, route back to `spec` or record the unresolved risk instead of widening scope.

---

## Sequential Thinking Guidance

If a sequential thinking tool is available, prefer using it when:
- there are multiple plausible decompositions
- hidden dependencies span files or layers
- sequencing is non-obvious
- there are meaningful tradeoffs between alternative approaches
- checker or challenger feedback reveals interacting weaknesses

Use it to:
- compare plan structures
- reason through dependency consequences
- refine sequencing
- tighten task boundaries

Do not use it by default for small or already obvious plans.

---

## Workflow

### Phase 0: Intake
Read the approved spec at `docs/supercode/<work_id>/spec.md`.

If the spec is not planning-ready:
- stop
- route back to `spec`

### Phase 1: Readiness Check
Verify:
- goal
- scope
- constraints
- current state
- desired outcome
- success criteria

If any are missing in a planning-blocking way:
- stop
- route back to `spec`
- state the exact missing input

### Phase 2: Gather Planning Context
Gather the minimum context required to avoid guessing.

If needed, use `research-delegation`.

### Phase 3: Planner Draft
Dispatch `planner` with:
- the approved spec
- gathered context
- required plan structure
- instruction to write only `docs/supercode/<work_id>/plan.md`

### Phase 4: Plan-Checker Review
Dispatch `plan-checker` with artifact-focused review input only:
- the approved spec
- the current plan
- the minimum necessary evidence required to judge readiness

Do not pass planner reasoning, planner narrative, or revision self-justification.

`plan-checker` must return:
- `[APPROVED]` or `[REJECTED]`
- short summary
- blocking issues only if rejected

### Phase 5: Plan-Challenger Review
Dispatch `plan-challenger` with artifact-focused review input only:
- the approved spec
- the current plan
- the minimum necessary evidence required to pressure-test the plan

Do not pass planner reasoning, planner narrative, or revision self-justification.

`plan-challenger` returns:
- overall assessment
- main risks
- tightening suggestions

### Phase 6: Planner Revision
If `plan-checker` rejects the plan, or `plan-challenger` surfaces meaningful weaknesses:
- dispatch `planner` again
- revise the same plan artifact
- fix checker blockers
- address major challenger risks
- preserve alignment with the spec
- maintain scope discipline

### Phase 7: Re-Validation Loop
Run `plan-checker` again on the revised plan.

Repeat until:
- `plan-checker` returns `[APPROVED]`
- no blocking issues remain
- major challenger risks are addressed or explicitly documented
- the plan is ready for execution

Do not loop forever for perfection.

### Phase 8: Finalization
Once the plan is strong enough:
- save the final plan to `docs/supercode/<work_id>/plan.md`
- report the save path
- hand off to `pre-execute-alignment`

This skill does not create the worktree and does not implement the plan.

---

## Reviewer Session Freshness Rule

`plan-checker` and `plan-challenger` must use fresh review sessions by default for each independent review pass.

Do not reuse a checker or challenger session if it:
- helped write or revise the plan
- received planner reasoning, revision narrative, or self-justification
- reviewed a rejected revision and cannot cleanly judge the current plan artifact only
- performed research or otherwise left the read-only reviewer role

---

## Reviewer Isolation Rule

`plan-checker` and `plan-challenger` must review from artifact-focused context only.

They may receive:
- approved spec
- current plan artifact
- minimal necessary repository or external evidence gathered through `research-delegation`

They must not receive:
- planner reasoning chains
- planner self-justification
- verbose revision narrative
- “why I planned it this way” prose beyond what is already embodied in the plan artifact

Reviewers judge the plan artifact, not the planner’s effort.

---

## Review Criteria

### plan-checker must block for:
- missing or weak alignment to the approved spec
- vague or non-actionable task definitions
- tasks missing file targets
- tasks missing meaningful QA
- weak or missing verification strategy
- hidden hand-wavy sequencing
- work that is too large or too diffuse for safe execution
- fake certainty over unresolved requirements

### plan-challenger should pressure-test:
- overengineering
- brittle assumptions
- hidden cross-task dependencies
- unrealistic task ordering
- weak rollback or verification thinking
- missing handling of obvious risk
- unnecessary complexity compared to the actual spec needs

---

## Completion Gate

The `plan` skill is complete only when:
- `work_id` exists
- `docs/supercode/<work_id>/plan.md` exists
- `plan-checker` approves the plan
- no blocking issues remain
- the plan is execution-ready
- major challenger risks are addressed or explicitly documented
- the plan is narrow enough for downstream batching and execution

---

## Handoff to Next Skill

On success, hand off to `pre-execute-alignment` with:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- accepted risks
- known caveats
- planning assumptions that remain in force

---

## Failure Handling

If planning repeatedly fails because the spec is too weak:
- stop
- route back to `spec`
- specify the exact missing or unstable inputs

If planning fails because repository or dependency behavior is unclear:
- use `research-delegation`
- gather the missing evidence
- resume planning only after that evidence is available

If planning returns after a later failure:
- revise the existing `docs/supercode/<work_id>/plan.md`
- record the reason under `Revisions`
- re-run checker and challenger
- do not create a second plan file for the same work item

---

## Hyperplan-Lite Challenge Checklist

The `plan-challenger` must evaluate the plan from multiple perspectives to expose hidden weaknesses. This is a lightweight multi-perspective challenge requirement that strengthens `plan-challenger` behavior without adding new public stages.

Required challenge perspectives:

- **Scope creep / non-goal challenge**: verify the plan does not expand beyond the approved spec; flag any scope creep or non-goal work.
- **Dependency and sequencing challenge**: verify task dependencies are real and ordering is sound; flag missing or incorrect dependency edges.
- **Verification adequacy challenge**: verify each task has meaningful, executable verification; flag vague or untestable QA expectations.
- **Concurrency and ownership challenge**: verify parallel claims are safe considering file ownership and write surfaces; flag optimistic parallelism.
- **Security/risk trigger challenge**: verify whether the plan changes code or behavior that affects a security-sensitive capability; flag missing security trigger considerations.
- **Completion matrix challenge**: verify the plan maps each spec success criterion to tasks, evidence, and status; flag criteria without task coverage.

The plan artifact must record challenge findings and how major findings were resolved or accepted. The strict-completion matrix must tie spec success criteria to plan tasks and verification evidence without creating a new public stage. The strict-completion matrix uses canonical statuses: `pending`, `satisfied`, `blocked`, `not_applicable`. Matrix rows are limited to approved spec success criteria only; execution and final-review must not add new completion criteria. The strict-completion matrix must not expand scope beyond the approved spec and plan (not raw ultrawork or ulw mode). Phase 3-1 records the matrix as a markdown table inside the plan artifact and final-review artifact/section. A separate structured machine-checkable completion matrix artifact is deferred to Phase 3-2. After plan approval, `plan.md` is read-only execution input; execution must not update strict-completion statuses/evidence in `plan.md`. Task evidence belongs in `verification/<task_id>.json` and final status/evidence belongs in the final-review artifact/section.

---

## Phase 3-1 Coordination Reference

This section is the canonical Phase 3-1 coordination reference for the plan stage. It lists exact field names, enum values, statuses, and invariant concepts that downstream skill docs and tests must align with.

### Mailbox Artifact

- Artifact path: `docs/supercode/<work_id>/mailbox.jsonl`
- Lifecycle: append-only, orchestrator-mediated durable records. Existing records are not rewritten; resolution is represented by appending a follow-up record with the same `thread_id` and an updated `status`. Free agent-to-agent chat and runtime message broker infrastructure are explicitly excluded and not implemented.
- Canonical mailbox fields: `message_id`, `thread_id`, `timestamp`, `sender`, `recipient`, `message_type`, `stage`, `task_id`, `summary`, `artifact_refs`, `status`
- Canonical `message_type` values: `research_request`, `research_response`, `executor_handoff`, `reviewer_finding`, `blocker`, `route_back_reason`, `final_review_evidence_gap`, `status_update`
- Canonical `status` values: `open`, `acknowledged`, `resolved`, `blocked`, `superseded`

### Ownership Registry Artifact

- Artifact path: `docs/supercode/<work_id>/ownership.json`
- Canonical top-level fields: `work_id`, `entries`
- Canonical ownership entry fields: `entry_id`, `target`, `target_type`, `owner_task_id`, `mode`, `status`, `allowed_operations`, `policy_summary`, `conflict_notes`, `blocker_refs`
- `target_type` is `path` only for Phase 3-1; `glob` matching is deferred to Phase 3-2 and is not accepted by Phase 3-1 helper schemas.
- Canonical ownership modes: `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`
- Canonical ownership statuses: `active`, `released`, `blocked`, `violated`
- Canonical allowed operations: `read`, `write`, `append`, `create`, `delete`, `rename`
- Ownership mode/operation invariants are canonical per-entry constraints: `read_only` accepts only `read`; `exclusive_write` accepts `read`, `write`, `create`, `delete`, `rename` but not `append`; `shared_append` accepts only `read` and `append`; `orchestrator_owned` requires `owner_task_id: "orchestrator"`; `sequenced_write` accepts `read`, `write`, `create`, `delete`, `rename` but not `append` and requires serial batching. Invalid mode/operation combinations must fail manual registry/batch workflow checks.

### Ownership Evidence

- `ownership_evidence` is recorded in per-task verification records at `docs/supercode/<work_id>/verification/<task_id>.json`.
- Canonical `ownership_evidence` fields: `task_start_changed_files`, `task_end_changed_files`, `task_local_changed_files`, `preexisting_changed_files_touched`, `attribution_method`, `attribution_limitations`, `changed_files`, `actual_changed_files_source`, `actual_changed_files`, `notes`
- Canonical `attribution_method` values: `executor_edit_log`, `before_after_snapshot`, `reviewer_confirmed`, `pre_registry_bootstrap`, `not_applicable`
- Canonical `changed_files[]` entry fields: `path`, `operation`, `ownership_entry_id`, `coverage_status`
- Canonical `coverage_status` values: `covered`, `uncovered`, `conflict`, `not_applicable`

### Security Trigger Evidence

- `security_trigger_evidence` is recorded in per-task verification records.
- Canonical `security_trigger_evidence` fields: `triggered_categories`, `decision`, `evidence_refs`, `notes`
- Canonical `SecurityTriggerCategorySchema` values: `authentication_authorization`, `secrets_credentials_env_tokens`, `filesystem_mutation`, `shell_command_execution`, `git_operation`, `network_external_api`, `dependency_install_update`, `sandbox_worktree_permission_path`, `generated_untrusted_input`
- Canonical `security_trigger_evidence.decision` values: `not_triggered`, `triggered_evidence_recorded`, `route_back_required`

### Strict-Completion Matrix

- Canonical matrix statuses: `pending`, `satisfied`, `blocked`, `not_applicable`
- Matrix rows are limited to approved spec success criteria only.
- Phase 3-1 records the matrix as a markdown table in the plan and final-review. A separate machine-checkable artifact is deferred to Phase 3-2.

### Phase 3-2 Deferred Candidates

The following are documented as Phase 3-2 roadmap items and must not be implemented in Phase 3-1:

- automatic ownership validation against per-task changed files
- conflict preflight before executing parallel batches
- mailbox routing enforcement for unresolved messages and reviewer findings
- actual security reviewer/research execution subsystem
- multi-agent hyperplan challengers beyond checklist form
- structured machine-checkable completion matrix artifact
- optional AI-slop cleanup gate

### Phase 3-1 Exclusions

Phase 3-1 must not implement and does not enable:

- per-worker worktrees (explicitly excluded and deferred)
- OS-level or distributed locks (not implemented)
- full OMO Team Mode (excluded)
- raw ultrawork/ulw mode (excluded, not enabled)
- free agent-to-agent chat (excluded)
- runtime message broker infrastructure (not implemented)
- no new public workflow stage is introduced; the public stage chain remains: `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`
