# Plan: Phase 3-1 Coordination Foundation

## Work ID

`20260508-phase3-coordination-foundation-d7f4`

## Goal

Implement the Phase 3-1 coordination foundation as a bounded, test-backed contract layer for mailbox artifacts, file ownership registry artifacts, hyperplan-lite planning challenge requirements, security trigger rules, and strict-completion matrix hardening while preserving Supercode's current public workflow stages and single-worktree model.

## Source Spec

- Approved spec: `docs/supercode/20260508-phase3-coordination-foundation-d7f4/spec.md`
- Evidence packet: `docs/supercode/20260508-phase3-coordination-foundation-d7f4/evidence.md`

## Architecture / Design Strategy

1. Add a pure TypeScript/Zod helper module for Phase 3 coordination artifact contracts, following the existing `src/hooks/workflow-artifacts.ts` pattern: schemas, inferred types, path helpers, and `safeParse` validation wrappers only.
2. Keep Phase 3-1 as a contract/foundation layer. Do not add filesystem I/O, shell execution, runtime lock enforcement, routing daemons, message brokers, new workflow stages, or per-worker worktrees.
3. Represent mailbox and ownership artifacts with the exact canonical enums and field names listed in this plan so helper schemas, tests, and skill docs cannot diverge.
4. Harden skill markdown contracts in existing stages instead of creating a new public stage:
   - `plan`: hyperplan-lite checklist and completion-matrix planning responsibility.
   - `pre-execute-alignment`: ownership registry planning, conflict-sensitive batching, and mailbox handoff expectations.
   - `execute`: ownership policy as a hard workflow failure, mailbox update expectations, and security-trigger handling through existing research/review mechanisms.
   - `final-review`: completion evidence checks covering mailbox, ownership, security-trigger evidence, and strict-completion matrix support.
   - `spec`: bounded security trigger discovery and Phase 3-2 roadmap preservation where useful.
5. Use markdown contract tests for skill contracts, in-memory fixture tests for helper behavior, and one opt-in current-work validation test after current-work Phase 3 artifacts are bootstrapped. Phase 3-1 requires evidence-path contracts and documented manual review, not automatic runtime enforcement.

### Canonical Phase 3-1 Artifact Contracts

These names are normative for T01-T05 tests, helper schemas, current-work artifacts, and skill docs.

#### Mailbox message contract

- Artifact path: `docs/supercode/<work_id>/mailbox.jsonl`.
- Lifecycle: append-only, orchestrator-mediated durable records. Existing records are not rewritten to resolve a thread; resolution is represented by appending a follow-up record with the same `thread_id` and an updated `status`. The mailbox is not a broker and not free agent chat.
- Canonical fields:
  - `message_id`: non-empty string.
  - `thread_id`: non-empty string for relating request/response/status records.
  - `timestamp`: non-empty string.
  - `sender`: non-empty string.
  - `recipient`: non-empty string.
  - `message_type`: one of `research_request`, `research_response`, `executor_handoff`, `reviewer_finding`, `blocker`, `route_back_reason`, `final_review_evidence_gap`, `status_update`.
  - `stage`: non-empty string.
  - `task_id`: non-empty string or `null`.
  - `summary`: non-empty string.
  - `artifact_refs`: array of non-empty strings.
  - `status`: one of `open`, `acknowledged`, `resolved`, `blocked`, `superseded`.

#### Ownership registry contract

- Artifact path: `docs/supercode/<work_id>/ownership.json`.
- Canonical top-level fields:
  - `work_id`: non-empty string.
  - `entries`: array of ownership entries.
- Canonical ownership entry fields:
  - `entry_id`: non-empty string.
  - `target`: non-empty repo-relative file path string.
  - `target_type`: exact value `path` only for Phase 3-1.
  - `owner_task_id`: non-empty actor id string. Valid actors include task ids such as `T00` through `T06` and the actor id `orchestrator`.
  - `mode`: one of `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`.
  - `status`: one of `active`, `released`, `blocked`, `violated`.
  - `allowed_operations`: non-empty array containing one or more of `read`, `write`, `append`, `create`, `delete`, `rename`.
  - `policy_summary`: non-empty string describing the allowance/constraint.
  - `conflict_notes`: array of strings; empty when no known conflicts.
  - `blocker_refs`: array of strings referencing mailbox messages, ledger events, or artifacts; empty when not applicable.
- Shared ownership representation: `shared_append` uses one ownership entry per allowed actor, all with the same `target`/`target_type`, each actor's own `owner_task_id`, mode `shared_append`, and `allowed_operations` exactly `read` and `append`. `owner_task_id: "orchestrator"` is valid for shared append artifacts such as mailbox/ledger. Do not use nullable or multi-owner `owner_task_id` in Phase 3-1.
- Append-only bootstrap representation: when an append-only artifact does not exist before T00, T00 must have a separate bootstrap creation entry (`exclusive_write` or `sequenced_write`) with `allowed_operations` including `create`. After creation, that bootstrap entry must be marked `released`; future writes use active `shared_append` entries only. `shared_append` entries must never include `create`.
- Orchestrator ownership representation: `orchestrator_owned` must use `owner_task_id: "orchestrator"`; executor tasks may receive `read_only` entries for the same target but must not receive write-capable entries unless routed back and explicitly reassigned.

#### Ownership path matching constraints

- Phase 3-1 supports exact repo-relative file path matching only.
- `target_type` must be `path`; `glob` matching is a Phase 3-2 deferred candidate and must not be accepted by Phase 3-1 helper schemas or described as implemented enforcement.
- Paths must be repo-relative strings with no leading `/`, no drive/root prefix, no `..` segment, and no empty path segments.
- Matching is case-sensitive string equality after rejecting invalid path forms.
- Directory prefix expansion is not supported. An ownership entry for `src/foo` does not cover `src/foo/bar.ts` unless `src/foo/bar.ts` is listed as its own exact `target`.
- Helper logic must remain pure string validation/comparison only; it must not read git diffs, inspect the filesystem, run shell commands, perform glob expansion, preflight conflicts, or act as a runtime enforcement engine.

#### Ownership mode/operation invariants

These invariants are canonical and split into schema-enforceable per-entry checks and manual registry/batch workflow checks so invalid mode/operation combinations cannot pass by interpretation.

Schema-enforceable per-entry invariants:

- `read_only`: `allowed_operations` must be exactly `read`; forbids `write`, `append`, `create`, `delete`, and `rename`.
- `exclusive_write`: `allowed_operations` may contain `read`, `write`, `create`, `delete`, and `rename`; it must not contain `append` unless the plan explicitly routes back because append-only shared behavior should use `shared_append`.
- `shared_append`: multiple active entries may cover the same target for different owner tasks; `allowed_operations` must be exactly `read` and `append`; forbids rewrite, delete, reorder, create, and rename.
- `orchestrator_owned`: `owner_task_id` must be exactly `orchestrator`; `allowed_operations` may contain `read`, `write`, `append`, `create`, `delete`, and `rename` for orchestrator-owned artifact maintenance; executor tasks must not claim this mode.
- `sequenced_write`: write-capable operations may contain `read`, `write`, `create`, `delete`, and `rename`; it must not contain `append`; entries for the same target require serial batch sequencing and must not be scheduled in the same parallel batch.
- Any ownership entry whose `allowed_operations` violates its `mode` invariant is invalid, even if the target/path fields are otherwise valid.
- Actor invariants: `exclusive_write` and `sequenced_write` normally require task-id owners (`T00`-style). `owner_task_id: "orchestrator"` is valid for these modes only when the entry explicitly documents pre-registry/orchestrator provenance in `policy_summary`. `read_only` may use a task id or `orchestrator` when representing pre-registry/read-only workflow artifact provenance.

Manual registry/batch workflow checks:

- `exclusive_write` exactly-one-active-entry-per-target across the registry and `shared_append` multiple-entry coordination are registry-level checks reviewed by `pre-execute-alignment` and `final-review`; Phase 3-1 does not need a cross-entry registry validator.
- `sequenced_write` serial batching is a pre-execute-alignment and final-review workflow check; Phase 3-1 documents and tests the contract but does not automate batch conflict preflight.
- `orchestrator_owned` executor write prevention is checked by comparing actual changed files, ownership entries, and `ownership_evidence`; Phase 3-1 does not use OS locks.

#### Ownership evidence path contract

