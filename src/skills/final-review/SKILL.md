---
name: final-review
description: Use after execute completes in an isolated worktree to independently verify fresh evidence, review the finished implementation against the spec and plan, and decide PASS/FAIL before finish.
---

## Purpose

The `final-review` skill independently verifies whether the completed work is actually ready to be treated as complete.

It runs after `execute` has completed implementation in the isolated worktree.

It does not implement code.
It does not continue planning.
It does not repair defects.

Its job is to:
- gather fresh verification evidence
- independently review the finished implementation
- compare the current worktree against the approved spec and plan
- save an official final review record
- issue a binary PASS / FAIL judgment
- route failures to the correct previous workflow stage

This skill is the final judgment gate before `finish`.

Outcome contract: final review passes only when a fresh verifier and fresh final reviewer can support PASS from current artifacts, current verification evidence, and the approved spec/plan; passing tests alone are necessary evidence when required, but never sufficient by themselves.

---

## Primary Agents

- `completion-verifier`
- `final-reviewer`

### completion-verifier
Runs fresh verification evidence for the completed implementation in the active worktree.

It must prove what the current worktree state actually passes right now.

It blocks completion claims that are not backed by fresh evidence.

### final-reviewer
Independently reviews the completed implementation against:
- the approved spec
- the approved plan
- the fresh verification evidence
- the current worktree state

It issues the final PASS / FAIL judgment.

Do not collapse these roles into one blended response.

Neither subagent may modify files.

---

## Phase 2 Artifact Lifecycle

The `final-review` stage inspects persisted Phase 2 artifacts as part of the evidence base and records reviewer-owned outcomes.

### Final-Review Stage: Artifact Responsibilities

- **Responsible actor**: final reviewer/orchestrator
- **Artifact action**: inspect `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/<task_id>.json`; write `final-review.md`; may add reviewer outcome references
- **Minimum ledger event**: `final_review_decision` or `routed_return`
- **State fields updated**: `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated`

The final reviewer must read persisted `docs/supercode/<work_id>/evidence.md`, `docs/supercode/<work_id>/state.json`, `docs/supercode/<work_id>/ledger.jsonl`, and task verification records under `docs/supercode/<work_id>/verification/<task_id>.json` as part of final-review evidence. This preserves reviewer isolation and final-review artifact behavior while leveraging durable Phase 2 artifacts.

The `reviewer_outcomes` field in task verification records is nullable, null, empty, or pending before final review. The final reviewer may populate or reference `reviewer_outcomes` during the review. The `record_status` field on verification records uses narrow values: `verified`, `pending`, `not_applicable`, `pre_adoption_unavailable`, `failed`.

Task status values in verification records use narrow values: `pending`, `in_progress`, `completed`, `blocked`, `skipped`. Command/result entry statuses use: `pass`, `fail`, `not_run`, `not_applicable`.

### Terminal Handoff Validation

Before the final-review handoff, the final repository and artifact state must be validated after the final artifact write. The execute stage is responsible for running this terminal validation before handing off. The final validation evidence may live in orchestration or final verification evidence and does not need to self-record in the same artifact if doing so would require another write. The final reviewer should confirm that terminal handoff validation was performed by inspecting available validation evidence.

---

## Position in the Workflow

This skill runs after:

1. `spec`
2. `worktree`
3. `plan`
4. `pre-execute-alignment`
5. `execute`

This skill runs before:

6. `finish`

If this skill returns PASS, the workflow may proceed to `finish`.

If this skill returns FAIL, the workflow must route backward according to the failure category.

---

## Worktree Assumption

`final-review` runs in the same isolated worktree used by `execute`.

Default expectation:
- implementation is complete in the worktree
- task-level execution loops have passed
- execution-level verification has already run
- the work has not yet been treated as finally complete
- merge / PR / final integration must not happen before this skill passes

Do not require the work to be merged before running final review.

This is a pre-finish final gate.

---

## Inputs

This skill requires:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- current isolated worktree state
- execution completion status
- execution-level verification result, if available

This skill must not rely on:
- executor self-reports
- implementation optimism
- stale verification results
- verbal “it should be done” claims
- reviewer summaries from execution as the sole evidence

Fresh evidence must be gathered during this skill.

---

## Output Artifact

This skill must save the final review record to:

`docs/supercode/<work_id>/final-review.md`

This file is the canonical final review artifact for the current work item.

Do not use a shared static review path.

---

## Review Record Requirements

`docs/supercode/<work_id>/final-review.md` must include:

