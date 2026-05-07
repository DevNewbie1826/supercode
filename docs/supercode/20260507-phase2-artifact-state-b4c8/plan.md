# Phase 2 Artifact / State Improvements Plan

## Work ID

`20260507-phase2-artifact-state-b4c8`

## Goal

Add durable, work-item-scoped workflow artifact conventions for `evidence.md`, `state.json`, `ledger.jsonl`, and task-level verification records so Supercode workflows become more traceable, resumable, and reviewable without changing the public workflow stage chain or replacing `todowrite` / `todo-sync`.

## Source Spec

`/Volumes/storage/workspace/supercode/.worktrees/20260507-phase2-artifact-state-b4c8/docs/supercode/20260507-phase2-artifact-state-b4c8/spec.md`

## Architecture / Design Strategy

- Use helper-backed enforcement as part of Phase 2. Repository evidence supports this: `zod` already exists, `src/hooks/todo-state.ts` is an existing pure workflow helper pattern with no file I/O, no `src/schemas/` directory exists, and the spec allows helper utilities when repository conventions support them.
- Lock the helper module path to `src/hooks/workflow-artifacts.ts`. Do not use a placeholder path and do not create `src/schemas/` for this work.
- Artifact creation/update remains orchestrator- and skill-instruction-driven. The helper module must be pure and side-effect free: no filesystem I/O, no runtime workflow stage changes, and no dependency on active `todowrite` internals.
- Preserve existing artifact convention under `docs/supercode/<work_id>/` and extend it with:
  - `evidence.md`
  - `state.json`
  - `ledger.jsonl`
  - `verification/<task_id>.json`
- `todowrite` is the active source for in-session todos. `state.json` is a durable snapshot/complement for resume/review visibility. If `state.json` is stale or mismatched against active todo state, workflow instructions must require reporting the mismatch and updating deliberately, not silently trusting stale state.
- `ledger.jsonl` is append-only operationally: normal workflow progress appends one valid JSON object per line and does not rewrite or reorder historical lines.
- Define a stage-by-stage lifecycle matrix in skill guidance and contract tests: stage, responsible actor, artifact action, minimum ledger event, and state fields updated.

## Scope

### In Scope

- Artifact conventions and lifecycle instructions for `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/<task_id>.json`.
- Stage-by-stage lifecycle matrix covering the existing public workflow stages.
- Contract tests for skill instruction coverage.
- Required schema/helper utilities for machine-checkable `state.json`, `ledger.jsonl`, and verification record schemas, plus artifact path helpers, implemented at `src/hooks/workflow-artifacts.ts`.
- Narrow adoption/backfill of the new Phase 2 artifacts for this work item after schemas and lifecycle instructions exist:
  - `docs/supercode/20260507-phase2-artifact-state-b4c8/evidence.md`
  - `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`
  - `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`
  - `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/<task_id>.json` for tasks whose records are available after the schema/lifecycle work exists.
- Skill updates for `spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, and `todo-sync`; `finish` only for preservation/no-cleanup documentation if present.

### Out of Scope

- Mailbox system.
- File ownership registry.
- Per-worker worktree system or parallel executor coordination beyond recording state/events.
- Skill-embedded MCP runtime.
- Hierarchical `AGENTS.md` generator/loader.
- Wiki / knowledge layer.
- Ultragoal mode.
- New public workflow stage or changed stage chain.
- Replacement of `todowrite` / `todo-sync` as active todo mechanism.
- Auto-merge, auto-PR, auto-discard, changed finish behavior, or new worktree copy/cleanup/runtime behavior.
- Any mailbox, coordination, or runtime orchestration behavior implied by the current-work adoption artifacts. The backfill is documentation/evidence adoption for this work item only.

## Assumptions

- The existing skill files named in the spec exist in this worktree and remain markdown instruction artifacts.
- `zod` is available in `package.json` and will be used for pure helper schemas.
- Repository test conventions permit focused tests under `src/__tests__/`.
- `bun test` and `bun run typecheck` are the authoritative verification commands.
- Worktree and finish updates are documentation/instruction-only. They must not add new copy, cleanup, runtime preservation, or artifact-migration behavior.
- If `src/skills/finish/SKILL.md` is absent, do not create a new finish skill.

## Source Spec Alignment

| Spec Requirement | Planned Coverage |
|---|---|
| Durable Evidence Packet at `docs/supercode/<work_id>/evidence.md` with internal evidence, external evidence, checked scope, unchecked scope, unresolved uncertainty | T03 lifecycle matrix and skill contracts; T04 skill updates; T01/T02 helpers for artifact paths and related record schemas |
| Persistent `state.json` with required fields | T01/T02 helper schema; T03/T04 lifecycle guidance |
| Append-only `ledger.jsonl` minimum event schema | T01/T02 helper schema; T03/T04 lifecycle guidance defining append-only JSONL behavior |
| Task verification records under `verification/<task_id>.json` with required evidence fields | T01/T02 helper schema; T03/T04 execute and final-review guidance |
| Skill lifecycle coverage for `spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, `final-review` | T03/T04 |
| `todo-sync` explains `state.json` complements active todo synchronization | T03/T04 |
| Current work item adopts/backfills the new artifacts for final-review evidence | T05 |
| Tests / contract checks prevent missing required fields or lifecycle instructions | T01, T03, T06, T07 |
| Existing tests and typecheck pass | T07 |
| No Phase 3/4 artifacts | T03-T08 negative assertions and scope review |

## Execution Policy

- Start with T00 to verify and record the already-decided helper evidence in the executor completion report / task handoff notes only: helper-backed enforcement is required, and the locked path is `src/hooks/workflow-artifacts.ts`.
- Use TDD for behavior/schema/helper changes: write failing helper tests before implementing helper code.
- Contract tests for markdown skill behavior should be written before or alongside skill changes and should fail on missing lifecycle sections/structured bullets, not on arbitrary keyword absence.
- Keep changes serial by default because skill contract tests and shared markdown files overlap.
- Do not modify public workflow stage order: `spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`.
- Do not add broad runtime dependencies; use existing `zod` only.
- Do not add file I/O to `src/hooks/todo-state.ts` or make `state.json` the active todo source.
- Do not introduce Phase 3/4 implementation mechanics. Phase 3/4 terms may appear only in explicit non-goal, exclusion, or negative-test contexts.
- Each task must leave the repository in a testable state before moving to the next task.
- Actual file-based task-level verification records under `verification/<task_id>.json` begin only after T02 creates the helper schema and T04 defines the lifecycle instructions for those records. T00 must not attempt to create or update `verification/T00.json`.

