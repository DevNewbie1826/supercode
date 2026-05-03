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

## Evidence Packet Behavior

Before dispatching `planner`, the orchestrator should create a planning Evidence Packet when file targets, tests, conventions, dependencies, or external behavior may affect the plan.

The planning Evidence Packet should include:
- relevant files
- related tests
- similar implementations
- project conventions
- external constraints, if any
- unresolved uncertainty

Planner, checker, and challenger should use this packet before using `research-delegation` for bounded missing evidence.

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