- Work ID
- Verdict
- Spec Reference
- Plan Reference
- Fresh Verification Evidence Summary
- File / Artifact Inspection Summary
- Scope Completion Assessment
- Success Criteria Assessment
- Residual Issues
- Failure Category, if any
- Routing Recommendation
- Final Assessment

---

## Hard Rules

1. Do not claim completion without fresh verification evidence.
2. Do not trust earlier execution results without re-running or re-checking relevant evidence now.
3. Do not let `final-review` modify code.
4. Do not issue conditional passes.
5. Do not issue “mostly pass.”
6. Do not skip the saved review record.
7. Do not merge, create a PR, or treat the work as complete before final review has passed.
8. Do not rely on verbal summaries when the spec, plan, and worktree can be inspected directly.
9. Do not pass simply because execution agents said the work is done.
10. Do not route failures to the wrong layer just to avoid replanning.
11. Do not issue PASS based only on a green test command when scope completion, artifact inspection, or product-facing acceptance criteria remain unverified.

---

## Reviewer Isolation Rule

`completion-verifier` and `final-reviewer` must receive isolated, artifact-focused context.

They may receive:
- approved spec
- approved plan
- current worktree state
- fresh verification output gathered during this skill
- minimal repository or external evidence returned through `research-delegation`, if needed

They must not receive:
- executor reasoning
- executor effort narrative
- executor self-justification
- trial-and-error history
- execution chat history
- “why I implemented it this way” prose
- stale claims that are not supported by fresh evidence

They judge the current artifacts, not the effort spent producing them.

---

## Evidence Packet Behavior

Before dispatching `completion-verifier` or `final-reviewer`, the orchestrator should provide a final-review Evidence Packet when completion depends on repository inspection, call sites, related tests, external contracts, or version-specific behavior.

Final-review agents should use this packet first and use `research-delegation` directly for a bounded evidence request if the verdict still requires additional discovery.

---

## Core Principle

Evidence before completion claims.

The work is not complete because someone says it is complete.
The work is complete only if the current worktree survives fresh verification and independent review against the approved spec and plan.

---

## When to Use

Use this skill when:
- `execute` has finished implementation work
- execution-level verification has already been attempted
- a final independent completion judgment is needed
- merge, PR creation, or final handoff is being considered

Do not use this skill when:
- implementation is still in progress
- no approved spec exists
- no approved plan exists
- the work is still actively changing
- clarification or planning is still unresolved

---

## Sequential Thinking Guidance

If a sequential thinking tool is available, prefer using it when:
- PASS vs FAIL is not obvious
- spec, plan, and implementation appear partially aligned but not cleanly
- there are multiple possible failure categories
- the evidence is broad, cross-cutting, or internally conflicting

Use it to:
- separate evidence from interpretation
- test alternative verdict paths
- classify the failure category more reliably
- make the routing recommendation more defensible

Do not use it for simple final reviews where the verdict is already clear from direct evidence.

---

## Research Rule

Use the Evidence Packet provided by the orchestrator before deciding whether more research is needed.

Known exact path reads are not research.

Agents may directly inspect files, diffs, artifacts, exact known paths, and evidence explicitly provided in their assigned context.

If the Evidence Packet and assigned context are insufficient, and additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, call-site discovery, related-test discovery, impact-radius discovery, or external reference evidence is required, the agent must use `research-delegation` directly for a bounded evidence request.

Research delegation gathers evidence only. It does not let verifier or reviewer agents change gates, final verdict rules, routing authority, or approved scope.

Mandatory research triggers:
- the agent would need to inspect more than 2 unprovided files to make the decision safely
- file ownership, related tests, call sites, import/export paths, or project conventions are unclear
- a claim about repository behavior is not supported by provided evidence
- external library, framework, API, or version behavior affects the decision
- PASS / APPROVED / READY / completion would rely on guessing

Research requests must state the evidence type, precise question, why the evidence is needed, and the verdict or routing decision blocked until it arrives.

Use this boundary:
- Known exact path or provided artifact -> direct read / inspect
- Unknown scope, broad discovery, implementation tracing, project convention discovery, or external evidence -> use `research-delegation` directly with a bounded evidence request

---

### Phase 1: Completion Verification

Dispatch `completion-verifier` with isolated context:
- approved spec
- approved plan
- active worktree state
- relevant verification commands from the plan
- execution-level verification expectations

`completion-verifier` must:
- identify the commands or checks that prove the current completion claim
- run or re-check them fresh
- inspect exit codes and output
- determine whether the completion claim is supported by current evidence
- report incomplete, stale, unavailable, or failing evidence clearly

If verification fails or is incomplete:
- final review must fail
- do not proceed as if the work is complete