## File Structure

```text
docs/supercode/20260507-phase2-artifact-state-b4c8/
  spec.md
  plan.md
  evidence.md                                # created in T05 for current-work adoption/backfill
  state.json                                 # created in T05 for current-work adoption/backfill
  ledger.jsonl                               # created in T05 for current-work adoption/backfill
  verification/
    <task_id>.json                           # created in T05+ only where records are available

src/
  __tests__/
    phase2-artifact-state-contract.test.ts     # new skill contract tests
    workflow-artifacts.test.ts                 # new helper schema/path tests
    workflow-artifacts-current-work.test.ts    # opt-in current-work docs validation; skips when WORK_ID is unset
  skills/
    spec/SKILL.md
    worktree/SKILL.md
    plan/SKILL.md
    pre-execute-alignment/SKILL.md
    execute/SKILL.md
    final-review/SKILL.md
    finish/SKILL.md                            # modify only if present, docs-only
    todo-sync/SKILL.md
  hooks/
    workflow-artifacts.ts                      # new pure helper schema/path module
```

The helper path is locked to `src/hooks/workflow-artifacts.ts`; do not create `src/schemas/` or any second helper location.

## File Responsibilities

- `src/__tests__/phase2-artifact-state-contract.test.ts`: markdown contract checks for required artifact paths, lifecycle matrix sections/structured bullets, required fields, stage-chain preservation, `todowrite` preservation, append-only ledger behavior, reviewer/executor verification ownership, and Phase 3/4 exclusions.
- `src/__tests__/workflow-artifacts.test.ts`: permanent TDD coverage using fixtures/in-memory sample artifacts for required schema fields, path helpers, JSONL event validation, `evidence.md` section validation, nullable/pending reviewer outcomes, and rejection of malformed records. Do not make normal `bun test` depend on mutable current-work artifact files.
- `src/__tests__/workflow-artifacts-current-work.test.ts`: opt-in current-work artifact validation target. It must skip safely when `WORK_ID` is unset so normal `bun test` remains stable, and when run with `WORK_ID=20260507-phase2-artifact-state-b4c8` it loads `docs/supercode/${WORK_ID}/evidence.md`, `state.json`, `ledger.jsonl`, and `verification/*.json` from disk and validates them using exports from `src/hooks/workflow-artifacts.ts`.
- `src/hooks/workflow-artifacts.ts`: pure Zod schemas, TypeScript types, artifact path builders, JSON/JSONL validation helpers, and a pure `evidence.md` section validator; no filesystem reads/writes. The evidence validator accepts markdown text and validates required sections: internal evidence, external evidence, checked scope, unchecked scope, unresolved uncertainty.
- `src/skills/spec/SKILL.md`: define when `evidence.md` starts and how spec-stage evidence is materialized.
- `src/skills/worktree/SKILL.md`: documentation-only guidance that artifact files remain part of the work-item artifact set in the isolated worktree; do not add copy/runtime behavior.
- `src/skills/plan/SKILL.md`: define planner use of persisted `evidence.md`, state snapshot updates, and append-only ledger events without replacing plan artifact behavior.
- `src/skills/pre-execute-alignment/SKILL.md`: define state/ledger updates for alignment decisions and execution route.
- `src/skills/execute/SKILL.md`: define executor-owned task verification record creation/update and execution state/ledger responsibilities.
- `src/skills/final-review/SKILL.md`: require reviewer-owned final review to inspect persisted evidence, state, ledger, and task verification records; reviewer outcomes may be absent/pending in task records before review.
- `src/skills/todo-sync/SKILL.md`: state explicitly that active todo state remains `todowrite`; `state.json` is a durable snapshot/complement and stale/mismatched state must be reported.
- `src/skills/finish/SKILL.md`: if present, documentation-only preservation/no-cleanup instruction; no new cleanup or copy behavior.
- `docs/supercode/20260507-phase2-artifact-state-b4c8/evidence.md`: current-work persisted Evidence Packet backfill using available evidence; do not invent unsupported historical evidence.
- `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`: current-work state snapshot after Phase 2 schemas/lifecycle instructions exist; `todowrite` remains active in-session todo source.
- `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`: current-work append-only JSONL event log seeded from available post-adoption events; do not rewrite history or fabricate complete historical events.
- `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/<task_id>.json`: current-work task verification records for T05 and later tasks at minimum; earlier T00-T04 records may be absent or marked unavailable if they were not captured after schema/lifecycle support existed.

## Required Lifecycle Matrix

T04 must add a stage-by-stage lifecycle matrix, or equivalent structured bullets, to the relevant skill guidance. One canonical lifecycle matrix may live in shared skill guidance, but each relevant skill must still contain its own actionable ownership/responsibility row or structured bullet for its stage. T03 must test both the canonical lifecycle content and each relevant skill's stage-specific responsibility. Minimum required content:

| Stage | Responsible actor | Artifact action | Minimum ledger event | State fields updated |
|---|---|---|---|---|
| `spec` | spec/orchestrator | create/update `evidence.md`; initialize artifact set when work id is stable | artifact initialized or evidence captured | `work_id`, active stage/status, blockers, next route, `last_updated` |
| `worktree` | worktree/orchestrator | carry artifact path convention into isolated worktree; documentation-only preservation guidance | stage transition/gate decision | active stage/status, blockers, next route, `last_updated` |
| `plan` | planner/orchestrator | read/update `evidence.md`; write `plan.md`; update state snapshot | planning started/completed or gate decision | active stage/status, blockers, next route, `last_updated` |
| `pre-execute-alignment` | alignment/orchestrator | record execution order, blockers, and route | alignment decision | active stage/status, active task if applicable, blockers, next route, `last_updated` |
| `execute` | executor/orchestrator | append task events; write/update `verification/<task_id>.json`; update state from `todowrite` snapshot | task started, task completed, or task blocked | active stage/status, active task, completed tasks, blockers, next route, `last_updated` |
| `final-review` | final reviewer/orchestrator | inspect artifacts; write `final-review.md`; may add reviewer outcome references | final-review pass/fail/routed return | active stage/status, blockers, next route, `last_updated` |
| `finish` | finisher/orchestrator | documentation-only preservation of artifacts; no new cleanup/copy runtime | route to finish / finished | active stage/status, next route, `last_updated` |

