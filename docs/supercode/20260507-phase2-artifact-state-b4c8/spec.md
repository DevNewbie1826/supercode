# Phase 2 Artifact / State Improvements Spec

## Work ID

`20260507-phase2-artifact-state-b4c8`

## Objective

Add durable, work-item-scoped workflow artifacts that improve Supercode's traceability, resumability, and final-review evidence quality without changing the public workflow stage chain.

Phase 2 is limited to:

- `evidence.md`
- `state.json`
- `ledger.jsonl`
- task-level verification records

This work should materialize workflow evidence and status that currently lives only in conversation context, `todowrite` state, executor reports, and reviewer summaries.

## Readiness Score

| Dimension | Score | Rationale |
|---|---:|---|
| Intent | 2 | The approved intent is to implement Phase 2 Artifact / State Improvements only. |
| Outcome | 2 | Desired artifacts and their roles are explicit: persisted evidence, current state, append-only event ledger, and task verification records. |
| Scope | 2 | Scope is bounded to four artifact/state features; mailbox, file ownership, per-worker worktrees, embedded MCP, hierarchical `AGENTS.md`, wiki, and ultragoal are excluded. |
| Constraints | 2 | Must preserve existing workflow gates, `todowrite` as active todo mechanism, artifact path convention, reviewer isolation, and finish behavior. |
| Success Criteria | 2 | Success criteria below define required artifact schemas, lifecycle update points, tests, and verification. |
| Repository Context | 2 | Internal research confirmed current artifact conventions and absence of existing `evidence.md`, `state.json`, or `ledger.jsonl` implementations. |

Rubric: 0 = missing or unclear, 1 = partially specified or carries material uncertainty, 2 = clear enough for the next gate to act without guessing.

## Current State

Supercode already stores core workflow artifacts under:

```text
docs/supercode/<work_id>/
```

Current required artifacts are:

- `spec.md`
- `plan.md`
- `final-review.md`

Internal repository evidence shows:

- `src/skills/spec/SKILL.md` defines the spec artifact path under `docs/supercode/<work_id>/spec.md`.
- `src/skills/plan/SKILL.md` defines the plan artifact path under `docs/supercode/<work_id>/plan.md`.
- `src/skills/final-review/SKILL.md` defines the final review artifact path under `docs/supercode/<work_id>/final-review.md`.
- `src/skills/execute/SKILL.md` and `src/skills/final-review/SKILL.md` describe Evidence Packets as conceptual context passed to agents, not persisted files.
- `src/skills/todo-sync/SKILL.md` uses the `todowrite` tool for active todo state and does not define file-based workflow state.
- `src/hooks/todo-state.ts` normalizes and snapshots todo tool state in memory / hook context, with no durable workflow artifact file I/O.
- Per-task verification is reported in executor completion reports but is not persisted as a structured per-task artifact.
- Repository search found no existing `evidence.md`, `state.json`, or `ledger.jsonl` implementation.
- Package scripts are `bun test` and `tsc --noEmit` via `bun run typecheck`.

## Desired Outcome

After Phase 2, each work item can have a richer durable artifact set:

```text
docs/supercode/<work_id>/
  spec.md
  evidence.md
  plan.md
  state.json
  ledger.jsonl
  verification/
    <task_id>.json
  final-review.md
```

The new artifacts should support:

- durable Evidence Packet materialization;
- resumable workflow state inspection;
- append-only workflow event history;
- task-level verification evidence that final review can inspect;
- tests or contract checks that prevent malformed artifact schemas or missing required fields.

## Scope

In scope:

1. Define and implement the Phase 2 artifact conventions for work-item-scoped files under `docs/supercode/<work_id>/`.
2. Add or update workflow skill instructions so orchestrator-led stages know when each new artifact should be created or updated.
3. Add or update prompt/skill contract tests, helper utilities, schema validation, or fixtures as needed by repository conventions.
4. Define `evidence.md` as a persisted form of the existing Evidence Packet concept.
5. Define `state.json` as a persistent complement to `todowrite`, not a replacement.
6. Define `ledger.jsonl` as append-only workflow event history.
7. Define task-level verification records as structured per-task evidence, likely under `docs/supercode/<work_id>/verification/<task_id>.json` unless planning identifies a better repository-consistent design.

Likely affected areas based on internal research:

- `src/skills/spec/SKILL.md`
- `src/skills/worktree/SKILL.md`
- `src/skills/plan/SKILL.md`
- `src/skills/pre-execute-alignment/SKILL.md`
- `src/skills/execute/SKILL.md`
- `src/skills/final-review/SKILL.md`
- `src/skills/finish/SKILL.md`, if finish needs cleanup/preservation rules for new artifacts
- `src/skills/todo-sync/SKILL.md`, if it needs explicit coordination language with `state.json`
- `src/hooks/todo-state.ts`, only if planning determines durable state should be supported by code utilities rather than prompt/skill instructions alone
- `src/__tests__/...`, especially new or existing prompt/skill contract tests and any tests for state/ledger helpers if code utilities are added

## Non-Goals

This Phase 2 work must not implement Phase 3 or Phase 4 features:

- No mailbox system.
- No file ownership registry.
- No per-worker worktree system.
- No parallel executor coordination system beyond recording state/events.
- No skill-embedded MCP runtime.
- No hierarchical `AGENTS.md` generator or loader.
- No wiki / knowledge layer.
- No ultragoal mode.
- No new public workflow stage.
- No replacement of `todowrite` / `todo-sync` as the active todo mechanism.
- No auto-merge, auto-PR, auto-discard, or changed finish behavior.

## Decision Boundaries

- Downstream planner/executor may choose exact JSON schema field names and helper file organization when they preserve the artifact roles and success criteria in this spec.
- Downstream planner/executor may decide whether artifact creation is enforced by prompt/skill contract tests only or by TypeScript helper utilities plus tests, based on repository conventions discovered during planning.
- User approval is required before expanding Phase 2 to mailbox, file ownership, per-worker worktree, embedded MCP, hierarchical `AGENTS.md`, wiki, or ultragoal functionality.
- Route back to `spec` if planning discovers that artifact/state persistence requires changing the public workflow stage chain or replacing `todo-sync`.

## Constraints

- Preserve the public stage chain: `spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`.
- Preserve reviewer isolation and executor-only implementation authority.
- Preserve `todowrite` / `todo-sync` as the active in-session task tracking mechanism; `state.json` is a durable complement.
- Keep artifacts work-item-scoped under `docs/supercode/<work_id>/`.
- Do not introduce broad runtime dependencies unless planning demonstrates they are necessary and tested.
- `ledger.jsonl` must be append-only in concept; consumers should not need to rewrite historical events for normal workflow progress.
- Artifact schemas should be human-readable and machine-checkable enough for tests.
- Avoid requiring every minor workflow event to be logged if it creates noisy, brittle bookkeeping; define a required minimum event set.

## Success Criteria

The work is successful when:

1. Workflow instructions define `docs/supercode/<work_id>/evidence.md` as the durable Evidence Packet artifact, including internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty.
2. Workflow instructions define `docs/supercode/<work_id>/state.json` as a persistent state artifact including at least `work_id`, active stage, active gate or status, active task when applicable, completed tasks, blockers, next route, and last updated timestamp.
3. Workflow instructions define `docs/supercode/<work_id>/ledger.jsonl` as an append-only event log with a minimum event schema including timestamp, event type, stage, optional task id, summary, and relevant artifact references.
4. Workflow instructions define task-level verification records, preferably `docs/supercode/<work_id>/verification/<task_id>.json`, including task id, status, commands/checks run, results, reviewer outcomes, diagnostics status where available, and unresolved concerns.
5. `spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, and `final-review` skills state when the new artifacts should be created or updated, without adding a new public workflow stage.
6. `todo-sync` guidance clearly explains that `state.json` complements but does not replace active todo synchronization.
7. Tests or contract checks cover the new artifact requirements and fail if required schema fields or lifecycle instructions are missing.
8. Existing tests and typecheck pass: `bun test` and `bun run typecheck`.
9. No Phase 3 or Phase 4 implementation artifacts are introduced.

## Risks / Unknowns

- It is not yet known whether this repository prefers prompt/skill-only contract enforcement or TypeScript helper utilities for artifact schema generation and validation.
- If schemas become too detailed, workflow bookkeeping may become brittle or burdensome.
- If schemas are too loose, final-review and resume behavior may not gain enough reliability.
- `state.json` may overlap conceptually with `todowrite`; implementation must avoid creating conflicting sources of truth.
- The exact verification record location may be adjusted during planning if repository conventions support a better structure.

## Evidence Packet

### Internal Evidence

- `src/skills/spec/SKILL.md` — existing spec artifact path is `docs/supercode/<work_id>/spec.md`.
- `src/skills/plan/SKILL.md` — existing plan artifact path is `docs/supercode/<work_id>/plan.md`; it already requires checked/unchecked scope and unresolved uncertainty in planning contexts.
- `src/skills/final-review/SKILL.md` — existing final review artifact path is `docs/supercode/<work_id>/final-review.md`.
- `src/skills/execute/SKILL.md` — Evidence Packet and per-task completion reports exist conceptually, but are not persisted as `evidence.md` or verification records.
- `src/skills/todo-sync/SKILL.md` — current todo synchronization uses `todowrite`; no durable file-based state is defined.
- `src/hooks/todo-state.ts` — normalizes todo state and builds snapshots without durable workflow artifact file I/O.
- Repository search found no existing `evidence.md`, `state.json`, or `ledger.jsonl` implementation.
- `package.json` — verification commands are `bun test` and `bun run typecheck`.

### External Evidence

- Phase 2 is inspired by prior `oh-my-codex` / `oh-my-openagent` research: durable context snapshots, state files, ledgers, and verification records, adapted to Supercode's existing gated workflow.

### Evidence Scope

- Checked: workflow skill files, todo state utilities, related todo tests, Phase 1 contract tests, package scripts, artifact conventions under `docs/supercode/<work_id>/`.
- Not checked: every agent prompt file, all implementation utilities outside todo hooks, CI configuration, and any untracked local `.todo.md` behavior.

## Revisions

- 2026-05-07: Initial Phase 2 spec drafted for Artifact / State Improvements after user approved starting Phase 2 with this bounded scope.