- `pre-execute-alignment` assigns ownership entries per task before execution and records batching constraints from those entries.
- Canonical evidence carrier: the existing per-task verification record at `docs/supercode/<work_id>/verification/<task_id>.json` carries a manual `ownership_evidence` object. Phase 3-1 may allow this object through the existing verification-record passthrough schema; no separate machine-checkable ownership-evidence artifact is required in this slice.
- Phase 3-1 separates per-task attribution from global ownership compliance because a single uncommitted worktree has cumulative diffs. Task reviewers use task-local evidence; final-review uses global changed-file evidence for the whole work item.
- Canonical per-task `ownership_evidence` shape:
  - `task_start_changed_files`: array of path strings present in the worktree before the task began.
  - `task_end_changed_files`: array of path strings present in the worktree after the task ended.
  - `task_local_changed_files`: array of path strings attributed to the current task by the executor/reviewer.
  - `preexisting_changed_files_touched`: array of path strings that were already changed before task start and were touched again by this task.
  - `attribution_method`: one of `executor_edit_log`, `before_after_snapshot`, `reviewer_confirmed`, `pre_registry_bootstrap`, `not_applicable`.
  - `attribution_limitations`: array of strings describing ambiguity in task-local attribution; empty when none.
  - `changed_files`: array of changed-file evidence entries.
  - `changed_files[].path`: repo-relative path for the task-local or preexisting-touched file.
  - `changed_files[].operation`: one of `read`, `write`, `append`, `create`, `delete`, `rename`.
  - `changed_files[].ownership_entry_id`: matching ownership registry `entry_id` or `null` when uncovered.
  - `changed_files[].coverage_status`: one of `covered`, `uncovered`, `conflict`, `not_applicable`.
  - `actual_changed_files_source`: non-empty string describing the manual source used to identify actual changed files, such as `git diff --name-only`, `git status --short`, or an explicitly inspected changed-file list.
  - `actual_changed_files`: array of non-empty path strings copied from the inspected changed-file source. For per-task review this mirrors `task_end_changed_files`; for final-review/global evidence this is the whole-work-item changed-file list.
  - `notes`: array of strings for manual reviewer context.
- `execute` must manually capture `task_start_changed_files` before task edits, `task_end_changed_files` after task edits, and `task_local_changed_files` using the declared `attribution_method`. It must record matching entries in `ownership_evidence.changed_files` with the matching ownership `entry_id` as `ownership_entry_id` for each task-local changed file.
- If a task edits a file already present in `task_start_changed_files`, it must list that file in `preexisting_changed_files_touched` and cite the matching ownership allowance in `changed_files[]`. Omission is a task review failure.
- Task reviewers manually compare `task_local_changed_files` and `preexisting_changed_files_touched` to `ownership_evidence.changed_files[].path` and the task's ownership allowances. Any omitted task-local or preexisting-touched file is an ownership evidence failure and must be recorded as `coverage_status: "uncovered"`, a blocker, or a route-back reason.
- Each completed task T01 through T06 must create or update its own `docs/supercode/<work_id>/verification/<task_id>.json` before it is considered complete. The record must include the base Phase 2 verification fields plus Phase 3 `ownership_evidence` and `security_trigger_evidence`; if either evidence category is not applicable, it must still be present with explicit `not_applicable`/`not_triggered` evidence rather than omitted.
- Final-review must perform a global ownership path-coverage check: compare fresh whole-work-item changed-file paths against the union of exact `target` paths in active ownership allowances in `docs/supercode/<work_id>/ownership.json` and fail any unowned changed-file path, regardless of per-task attribution.
- Global ownership compliance is path coverage only because the global changed-file list is path-only. Operation compliance is checked separately through per-task `ownership_evidence.changed_files[].operation` values against the matching ownership entry's `allowed_operations` and mode invariants.
- Final-review should flag globally changed paths whose only matching active entries are `read_only` or `orchestrator_owned` unless `pre_registry_bootstrap` or explicit orchestrator provenance explains the change.
- Final-review must allow an initial file create for append-only artifacts only when the create is covered by a released T00 bootstrap creation entry or explicit `pre_registry_bootstrap` provenance. Later active `shared_append` entries must not include or imply `create`.
- Final-review also checks per-task attribution evidence for omissions when available, but global unowned changed files are sufficient for failure even if the responsible task is ambiguous.
- Phase 3-1 does not automate patch subtraction, snapshot differencing, or git-diff ownership validation; it defines the manual evidence protocol and review failure rules. Phase 3-2 may add snapshot/patch automation.
- `pre_registry_bootstrap` is the required provenance marker for spec/plan/worktree artifacts that existed or changed before T00 established the provisional Phase 3 registry. It is not an exemption: final-review still performs global path coverage against the registry, but task-local attribution for pre-T00 history may use this explicit provenance instead of invented per-task attribution.

#### Security trigger boundedness contract

- Security triggers apply when the work changes code or workflow behavior that affects a listed security-sensitive capability.
- Routine executor mechanics, such as editing ordinary docs/tests/schemas, running tests/typecheck, or making non-security wording changes, do not automatically require security research unless they affect authentication/authorization, secrets, filesystem mutation behavior, shell execution behavior, git operation behavior, network/API behavior, dependency behavior, sandbox/worktree/permission/path traversal behavior, or generated-code handling of untrusted input.
- Minimal evidence location/shape: applicable trigger decisions are recorded in the plan artifact under the security/risk trigger challenge and in per-task verification records as a manual `security_trigger_evidence` object with `triggered_categories`, `decision`, `evidence_refs`, and `notes`.
- Canonical `SecurityTriggerCategorySchema` values: `authentication_authorization`, `secrets_credentials_env_tokens`, `filesystem_mutation`, `shell_command_execution`, `git_operation`, `network_external_api`, `dependency_install_update`, `sandbox_worktree_permission_path`, `generated_untrusted_input`.
- Canonical `security_trigger_evidence.decision` values: `not_triggered`, `triggered_evidence_recorded`, `route_back_required`.

#### Strict-completion matrix contract

- Matrix rows are limited to approved spec success criteria only; execution and final-review must not add new completion criteria.
- Canonical row mapping: `spec_success_criterion -> plan_task_ids -> verification_evidence -> status`.
- Canonical matrix statuses: `pending`, `satisfied`, `blocked`, `not_applicable`.
- Phase 3-1 records the matrix as a markdown table inside the plan artifact and final-review artifact/section. A separate structured machine-checkable completion matrix artifact remains deferred to Phase 3-2.
- After plan approval, `plan.md` is read-only execution input with `pre_registry_bootstrap` provenance. Execution must not update strict-completion statuses/evidence in `plan.md`; task evidence belongs in `verification/<task_id>.json`, and final status/evidence belongs in the final-review artifact/section.

#### Current-work bootstrap contract

- This work item must bootstrap provisional Phase 3 artifacts before helper/schema/skill-doc execution tasks begin, then validate/finalize them after helper schemas exist.
- Required current-work artifacts:
  - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json` with exact repo-relative path entries covering every file planned for creation/modification in this plan, including the current-work artifacts themselves.
  - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl` with append-only initialization and handoff/status records for this work item.
  - The strict-completion matrix in this `plan.md` and a final-review matrix section/artifact at review time.
- T00 creates provisional artifacts using the canonical fields in this plan. T05 validates/finalizes those artifacts with the implemented helper schemas and opt-in current-work test.
- Once T00 establishes the provisional registry, missing or ambiguous Phase 3 ownership/mailbox/strict-completion evidence for T01 and later is not exempt for this work item; it must fail task review or final-review under the new contract.

#### Skill doc canonical-reference contract

- `src/skills/plan/SKILL.md` and `src/skills/execute/SKILL.md` should contain the canonical Phase 3-1 coordination reference sections that list exact mailbox, ownership, ownership mode/operation invariants, security evidence, and strict-completion field/status names.
- Centralize exact enum/status assertion tests against those canonical `plan`/`execute` sections.
- Other touched skill docs should reference that canonical section semantically and include only the fields/statuses needed for their responsibilities. Contract tests should avoid forcing every enum string to be repeated in every skill doc.

## Scope

### In Scope

- Phase 3 coordination helper schemas, types, path helpers, and validation wrappers.
- `docs/supercode/<work_id>/mailbox.jsonl` path contract and mailbox message schema.
- `docs/supercode/<work_id>/ownership.json` path contract and ownership registry schema.
- Ownership modes: `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`.
- Workflow policy text making ownership violations review/final-review failures, including manual `ownership_evidence` changed-file-to-ownership requirements in per-task verification records.
- Hyperplan-lite challenge checklist inside the existing `plan` stage.
- Security trigger rules routed through existing spec/plan/execute/final-review research and review mechanisms.
- Strict-completion matrix concept mapping `spec success criterion -> plan task(s) -> verification evidence -> status`.
- Phase 3-2 roadmap preservation as deferred work only.
- Tests for helper behavior, no-I/O helper constraints, skill contracts, negative scope boundaries, and existing Phase 2 regression coverage.

### Out of Scope

- Per-worker worktrees, OS/distributed locks, runtime message broker infrastructure, free agent chat, raw OMO Team Mode, raw `ulw`/ultrawork, ultragoal mode, broad AI-slop cleanup automation, and any new public workflow stage.
- Automatic git-diff-based ownership validation, glob ownership matching, directory-prefix ownership expansion, conflict preflight automation, mailbox routing enforcement, actual security reviewer execution subsystem, multi-agent hyperplan runtime, and machine-checkable completion matrix artifact. These remain Phase 3-2 roadmap items.

## Assumptions

- The helper module may be named `src/hooks/workflow-coordination-artifacts.ts` unless execution finds an existing naming convention conflict.
- Permanent tests should use fixture/in-memory samples and markdown reads from repository files, matching existing Phase 2 test style.
- `bun test` and `bun run typecheck` are the authoritative full verification commands.
- Phase 3-1 documents hard workflow policy and manual `ownership_evidence` requirements for ownership violations without implementing automatic git-diff-based validation.
- Security triggers require bounded evidence/review only when applicable; they must not force every work item through heavy security review.

## Source Spec Alignment