## Post-Adoption Artifact Validation Rule

After T05 bootstraps current-work artifacts, every later task that writes or updates `docs/supercode/20260507-phase2-artifact-state-b4c8/evidence.md`, `state.json`, `ledger.jsonl`, or `verification/<task_id>.json` must:

1. update the relevant current-work artifact records first;
2. run targeted artifact validation against the current docs artifacts on disk using the helper schemas and pure validators;
3. append/update task evidence with the validation command and result after that validation runs.

If a task's own verification record includes command results, it must record that a later validation command was run after the record update. It must not claim impossible final self-inclusion where the record already contains the result of a validation command that had not run yet. Final self-inclusion is established by a subsequent validation event/record update or by the next task's artifact validation.

Artifact validation must include `evidence.md` from disk after bootstrap/backfill and before final-review handoff. The evidence validation must confirm these sections exist: internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty.

Terminal handoff rule: the final repository state handed to final-review must have been validated after the final artifact write. The final validation result does not need to self-record in the same artifact if doing so would require another write; it must be available in orchestration/final verification evidence.

Permanent tests and current-work validation are separate:

- Permanent tests (`bun test`, including `src/__tests__/workflow-artifacts.test.ts`) use fixtures or in-memory sample artifacts and pure helper/schema validators. They must not depend on mutable `docs/supercode/20260507-phase2-artifact-state-b4c8/*` files.
- Current-work artifact validation uses `src/__tests__/workflow-artifacts-current-work.test.ts`. The test must skip when `WORK_ID` is unset, so default `bun test` remains safe. The exact handoff validation command is:

```bash
WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts
```

When `WORK_ID` is set, the test loads `docs/supercode/${WORK_ID}/evidence.md`, `state.json`, `ledger.jsonl`, and `verification/*.json` from disk and validates them with helper exports. Default fixture tests remain separate and stable.

## Canonical JSON Schema / Key Map

Use these exact snake_case keys in JSON artifacts and helper schemas. Human-readable phrases in markdown skill instructions are aliases only and must not replace canonical JSON keys.

### `state.json` canonical keys

| Canonical JSON key | Meaning | Human-readable aliases allowed in prose only |
|---|---|---|
| `work_id` | Stable work item id | work id |
| `active_stage` | Current public workflow stage | active stage, stage |
| `active_gate_or_status` | Meaningful workflow gate/status string within the active stage, such as `planning`, `aligned`, `executing`, `blocked`, `verification_passed`, `final_review_pending`, or `routed_return`; not arbitrary filler | active gate, status, gate/status |
| `active_task` | Current task id or `null` when no task is active | active task |
| `completed_tasks` | Array of task status objects; each entry includes task id, status, and verification record status/provenance | completed tasks |
| `blockers` | Current blockers or empty array; each blocker entry includes summary and route/status | blockers |
| `next_route` | Next workflow route/stage decision | next route |
| `last_updated` | ISO-like timestamp string for the state snapshot update | last updated timestamp |

Each `completed_tasks` entry must include at least `task_id`, `status`, and `verification_record_status`. Use narrow task `status` values: `pending`, `in_progress`, `completed`, `blocked`, or `skipped`. Use narrow `verification_record_status` values: `verified`, `pending`, `not_applicable`, `pre_adoption_unavailable`, or `failed`. This prevents backfilled state from implying structured verification records exist for T00-T04 unless files actually exist.

Each `blockers` entry must include at least `summary` and `route_or_status` so blockers are actionable rather than opaque strings.

### `ledger.jsonl` event canonical keys

Each line is one JSON object with these canonical keys:

| Canonical JSON key | Meaning | Human-readable aliases allowed in prose only |
|---|---|---|
| `timestamp` | Event timestamp | time |
| `event_type` | Event type such as artifact initialized, task completed, or final-review decision | event type |
| `stage` | Public workflow stage associated with the event | stage |
| `task_id` | Task id when applicable; nullable/omittable for stage-level events | optional task id |
| `summary` | Short event summary | summary |
| `artifact_refs` | Array of relevant artifact path references | artifact references, artifact refs |

Minimum allowed `event_type` values for required lifecycle events are: `artifact_initialized`, `evidence_captured`, `stage_transition`, `gate_decision`, `alignment_decision`, `task_started`, `task_completed`, `task_blocked`, `artifact_validation`, `final_review_decision`, `routed_return`, and `finish_ready`. The schema may allow additional strings for future workflow events, but tests must cover these minimum required event types.

### `verification/<task_id>.json` canonical keys

| Canonical JSON key | Meaning | Human-readable aliases allowed in prose only |
|---|---|---|
| `task_id` | Task id for the record | task id |
| `status` | Task verification status | status |
| `commands` | Commands/checks run by executor; entries include command/check name, result status, summary, and timestamp when known | commands, checks run |
| `results` | Results for commands/checks; entries include command/check name, result status, summary, and timestamp when known | results |
| `executor_evidence` | Executor-owned evidence and notes | executor-owned evidence |
| `reviewer_outcomes` | Reviewer-owned outcomes; nullable, empty, or pending before reviewer action | reviewer outcomes |
| `diagnostics_status` | Diagnostics/typecheck/lint status object including status and summary | diagnostics status |
| `unresolved_concerns` | Remaining concerns or empty array | unresolved concerns |
| `record_status` | Provenance/status of this verification record, especially for backfilled/adopted records | record status |

`status` uses the narrow task status values: `pending`, `in_progress`, `completed`, `blocked`, or `skipped`. `record_status` distinguishes current verified records from historical/pre-adoption tasks and uses the narrow values: `verified`, `pending`, `not_applicable`, `pre_adoption_unavailable`, or `failed`. Command/result entry statuses use: `pass`, `fail`, `not_run`, or `not_applicable`.