---

### Phase 1A: Product Completeness Check

Run this check only when the approved spec or plan includes user-facing product, UI, or UX work.

For those work items, fresh evidence must also cover:
- the intended user-visible path or interaction
- obvious empty, loading, error, and success states in scope
- accessibility or interaction expectations explicitly required by the spec or plan
- screenshots, browser checks, or equivalent UI evidence when the plan requires them

Do not apply this gate to backend-only, tooling-only, docs-only, or internal refactor work unless the approved artifacts make product completeness part of scope.

---

### Phase 2: Independent Final Review

Dispatch `final-reviewer` with isolated context:
- approved spec
- approved plan
- current worktree state
- fresh verification evidence

`final-reviewer` must inspect:
- implementation against the spec
- implementation against the plan
- scope completion
- out-of-scope changes
- success criteria coverage
- test / verification adequacy
- critical leftovers
- obvious regressions or incomplete artifacts
- product completeness only for user-facing product, UI, or UX work

`final-reviewer` must decide:
- PASS
- FAIL

No other verdict is allowed.

The PASS/FAIL record must be concise and evidence-backed: list the commands or inspections that support the verdict, explicitly name unchecked scope, and avoid repeating executor explanations.

---

## Final-Review Session Freshness Rule

`completion-verifier` and `final-reviewer` must use fresh sessions by default for each final-review run.

Do not reuse a verifier or final-reviewer session if it:
- participated in execution, implementation, planning, or earlier task reviews
- received executor reasoning, effort narrative, or stale completion claims as evidence
- performed research or otherwise left the read-only verification/review role
- handled a previous failed final-review run and cannot cleanly judge only the current artifacts and fresh evidence

---

### Phase 3: Save Review Record

Save the final review record to:

`docs/supercode/<work_id>/final-review.md`

This review record is an official workflow artifact.

It is not incidental runtime output.
It is not a disposable log.
It is part of the spec-to-plan-to-execution-to-review artifact chain.

---

### Phase 4: Final Judgment

End with exactly one binary result:

- PASS
- FAIL

If PASS:
- the work is ready for `finish`
- merge / PR / branch completion may be considered

If FAIL:
- do not treat the work as complete
- report the exact failed areas
- route backward according to the failure category

---

## Failure Categories

Use exactly one primary failure category.

### spec-failure
Use when:
- the underlying request is still ambiguous
- the spec does not support a valid final judgment
- success criteria are too weak or unstable
- the desired outcome was never actually clarified

Route to:
- `spec`

### plan-failure
Use when:
- the plan is insufficient
- the plan missed required work
- the plan decomposed work incorrectly
- the plan’s verification strategy was inadequate
- implementation followed the plan, but the plan was wrong or incomplete

Route to:
- `plan`

### implementation-failure
Use when:
- the implementation is incomplete
- behavior is wrong
- tests fail
- verification fails
- scope was violated
- code does not satisfy the approved plan/spec

Route to:
- `execute`

### unclear-root-cause
Use when:
- the failure is real
- the layer is not yet clear
- the evidence does not yet support spec vs plan vs implementation routing

Route to:
- `systematic-debugging`
- then back to `execute` or another stage based on debugging findings

---

## Completion Standard

`final-review` passes only when all of the following are true:
- fresh verification evidence supports the completion claim
- the implementation achieves the approved spec’s goal
- the implementation satisfies the approved plan
- in-scope work is complete
- out-of-scope boundaries are respected
- success criteria are supported
- no major incomplete artifacts remain
- no major unresolved regression risk remains
- the final review document has been saved

---

## Failure Routing

If FAIL, route to exactly one of:

- `spec`
- `plan`
- `execute`
- `systematic-debugging`

Routing policy:
- return to `execute` if implementation fixes are needed
- return to `plan` if plan structure, decomposition, or verification strategy is insufficient
- return to `spec` if the underlying requirement is still unstable
- return to `systematic-debugging` if the real layer of failure is unclear

When returning to `execute` for fixes:
- the failure should be treated as input to `systematic-debugging` when the cause is not obvious
- execution must remain in the same worktree by default
- later execution must re-enter required review loops

Do not guess the wrong layer of failure.

---

## Final Output

When this skill completes, report:

- final verdict: PASS / FAIL
- where `final-review.md` was saved
- what fresh verification evidence was used
- whether the work is ready for `finish`
- if FAIL, the exact routing target and reason

Conclude with exactly one of:

### PASS
Final review passed. The work is ready for `finish`.

### FAIL
Final review failed. The work is not ready to be treated as complete.