| Spec success criterion | Planned coverage |
|---|---|
| 1. Coordination artifacts specified with canonical fields and narrow statuses/modes | T01/T02 helper schemas and tests; T03/T04 markdown contracts |
| 2. Pure helper schemas/path helpers validate mailbox and ownership without filesystem I/O | T01/T02 helper test and implementation |
| 3. Skill docs describe mailbox lifecycle responsibilities | T03/T04 contract tests and skill updates |
| 4. Skill docs describe ownership responsibilities and hard failure behavior | T03/T04 contract tests and skill updates |
| 5. Plan-stage docs include hyperplan-lite expectations | T03/T04 plan skill contract updates |
| 6. Security trigger rules are documented and routed through existing mechanisms | T03/T04 spec/plan/execute/final-review updates |
| 7. Strict-completion acceptance matrix is documented | T03/T04 plan/final-review updates |
| 8. Tests cover helpers, contracts, and negative scope boundaries | T01/T03/T05 |
| 9. Existing Phase 2 tests continue to pass | T06 full test run |
| 10. Full verification passes | T06 `bun test`; `bun run typecheck` |
| 11. Phase 3-2 roadmap preserved without implementing it | T03/T04 negative and roadmap contract coverage |

## Strict-Completion Matrix for This Work

This matrix is the Phase 3-1 markdown strict-completion matrix for the current work item. It is limited to approved spec success criteria.

| Spec success criterion | Plan task ids | Verification evidence | Status |
|---|---|---|---|
| 1. Phase 3-1 coordination artifacts are specified with canonical fields and narrow statuses/modes where appropriate. | T00, T01, T02, T03, T04, T05 | Provisional current-work artifacts, helper tests, helper schemas, markdown contract tests, current-work `ownership.json`/`mailbox.jsonl` validation | pending |
| 2. Pure helper schemas/path helpers validate mailbox and ownership artifact shapes without filesystem I/O. | T01, T02 | `bun test src/__tests__/workflow-coordination-artifacts.test.ts`; `bun run typecheck`; helper purity assertion | pending |
| 3. Skill docs describe mailbox lifecycle responsibilities for relevant stages. | T00, T03, T04, T05 | Provisional mailbox bootstrap; `bun test src/__tests__/phase3-coordination-contract.test.ts`; current-work mailbox artifact validation | pending |
| 4. Skill docs describe ownership registry responsibilities and hard workflow failure behavior for ownership violations. | T00, T03, T04, T05 | Provisional ownership bootstrap; markdown contract tests; current-work ownership registry validation; current-work evidence protocol validation | pending |
| 5. Plan-stage docs include hyperplan-lite multi-perspective challenge expectations. | T03, T04 | Markdown contract tests for `src/skills/plan/SKILL.md` | pending |
| 6. Security trigger rules are documented and routed to existing research/review mechanisms without creating a new public stage. | T01, T02, T03, T04, T05 | Helper tests for `SecurityTriggerCategorySchema`/`SecurityTriggerEvidenceSchema`; markdown contract tests; current-work validation | pending |
| 7. Strict-completion is documented as an acceptance matrix tied to spec criteria, plan tasks, and verification evidence. | T00, T03, T04, T05 | This matrix in `plan.md`; markdown contract tests; final-review matrix section | pending |
| 8. Tests cover helper behavior, skill contract requirements, and negative scope boundaries. | T01, T03, T05, T06 | Targeted test runs, current-work validation, and full `bun test` | pending |
| 9. Existing Phase 2 artifact tests continue to pass. | T04, T06 | `bun test src/__tests__/phase2-artifact-state-contract.test.ts`; full `bun test` | pending |
| 10. Full verification passes: `bun test` and `bun run typecheck`. | T06 | Final `bun test`; final `bun run typecheck` | pending |
| 11. The spec and later plan explicitly preserve the Phase 3-2 roadmap without implementing it in Phase 3-1. | T03, T04, T05, T06 | Markdown contract tests; current-work scope-boundary validation; final scope review | pending |

## Execution Policy

- Follow TDD for behavior/contract changes: add or update tests first, confirm targeted failure, then implement the minimal production/markdown change to pass.
- Do not modify production/test code outside the files listed in task file targets unless execution routes back to planning with evidence.
- Keep helper modules pure: no `node:fs`, `node:path` filesystem access, shell execution, subprocesses, network calls, or `todowrite` dependency inside the helper module.
- Use existing workflow stages only. Do not create a new skill directory, command, or public stage.
- Treat documentation text as executable contract where covered by markdown tests; avoid wording-only changes that are not tied to a test where the spec requires durable behavior.
- Prefer narrow enums and simple shapes over future-proof abstractions.
- Preserve existing Phase 2 behavior and tests.

## File Structure

### Create

- `src/hooks/workflow-coordination-artifacts.ts`
- `src/__tests__/workflow-coordination-artifacts.test.ts`
- `src/__tests__/phase3-coordination-contract.test.ts`
- `src/__tests__/workflow-coordination-artifacts-current-work.test.ts`
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json`
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl`
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T00.json` through `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T06.json` when task verification records are produced.
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/final-review.md` during final-review.

### Modify

- `src/skills/spec/SKILL.md`
- `src/skills/plan/SKILL.md`
- `src/skills/pre-execute-alignment/SKILL.md`
- `src/skills/execute/SKILL.md`
- `src/skills/final-review/SKILL.md`

### Do Not Modify Unless Routed Back

- Public workflow stage list or skill directory structure.
- `src/skills/worktree/SKILL.md`, `src/skills/finish/SKILL.md`, and `src/skills/todo-sync/SKILL.md`.
- Runtime hook code outside `src/hooks/workflow-coordination-artifacts.ts`.

## File Responsibilities