## Task Sections

### T00 — Verify locked helper evidence

- **Task id:** `T00`
- **Task name:** Confirm helper-backed enforcement and locked path evidence
- **Purpose:** Record the evidence-backed decision so execution begins without unresolved helper strategy ambiguity.
- **Files to create / modify / test:**
  - Inspect only existing repository files needed to confirm provided evidence, such as `package.json`, `src/hooks/todo-state.ts`, and the absence of `src/schemas/`.
  - Modify no production or test files in this task.
- **Concrete steps:**
  1. Confirm `zod` is already available in `package.json`.
  2. Confirm `src/hooks/todo-state.ts` is a pure workflow helper pattern with no durable file I/O.
  3. Confirm no `src/schemas/` directory exists.
  4. Record in the executor completion report / task handoff notes that helper-backed enforcement is required for machine-checkable `state.json`, `ledger.jsonl`, and verification record schemas.
  5. Record in the executor completion report / task handoff notes that the helper module path is locked to `src/hooks/workflow-artifacts.ts`.
  6. Do not create or update `verification/T00.json`; file-based verification records are not available until after T02 helper schemas and T04 lifecycle instructions exist.
- **Explicit QA / verification:**
  - Manual evidence note in executor completion report / task handoff notes listing evidence confirmed and the locked path.
  - No code/test command required unless files were accidentally changed; if changed, revert those changes before leaving T00.
- **Expected result:** Execution proceeds with helper-backed enforcement at `src/hooks/workflow-artifacts.ts`; no conditional strategy remains.
- **Dependency notes:** First task.
- **Parallel eligibility:** Not parallel; it records the fixed evidence used by T01 and T02.

### T01 — Add failing helper tests

- **Task id:** `T01`
- **Task name:** Add workflow artifact schema/path tests
- **Purpose:** Establish executable expectations for Phase 2 artifact shapes and paths before adding helper implementation.
- **Files to create / modify / test:**
  - Create `src/__tests__/workflow-artifacts.test.ts`.
  - Create `src/__tests__/workflow-artifacts-current-work.test.ts`.
  - Test future module at `src/hooks/workflow-artifacts.ts`.
- **Concrete steps:**
  1. Add tests that import the planned helper module from `src/hooks/workflow-artifacts.ts`.
  2. Assert path helpers produce the four desired artifact paths under `docs/supercode/<work_id>/`.
  3. Assert valid `state.json` data uses the canonical JSON keys from the schema/key map and includes at least: `work_id`, `active_stage`, `active_gate_or_status`, `active_task`, `completed_tasks`, `blockers`, `next_route`, `last_updated`.
  4. Assert `completed_tasks` entries include `task_id`, `status`, and `verification_record_status` so historical/pre-adoption tasks do not imply structured verification records unless records exist.
  5. Assert task `status`, `verification_record_status`, `record_status`, and command/result statuses use the narrow allowed values from the schema/key map.
  6. Assert `active_gate_or_status` is a non-empty meaningful workflow gate/status string, and blocker entries include `summary` and `route_or_status`.
  7. Assert valid ledger event data uses canonical JSON keys and includes at least: `timestamp`, `event_type`, `stage`, optional `task_id`, `summary`, `artifact_refs`, and is suitable for one-JSON-object-per-line JSONL append behavior.
  8. Assert ledger event schema/tests cover the minimum required `event_type` values: `artifact_initialized`, `evidence_captured`, `stage_transition`, `gate_decision`, `alignment_decision`, `task_started`, `task_completed`, `task_blocked`, `artifact_validation`, `final_review_decision`, `routed_return`, and `finish_ready`.
  9. Assert valid verification data uses canonical JSON keys and includes at least: `task_id`, `status`, `commands`, `results`, `executor_evidence`, `reviewer_outcomes`, `diagnostics_status`, `unresolved_concerns`, `record_status`.
  10. Assert command/result entries include command/check name, result status, summary, and timestamp when known; assert `diagnostics_status` includes status and summary.
  11. Assert `reviewer_outcomes` can be nullable, empty, or pending before final review; do not require executor tasks to invent reviewer-owned evidence.
  12. Assert malformed records are rejected by schema validation.
  13. Add permanent tests using fixtures/in-memory sample artifacts for the pure `evidence.md` section validator. The tests must cover required sections: internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty.
  14. Do not add default-suite tests that load mutable current-work docs artifacts. If a current-work validation mode is added, make it opt-in and separate from normal `bun test` unless it uses stable fixtures.
  15. Add `src/__tests__/workflow-artifacts-current-work.test.ts` as the concrete opt-in current-work validation target. It must skip when `WORK_ID` is unset, and when `WORK_ID` is set it must load artifacts from `docs/supercode/${WORK_ID}/` and validate them using helper exports.
  16. Run the permanent fixture test and confirm it fails only because the helper module/implementation is not present yet.
- **Explicit QA / verification:**
  - `bun test src/__tests__/workflow-artifacts.test.ts`
  - Expected initial result: failing test due to missing helper module or unimplemented exports.
- **Expected result:** Focused failing tests document the schema/helper contract.
- **Dependency notes:** Depends on T00.
- **Parallel eligibility:** Not parallel; defines the contract for T02.

### T02 — Implement pure artifact schemas and path helpers

- **Task id:** `T02`
- **Task name:** Implement Phase 2 artifact utility module
- **Purpose:** Provide machine-checkable schemas and reusable path helpers for required Phase 2 artifacts.
- **Files to create / modify / test:**
  - Create `src/hooks/workflow-artifacts.ts`.
  - Modify `src/__tests__/workflow-artifacts.test.ts` only for naming alignment, not semantic weakening.
  - Modify `src/__tests__/workflow-artifacts-current-work.test.ts` only for helper export naming alignment, not semantic weakening.
