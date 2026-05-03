# T5A Skill Hardening Semantic Audit

## Scope

Required skill targets were hardened with minimal prompt deltas. Conditional targets were not changed because no T5A requirement or stale-reference finding required edits to them.

## Required Skills

| Skill | Improvements added or strengthened | Preserved invariants |
|---|---|---|
| `src/skills/spec/SKILL.md` | Added explicit planning-readiness outcome contract, product-facing anti-literal guardrail, and stop rule for ambiguity that would block safe planning. | Preserved spec approval gate, one-question-at-a-time clarification, `docs/supercode/<work_id>/spec.md`, `spec-reviewer` gate, and no implementation/planning. |
| `src/skills/plan/SKILL.md` | Added execution-ready plan outcome contract, anti-slop planning guardrail, and bounded context-gathering stop rule. | Preserved planner/checker/challenger split, plan-checker approval gate, single plan artifact, and no implementation. |
| `src/skills/pre-execute-alignment/SKILL.md` | Added alignment-package outcome contract and clarified fresh checker readiness evidence as a route-back blocker. | Preserved no implementation, dependency/conflict batching rules, conservative parallelism, and route back to `plan` when blocked. |
| `src/skills/execute/SKILL.md` | Added execution outcome contract and made the executor completion report an official evidence artifact with research/unchecked-scope reporting. | Preserved executor-only write authority, TDD, AST/LSP checks, task-level spec review, quality review, and verification loop. |
| `src/skills/final-review/SKILL.md` | Added fresh-evidence PASS contract, tests-pass-is-not-enough rule, and concise evidence-backed PASS/FAIL record wording. | Preserved binary PASS/FAIL, saved `final-review.md`, no code modification, and finish only after PASS. |
| `src/skills/systematic-debugging/SKILL.md` | Added outcome contract, root-cause confidence/evidence standard, and stop rule for bounded research-delegation during tracing. | Preserved read-only/no-fix debugger authority and routing back to `execute`, `plan`, `spec`, or more evidence. |
| `src/skills/finish/SKILL.md` | Added finish outcome contract, stricter final verification scope, merge/PR preconditions, and concise verified-scope reporting expectations. | Preserved exactly four finish options, typed `discard` confirmation, no auto-merge/PR/discard, and existing worktree cleanup semantics. |
| `src/skills/worktree/SKILL.md` | Added setup/baseline outcome contract and degraded-baseline acceptance conditions. | Preserved `.worktrees/<work_id>/`, ignore safety, setup detection, and baseline-before-planning requirement. |
| `src/skills/test-driven-development/SKILL.md` | Added RED/GREEN evidence outcome contract and anti-test-slop checks focused on real behavior. | Preserved no production code before failing test for behavior-changing work. |

## Conditional Skills

| Skill | Status | Reason |
|---|---|---|
| `src/skills/todo-sync/SKILL.md` | Not changed | Existing concise synchronization role already covers terminal completion/stale todo prevention; no stale old-research reference found in this task scope. |
| `src/skills/playwright-cli/SKILL.md` | Not changed | No UI/product verification update was necessary for prompt-only T5A hardening; no stale old-research reference found in this task scope. |

## Preserved Public Workflow Invariants

- Public gate order remains: `spec` → `worktree` → `plan` → `pre-execute-alignment` → `execute` → `final-review` → `finish`.
- No new public workflow stages were introduced.
- Executor remains the only code-writing role during execution.
- Reviewers, checkers, verifiers, and debugger roles remain read-only unless their existing skill explicitly owns artifact writing such as plan/spec/review documents.
- `final-review` PASS remains required before `finish`.
- Finish still presents exactly four outcomes and keeps typed discard confirmation as `discard`.

## Research Model Audit

- Required target edits use `research-delegation` for direct bounded missing-evidence requests.
- Required target edits do not add `<needs_research>` handoffs.
- Required target edits do not describe the orchestrator as the ordinary research broker for subagents.

## Product-Completeness Boundary

Product-completeness wording remains conditional on user-facing product, UI, or UX work and is not made universal for prompt-only, internal, config-only, tooling-only, backend-only, or documentation-only tasks unless the approved artifacts explicitly scope a product-facing outcome.