- `src/hooks/workflow-coordination-artifacts.ts`: pure Phase 3 coordination artifact schemas, type exports, path helpers, and validation wrappers for mailbox messages and ownership registry.
- `src/__tests__/workflow-coordination-artifacts.test.ts`: in-memory tests for schema acceptance/rejection, path helper output, validation wrappers, and helper purity/no-I/O import constraints.
- `src/__tests__/phase3-coordination-contract.test.ts`: markdown contract tests for mailbox lifecycle, ownership hard policy and `ownership_evidence`, hyperplan-lite checklist, security triggers and `security_trigger_evidence`, strict-completion matrix location/statuses, Phase 3-2 roadmap preservation, and explicit exclusions.
- `src/__tests__/workflow-coordination-artifacts-current-work.test.ts`: opt-in `WORK_ID` current-work validation for `ownership.json`, `mailbox.jsonl`, required completed-task verification records with Phase 3 evidence, and required strict-completion matrix rows in read-only `plan.md`; skipped unless `WORK_ID` is set.
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json`: current-work ownership registry covering exact repo-relative paths planned for this work item; provisionally created by T00 and validated/finalized by T05 after helper schemas exist.
- `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl`: current-work append-only mailbox records for initialization, handoffs/status, blockers/route-backs if any, and final-review evidence gaps if any.
- `src/skills/spec/SKILL.md`: security-trigger identification and bounded routing expectations at spec time; Phase 3-2 roadmap/exclusion preservation if relevant to requested work.
- `src/skills/plan/SKILL.md`: canonical Phase 3-1 coordination reference section, hyperplan-lite challenge checklist, challenge finding resolution/acceptance recording, ownership/concurrency planning expectations, security trigger planning, and strict-completion matrix planning.
- `src/skills/pre-execute-alignment/SKILL.md`: ownership registry preparation, conflict-sensitive batching based on ownership modes, mailbox handoff expectations, and execution-alignment ownership constraints.
- `src/skills/execute/SKILL.md`: hard workflow policy for ownership scope, mailbox record updates for durable handoffs/blockers/findings, bounded security-trigger evidence handling, and Phase 3-2 deferrals.
- `src/skills/final-review/SKILL.md`: final review inspection of mailbox/ownership/completion evidence, hard failure on ownership violations, security-trigger evidence adequacy, and strict-completion matrix checks.

## Task Sections

### T00 — Bootstrap provisional current-work Phase 3 coordination artifacts

- **Purpose:** Establish non-ad-hoc Phase 3 current-work ownership, mailbox, and evidence protocol artifacts before T01-T04 modify code/docs under the new contract.
- **Files to create / modify / test:**
  - Create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json`.
  - Create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl`.
  - Create/update provisional verification evidence records under `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/` as tasks complete.
  - No helper/test/skill implementation files are modified in T00.
- **Concrete steps:**
  1. Create provisional `ownership.json` using the canonical fields defined in this plan, even before helper schemas exist.
  2. Include exact repo-relative `path` entries for all expected workflow and implementation artifacts for this work item, including at minimum:
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/spec.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/evidence.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/plan.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/state.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ledger.jsonl`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/final-review.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T00.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T01.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T02.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T03.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T04.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T05.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T06.json`
     - `src/hooks/workflow-coordination-artifacts.ts`
     - `src/__tests__/workflow-coordination-artifacts.test.ts`
     - `src/__tests__/phase3-coordination-contract.test.ts`
     - `src/__tests__/workflow-coordination-artifacts-current-work.test.ts`
     - `src/skills/spec/SKILL.md`
     - `src/skills/plan/SKILL.md`
     - `src/skills/pre-execute-alignment/SKILL.md`
     - `src/skills/execute/SKILL.md`
     - `src/skills/final-review/SKILL.md`
  3. Use exact `target_type: "path"` only; do not use globs or directory-prefix ownership.
  4. Create ownership entries using these explicit entry rules; every entry has `target_type: "path"`, `conflict_notes: []`, and `blocker_refs: []` unless a real blocker exists. Entries are `status: "active"` except released bootstrap creation entries as noted:

     | Target(s) | Entry id pattern | Owner task id(s) | Mode | Allowed operations | Policy summary |
     |---|---|---|---|---|---|
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/spec.md`, `docs/supercode/20260508-phase3-coordination-foundation-d7f4/evidence.md` | `own-T00-readonly-<slug>` | `T00` | `read_only` | `["read"]` | Existing pre-registry source artifact; read-only during Phase 3-1 execution unless routed back. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/plan.md` | `own-plan-readonly-T00` | `T00` | `read_only` | `["read"]` | Approved plan is read-only execution input after plan approval; strict-completion rows are defined here, but execution/final statuses and evidence are recorded in verification records and final-review artifact/section, not by editing `plan.md`. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json` | `own-ownership-T00`, `own-ownership-T05` | `T00`, `T05` | `sequenced_write` | `["read", "write", "create"]` | Serial registry lifecycle: T00 creates provisional registry; T05 validates/finalizes after schemas exist. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl` | `own-mailbox-bootstrap-T00` | `T00` | `exclusive_write` | `["read", "create", "write"]` | Bootstrap creation entry for mailbox because the file does not exist before T00; set `status: "released"` immediately after creation. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl` | `own-mailbox-<owner>` | one entry each for `orchestrator`, `T00`, `T01`, `T02`, `T03`, `T04`, `T05`, `T06` | `shared_append` | `["read", "append"]` | Active append-only durable mailbox records after bootstrap creation; no create/rewrite/reorder/delete. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ledger.jsonl` | `own-ledger-<owner>` | one entry each for `orchestrator`, `T00`, `T01`, `T02`, `T03`, `T04`, `T05`, `T06` | `shared_append` | `["read", "append"]` | Append-only durable workflow ledger records; no rewrite/reorder/delete. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/state.json` | `own-state-orchestrator` | `orchestrator` | `orchestrator_owned` | `["read", "write", "create"]` | Workflow state is orchestrator-owned; executors may read but must not rewrite unless explicitly assigned. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/final-review.md` | `own-final-review-orchestrator` | `orchestrator` | `orchestrator_owned` | `["read", "write", "create"]` | Final-review artifact is reviewer/orchestrator-owned, not executor-owned. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T00.json` | `own-verification-T00` | `T00` | `exclusive_write` | `["read", "write", "create"]` | T00 task verification record. |
     | `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T01.json` through `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T06.json` | `own-verification-<task_id>` | matching `T01` through `T06` | `exclusive_write` | `["read", "write", "create"]` | Each task owns only its own verification record. |
     | `src/__tests__/workflow-coordination-artifacts.test.ts` | `own-T01-helper-test` | `T01` | `exclusive_write` | `["read", "write", "create"]` | T01 creates/updates helper contract tests. |
     | `src/hooks/workflow-coordination-artifacts.ts` | `own-T02-helper` | `T02` | `exclusive_write` | `["read", "write", "create"]` | T02 creates/updates pure helper module. |
     | `src/__tests__/phase3-coordination-contract.test.ts` | `own-T03-contract-test` | `T03` | `exclusive_write` | `["read", "write", "create"]` | T03 creates/updates markdown contract tests. |
     | `src/skills/spec/SKILL.md`, `src/skills/plan/SKILL.md`, `src/skills/pre-execute-alignment/SKILL.md`, `src/skills/execute/SKILL.md`, `src/skills/final-review/SKILL.md` | `own-T04-<slug>` | `T04` | `exclusive_write` | `["read", "write"]` | T04 updates existing skill docs only. |
     | `src/__tests__/workflow-coordination-artifacts-current-work.test.ts` | `own-T05-current-work-test` | `T05` | `exclusive_write` | `["read", "write", "create"]` | T05 creates/updates opt-in current-work validation test. |

  5. For `shared_append` artifacts, create one active entry per allowed owner exactly as listed above; do not create a single multi-owner entry. If T00 creates an append-only file from scratch, also create a separate T00 bootstrap creation entry with `status: "released"` after creation.
  5a. For `ledger.jsonl`, if the file already exists before T00, shared append entries plus `pre_registry_bootstrap` provenance are sufficient. If T00 must create it from scratch, apply the same bootstrap creation-entry pattern as `mailbox.jsonl` with `entry_id: "own-ledger-bootstrap-T00"`, `owner_task_id: "T00"`, mode `exclusive_write`, `allowed_operations: ["read", "create", "write"]`, and `status: "released"` after creation.
  6. For sequenced paths, `own-ownership-T00` is valid only for T00 bootstrap and `own-ownership-T05` is valid only after T04 completes; no parallel batch may include both owners for `ownership.json`. `plan.md` is not sequenced during execution and must remain read-only after approval.
  7. Create `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/` and create `verification/T00.json` during T00.
  8. Minimum valid provisional `verification/T00.json` must include existing Phase 2 verification fields: `task_id: "T00"`, `status: "completed"`, `commands: []`, `results: []`, non-empty `executor_evidence`, `reviewer_outcomes: null`, `diagnostics_status` object with non-empty `status` and `summary`, `unresolved_concerns: []`, and `record_status: "verified"` or `"pending"` if review has not occurred. It must also include passthrough `ownership_evidence` with `attribution_method: "pre_registry_bootstrap"` and `security_trigger_evidence` with `decision: "not_triggered"` unless T00 changes a security-sensitive risk surface.
  9. Create `mailbox.jsonl` with exactly these minimum bootstrap records before T01 starts:
     - Record 1: `message_type: "status_update"`, `status: "resolved"`, `sender: "orchestrator"`, `recipient: "T00"`, `stage: "execute"`, `task_id: "T00"`, summary stating provisional ownership registry and mailbox were initialized, and `artifact_refs` including `ownership.json`, `mailbox.jsonl`, and `verification/T00.json`.
     - Record 2: `message_type: "executor_handoff"`, `status: "open"`, `sender: "T00"`, `recipient: "T01"`, `stage: "execute"`, `task_id: "T01"`, summary stating T01+ must use the provisional ownership/evidence protocol and cannot proceed without matching ownership evidence, and `artifact_refs` including `ownership.json` and this `plan.md`.
     - Both records must include non-empty `message_id`, shared `thread_id` or clearly related thread ids, non-empty `timestamp`, non-empty `summary`, and non-empty `artifact_refs`.
  10. Record `pre_registry_bootstrap` provenance in T00 mailbox/evidence notes for spec/plan/worktree artifacts that existed or changed before T00. This is explicit provenance, not a final-review exemption.
  11. Ensure the T00 handoff explicitly states every completed task T01-T06 must produce its own verification record with base Phase 2 fields plus Phase 3 `ownership_evidence` and `security_trigger_evidence` or explicit not-applicable/not-triggered evidence.
- **Explicit QA / verification:**
  - Manual inspection confirms `ownership.json` and `mailbox.jsonl` exist before T01 starts.
  - Manual inspection confirms `ownership.json` entries include explicit `entry_id`, `owner_task_id`, `mode`, `status`, `allowed_operations`, and `policy_summary` for every target listed in the T00 ownership table.
  - Manual inspection confirms `mailbox.jsonl` has a released T00 bootstrap creation entry plus active `shared_append` entries, and that active `shared_append` entries do not include `create`.
  - Manual inspection confirms `shared_append` artifacts have one entry per allowed owner (`orchestrator`, `T00` through `T06`) and `mailbox.jsonl`/`ledger.jsonl` future writes are not governed by active `exclusive_write` entries.
  - Manual inspection confirms `verification/` and `verification/T00.json` exist with the minimum Phase 2 fields and Phase 3 passthrough evidence fields described above.
  - Manual inspection confirms `mailbox.jsonl` contains the two minimum bootstrap records with all canonical mailbox fields.
  - No automated helper validation is required in T00 because helper schemas do not exist yet; T05 must validate/finalize these artifacts.
- **Expected result:** T01-T04 can proceed under provisional Phase 3 current-work ownership/mailbox/evidence protocol without ad hoc final-review exemption.
- **Dependency notes:** First execution task; no implementation dependencies.
- **Parallel eligibility:** Not parallel; T01 is not executable until T00 artifacts exist. Alignment can still plan serial handoff after T00.

### T01 — Add Phase 3 helper contract tests

- **Purpose:** Define the executable contract for mailbox and ownership helper behavior before implementing the helper module.
- **Files to create / modify / test:**
  - Create `src/__tests__/workflow-coordination-artifacts.test.ts`.
  - Test future file `src/hooks/workflow-coordination-artifacts.ts`.