- **Concrete steps:**
  1. Add Zod schemas and exported TypeScript types for workflow state, ledger event, and task verification record.
  2. Add a pure `evidence.md` section validator/helper that accepts markdown text and verifies required sections without filesystem I/O.
  3. Add path helper functions for the four Phase 2 artifact paths.
  4. Keep helpers pure: no filesystem I/O and no dependency on `todowrite` runtime state.
  5. Use simple string fields/arrays/objects adequate to satisfy spec-required fields; avoid over-specific enums that make bookkeeping brittle.
  6. Ensure schemas allow optional task id in ledger events, nullable/optional active task in state, and nullable/empty/pending reviewer outcomes in verification records.
  7. Ensure state completed-task entries carry `task_id`, `status`, and `verification_record_status`, and verification records carry `record_status`, so current verified records are distinguishable from historical/pre-adoption tasks.
  8. Use narrow enums/unions for task status, verification record status/provenance, record status, and command/result status as defined in the schema/key map.
  9. Ensure ledger event tests cover the minimum allowed required lifecycle `event_type` values while keeping the schema broad enough for additional event strings if needed.
  10. Ensure blocker entries include `summary` and `route_or_status`; command/result entries include command/check name, result status, summary, and timestamp when known; `diagnostics_status` includes status and summary.
  11. Ensure artifact references can identify relevant files without requiring absolute local paths.
  12. Ensure `workflow-artifacts-current-work.test.ts` skips safely when `WORK_ID` is unset and validates `docs/supercode/${WORK_ID}/evidence.md`, `state.json`, `ledger.jsonl`, and `verification/*.json` when `WORK_ID` is set.
- **Explicit QA / verification:**
  - `bun test src/__tests__/workflow-artifacts.test.ts`
  - `bun run typecheck`
- **Expected result:** Helper tests pass and typecheck confirms exported types/helpers are valid.
- **Dependency notes:** Depends on T01.
- **Parallel eligibility:** Not parallel; helper contract affects later consistency checks.

### T03 — Add failing skill contract tests for lifecycle instructions

- **Task id:** `T03`
- **Task name:** Add Phase 2 skill contract tests
- **Purpose:** Lock required workflow instruction coverage before modifying skill markdown.
- **Files to create / modify / test:**
  - Create `src/__tests__/phase2-artifact-state-contract.test.ts`
  - Read skill files under `src/skills/*/SKILL.md`
