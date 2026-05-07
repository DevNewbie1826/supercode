# Evidence Packet

> **Adoption note:** This evidence.md is a Phase 2 backfill for work item `20260507-phase2-artifact-state-b4c8`. It is based on available artifacts and planning evidence, not on full conversation history. Pre-T05 events are represented honestly from spec/plan artifacts only. This is documentation/evidence adoption for this work item only — not Phase 3 mailbox, coordination, or runtime orchestration.

## Internal Evidence

- `src/skills/spec/SKILL.md` — defines spec artifact path at `docs/supercode/<work_id>/spec.md`.
- `src/skills/plan/SKILL.md` — defines plan artifact path at `docs/supercode/<work_id>/plan.md`; requires checked/unchecked scope and unresolved uncertainty in planning contexts.
- `src/skills/final-review/SKILL.md` — defines final review artifact path at `docs/supercode/<work_id>/final-review.md`.
- `src/skills/execute/SKILL.md` — Evidence Packet and per-task completion reports exist conceptually but were not persisted as `evidence.md` or verification records before Phase 2.
- `src/skills/todo-sync/SKILL.md` — current todo synchronization uses `todowrite`; no durable file-based state was defined before Phase 2.
- `src/hooks/todo-state.ts` — normalizes todo state and builds snapshots without durable workflow artifact file I/O.
- `src/hooks/workflow-artifacts.ts` — Phase 2 helper module providing pure Zod schemas, TypeScript types, artifact path builders, JSON/JSONL validation helpers, and a pure `evidence.md` section validator. No filesystem I/O.
- `src/__tests__/workflow-artifacts.test.ts` — permanent TDD coverage using fixtures/in-memory sample artifacts for required schema fields, path helpers, JSONL event validation, `evidence.md` section validation, nullable/pending reviewer outcomes, and rejection of malformed records.
- `src/__tests__/workflow-artifacts-current-work.test.ts` — opt-in current-work artifact validation that skips when `WORK_ID` is unset and validates disk artifacts when set.
- `src/__tests__/phase2-artifact-state-contract.test.ts` — skill contract tests for lifecycle instruction coverage.
- `package.json` — verification commands are `bun test` and `bun run typecheck`. `zod` is available as a dependency.
- Repository search confirmed no existing `evidence.md`, `state.json`, or `ledger.jsonl` implementation before Phase 2.

## External Evidence

- Phase 2 is inspired by prior `oh-my-codex` / `oh-my-openagent` research: durable context snapshots, state files, ledgers, and verification records, adapted to Supercode's existing gated workflow.

## Checked Scope

- Workflow skill files: `src/skills/spec/SKILL.md`, `src/skills/worktree/SKILL.md`, `src/skills/plan/SKILL.md`, `src/skills/pre-execute-alignment/SKILL.md`, `src/skills/execute/SKILL.md`, `src/skills/final-review/SKILL.md`, `src/skills/todo-sync/SKILL.md`.
- Todo state utilities: `src/hooks/todo-state.ts`, `src/hooks/workflow-artifacts.ts`.
- Test files: `src/__tests__/workflow-artifacts.test.ts`, `src/__tests__/workflow-artifacts-current-work.test.ts`, `src/__tests__/phase2-artifact-state-contract.test.ts`.
- Phase 1 contract tests and package scripts.
- Artifact conventions under `docs/supercode/<work_id>/`.

## Unchecked Scope

- Every agent prompt file not listed in checked scope.
- All implementation utilities outside `src/hooks/`.
- CI configuration.
- Any untracked local `.todo.md` behavior.
- Runtime behavior of skills in production orchestrator context (only instruction/markdown content was checked).

## Unresolved Uncertainty

- Whether downstream consumers will find the current schema granularity sufficient or will request additional fields in future phases.
- Whether the append-only ledger pattern will accumulate enough events to become a performance concern for long-running work items (low risk for current scope).