- **Concrete steps:**
  1. Add failing tests that import the planned helper exports.
  2. Cover mailbox path helper output: `docs/supercode/<work_id>/mailbox.jsonl`.
  3. Cover ownership path helper output: `docs/supercode/<work_id>/ownership.json`.
  4. Cover valid mailbox message fixture with exactly the canonical fields listed in the Mailbox message contract: `message_id`, `thread_id`, `timestamp`, `sender`, `recipient`, `message_type`, `stage`, `task_id`, `summary`, `artifact_refs`, `status`.
  5. Cover all exact mailbox `message_type` values: `research_request`, `research_response`, `executor_handoff`, `reviewer_finding`, `blocker`, `route_back_reason`, `final_review_evidence_gap`, `status_update`.
  6. Cover all exact mailbox `status` values: `open`, `acknowledged`, `resolved`, `blocked`, `superseded`.
  7. Cover invalid mailbox messages for missing canonical fields and unsupported `message_type`/`status`.
  8. Cover valid ownership registry fixture with top-level `work_id` and `entries`.
  9. Cover valid ownership entries with exactly the canonical fields listed in the Ownership registry contract: `entry_id`, `target`, `target_type`, `owner_task_id`, `mode`, `status`, `allowed_operations`, `policy_summary`, `conflict_notes`, `blocker_refs`.
  10. Cover exact `target_type` value `path` only; add negative tests rejecting `glob` as Phase 3-2 deferred.
  11. Cover every required ownership mode: `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`.
  12. Cover all exact ownership `status` values: `active`, `released`, `blocked`, `violated`.
  13. Cover all exact `allowed_operations` values: `read`, `write`, `append`, `create`, `delete`, `rename`.
  14. Cover valid and invalid ownership mode/operation/actor invariants exactly: `read_only` accepts only `read` and permits task ids or `orchestrator` for pre-registry/read-only provenance; `exclusive_write` accepts `read`/`write`/`create`/`delete`/`rename`, rejects `append`, and normally requires task-id owners; `shared_append` accepts only `read`/`append`, allows `orchestrator` plus task owners, and rejects rewrite/delete/reorder/create/rename; `orchestrator_owned` requires `owner_task_id: "orchestrator"`; `sequenced_write` accepts `read`/`write`/`create`/`delete`/`rename`, rejects `append`, normally requires task-id owners, and requires docs/tests to assert serial batching.
  15. Cover shared ownership representation with multiple `shared_append` entries for the same target and different non-null actor `owner_task_id` values, including `orchestrator` and task ids; assert `shared_append` entries reject `create`.
  15a. Cover append-only bootstrap creation representation: a T00 `exclusive_write` or `sequenced_write` entry may include `create` for a new append-only file, must be `released` after creation in current-work artifacts, and must coexist with active `shared_append` entries for future appends.
  16. Cover orchestrator ownership representation with `owner_task_id: "orchestrator"`, invalid executor-owned `orchestrator_owned` fixtures, and invalid `exclusive_write`/`sequenced_write` entries using `orchestrator` without explicit provenance in `policy_summary`.
  17. Cover invalid ownership entries for unsupported `target_type`, mode, status, operation, missing owner/target fields, empty `allowed_operations`, missing `policy_summary`, invalid mode/operation combinations, absolute paths, paths containing `..`, empty path segments, and directory-prefix-only assumptions.
  18. Cover valid and invalid manual `OwnershipEvidenceSchema` fixtures for `ownership_evidence` with `task_start_changed_files`, `task_end_changed_files`, `task_local_changed_files`, `preexisting_changed_files_touched`, `attribution_method`, `attribution_limitations`, `actual_changed_files_source`, `actual_changed_files`, and `changed_files[]` entries containing `path`, `operation`, `ownership_entry_id`, and `coverage_status`; include `pre_registry_bootstrap` attribution method and `covered`, `uncovered`, `conflict`, and `not_applicable` coverage statuses.
  19. Cover omitted-evidence failures by testing that fixture-level manual comparison expectations reject or flag a case where `task_local_changed_files` or `preexisting_changed_files_touched` contains a path missing from `changed_files[].path`. This may be a pure helper validation/refinement or a test helper assertion; it must not require git I/O.
  20. Cover valid and invalid global ownership path-coverage fixtures that compare a whole-work-item changed-file path list against the union of exact ownership `target` paths and flag unowned changed-file paths without assigning them to a task or checking operations.
  21. Cover valid and invalid manual `SecurityTriggerEvidenceSchema` fixtures with narrow `triggered_categories`, `decision`, `evidence_refs`, and `notes`; include all canonical `SecurityTriggerCategorySchema` values and `not_triggered`, `triggered_evidence_recorded`, and `route_back_required` decisions.
  22. Cover a full `VerificationRecordSchema` fixture that embeds both `ownership_evidence` and `security_trigger_evidence` via passthrough fields, then separately validate those passthrough fields with Phase 3 helper schemas/manual comparison assertions. The base `VerificationRecordSchema` passing alone is not sufficient evidence validation.
  23. Add a source-text purity assertion that the helper module does not import or reference filesystem/shell/runtime dependencies such as `node:fs`, `fs`, `child_process`, `Bun.$`, or `todowrite`.
  - **Explicit QA / verification:**
  - Run targeted test command after adding tests and before implementation: `bun test src/__tests__/workflow-coordination-artifacts.test.ts`.
  - Expected TDD state before T02: targeted test fails because `src/hooks/workflow-coordination-artifacts.ts` or its exports do not exist.
  - Before T01 is marked complete, create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T01.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T01 changed files and `security_trigger_evidence` or explicit not-triggered evidence.
- **Expected result:** A failing, precise helper contract test suite that drives T02 implementation.
- **Dependency notes:** Depends on T00 provisional current-work artifact bootstrap.
- **Parallel eligibility:** Not parallel with T02 because it must establish the red test first. T03 waits for T02 so it can import helper schemas.

### T02 — Implement pure Phase 3 coordination helper module

- **Purpose:** Provide the machine-checkable Phase 3 coordination artifact foundation without filesystem I/O or runtime enforcement.
- **Files to create / modify / test:**
  - Create `src/hooks/workflow-coordination-artifacts.ts`.
  - Test `src/__tests__/workflow-coordination-artifacts.test.ts`.