- **Concrete steps:**
  1. Follow the existing markdown contract-test style used by `src/__tests__/phase1-gate-hardening.test.ts`.
  2. Add assertions that relevant skill files contain lifecycle sections or structured bullets for the Phase 2 artifacts, not loose keyword stuffing.
  3. Require the canonical lifecycle matrix content: stage, responsible actor, artifact action, minimum ledger event, and state fields updated.
  4. Require each relevant skill file to contain its own actionable ownership/responsibility row or structured bullet for its stage, even if a shared skill contains the canonical matrix.
  5. Add assertions that relevant skill files mention exact artifact paths or path patterns for `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/<task_id>.json`.
  6. Add assertions that `spec`, `worktree`, `plan`, `pre-execute-alignment`, `execute`, and `final-review` describe when artifacts are created or updated.
  7. Add assertions that `todo-sync` says `todowrite` is the active in-session todo source and `state.json` is a durable snapshot/complement; stale or mismatched state must be reported, not silently trusted.
  8. Add assertions for required field names and value semantics in skill docs:
     - Evidence: internal evidence, external evidence, checked scope, unchecked scope, unresolved uncertainty.
     - State: canonical JSON keys `work_id`, `active_stage`, `active_gate_or_status`, `active_task`, `completed_tasks`, `blockers`, `next_route`, `last_updated`, plus completed-task `verification_record_status` provenance.
     - Ledger: timestamp, event type, stage, optional task id, summary, artifact references, append JSONL lines, do not rewrite history during normal progress, and minimum required event types.
     - Verification: canonical JSON keys `task_id`, `status`, `commands`, `results`, `executor_evidence`, `reviewer_outcomes`, `diagnostics_status`, `unresolved_concerns`, `record_status`; reviewer outcomes nullable/empty/pending before review; narrow status/provenance values.
     - Evidence: current-work `evidence.md` validation requires internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty sections.
  9. Add negative assertions that public stage chain remains unchanged.
  10. Allow Phase 3/4 terms only in non-goal, exclusion, or negative-test contexts; tests should reject wording that presents those terms as implemented features.
  11. Run the test and confirm it fails because skill instructions have not yet been updated.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase2-artifact-state-contract.test.ts`
  - Expected initial result: failing assertions for missing Phase 2 lifecycle language.
- **Expected result:** Focused failing contract tests define required skill instruction changes without encouraging keyword stuffing.
- **Dependency notes:** Depends on T02 so contract tests can reference helper-backed enforcement consistently.
- **Parallel eligibility:** Not parallel by default; shared test patterns and future skill edits require serial review.

### T04 — Update workflow skill artifact lifecycle instructions

- **Task id:** `T04`
- **Task name:** Document artifact creation and update lifecycle in skills
- **Purpose:** Make orchestrator-led workflow stages know when and how to create/update Phase 2 artifacts while preserving the existing stage chain and todo mechanism.
- **Files to create / modify / test:**
  - Modify `src/skills/spec/SKILL.md`
  - Modify `src/skills/worktree/SKILL.md` documentation only
  - Modify `src/skills/plan/SKILL.md`
  - Modify `src/skills/pre-execute-alignment/SKILL.md`
  - Modify `src/skills/execute/SKILL.md`
  - Modify `src/skills/final-review/SKILL.md`
  - Modify `src/skills/todo-sync/SKILL.md`
  - Modify `src/skills/finish/SKILL.md` only if the file exists and only for documentation/no-cleanup guidance
  - Test `src/__tests__/phase2-artifact-state-contract.test.ts`
- **Concrete steps:**
  1. Add or update a canonical lifecycle matrix or equivalent structured bullets covering each public stage, responsible actor, artifact action, minimum ledger event, and state fields updated.
  2. Ensure each relevant skill file also has its own actionable ownership/responsibility row or structured bullet for its stage; do not rely only on a shared matrix elsewhere.
  3. In `spec`, add guidance that the Evidence Packet should be materialized or updated as `docs/supercode/<work_id>/evidence.md` with internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty.
  4. In `worktree`, add documentation-only guidance that the artifact directory convention includes `evidence.md`, `state.json`, `ledger.jsonl`, and `verification/`; do not add new copy, cleanup, migration, or runtime worktree behavior.
  5. In `plan`, add guidance that planner reads/uses persisted `evidence.md` when present, records planning state snapshot in `state.json`, and appends meaningful planning events to `ledger.jsonl`.
  6. In `pre-execute-alignment`, add guidance that alignment outcome, execution order, blockers, next route, and relevant artifact refs update `state.json` and append ledger events.
  7. In `execute`, add guidance that each task writes/updates `verification/<task_id>.json` with executor-owned commands/checks, results, diagnostics status, and unresolved concerns; reviewer outcomes may remain null, empty, or pending until reviewer-owned stages supply them.
  8. In `execute`, require state/ledger updates at task start/completion/blockage and require state snapshots to be derived from active workflow/todowrite reality rather than treated as authoritative.
  9. In `execute` and any post-adoption task guidance, state that artifact-updating tasks must update records first, then run targeted current-docs artifact validation; command results included in the same task record should note a later validation command rather than claiming impossible final self-inclusion.
  10. In `final-review`, require reading persisted `evidence.md`, `state.json`, `ledger.jsonl`, and verification records as part of final-review evidence, while maintaining reviewer isolation and final-review artifact behavior.
  11. In `todo-sync`, state clearly that `todowrite` remains the active in-session todo source and `state.json` is a durable snapshot/complement only; stale or mismatched `state.json` must be reported and deliberately reconciled.
  12. In `finish`, if present, state that Phase 2 artifacts are preserved with the work item as documentation/instruction guidance only; do not change finish cleanup/copy/runtime behavior.
  13. Define minimum ledger events: artifact initialized, stage transition/gate decision, task started, task completed/blocked, final-review decision, route to finish or routed return.
  14. Define append-only ledger operation: append one JSON object per line to `ledger.jsonl`; do not rewrite, reorder, or delete historical lines during normal workflow progress.
  15. Define terminal handoff validation: final-review handoff requires validation after the final artifact write, with final validation evidence available in orchestration/final verification evidence even if not self-recorded in the same artifact.
- **Explicit QA / verification:**
  - `bun test src/__tests__/phase2-artifact-state-contract.test.ts`
  - Manual review of modified skill files for:
    - unchanged public stage chain;
    - lifecycle matrix/structured bullets present;
    - no mailbox/file ownership/per-worker/embedded MCP/hierarchical AGENTS/wiki/ultragoal implementation language;
    - Phase 3/4 terms only in non-goal/exclusion contexts;
    - `todowrite` remains active todo source;
    - worktree/finish changes are documentation/instruction-only.
- **Expected result:** Contract tests pass for required skill lifecycle language and no public workflow stage or runtime behavior changes are introduced.
- **Dependency notes:** Depends on T03.
- **Parallel eligibility:** Not parallel; multiple shared skill contracts and cross-file wording must remain consistent.

### T05 — Bootstrap current-work Phase 2 artifacts

- **Task id:** `T05`
- **Task name:** Backfill this work item with Phase 2 artifacts
- **Purpose:** Adopt the newly defined artifact conventions for `20260507-phase2-artifact-state-b4c8` so final review can inspect real current-work artifacts, while avoiding fabricated historical records.
- **Files to create / modify / test:**
  - Create/update `docs/supercode/20260507-phase2-artifact-state-b4c8/evidence.md`
  - Create/update `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`
  - Append to `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`
  - Create `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/T05.json`
  - Create later `verification/<task_id>.json` records for T06, T07, and T08 as those tasks complete
  - Do not create fake complete records for T00-T04 unless actual evidence was captured after schemas/lifecycle instructions existed
- **Concrete steps:**
  1. Use the schemas/helpers from T02 and lifecycle guidance from T04 to create the current-work artifact files under `docs/supercode/20260507-phase2-artifact-state-b4c8/`.
  2. Write `evidence.md` from available planning/spec evidence: internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty. Clearly mark any backfilled evidence as based on available artifacts rather than pretending full conversation history was captured.
  3. Write `state.json` as a durable current snapshot using canonical JSON keys, including `work_id`, `active_stage`, `active_gate_or_status`, `active_task`, `completed_tasks`, `blockers`, `next_route`, and `last_updated`.
  4. In `completed_tasks`, distinguish tasks with structured verification records from historical/pre-adoption tasks using `verification_record_status`; do not let T00-T04 entries imply structured verification exists unless corresponding files actually exist.
  5. Seed or append `ledger.jsonl` with valid JSONL events using canonical keys for the adoption/backfill itself and subsequent post-adoption workflow events. Do not rewrite historical lines during normal progress and do not fabricate a complete pre-adoption event history for T00-T04.
  6. Create `verification/T05.json` for the bootstrap task with canonical keys, executor-owned commands/checks/results, diagnostics status where available, unresolved concerns, `record_status`, and reviewer outcomes as null/empty/pending.
  7. Run targeted current-work artifact validation after writing/updating the T05 artifacts with `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`. This targeted validation reads actual current-work docs artifacts from disk and validates `evidence.md`, `state.json`, every `ledger.jsonl` line, and available `verification/*.json` records against helper schemas/section checks.
  8. Keep this current-work validation as executor verification/handoff evidence, not as a permanent default `bun test` dependency tied to this mutable work id.
  9. If `verification/T05.json` records command results, record that a later validation command ran after the record update; do not claim impossible final self-inclusion.
  10. Add an explicit note in current-work artifacts that this is an adoption/demo/backfill of Phase 2 artifacts for this work item only, not Phase 3 mailbox, coordination, or runtime orchestration.
  11. Ensure later tasks T06-T08 create/update their own verification records now that schemas and lifecycle instructions exist.
- **Explicit QA / verification:**
  - `bun test src/__tests__/workflow-artifacts.test.ts`
  - `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`
  - After artifact updates, validate the created docs artifacts by loading `docs/supercode/20260507-phase2-artifact-state-b4c8/evidence.md`, `state.json`, `ledger.jsonl`, and available `verification/*.json` from disk and checking them against helper schemas/section checks.
  - Confirm `evidence.md` includes sections for internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty.
  - Manual review that no unsupported historical T00-T04 verification records were invented.
- **Expected result:** This work item contains real Phase 2 artifacts suitable for final-review inspection, with honest backfill boundaries.
- **Dependency notes:** Depends on T04 because helper schemas and lifecycle instructions must exist first.
- **Parallel eligibility:** Not parallel; it writes current-work artifact files used by later verification and final scope review.

### T06 — Align helper coverage with skill contracts

- **Task id:** `T06`
- **Task name:** Connect helpers to contracts and exclusions
- **Purpose:** Ensure prompt/skill contracts and helper utilities stay aligned.
- **Files to create / modify / test:**
  - Modify `src/__tests__/phase2-artifact-state-contract.test.ts`
  - Modify `src/__tests__/workflow-artifacts.test.ts` only if consistency checks are needed
  - Modify `src/hooks/workflow-artifacts.ts` only if tests reveal a narrow mismatch
  - Create/update `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/T06.json`
  - Append a T06 event to `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`
  - Update `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`
- **Concrete steps:**
  1. Add assertions that helper exports cover the same artifact concepts tested in skill markdown.
  2. Add assertions that contract wording requires machine-checkable fields and structured lifecycle sections while keeping helper utilities pure and free of file I/O requirements.
  3. Add negative coverage that no test fixture or helper path creates Phase 3/4 artifact directories such as mailbox, ownership registry, per-worker worktrees, wiki, or ultragoal.
  4. Ensure permanent tests validate artifact schemas/sections using fixtures or in-memory samples, including `evidence.md` required sections, `verification_record_status`, and `record_status` provenance fields.
  5. Update `verification/T06.json`, `state.json`, and `ledger.jsonl`, then run targeted current-work artifact validation against current docs artifacts from disk as executor verification/handoff evidence using `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`.
  6. If T06 records command results in `verification/T06.json`, include a result for the artifact validation command that ran after the record update, without claiming the record already contained its own final validation result before the command ran.
  7. Keep tests semantic by checking lifecycle sections/structured bullets and required field clusters, not isolated keywords that can be satisfied by stuffing prose.
- **Explicit QA / verification:**
  - `bun test src/__tests__/workflow-artifacts.test.ts src/__tests__/phase2-artifact-state-contract.test.ts`
  - `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`
  - `bun run typecheck`
- **Expected result:** Tests verify artifact lifecycle and schema/field expectations without over-constraining prose.
- **Dependency notes:** Depends on T05.
- **Parallel eligibility:** Not parallel; bridges helpers and skill-contract outputs.

### T07 — Run full verification and fix narrow defects

- **Task id:** `T07`
- **Task name:** Full test and typecheck verification
- **Purpose:** Confirm Phase 2 changes pass repository-level verification and correct only defects within approved scope.
- **Files to create / modify / test:**
  - Modify only files already touched in T00-T06 if verification reveals defects.
  - Create/update `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/T07.json`
  - Append a T07 event to `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`
  - Update `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`
  - No new feature files unless a failing test shows a narrowly necessary missing test fixture or import path.
- **Concrete steps:**
  1. Run full test suite.
  2. Run full typecheck.
  3. If failures occur, classify them as caused by Phase 2 changes or pre-existing/unrelated.
  4. Fix in-scope failures with the smallest change that preserves spec alignment.
  5. Re-run targeted tests after each fix, then the full verification commands.
  6. Confirm the full test suite validates artifact schemas and `evidence.md` sections using fixtures/in-memory samples, and does not depend on mutable current-work docs artifacts.
  7. Update `verification/T07.json`, `state.json`, and `ledger.jsonl`, then run targeted artifact validation against current docs artifacts from disk using `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`.
  8. If T07 records command results, include a result for the artifact validation command that ran after the record update; do not claim impossible final self-inclusion.
- **Explicit QA / verification:**
  - `bun test`
  - `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`
  - `bun run typecheck`
- **Expected result:** Full test suite and typecheck pass, or any unrelated pre-existing failure is documented with evidence and not hidden.
- **Dependency notes:** Depends on T06.
- **Parallel eligibility:** Not parallel; final verification depends on all implementation changes.

### T08 — Final scope and artifact review

- **Task id:** `T08`
- **Task name:** Verify Phase 2-only scope and execution handoff readiness
- **Purpose:** Ensure the completed implementation stays inside approved Phase 2 Artifact / State Improvements and is ready for final review.
- **Files to create / modify / test:**
  - Review files modified in T00-T07.
  - Create/update `docs/supercode/20260507-phase2-artifact-state-b4c8/verification/T08.json`
  - Append a T08 event to `docs/supercode/20260507-phase2-artifact-state-b4c8/ledger.jsonl`
  - Update `docs/supercode/20260507-phase2-artifact-state-b4c8/state.json`
  - No planned file modifications unless review finds a concrete scope violation or missing spec requirement.
- **Concrete steps:**
  1. Review diff for added files/directories and confirm they are limited to skill docs, tests, pure artifact helper module at `src/hooks/workflow-artifacts.ts`, and current-work Phase 2 artifacts under `docs/supercode/20260507-phase2-artifact-state-b4c8/`.
  2. Confirm no mailbox, ownership registry, per-worker worktree, embedded MCP runtime, hierarchical `AGENTS.md`, wiki, ultragoal, or new public workflow stage was added.
  3. Confirm Phase 3/4 terms appear only in non-goal, exclusion, or negative-test contexts.
  4. Confirm `todo-sync` and any helper code do not replace `todowrite` as active todo source.
  5. Confirm `ledger.jsonl` guidance is append-only: append JSONL lines, no normal-history rewriting.
  6. Confirm worktree and finish changes are documentation/instruction-only and add no new copy/cleanup/runtime behavior.
  7. Confirm skill instructions define the desired artifact structure exactly under `docs/supercode/<work_id>/`.
  8. Confirm tests cover required fields, lifecycle matrix/structured bullets, stale-state reporting, and reviewer/executor verification ownership.
  9. Confirm current-work artifacts exist and are honest adoption/backfill records, not mailbox/coordination or fabricated complete historical records for T00-T04.
  10. Confirm `state.json` completed-task entries distinguish current verified records from historical/pre-adoption tasks via `verification_record_status`, and verification files use `record_status`.
  11. Confirm permanent tests use stable fixtures/in-memory samples for artifact validators, while current-work docs artifact validation is recorded as targeted executor verification/handoff evidence.
  12. Update `verification/T08.json`, `state.json`, and `ledger.jsonl`, then run targeted artifact validation against current docs artifacts from disk using `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`.
  13. If T08 records command results, include a result for the artifact validation command that ran after the record update; do not claim impossible final self-inclusion.
  14. Run terminal handoff validation after the final artifact write with `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts` and keep the result in orchestration/final verification evidence; do not perform another artifact write solely to self-record this final validation result.
- **Explicit QA / verification:**
  - `git diff --stat`
  - `git diff -- src/skills src/__tests__ src/hooks src/schemas docs/supercode/20260507-phase2-artifact-state-b4c8`
  - `bun test`
  - `bun run typecheck`
  - `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`
- **Expected result:** Scope review passes with evidence suitable for final-review inspection.
- **Dependency notes:** Depends on T07.
- **Parallel eligibility:** Not parallel; final scope validation depends on complete diff.

## QA Standard

- Required commands before handoff:
  - `bun test`
  - `bun run typecheck`
- Required targeted commands during execution:
  - `bun test src/__tests__/phase2-artifact-state-contract.test.ts`
  - `bun test src/__tests__/workflow-artifacts.test.ts`
  - `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`
- Required manual checks:
  - T00 executor completion report / task handoff notes confirm helper-backed enforcement and locked path `src/hooks/workflow-artifacts.ts`; no `verification/T00.json` is expected.
  - Public stage chain remains `spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`.
  - `todowrite` / `todo-sync` remains the active source for in-session todos.
  - `state.json` is documented as a durable snapshot/complement; stale or mismatched state is reported, not silently trusted.
  - New artifacts are work-item-scoped under `docs/supercode/<work_id>/`.
  - Current-work artifacts for `20260507-phase2-artifact-state-b4c8` exist after T05: `evidence.md`, `state.json`, `ledger.jsonl`, and available `verification/<task_id>.json` records for T05 and later tasks.
  - Current-work artifact backfill is explicitly labeled as adoption/demo/backfill and does not fabricate complete historical verification records for T00-T04.
  - JSON artifacts use canonical snake_case keys from the schema/key map; prose aliases do not replace actual JSON keys.
  - Backfilled `state.json` uses `verification_record_status` in completed-task entries, and verification records use `record_status`, to distinguish current verified records from historical/pre-adoption tasks.
  - Permanent tests validate helper schemas and `evidence.md` section validator with fixtures/in-memory sample artifacts; normal `bun test` does not depend on mutable current-work docs artifacts.
  - Targeted current-work validation loads docs artifacts from disk after T05/T06/T07/T08 and validates them against helper schemas/section validators as executor verification/handoff evidence.
  - Current-work `evidence.md` is loaded from disk and validated after bootstrap/backfill and before final-review handoff for sections: internal evidence, external evidence, checked scope, unchecked scope, unresolved uncertainty.
  - Every post-T05 task that updates current-work artifacts updates records first, then runs targeted artifact validation against docs artifacts on disk.
  - Verification records that include validation command results only claim a validation command that ran after the record update; they do not claim impossible final self-inclusion.
  - Terminal handoff to final-review has validation evidence produced after the final artifact write; that final validation result may live in orchestration/final verification evidence rather than self-recording in the same artifact.
  - Narrow status/provenance values are used for `verification_record_status`, `record_status`, task statuses, and command/result statuses; ledger tests cover minimum required lifecycle `event_type` values.
  - `ledger.jsonl` is append-only operationally: append JSONL lines and do not rewrite history during normal progress.
  - Helper utilities are pure and do not perform filesystem I/O.
  - Worktree and finish changes are documentation/instruction-only.
  - No Phase 3/4 feature artifacts or implementation mechanics are introduced.
- File-based task-level verification records during execute begin after T02 helper schemas and T04 skill lifecycle instructions exist. Those records should separate executor-owned evidence from reviewer-owned evidence. Reviewer outcomes may be null, empty, or pending until a reviewer-owned stage supplies them.

## Revisions

- 2026-05-07: Initial execution-ready plan created from approved Phase 2 spec and planning evidence packet.
- 2026-05-07: Revised to add T00 helper decision gate, optional helper path locking, lifecycle matrix requirement, append-only ledger operation, stale `state.json` handling, stricter contract-test guidance, reviewer/executor verification ownership, and documentation-only worktree/finish constraints.
- 2026-05-07: Revised to remove execution-time helper ambiguity: helper-backed enforcement is required, `src/hooks/workflow-artifacts.ts` is the locked helper path, T00 is now evidence confirmation only, and downstream tasks are no longer conditional.
- 2026-05-07: Revised T00 evidence handling to use executor completion report / task handoff notes only; file-based task verification records begin after T02 helper schemas and T04 lifecycle instructions exist.
- 2026-05-07: Revised to add T05 current-work artifact adoption/backfill so this work item creates `evidence.md`, `state.json`, `ledger.jsonl`, and available verification records for final-review evidence without inventing pre-adoption history.
- 2026-05-07: Revised to add canonical JSON key maps, provenance/status requirements for backfilled task state and verification records, and post-bootstrap tests that load current-work docs artifacts from disk for schema validation.
- 2026-05-07: Revised to add post-adoption artifact validation ordering, tighter schema value semantics for task/blocker/command/diagnostics entries, and per-skill lifecycle ownership contract granularity.
- 2026-05-07: Revised to require current-work `evidence.md` disk validation, narrow status/provenance enums, minimum lifecycle event types, and terminal handoff validation after the final artifact write.
- 2026-05-07: Revised to add a pure `evidence.md` section validator scope and separate permanent fixture-based tests from targeted current-work artifact validation so normal `bun test` is not coupled to mutable workflow artifacts.
- 2026-05-07: Revised to add concrete opt-in current-work validation test target `src/__tests__/workflow-artifacts-current-work.test.ts` and exact handoff command `WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts`.
