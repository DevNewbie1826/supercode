# Spec: Phase 3-1 Coordination Foundation

## Work ID

`20260508-phase3-coordination-foundation-d7f4`

## Objective

Create the first Phase 3 Supercode coordination layer for safer multi-agent execution while preserving the existing public workflow gates and the single isolated worktree model.

This work documents and implements the **foundation/contract layer** for:

1. orchestrator-mediated durable mailbox records,
2. workflow-enforced file ownership registry contracts,
3. hyperplan-lite planning challenge requirements,
4. security-research trigger rules,
5. strict-completion matrix hardening.

The immediate goal is not to build full runtime automation. The goal is to make these concepts durable, testable, and planning-ready for later enforcement work.

## Current State

Phase 1 and Phase 2 are complete and merged into `main`.

Current relevant repository state:

- `src/skills/execute/SKILL.md` now defines Phase 2 artifact lifecycle and explicitly lists mailbox system, file ownership registry, per-worker worktree, deeper parallel coordination, and ultragoal mode as outside Phase 2.
- `src/hooks/workflow-artifacts.ts` provides the Phase 2 pattern for pure Zod schemas, types, path helpers, and validation helpers without filesystem I/O.
- `src/__tests__/workflow-artifacts.test.ts`, `src/__tests__/workflow-artifacts-current-work.test.ts`, and `src/__tests__/phase2-artifact-state-contract.test.ts` establish the current testing pattern for permanent fixture tests, opt-in current-work artifact validation, and markdown contract tests.
- `src/skills/pre-execute-alignment/SKILL.md` already owns task order, safe batching, dependency constraints, conflict warnings, and per-task verification expectations.
- `src/skills/final-review/SKILL.md` already requires fresh verification evidence, scope completion, success criteria support, out-of-scope boundary checks, and saved final review artifacts.
- `src/skills/todo-sync/SKILL.md` states that `todowrite` remains the active in-session source while `state.json` is a durable complement.
- Package scripts remain simple: `bun test` and `bun run typecheck`.

External OMO research adds relevant inspiration but must not replace Supercode's gates:

- OMO's v4-style Team Mode and related skills show useful patterns for adversarial planning, security review, strict completion, and AI-slop cleanup.
- OMO's `hyperplan` concept is useful as a multi-perspective plan challenge pattern.
- OMO's `security-research` concept is useful as a risk-triggered security evidence path.
- OMO's `ulw` / ultrawork philosophy is useful only when constrained to approved scope; raw ultrawork behavior is too risky for Supercode.
- OMO's `/remove-ai-slops` command and `ai-slop-remover` skill are useful future inspiration, but not part of Phase 3-1.

## Desired Outcome

After Phase 3-1, Supercode should have a documented and test-backed coordination foundation that downstream stages can rely on without guessing.

Expected target state:

- A pure helper module or modules define schemas, types, path helpers, and validators for Phase 3 coordination artifacts.
- Skill contracts describe how mailbox and ownership records are created, updated, inspected, and used by the existing workflow stages.
- `pre-execute-alignment` records ownership expectations and conflict-sensitive batching requirements.
- `execute` treats ownership scope as a hard workflow policy, even if filesystem-level locks are not introduced.
- `final-review` checks ownership/mailbox/completion artifacts as part of completion evidence.
- `plan` includes hyperplan-lite challenge coverage without introducing a new public workflow stage.
- security-sensitive work has documented trigger rules for when additional security evidence or review is required.
- strict-completion is expressed as an acceptance matrix requirement, not as raw OMO-style ultrawork.
- Phase 3-2 enforcement work is documented clearly enough to avoid being forgotten, but remains out of scope for this first implementation cycle.

## Scope

### In Scope for Phase 3-1

#### 1. Mailbox foundation

Define an orchestrator-mediated durable mailbox artifact for workflow messages that should survive context loss or resume.

Candidate artifact path:

`docs/supercode/<work_id>/mailbox.jsonl`

Minimum message concepts:

- `message_id`
- `timestamp`
- `sender`
- `recipient`
- `message_type`
- `stage`
- `task_id` when applicable
- `summary`
- `artifact_refs`
- `status`

Expected message types include research requests/responses, executor handoffs, reviewer findings, blockers, route-back reasons, and final-review evidence gaps.

Mailbox is a durable communication artifact. It is not a free agent-to-agent chat system and not a runtime message broker.