- **Concrete steps:**
  1. Import only `zod`.
  2. Define and export `MailboxMessageTypeSchema` with exact values: `research_request`, `research_response`, `executor_handoff`, `reviewer_finding`, `blocker`, `route_back_reason`, `final_review_evidence_gap`, `status_update`.
  3. Define and export `MailboxStatusSchema` with exact values: `open`, `acknowledged`, `resolved`, `blocked`, `superseded`.
  4. Define and export `MailboxMessageSchema` with exact canonical fields: `message_id`, `thread_id`, `timestamp`, `sender`, `recipient`, `message_type`, `stage`, `task_id`, `summary`, `artifact_refs`, `status`. Use `.passthrough()` only if needed for future-safe metadata.
  5. Define and export `OwnershipModeSchema` with exact values: `exclusive_write`, `shared_append`, `orchestrator_owned`, `sequenced_write`, `read_only`.
  6. Define and export `OwnershipStatusSchema` with exact values: `active`, `released`, `blocked`, `violated`.
  7. Define and export `OwnershipTargetTypeSchema` with exact value `path` only; do not include `glob` in Phase 3-1.
  8. Define and export `AllowedOperationSchema` with exact values: `read`, `write`, `append`, `create`, `delete`, `rename`.
  9. Define and export `OwnershipEntrySchema` with exact canonical fields: `entry_id`, `target`, `target_type`, `owner_task_id`, `mode`, `status`, `allowed_operations`, `policy_summary`, `conflict_notes`, `blocker_refs`.
  10. Add schema refinements for exact repo-relative path constraints, rejecting absolute paths, `..` segments, empty path segments, and `glob` target types.
  11. Add schema refinements for the exact ownership mode/operation/actor invariants in this plan: allow `orchestrator` for `shared_append`; require `owner_task_id: "orchestrator"` for `orchestrator_owned`; allow `read_only` owner as task id or `orchestrator`; require `exclusive_write`/`sequenced_write` owners to be task ids unless `policy_summary` explicitly documents pre-registry/orchestrator provenance; reject invalid `allowed_operations` by mode; reject `create` in `shared_append`; allow append-only file creation only through a separate released bootstrap creation entry in registry/current-work fixtures.
  12. Define and export `OwnershipRegistrySchema` with exact top-level fields: `work_id` and `entries`.
  13. Define and export `OwnershipEvidenceSchema` for the manual per-task verification-record `ownership_evidence` object with `task_start_changed_files`, `task_end_changed_files`, `task_local_changed_files`, `preexisting_changed_files_touched`, `attribution_method`, `attribution_limitations`, `actual_changed_files_source`, `actual_changed_files`, `changed_files` entries containing `path`, `operation`, `ownership_entry_id`, `coverage_status`, plus top-level `notes`. Include exact `attribution_method` values `executor_edit_log`, `before_after_snapshot`, `reviewer_confirmed`, `pre_registry_bootstrap`, `not_applicable`. Include a pure refinement or exported pure helper that can compare `task_local_changed_files` and `preexisting_changed_files_touched` to `changed_files[].path` and fail/flag omissions without reading git or the filesystem.
  14. Define and export a pure global ownership path-coverage helper that accepts a whole-work-item changed-file path list and an ownership registry object and returns/validates unowned changed-file path findings without assigning task attribution, checking operations, reading git/filesystem state, expanding globs, expanding directories, preflighting conflicts, or enforcing runtime locks.
  15. Define and export `SecurityTriggerCategorySchema` with exact values: `authentication_authorization`, `secrets_credentials_env_tokens`, `filesystem_mutation`, `shell_command_execution`, `git_operation`, `network_external_api`, `dependency_install_update`, `sandbox_worktree_permission_path`, `generated_untrusted_input`.
  16. Define and export `SecurityTriggerEvidenceSchema` for the manual per-task verification-record `security_trigger_evidence` object with `triggered_categories`, `decision`, `evidence_refs`, and `notes`.
  17. Add pure path helpers `mailboxPath(workId: string)` and `ownershipPath(workId: string)`.
  18. Add validation wrappers `validateMailboxMessage(data: unknown)`, `validateOwnershipRegistry(data: unknown)`, `validateOwnershipEvidence(data: unknown)`, and `validateSecurityTriggerEvidence(data: unknown)` returning schema `safeParse` results.
  19. Export inferred TypeScript types for public helper schemas/enums.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/workflow-coordination-artifacts.test.ts` and confirm it passes.
  - Run `bun run typecheck` after helper implementation.
  - Check LSP diagnostics for `src/hooks/workflow-coordination-artifacts.ts` and `src/__tests__/workflow-coordination-artifacts.test.ts`; severity 1 diagnostics must be resolved or documented for route-back.
  - Before T02 is marked complete, create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T02.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T02 changed files and `security_trigger_evidence` or explicit not-triggered evidence.
- **Expected result:** Pure helper module satisfies the helper contract tests and typechecks.
- **Dependency notes:** Depends on T01 red tests.
- **Parallel eligibility:** Not parallel with T01 or T03 because T03 imports the helper schemas added here.

### T03 — Add Phase 3 skill markdown contract tests

- **Purpose:** Convert the Phase 3-1 skill documentation requirements into executable markdown contract tests before editing skill docs.
- **Files to create / modify / test:**
  - Create `src/__tests__/phase3-coordination-contract.test.ts`.
  - Read/validate `src/skills/spec/SKILL.md`, `src/skills/plan/SKILL.md`, `src/skills/pre-execute-alignment/SKILL.md`, `src/skills/execute/SKILL.md`, and `src/skills/final-review/SKILL.md`.
  - Import canonical schemas from `src/hooks/workflow-coordination-artifacts.ts` for enum/status consistency assertions.
- **Concrete steps:**
  1. Follow helper functions/patterns from `src/__tests__/phase2-artifact-state-contract.test.ts` for reading markdown and checking sections/semantic clusters.
  2. Add tests requiring canonical Phase 3-1 coordination reference sections in `src/skills/plan/SKILL.md` and `src/skills/execute/SKILL.md` that list exact mailbox/ownership/helper evidence enum, status, field names, and ownership mode/operation invariants.
  3. Add tests requiring mailbox lifecycle responsibilities across relevant stages, including durable `docs/supercode/<work_id>/mailbox.jsonl`, append-only orchestrator-mediated records, semantic references to the canonical section, resolution by follow-up `thread_id` status records, and no free agent chat/message broker wording.
  4. Add tests requiring ownership registry responsibilities, path `docs/supercode/<work_id>/ownership.json`, semantic references to the canonical section, exact repo-relative path matching only, glob/directory-prefix matching deferred, hard workflow failure behavior for ownership violations, manual per-task `ownership_evidence` in `docs/supercode/<work_id>/verification/<task_id>.json`, documented task-local attribution fields, failure on omitted task-local or preexisting-touched changed-file evidence, global final-review path-coverage comparison of whole-work-item changed-file paths against the union of ownership targets, separate per-task operation compliance checks, and conflict-sensitive batching.
  5. Add tests requiring `plan` to include hyperplan-lite perspectives: scope creep/non-goal, dependency/sequencing, verification adequacy, concurrency/ownership, security/risk trigger, and completion matrix.
  6. Add tests requiring security trigger categories from the spec, bounded routing through existing research/review mechanisms without a new public stage, and manual `security_trigger_evidence` in per-task verification records.
  7. Add negative security-trigger boundedness tests requiring docs to state that routine docs/tests/schema edits, test execution, and non-security wording changes do not automatically trigger security research unless they affect a security-sensitive risk surface.
  8. Add tests requiring strict-completion matrix wording tying approved spec success criteria only to plan tasks, verification evidence, and exact statuses `pending`, `satisfied`, `blocked`, `not_applicable`, while forbidding raw ultrawork/ulw scope expansion and new criteria during execution/final-review. Require the Phase 3-1 matrix to be recorded as a markdown table in the plan artifact and final-review artifact/section, with separate machine-checkable artifact deferred.
  9. Add tests that import `MailboxMessageTypeSchema`, `MailboxStatusSchema`, `OwnershipModeSchema`, `OwnershipStatusSchema`, `OwnershipTargetTypeSchema`, and `AllowedOperationSchema` from the helper module and require the canonical `plan`/`execute` reference sections to include those exact option strings plus the mode/operation invariant semantics, not synonyms. Do not require every touched skill doc to repeat every enum value.
  10. Add tests requiring explicit Phase 3-2 roadmap preservation for automatic ownership validation, conflict preflight, mailbox routing enforcement, actual security reviewer/research execution, multi-agent hyperplan, structured completion matrix artifact, and optional AI-slop cleanup gate.
  11. Add negative scope tests confirming per-worker worktrees, OS/distributed locks, full OMO Team Mode, raw `ulw`, free agent chat, and new public workflow stages remain excluded or deferred, not implemented.
- **Explicit QA / verification:**
  - Run targeted test command before skill doc edits: `bun test src/__tests__/phase3-coordination-contract.test.ts`.
  - Expected TDD state before T04: targeted test fails on missing Phase 3-1 skill contract text.
  - Before T03 is marked complete, create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T03.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T03 changed files and `security_trigger_evidence` or explicit not-triggered evidence.
- **Expected result:** A failing markdown contract suite that precisely identifies required skill documentation gaps.
- **Dependency notes:** Depends on T02 so markdown contract tests can import helper schemas for canonical enum/status consistency; should not edit skill docs.
- **Parallel eligibility:** Not parallel with T02 or T04. Must complete before T04.

### T04 — Update existing skill contracts for Phase 3-1 foundation

- **Purpose:** Make existing workflow stages describe the Phase 3-1 coordination foundation and pass markdown contract tests without adding runtime enforcement or new stages.
- **Files to create / modify / test:**
  - Modify `src/skills/spec/SKILL.md`.
  - Modify `src/skills/plan/SKILL.md`.
  - Modify `src/skills/pre-execute-alignment/SKILL.md`.
  - Modify `src/skills/execute/SKILL.md`.
  - Modify `src/skills/final-review/SKILL.md`.
  - Test `src/__tests__/phase3-coordination-contract.test.ts` and existing `src/__tests__/phase2-artifact-state-contract.test.ts`.
- **Concrete steps:**
  1. In `src/skills/spec/SKILL.md`, add bounded security trigger identification requirements and preserve Phase 3-2/deferred-scope wording where security, ownership, or coordination requirements arise.
  2. In `src/skills/plan/SKILL.md`, add one canonical Phase 3-1 coordination reference section listing exact mailbox, ownership, ownership mode/operation invariants, `ownership_evidence`, `security_trigger_evidence`, and strict-completion field/status names for other skills to reference.
  3. In `src/skills/plan/SKILL.md`, add hyperplan-lite as an internal planning challenge checklist, require recording major challenge findings and their resolution/acceptance in the plan artifact, and require strict-completion matrix planning without a new public stage. The strict-completion matrix rows must be limited to approved spec success criteria only; after plan approval, execution must not update matrix status/evidence in `plan.md` and must record task/final status evidence in verification records and final-review artifact/section.
  4. In `src/skills/plan/SKILL.md`, add planning expectations for ownership/concurrency and security/risk trigger challenges, aligned to existing `plan-checker`/`plan-challenger` roles.
  5. In `src/skills/pre-execute-alignment/SKILL.md`, add ownership registry setup expectations that reference the canonical `plan` section, conflict-sensitive batching rules, mailbox handoff expectations, and the rule that tasks without ownership allowance must not write affected files.
  6. In `src/skills/pre-execute-alignment/SKILL.md`, require assigning ownership entries per task before execution and documenting which ownership entries govern each task/batch.
  7. In `src/skills/execute/SKILL.md`, add a canonical execution ownership reference section with exact ownership mode/operation invariants; state that ownership violations are manual workflow-contract failures for task review/final review while automatic git-diff-based validation is deferred.
  8. In `src/skills/execute/SKILL.md`, require per-task verification records at `docs/supercode/<work_id>/verification/<task_id>.json` to include manual `ownership_evidence.task_start_changed_files`, `task_end_changed_files`, `task_local_changed_files`, `preexisting_changed_files_touched`, `attribution_method`, `attribution_limitations`, `actual_changed_files_source`, `actual_changed_files`, and `changed_files[]` entries for each task-local or preexisting-touched file with `path`, `operation`, `ownership_entry_id`, and `coverage_status`; execute must manually compare task-local/preexisting-touched files to evidence entries and treat omissions/uncovered/conflict entries as blockers or route-back reasons.
  9. In `src/skills/execute/SKILL.md`, add bounded security-trigger handling through existing research/review routes and explicitly avoid full security-research subsystem implementation; require manual `security_trigger_evidence` in per-task verification records and state routine docs/tests/schema edits and running tests do not trigger security research unless they change a security-sensitive risk surface.
  10. In `src/skills/final-review/SKILL.md`, add final review checks for append-only mailbox records, fresh global changed-file path evidence for the whole work item compared to the union of exact ownership target paths, per-task `ownership_evidence` attribution/operation checks where available, `security_trigger_evidence` adequacy, and strict-completion matrix evidence in the final-review artifact/section.
  11. In `src/skills/final-review/SKILL.md`, require final-review failure when any global changed-file path is unowned by the union of exact ownership target paths, when task-local/preexisting-touched evidence omits a changed file from `ownership_evidence.changed_files[]`, when manual `ownership_evidence` shows a changed file has no matching ownership allowance, or when the operation conflicts with its ownership mode/status; final-review should also flag paths whose only matching active entries are `read_only` or `orchestrator_owned` unless `pre_registry_bootstrap` or explicit orchestrator provenance explains them. Initial create for append-only files is allowed only when covered by a released T00 bootstrap creation entry or `pre_registry_bootstrap` provenance; later `shared_append` entries must not include create. Do not require an automated validator.
  12. Add or update explicit exclusions/deferred roadmap text across the touched skill docs for per-worker worktrees, OS/distributed locks, full OMO Team Mode, raw `ulw`, free agent chat, new public workflow stages, and Phase 3-2 automation items.
  13. Keep wording concise and sectioned so contract tests can assert semantic clusters rather than brittle snapshots.
- **Explicit QA / verification:**
  - Run `bun test src/__tests__/phase3-coordination-contract.test.ts` and confirm it passes.
  - Run `bun test src/__tests__/phase2-artifact-state-contract.test.ts` and confirm Phase 2 contracts still pass.
  - Check LSP/markdown not applicable for markdown files, but inspect failing test output for accidental scope expansion if tests fail.
  - Before T04 is marked complete, create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T04.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T04 changed files and `security_trigger_evidence` or explicit not-triggered evidence.
- **Expected result:** Existing skill docs express Phase 3-1 foundation contracts and explicit Phase 3-2 deferrals without introducing a new public workflow stage or runtime subsystem.
- **Dependency notes:** Depends on T03 red tests. Avoid editing helper module/test files.
- **Parallel eligibility:** Not parallel with T02 or T03 because T04 depends on helper-backed markdown contract tests from T03.

### T05 — Bootstrap current-work Phase 3 artifacts and validation

- **Purpose:** Apply the newly introduced Phase 3-1 contract to this same work item so final-review has concrete ownership, mailbox, and strict-completion evidence without ad hoc exemption.
- **Files to create / modify / test:**
  - Create `src/__tests__/workflow-coordination-artifacts-current-work.test.ts`.
  - Validate/finalize `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json` created by T00.
  - Validate/finalize `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl` created by T00.
  - Do not modify `docs/supercode/20260508-phase3-coordination-foundation-d7f4/plan.md`; it is read-only after plan approval.
  - Test current-work artifacts with `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts`.
- **Concrete steps:**
  1. Add an opt-in current-work validation test that skips unless `WORK_ID` is set, following the existing current-work validation pattern.
  2. Validate `docs/supercode/<WORK_ID>/ownership.json` by reading it only in this opt-in test and parsing it with Phase 3 helper schemas.
  3. Validate `docs/supercode/<WORK_ID>/mailbox.jsonl` by reading each non-empty JSONL line only in this opt-in test and parsing each record with `MailboxMessageSchema`.
  4. Validate `docs/supercode/<WORK_ID>/verification/T00.json` through `verification/T05.json` records with the base Phase 2 `VerificationRecordSchema`; these records are required by T05 because T00-T05 are completed or completing by then. Each record must include `ownership_evidence` and `security_trigger_evidence`; validate them with `OwnershipEvidenceSchema`, omitted-file comparison helpers, and `SecurityTriggerEvidenceSchema`.
  5. Validate `docs/supercode/<WORK_ID>/plan.md` contains the strict-completion matrix heading, approved spec success criteria rows, canonical statuses, and no additional success criteria.
  6. Before finalizing artifacts, run `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts`; expected TDD state may be failure because T00 artifacts have not yet been normalized to the implemented helper schemas or because the current-work validation test is new.
  7. Validate/finalize `ownership.json` with `work_id` and exact repo-relative `path` entries for all files planned for this work item, including at minimum:
     - `src/hooks/workflow-coordination-artifacts.ts`
     - `src/__tests__/workflow-coordination-artifacts.test.ts`
     - `src/__tests__/phase3-coordination-contract.test.ts`
     - `src/__tests__/workflow-coordination-artifacts-current-work.test.ts`
     - `src/skills/spec/SKILL.md`
     - `src/skills/plan/SKILL.md`
     - `src/skills/pre-execute-alignment/SKILL.md`
     - `src/skills/execute/SKILL.md`
     - `src/skills/final-review/SKILL.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/plan.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/spec.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/evidence.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/state.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ledger.jsonl`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/ownership.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/mailbox.jsonl`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/final-review.md`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T00.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T01.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T02.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T03.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T04.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T05.json`
     - `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T06.json`
  8. Use exact `target_type: "path"` only; do not use glob entries or directory-prefix coverage.
  9. Assign entries to task ids from this plan with modes matching intended operations: `exclusive_write` for new/modified code and skill docs, `shared_append` for append-only `mailbox.jsonl` and `ledger.jsonl`, `sequenced_write` for `ownership.json`, `read_only` for approved `plan.md`, `orchestrator_owned` for `state.json` and `final-review.md` unless explicitly assigned, `exclusive_write` for per-task verification records, and no write-capable entry for unplanned files.
  10. Validate/finalize `mailbox.jsonl` with append-only records including at least the T00 initialization `status_update`, a plan-to-execute handoff or bootstrap handoff record, and any blocker/route-back records if they occurred during implementation. `mailbox.jsonl` must remain `shared_append`, not `exclusive_write`.
  11. Ensure this `plan.md` contains the strict-completion matrix rows for this work item, but do not update statuses/evidence in `plan.md`; execution/final evidence belongs in verification records and final-review artifact/section. Do not add success criteria beyond the approved spec.
  12. Re-run `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts` and confirm it passes.
