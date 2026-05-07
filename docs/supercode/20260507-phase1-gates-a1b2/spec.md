# Phase 1 Workflow Gate Hardening Spec

## Work ID

`20260507-phase1-gates-a1b2`

## Objective

Strengthen the existing Supercode workflow gates and reviewer prompts using selected ideas from `oh-my-codex` and `oh-my-openagent`, while preserving the current public stage chain:

`spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`

This first implementation cycle is limited to low-risk Phase 1 changes: prompt/skill gate hardening for ambiguity, scope boundaries, evidence-backed planning, AI-slop/comment quality, and fresh verification evidence.

## Current State

Internal repository evidence indicates the workflow already has strong gated stages and reviewer roles:

- `src/skills/spec/SKILL.md` requires a `Non-Goals` section and describes an ambiguity-reduction clarification loop.
- `src/agents/prompt-text/spec-reviewer-prompt.md` already checks ambiguity burden and whether non-goals are missing when needed.
- `src/skills/plan/SKILL.md` routes back to `spec` when ambiguity blocks planning.
- `src/agents/prompt-text/plan-checker-prompt.md` blocks vague or non-actionable plans and weak verification.
- `src/agents/prompt-text/plan-challenger-prompt.md` pressure-tests hidden dependencies, brittle sequencing, overengineering, and scope inflation.
- `src/skills/execute/SKILL.md` enforces task-level TDD, AST/LSP checks, review loops, and verification.
- `src/agents/prompt-text/code-quality-reviewer-prompt.md` reviews correctness, maintainability, simplicity, tests, and project fit.
- `src/skills/final-review/SKILL.md`, `src/agents/prompt-text/completion-verifier-prompt.md`, and `src/agents/prompt-text/final-reviewer-prompt.md` already require fresh verification evidence.

Gaps identified for this Phase 1 work:

- Ambiguity is reviewed qualitatively, but there is no explicit lightweight scoring rubric that forces the spec author/reviewer to assess each readiness dimension consistently.
- Non-goals exist in the spec shape, but decision boundaries are not consistently required as first-class scope controls.
- Planning is evidence-aware, but the plan gate does not clearly require explicit evidence for repository reality when tasks depend on files, tests, conventions, or external behavior.
- AI-slop/comment quality checks are not explicitly defined in quality review prompts.
- Fresh verification exists, but completion/final-review prompts can be tightened to reject stale or uninspected verification output more explicitly.

## Desired Outcome

Phase 1 should make the workflow harder to misuse without adding a new public workflow stage or changing executor authority.

After this work:

1. The spec stage requires an explicit lightweight ambiguity/readiness score using fixed dimensions, not only free-form prose.
2. Specs include clear non-goals and decision boundaries when needed to prevent downstream guessing or scope drift.
3. The planning gate explicitly blocks evidence-free plans when repository facts, tests, conventions, or external behavior materially affect execution.
4. Code quality review explicitly checks for AI-generated slop patterns and low-value comments in changed code.
5. Final review and completion verification emphasize fresh, inspected evidence rather than stale claims.
6. Follow-up Phase 2-4 work is recorded so it is not forgotten, but remains out of implementation scope for this work item.

## Scope

In scope for Phase 1:

- Update workflow skill instructions and reviewer prompt text related to:
  - spec ambiguity scoring/readiness;
  - non-goals and decision boundaries;
  - evidence-required planning;
  - AI-slop and comment-quality checks;
  - fresh verification evidence standards.
- Keep changes limited to workflow/prompt/skill artifacts and any tests or snapshots required by this repository's conventions.
- Preserve existing Supercode gate order, approval points, context isolation rules, subagent authority boundaries, TDD requirement, final-review gate, and finish-choice pause.
- Record the deferred Phase 2-4 roadmap in the spec or a lightweight workflow artifact so later work items can pick it up.

Likely affected areas based on research:

- `src/skills/spec/SKILL.md`
- `src/agents/prompt-text/spec-reviewer-prompt.md`
- `src/skills/plan/SKILL.md`
- `src/agents/prompt-text/plan-checker-prompt.md`
- `src/agents/prompt-text/plan-challenger-prompt.md`
- `src/agents/prompt-text/code-quality-reviewer-prompt.md`
- `src/agents/prompt-text/completion-verifier-prompt.md`
- `src/agents/prompt-text/final-reviewer-prompt.md`
- `src/skills/final-review/SKILL.md`
- Tests or generated prompt artifacts if repository conventions require them.

Minimum required artifact coverage:

- Spec gate changes must update both `src/skills/spec/SKILL.md` and `src/agents/prompt-text/spec-reviewer-prompt.md`.
- Planning gate changes must update `src/skills/plan/SKILL.md` and `src/agents/prompt-text/plan-checker-prompt.md`; `plan-challenger-prompt.md` must be updated if the evidence requirement affects challenger responsibilities.
- AI-slop/comment quality changes must update `src/agents/prompt-text/code-quality-reviewer-prompt.md`.
- Fresh verification changes must update `src/agents/prompt-text/completion-verifier-prompt.md` and `src/agents/prompt-text/final-reviewer-prompt.md`; `src/skills/final-review/SKILL.md` must be updated if the skill-level hard rules need matching language.
- Any generated prompt registry, TypeScript agent config, or snapshot/test file discovered by planning/execution must be updated when required by repository conventions.

## Non-Goals

This work must not implement Phase 2-4 items:

- No new `evidence.md`, `state.json`, or `ledger.jsonl` artifact system.
- No durable mailbox, shared task list, file ownership registry, or per-worker worktree implementation.
- No new skill-embedded MCP runtime.
- No hierarchical `AGENTS.md` generator.
- No project wiki/knowledge layer.
- No ultragoal/long-running execution mode.
- No new public workflow stage.
- No direct production-code feature unrelated to workflow gates/prompts.
- No weakening of user approval, final-review, finish-choice, reviewer isolation, or executor-only implementation authority.

## Deferred Follow-Up Roadmap

The following follow-up work should be handled as separate work items after Phase 1 completes:

### Phase 2 — Artifact / State Improvements

- Add `docs/supercode/<work_id>/evidence.md` as a durable Evidence Packet artifact.
- Add work-item `state.json` and/or `ledger.jsonl` for resume, review, and routing history.
- Add task-level verification records.

### Phase 3 — Execution Routing / Parallel Safety

- Add tier/category-based subagent routing.
- Add executor file ownership declarations.
- Add shared mailbox or coordination state for parallel executors.
- Add explicit collision rules for unsafe parallel batches.
- Consider per-worker worktrees only where the complexity is justified.

### Phase 4 — Extensibility / Knowledge Layer

- Add skill-embedded MCP declarations if compatible with Supercode skill loading.
- Add hierarchical project context docs such as directory-local `AGENTS.md` or equivalent.
- Add markdown-first project wiki/knowledge layer.
- Add ultragoal-style long-running goal ledger mode.

These follow-ups should not be planned or implemented in this Phase 1 work item beyond being recorded here.

## Constraints

- Preserve all existing Supercode workflow gates and stage names.
- Do not introduce implementation authority for reviewers or orchestrator.
- Do not let reviewer prompts depend on executor effort narratives; reviewers must judge artifacts and evidence.
- Do not add auto-merge, auto-PR, auto-discard, or unattended finish behavior.
- Prompt hardening should be actionable and testable, not merely aspirational.
- New criteria should minimize false blockers for small/simple changes.
- Ambiguity scoring must be lightweight and deterministic enough for reviewers to apply. Use a small fixed rubric such as 0-2 per dimension or equivalent; it must not become a heavyweight estimation framework.
- Ambiguity scoring must be a readiness aid. It should identify dimensions that need clarification and may support blocking review decisions, but it must not force fake precision when the spec is already clearly planning-ready.
- Decision boundaries mean explicit statements of what downstream agents may decide autonomously versus what requires user approval or routing back to an earlier gate.
- AI-slop/comment quality criteria must focus on concrete patterns: stale TODOs, comments that restate obvious code, unnecessary “AI assistant” prose, over-explaining trivial logic, unjustified abstraction layers, and filler text not tied to maintainability.
- If no dedicated tests or prompt-generation checks exist for a changed prompt/skill area, minimum verification must include repository discovery showing that absence, plus at least one available repository-wide syntax/type/lint/build check when present.

