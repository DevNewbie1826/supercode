---
name: systematic-debugging
description: Use when a failure is real but the root cause is unclear, especially after final-review or execute finds failing tests, regressions, flaky behavior, or unexpected runtime behavior.
---

## Purpose

The `systematic-debugging` skill identifies the most likely root cause of a real failure before execution attempts another fix.

Its job is to:
- prevent random fix attempts
- separate symptoms from causes
- gather evidence before changing code
- narrow the failure to the smallest credible causal path
- decide whether the issue needs a direct fix, defense-in-depth, condition-based waiting, or further routing
- return clear remediation guidance to `execute`

This skill is a failure-recovery skill.
It is not part of the normal happy path.

---

## Primary Agent

- `systematic-debugger`

The `systematic-debugger` owns the investigation.

The agent is read-only by default.

It must not:
- implement speculative fixes
- edit production code
- rewrite spec
- rewrite plan
- bypass evidence gathering
- turn debugging into broad refactoring

---

## Reference Documents

When using this skill, the `systematic-debugger` must reference:

- `root-cause-tracing.md`
- `defense-in-depth.md`
- `condition-based-waiting.md`

Use them as follows:

### root-cause-tracing.md
Use to move from visible symptom to the smallest credible causal path.

### defense-in-depth.md
Use to decide whether the issue needs more than a direct fix, such as validation, contract enforcement, observability, safer fallback, or regression protection.

### condition-based-waiting.md
Use when the failure may involve timing, readiness, async behavior, eventual consistency, race conditions, flaky tests, or unreliable sleeps.

---

## When to Use

Use this skill when:
- final-review returns `unclear-root-cause`
- execute hits a failing test and the cause is not obvious
- verification fails after implementation
- a regression appears
- behavior is flaky or intermittent
- runtime behavior contradicts the expected result
- a supposedly parallel-safe batch reveals hidden coupling
- repeated executor attempts are not converging
- a bug fix would otherwise be speculative

Do not use this skill when:
- the problem is already clearly a spec problem
- the problem is already clearly a plan problem
- the implementation defect is obvious and directly actionable
- the issue is a simple syntax or formatting mistake with an obvious fix
- there is no concrete failure to investigate

---

## Inputs

This skill may receive:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- current isolated worktree state
- failing command or test output
- final-review findings, if applicable
- execution failure summary
- changed files or relevant diff
- minimum code context needed to investigate
- prior returned research evidence, if relevant

Do not rely on executor effort narrative.
Use artifacts and evidence.

---

## Output

This skill must produce a debugging result containing:

- failure summary
- reliable reproduction status
- observed facts
- root-cause candidates
- rejected hypotheses
- narrowed root-cause path
- timing / readiness assessment
- defense-in-depth implications
- recommended execute focus
- routing recommendation

The output does not need to be saved as a workflow artifact unless the system chooses to persist it, but it must be structured enough for the orchestrator to route safely.

---

## Hard Rules

1. Do not implement speculative fixes.
2. Do not edit code by default.
3. Do not rewrite `spec.md`.
4. Do not rewrite `plan.md`.
5. Do not accept correlation as causation.
6. Do not stop at the first plausible explanation.
7. Do not treat executor narrative as evidence.
8. Do not add or recommend arbitrary sleeps as a first response to timing issues.
9. Do not broaden the investigation beyond the failure unless evidence requires it.
10. Distinguish observed facts from hypotheses.
11. Prefer narrow reproductions over broad speculation.
12. If additional discovery or external evidence beyond known paths and provided context is needed, use `orchestrator-mediated-research`.
13. If timing is suspected, use `condition-based-waiting.md`.
14. If the failure escaped too far downstream, use `defense-in-depth.md`.
15. If causal path is unclear, use `root-cause-tracing.md`.

---

## Research Rule

Known exact path reads are not research.

Use direct reads for exact files, artifacts, diffs, or paths already provided by the user, the active workflow, or prior evidence.

Use `orchestrator-mediated-research` only when additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, or external reference evidence is needed beyond known paths and provided context.

If a subagent returns `NEEDS_RESEARCH`, the orchestrator must fulfill that request through `orchestrator-mediated-research` and then resume or re-dispatch the subagent with the returned evidence.

Do not let the stage proceed based on missing evidence or guessing.
---

## Sequential Thinking Guidance

If a sequential thinking tool is available, use it when:
- multiple root-cause candidates are plausible
- the failure crosses multiple layers
- evidence is internally conflicting
- timing or state ordering may be involved
- prior attempts were inconclusive
- the correct routing target is not obvious

Use it to:
- separate evidence from interpretation
- branch and revise hypotheses
- compare causal chains
- eliminate weak explanations systematically
- converge on the smallest credible root-cause path

Do not use it for trivial failures where direct evidence is already sufficient.

---

## Debugging Workflow

### Phase 0: Intake