- **Explicit QA / verification:**
  - `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts` fails before T05 finalization if T00 artifacts do not match implemented schemas, and passes after `ownership.json`, `mailbox.jsonl`, and the plan matrix validate.
  - The current-work validation test must remain skipped when `WORK_ID` is unset so permanent `bun test` is not tied to mutable work item files.
  - Present verification records `T00` through `T06` must validate base verification shape, and any included `ownership_evidence`/`security_trigger_evidence` must validate with Phase 3 helper schemas.
  - For T05 completion specifically, records `T00` through `T05` must exist and include Phase 3 evidence. `T06` is validated during T06 final verification after T06 creates its own record.
  - Review `ownership.json` manually to confirm every listed target is exact repo-relative path syntax and no glob/directory-prefix assumptions are used.
  - Before T05 is marked complete, create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T05.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T05 changed files and `security_trigger_evidence` or explicit not-triggered evidence.
- **Expected result:** This work item has minimal Phase 3 current-work coordination artifacts and opt-in validation, so final-review can enforce Phase 3-1 contracts without exemption.
- **Dependency notes:** Depends on T02 helper schemas and T04 skill contracts. Runs before final verification.
- **Parallel eligibility:** Not parallel; it writes current-work artifacts and depends on prior contracts.

### T06 — Full regression, typecheck, and scope-boundary verification

- **Purpose:** Verify the completed Phase 3-1 foundation against all tests, typechecking, current-work artifact validation, and explicit non-goals.
- **Files to create / modify / test:**
  - Test all files changed in T01-T05.
  - No planned production/doc edits unless verification exposes a defect.
- **Concrete steps:**
  1. Run `bun test`.
  2. Run `bun run typecheck`.
  3. Run `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts`.
  4. If failures occur, route back to the responsible prior task based on failing file/contract rather than broad refactoring.
  5. Review changed files to confirm no new public workflow stage, skill directory, runtime filesystem locking, per-worker worktree logic, message broker, free agent chat, raw `ulw`, or broad AI-slop cleanup automation was added.
  6. Review helper module source to confirm it remains pure and contains no filesystem, shell, network, `todowrite`, or mutable current-work validation behavior outside the opt-in test.
  7. Review skill docs to confirm Phase 3-2 roadmap items are documented as deferred and not described as implemented enforcement.
  8. Review skill docs and helper tests together to confirm canonical mailbox/ownership enum, status, and field names match exactly.
  9. Review security-trigger wording to confirm routine docs/tests/schema work and test execution are not treated as automatic security-research triggers unless the change affects a security-sensitive risk surface.
  10. Review strict-completion wording to confirm matrix rows are limited to approved spec success criteria and exact statuses `pending`, `satisfied`, `blocked`, `not_applicable`.
  11. Review skill docs to confirm ownership hard failure is tied to manual `ownership_evidence` in per-task verification records and not described as automated git-diff validation.
  12. Review helper tests and skill docs to confirm invalid ownership mode/operation combinations fail and exact invariants are documented in canonical `plan`/`execute` reference sections.
  13. Review helper tests and skill docs to confirm omitted changed-file evidence fails: task-local and preexisting-touched files must be manually compared to `ownership_evidence.changed_files[]`, final-review must compare global changed-file paths to the union of exact ownership target paths, global checks are path coverage only, and base `VerificationRecordSchema` passthrough acceptance alone must not be treated as Phase 3 evidence validation.
  14. Review helper tests and skill docs to confirm Phase 3-1 rejects glob ownership, absolute paths, `..`, directory-prefix expansion, and any filesystem/git/glob runtime behavior in helper logic.
  15. Review current-work artifacts to confirm there is no ad hoc exemption for T01+ after T00 and no ad hoc final-review exemption after T05.
  16. Review ownership modes for workflow artifacts: `mailbox.jsonl` and `ledger.jsonl` must be `shared_append`, `ownership.json` must be serially controlled, approved `plan.md` must be `read_only`, and state/final-review artifacts must not be executor-writable unless explicitly assigned.
  17. Create/update `docs/supercode/20260508-phase3-coordination-foundation-d7f4/verification/T06.json` with base Phase 2 fields plus Phase 3 `ownership_evidence` for T06 validation/review changes and `security_trigger_evidence` or explicit not-triggered evidence, then re-run current-work validation so T00-T06 records are all checked.