#### 2. File ownership registry foundation

Define a durable ownership registry that makes write scope explicit and reviewable.

Candidate artifact path:

`docs/supercode/<work_id>/ownership.json`

Minimum ownership concepts:

- `work_id`
- `locks` or ownership entries
- path or glob target
- `owner_task_id`
- ownership mode
- status
- allowed operations or policy summary
- conflict notes or blocker references when applicable

Required ownership modes:

- `exclusive_write`: one task may write the path.
- `shared_append`: multiple tasks may append, but not rewrite/reorder/delete existing content.
- `orchestrator_owned`: executors must not modify the path unless explicitly assigned.
- `sequenced_write`: multiple tasks may modify the path, but not in the same parallel batch.
- `read_only`: task may inspect but not modify.

The registry is not merely advisory. It must be specified as a **hard workflow policy**: if a task modifies files outside its ownership allowance, task review or final review must fail.

#### 3. Hyperplan-lite planning hardening

Add a lightweight multi-perspective challenge requirement to the existing `plan` stage.

The goal is to strengthen `plan-challenger` behavior without adding new public stages or copying full OMO Team Mode.

Required perspectives:

- scope creep / non-goal challenge
- dependency and sequencing challenge
- verification adequacy challenge
- concurrency and ownership challenge
- security/risk trigger challenge
- completion matrix challenge

The plan artifact should record challenge findings and how major findings were resolved or accepted.

#### 4. Security-research trigger rules

Document when a work item requires security-specific research or review.

Trigger categories include:

- authentication or authorization
- secrets, credentials, `.env`, or token handling
- filesystem write/delete/copy/move behavior
- shell command execution
- git push/merge/PR/rebase/branch deletion behavior
- network calls or external APIs
- dependency install/update behavior
- sandbox, worktree, permission, or path traversal behavior
- generated code that handles untrusted input

Phase 3-1 documents the triggers and where they affect spec/plan/execute/final-review. It does not need to create a full security-research execution subsystem.

#### 5. Strict-completion matrix hardening

Constrain OMO-style ultrawork inspiration to Supercode-approved scope.

Add a completion matrix concept that maps:

`spec success criterion -> plan task(s) -> verification evidence -> status`

This is a final-review and planning hardening feature, not a new raw `ulw` mode. It must not expand scope beyond the approved spec and plan.

#### 6. Tests and validation

Add or update tests that validate:

- pure Phase 3 helper schemas and path helpers,
- no filesystem I/O in helper modules,
- skill markdown contracts for mailbox, ownership, hyperplan-lite, security triggers, and strict-completion,
- Phase 3-2/per-worker-worktree/full-Team-Mode concepts remain excluded from Phase 3-1 implementation.

### Explicit Phase 3-2 Roadmap to Preserve

Phase 3-2 should be documented but not implemented in this work item. Expected Phase 3-2 candidates:

1. ownership violation automatic validation against per-task changed files,
2. conflict preflight before executing parallel batches,
3. mailbox routing enforcement for unresolved messages and reviewer findings,
4. actual risk-triggered security reviewer/research execution,
5. multi-agent or multi-session hyperplan challengers beyond checklist form,
6. structured machine-checkable completion matrix artifact,
7. optional AI-slop cleanup gate inspired by OMO `/remove-ai-slops`, with executor-only fixes and behavior-preservation safeguards.

## Non-Goals

Phase 3-1 must not implement:

- per-worker worktrees,
- automatic merge of worker branches,
- OS-level or distributed file locks,
- runtime message broker infrastructure,
- autonomous free agent-to-agent chat,
- full OMO Team Mode,
- raw OMO `ulw` / ultrawork mode,
- skill-embedded MCP runtime,
- hierarchical `AGENTS.md`,
- wiki / knowledge layer,
- ultragoal mode,
- actual exploit execution or destructive security PoCs,
- broad AI-slop cleanup automation.

Phase 3-1 may mention these as exclusions or future candidates only.

## Constraints