Collect the minimum required context:
- what failed
- where it failed
- expected behavior
- actual behavior
- command, test, or scenario that exposed the issue
- current worktree state
- relevant spec and plan sections

If there is no concrete failure:
- stop
- request a clearer failure signal

---

### Phase 1: Failure Statement

Write the failure in one precise sentence.

It must include:
- expected behavior
- actual behavior
- exact failing point

Bad:
- “auth is broken”

Good:
- “The refresh flow is expected to retry once after a 401, but the current API client returns the original 401 without invoking the refresh path.”

---

### Phase 2: Reproduction

Establish the smallest reliable reproduction.

Classify reproduction as:
- `stable`
- `flaky`
- `partial`
- `not-yet-reproduced`

If reproduction is flaky or timing-sensitive, consult `condition-based-waiting.md`.

Do not proceed as if the issue is understood when reproduction is not reliable.

---

### Phase 3: Evidence Collection

Gather evidence from:
- failing test output
- logs
- current code path
- current file contents
- runtime values
- command output
- relevant diff
- relevant spec / plan expectations

Keep evidence separate from interpretation.

If needed, request repository or external evidence through `orchestrator-mediated-research`.

---

### Phase 4: Root Cause Tracing

Use `root-cause-tracing.md`.

Trace from:
1. symptom
2. immediate trigger
3. enabling condition
4. decision / control path
5. broken assumption or contract
6. smallest credible root cause

Do not stop at the symptom.
Do not stop at “the test failed.”
Do not stop at “the recent change caused it” unless the mechanism is explained.

---

### Phase 5: Hypothesis Elimination

List plausible root-cause candidates.

For each candidate:
- what evidence supports it?
- what evidence weakens it?
- what would falsify it?

Reject weak hypotheses explicitly.

Do not keep many vague possibilities alive when evidence can eliminate them.

---

### Phase 6: Timing and Readiness Check

If the issue may involve:
- flakiness
- race conditions
- async initialization
- eventual consistency
- background jobs
- rendering readiness
- external propagation
- sleeps or timeouts

then use `condition-based-waiting.md`.

Identify:
- the required readiness condition
- the current broken assumption
- the correct condition-based synchronization point
- the timeout or failure boundary

Do not recommend arbitrary sleeps as the fix.

---

### Phase 7: Defense-in-Depth Check

Use `defense-in-depth.md` when:
- the direct defect was allowed to escape too far
- a false assumption crossed layer boundaries
- a missing contract or validation enabled the issue
- recurrence risk is high
- the system should have prevented, detected, or degraded earlier

Decide whether remediation should include:
- direct fix only
- validation
- contract enforcement
- improved error handling
- observability
- safer degradation
- regression protection

Do not use defense-in-depth as an excuse for broad unrelated refactoring.

---

### Phase 8: Debugging Result

Produce a structured result for the orchestrator.

The result must be narrow enough that `execute` can resume with a concrete target.

If the root cause is still unclear:
- say exactly what evidence is missing
- do not recommend speculative code changes

---

## Output Format

Always respond in exactly this structure.

### Failure Summary
- one concise statement of the failing behavior

### Reproduction Status
- `stable`, `flaky`, `partial`, or `not-yet-reproduced`
- include reproduction command or scenario if known

### Observed Facts
- evidence-backed observations only

### Root-Cause Candidates
- plausible candidates still under consideration

### Rejected Hypotheses
- candidates ruled out, with reason

### Narrowed Root-Cause Path
- smallest credible causal explanation
- if not yet known, say `Not yet narrowed.`

### Timing / Readiness Assessment
- whether timing or readiness is involved
- if not involved, say `No timing/readiness issue indicated.`

### Defense-in-Depth Implications
- direct fix only, or additional safeguard recommendation
- if none, say `Direct fix only; no additional defense-in-depth change justified.`

### Recommended Execute Focus
- exact target for the next executor pass
- include what should be changed or verified next

### Routing Recommendation
- `execute`
- `plan`
- `spec`
- or `needs-more-evidence`

---

## Completion Gate

The `systematic-debugging` skill is complete only when:
- the failure is described concretely
- reproduction status is known
- observed facts are separated from hypotheses
- weak hypotheses are eliminated or explicitly downgraded
- the narrowed root-cause path is credible, or the missing evidence is clearly identified
- the orchestrator has a concrete next routing decision

---

## Handoff to Execute

If routing to `execute`, hand off:
- failure summary
- narrowed root-cause path
- rejected hypotheses
- timing/readiness constraints, if any
- defense-in-depth recommendation, if any
- exact execute focus

`execute` must then apply targeted changes through `executor` and re-run the required review loop.

---

## Failure Handling

If debugging cannot narrow the problem sufficiently:
- do not guess
- do not recommend speculative fixes
- state what evidence is missing
- return `needs-more-evidence`
- ask the orchestrator to gather the missing evidence or decide the next route

If debugging reveals that the issue is not an implementation problem:
- route to `plan` or `spec` as appropriate
- explain why execution alone cannot fix it