- **Explicit QA / verification:**
  - `bun test` must pass.
  - `bun run typecheck` must pass.
  - `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts` must pass.
  - T06 final current-work validation must include required verification records T00 through T06, each with Phase 3 evidence fields.
  - LSP diagnostics severity 1 should be checked for `src/hooks/workflow-coordination-artifacts.ts`, `src/__tests__/workflow-coordination-artifacts.test.ts`, and `src/__tests__/phase3-coordination-contract.test.ts` after final edits.
  - Scope-boundary review must be recorded in executor evidence for final review.
  - Canonical contract consistency review must confirm helper schemas, helper tests, and markdown contract tests use the same enum/status/field names.
  - Evidence carrier review must confirm `ownership_evidence`, `security_trigger_evidence`, and markdown strict-completion matrix locations are documented.
  - Ownership invariant review must confirm helper schema refinements and markdown contracts reject invalid mode/operation combinations and document shared/orchestrator ownership representation.
  - Ownership actor review must confirm `orchestrator` is valid for `shared_append` and `orchestrator_owned`, `orchestrator_owned` requires `orchestrator`, and `exclusive_write`/`sequenced_write` require task ids unless explicit provenance is documented.
  - Append-only bootstrap review must confirm files created by T00 before becoming append-only have a released bootstrap creation entry and active `shared_append` entries without `create`.
  - Omitted-evidence review must confirm task-local attribution, preexisting-touched file handling, and global ownership path-coverage comparison are documented for execute/final-review and represented in pure fixtures without filesystem/git automation.
  - Path matching review must confirm exact repo-relative path equality only and no glob/directory-prefix matching in Phase 3-1.
- **Expected result:** Full repository verification passes, current-work Phase 3 artifact validation passes, Phase 2 tests remain green, and Phase 3-1 remains a bounded foundation/contract layer.
- **Dependency notes:** Depends on T02, T04, and T05 completion.
- **Parallel eligibility:** Not parallel; final serial verification only.

## QA Standard

- Minimum targeted TDD checks:
  - `bun test src/__tests__/workflow-coordination-artifacts.test.ts` fails before T02 and passes after T02.
  - `bun test src/__tests__/phase3-coordination-contract.test.ts` fails before T04 and passes after T04.
- Required regression checks:
  - `bun test src/__tests__/phase2-artifact-state-contract.test.ts` after skill doc edits.
  - `WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts` after current-work artifacts are created.
  - `bun test` after all implementation/doc contract work.
  - `bun run typecheck` after TypeScript helper work and at final verification.
- Required static checks:
  - LSP diagnostics severity 1 for new TypeScript helper/test files after implementation.
  - Source-text helper purity assertion in tests and final manual scope-boundary review.
  - Exact canonical-name consistency across helper schemas, helper tests, and skill markdown contract tests.
  - Manual evidence carrier coverage for `ownership_evidence`, `security_trigger_evidence`, and markdown strict-completion matrix locations.
  - Current-work artifact coverage for `ownership.json`, `mailbox.jsonl`, this plan's read-only strict-completion matrix rows, and verification records with Phase 3 evidence; no ad hoc final-review exemption after T05.
  - Bootstrap ordering coverage: T00 must establish provisional current-work artifacts before T01-T04, and T05 must validate/finalize them after schemas exist.
  - Workflow artifact ownership coverage: expected workflow artifacts must be listed with correct modes, including `shared_append` for `mailbox.jsonl`/`ledger.jsonl` and explicit entries for state, verification, ownership, mailbox, and final-review paths.
  - Plan authority coverage: `plan.md` must remain read-only after approval; execution/final statuses and evidence must be recorded in verification records and final-review artifact/section.
  - Per-task verification coverage: completed T01-T06 tasks must create/update their own verification record with base Phase 2 fields and Phase 3 evidence fields or explicit not-applicable/not-triggered evidence.
  - Ownership mode/operation invariant coverage in helper schema refinements, helper fixtures, and canonical `plan`/`execute` skill reference sections.
  - Manual changed-file omission coverage: tests must fail/flag when `task_local_changed_files` or `preexisting_changed_files_touched` includes a path missing from `ownership_evidence.changed_files[]`, and global path-coverage fixtures must flag whole-work-item changed-file paths not covered by the union of exact ownership target paths; passthrough verification-record acceptance alone is insufficient.
  - Path matching coverage: tests must reject glob target types, absolute paths, `..` paths, empty path segments, and directory-prefix-only coverage assumptions.
- Failure handling:
  - Test failures must be fixed in the smallest responsible task/file.
  - Any need for runtime enforcement, a new stage, per-worker worktree, lock implementation, security subsystem, or automatic git-diff-based changed-file ownership validation must route back to plan/spec because it exceeds Phase 3-1.

## Revisions

- 2026-05-08: Initial execution-ready Phase 3-1 plan created from approved spec and evidence packet.
- 2026-05-08: Revised after plan-checker/challenger feedback to define exact mailbox/ownership enums, statuses, and field names; add changed-file-to-ownership evidence path; bound security triggers; require helper/doc canonical-name consistency; clarify append-only mailbox lifecycle; and constrain strict-completion matrix statuses/scope.
- 2026-05-08: Revised after challenger feedback to define manual `ownership_evidence` in per-task verification records as the canonical changed-file-to-ownership carrier, add `security_trigger_evidence`, specify markdown strict-completion matrix locations, and avoid repeated enum strings outside a canonical `plan` skill reference section.
- 2026-05-08: Revised after challenger feedback to define exact ownership mode/operation invariants, require schema refinement tests for invalid combinations, add full verification-record evidence fixtures, centralize exact enum/status assertions in canonical `plan`/`execute` reference sections, and document shared/orchestrator ownership representation.
- 2026-05-08: Revised after challenger feedback to require documented manual comparison of actual changed files to `ownership_evidence.changed_files[]`, fail on omitted ownership evidence, distinguish per-entry schema refinements from registry/batch workflow checks, and clarify that passthrough `VerificationRecordSchema` acceptance is not sufficient without Phase 3 evidence validation/manual review.
- 2026-05-08: Revised after challenger feedback to separate global ownership compliance from per-task attribution in a single uncommitted worktree, define task-local evidence fields and attribution methods, require preexisting-touched file evidence, defer patch/snapshot automation to Phase 3-2, move exclusive-write uniqueness to registry/batch checks, and define narrow `SecurityTriggerCategorySchema` values.
- 2026-05-08: Revised after challenger feedback to restrict Phase 3-1 ownership matching to exact repo-relative path equality, reject glob/absolute/parent-directory path semantics, distinguish global path coverage from per-task operation compliance, and keep helper logic pure with no git/filesystem/glob/conflict-preflight/runtime enforcement behavior.
- 2026-05-08: Revised after challenger feedback to bootstrap minimal current-work Phase 3 artifacts (`ownership.json`, `mailbox.jsonl`, and this plan's strict-completion matrix), add opt-in current-work validation, remove ad hoc final-review exemption after contract introduction, and clarify nested `ownership_evidence.changed_files[]` entry fields.
- 2026-05-08: Revised after challenger feedback to add T00 provisional current-work artifact bootstrap before helper/docs execution, require `pre_registry_bootstrap` provenance for pre-T00 artifacts, include expected workflow artifacts in ownership coverage, use `shared_append` for `mailbox.jsonl`/`ledger.jsonl`, and change T05 into validation/finalization rather than first-time bootstrap.
- 2026-05-08: Polish revision after challenger approval to remove stale ownership bootstrap wording and require opt-in current-work validation of present T00-T06 verification records, including Phase 3 `ownership_evidence` and `security_trigger_evidence` when present.
- 2026-05-08: Revised after task-compliance blocker to make T00 execution-ready with explicit ownership entry rules, per-owner `shared_append` entries, sequenced ownership order, mandatory `verification/T00.json`, exact minimum mailbox bootstrap records, and a hard dependency that T01 cannot start until T00 artifacts exist.
- 2026-05-08: Revised after challenger feedback to make approved `plan.md` read-only with `pre_registry_bootstrap` provenance, move execution/final strict-completion status evidence to verification/final-review artifacts, require T01-T06 verification records with Phase 3 evidence, and make T05/T06 current-work validation fail missing completed-task records or evidence.
- 2026-05-08: Revised after challenger feedback to clarify `owner_task_id` as an actor id, allow `orchestrator` for `shared_append` and `orchestrator_owned`, require task owners for `exclusive_write`/`sequenced_write` unless provenance is documented, allow read-only orchestrator provenance, and add final-review flagging for changed paths covered only by read-only/orchestrator-owned entries without provenance.
- 2026-05-08: Revised after challenger feedback to add append-only bootstrap creation semantics: T00 may create missing append-only artifacts via a released bootstrap creation entry, active `shared_append` remains read/append only, and final-review must reject later create operations under shared append.