- Preserve the public workflow stage chain: `spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish`.
- Preserve existing approval gates, reviewer isolation, and executor-only implementation authority.
- Keep a single isolated worktree per work item. Do not introduce per-worker worktrees.
- Keep `todowrite` as the active in-session source. Durable artifacts complement it; they do not replace it.
- Keep helper modules pure: no filesystem I/O, no shell execution, no runtime `todowrite` dependency.
- Use Zod for machine-checkable schemas, consistent with `src/hooks/workflow-artifacts.ts`.
- Permanent tests must use fixtures/in-memory samples; mutable current-work docs validation must remain opt-in via `WORK_ID` if added.
- Security trigger rules must be risk-based and bounded. They must not make every small change require a heavy security audit.
- Strict-completion must enforce approved scope only. It must not create scope creep or infinite completion loops.
- Ownership registry violations must be treated as workflow failures once the policy is in force, even though OS-level locking is out of scope.

## Success Criteria

The work is successful when all of the following are true:

1. Phase 3-1 coordination artifacts are specified with canonical fields and narrow statuses/modes where appropriate.
2. Pure helper schemas/path helpers validate mailbox and ownership artifact shapes without filesystem I/O.
3. Skill docs describe mailbox lifecycle responsibilities for relevant stages.
4. Skill docs describe ownership registry responsibilities and hard workflow failure behavior for ownership violations.
5. Plan-stage docs include hyperplan-lite multi-perspective challenge expectations.
6. Security trigger rules are documented and routed to existing research/review mechanisms without creating a new public stage.
7. Strict-completion is documented as an acceptance matrix tied to spec criteria, plan tasks, and verification evidence.
8. Tests cover helper behavior, skill contract requirements, and negative scope boundaries.
9. Existing Phase 2 artifact tests continue to pass.
10. Full verification passes: `bun test` and `bun run typecheck`.
11. The spec and later plan explicitly preserve the Phase 3-2 roadmap without implementing it in Phase 3-1.

## Risks / Unknowns

- The exact artifact shape may need adjustment during planning to keep mailbox and ownership simple enough for a first slice.
- If ownership is too weak, it becomes useless; if too strict, it may block legitimate shared edits. The ownership modes must balance both risks.
- Hyperplan-lite could become too heavy if every small plan requires many separate challengers. Phase 3-1 should keep it checklist-driven unless the plan justifies more.
- Security triggers could create false positives. They should require bounded evidence, not automatic failure.
- Strict-completion could become raw ultrawork if not constrained. It must remain limited to approved spec/plan scope.
- Current repository has no existing Phase 3 coordination helper, so naming and file organization will be determined during planning within the constraints above.

## Decision Boundaries

Downstream agents may decide autonomously:

- exact helper module naming and whether mailbox/ownership helpers live in one module or separate modules,
- exact schema field ordering and optional metadata fields, as long as canonical concepts are present,
- exact markdown wording for skill contracts,
- whether current-work validation is extended in the same style as Phase 2 or deferred when not necessary.

Downstream agents must route back for user approval before:

- adding per-worker worktrees,
- adding OS-level/distributed locking,
- adding autonomous agent-to-agent chat,
- adding raw ultrawork/ultragoal mode,
- adding broad AI-slop cleanup automation,
- creating a new public workflow stage,
- making security-research mandatory for all tasks regardless of trigger.

Downstream agents must route back to `spec` or `plan` if:

- mailbox and ownership scope cannot fit a single implementation cycle,
- the ownership policy cannot be made enforceable through workflow gates,
- security trigger behavior requires a new dedicated subsystem rather than documentation/contract integration,
- strict-completion would require changing approved workflow semantics.

## Readiness Score

| Dimension | Score | Notes |
|---|---:|---|
| Intent | 2 | The request is to document and then implement Phase 3-1 coordination foundation in sequence before later Phase 3-2 enforcement. |
| Outcome | 2 | Target state is a test-backed mailbox/ownership/hyperplan/security/strict-completion contract layer preserving existing gates. |
| Scope | 2 | Phase 3-1 in-scope items and Phase 3-2/excluded items are explicitly separated. |
| Constraints | 2 | Single worktree, no raw OMO Team Mode/ulw, pure helpers, existing gates, and `todowrite` preservation are specified. |
| Success Criteria | 2 | Completion can be judged by helper/schema tests, skill contract tests, Phase 2 regression tests, typecheck, and documented scope boundaries. |
| Repository Context | 2 | Current Phase 2 artifacts, helper patterns, skill docs, and test conventions are identified. |

## Revisions

- 2026-05-08: Initial Phase 3-1 coordination foundation spec drafted from user direction, internal repository inspection, and OMO-inspired research.