## Success Criteria

The work is successful when:

1. `src/skills/spec/SKILL.md` requires a lightweight ambiguity/readiness score covering at least intent, outcome, scope, constraints, success criteria, and relevant repository context when applicable.
2. `src/agents/prompt-text/spec-reviewer-prompt.md` checks that the ambiguity/readiness score is present, internally consistent, and does not leave planner-blocking uncertainty unresolved.
3. Spec-stage instructions and `spec-reviewer` criteria require non-goals and decision boundaries when their absence would create scope drift, unauthorized agent decisions, or downstream guessing.
4. `src/skills/plan/SKILL.md` and `src/agents/prompt-text/plan-checker-prompt.md` explicitly block plans that rely on unsupported repository assumptions, missing related-test discovery, missing convention evidence, or unsupported external behavior where those facts materially affect execution.
5. `plan-challenger` criteria either incorporate evidence-risk pressure testing or are explicitly confirmed not to need changes because existing criteria already cover it.
6. `src/agents/prompt-text/code-quality-reviewer-prompt.md` explicitly checks changed code for concrete AI-slop/comment-quality patterns: excessive or low-value comments, stale TODOs, unnecessary abstraction, over-explaining trivial code, and filler prose.
7. `completion-verifier` and `final-reviewer` prompts explicitly require fresh verification output to be run or gathered, inspected, and tied to the spec/plan rather than accepted as a stale claim.
8. Existing tests, prompt generation checks, lint/typecheck, or repository-appropriate verification commands pass, or any baseline failure is clearly classified before final review.

## Risks / Unknowns

- The repository may have generated prompt artifacts or tests that must be updated alongside prompt markdown; this must be discovered during planning/execution.
- Ambiguity scoring could become bureaucratic if over-specified; implementation should keep it lightweight and useful.
- AI-slop checks are subjective; reviewer criteria should focus on concrete, actionable patterns rather than style preferences.
- The exact test command set is not yet known and must be identified during planning/worktree setup.

## Evidence Packet

### Internal Evidence

- `src/skills/spec/SKILL.md` — current spec stage already requires `Non-Goals` and has an ambiguity-reduction clarification loop.
- `src/agents/prompt-text/spec-reviewer-prompt.md` — current spec reviewer checks ambiguity burden and missing non-goals.
- `src/skills/plan/SKILL.md` — planning readiness can route back to spec when ambiguity blocks planning.
- `src/agents/prompt-text/plan-checker-prompt.md` — plan checker blocks vague/non-actionable tasks and weak verification.
- `src/agents/prompt-text/plan-challenger-prompt.md` — challenger checks hidden dependencies, scope inflation, and assumption fragility.
- `src/skills/execute/SKILL.md` — execute stage enforces TDD, AST/LSP, reviewer loop, and verification.
- `src/agents/prompt-text/code-quality-reviewer-prompt.md` — quality reviewer is the natural location for AI-slop/comment checks.
- `src/skills/final-review/SKILL.md`, `src/agents/prompt-text/completion-verifier-prompt.md`, `src/agents/prompt-text/final-reviewer-prompt.md` — fresh evidence requirements already exist and should be tightened rather than replaced.

### External Inspiration Evidence

- `oh-my-codex` deep-interview uses Socratic clarification and ambiguity scoring ideas.
- `oh-my-codex` Ralph workflow emphasizes context intake, fresh verification, and deslop pass concepts.
- `oh-my-openagent` includes Todo Continuation Enforcer, comment-checker, category-based routing, and session continuity ideas.

### Evidence Scope

- Checked: Supercode skill markdown files, prompt text files, prior external repo research results.
- Not checked yet: TypeScript agent definition/config files, generated prompt indexes, repository test suite details.

## Revisions

- 2026-05-07: Initial spec drafted for Phase 1 only after user requested sequential implementation and follow-up memo.
