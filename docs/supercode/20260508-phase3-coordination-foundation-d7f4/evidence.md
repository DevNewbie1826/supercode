# Evidence Packet: Phase 3-1 Coordination Foundation

## Internal Evidence

- `src/skills/execute/SKILL.md` lines 581-607 define Phase 2 artifact lifecycle and terminal handoff validation.
- `src/skills/execute/SKILL.md` lines 672-674 explicitly exclude mailbox system, file ownership registry, per-worker worktree, deeper parallel coordination, skill-embedded MCP runtime, hierarchical `AGENTS.md`, wiki/knowledge layer, and ultragoal mode from Phase 2.
- `src/hooks/workflow-artifacts.ts` lines 1-9 state the helper pattern: pure Zod schemas, types, path helpers, and validation helpers with no filesystem I/O or `todowrite` runtime dependency.
- `src/hooks/workflow-artifacts.ts` lines 71-145 define current schema style for workflow state, ledger events, and task verification records.
- `src/hooks/workflow-artifacts.ts` lines 153-176 define pure path helper style for workflow artifacts.
- `src/skills/pre-execute-alignment/SKILL.md` lines 8-17 define the alignment package responsibility: task order, safe batching, dependencies, conflict warnings, and verification expectations.
- `src/skills/pre-execute-alignment/SKILL.md` lines 82-97 prohibit optimistic execution when conflicts are plausible and require conservative batching.
- `src/skills/final-review/SKILL.md` lines 57-76 require final-review inspection of persisted Phase 2 artifacts and terminal handoff validation evidence.
- `src/skills/final-review/SKILL.md` lines 446-457 define the completion standard: fresh evidence, spec goal, plan satisfaction, in-scope completion, boundary respect, success criteria support, no major incomplete artifacts, no unresolved regression risk, and saved final review.
- `src/skills/plan/SKILL.md` lines 217-234 require planning evidence packets, checked/unchecked scope, unresolved uncertainty, and bounded research when planning would otherwise guess.
- `src/__tests__/phase2-artifact-state-contract.test.ts` lines 1-20 show the current markdown contract test style and negative Phase 3/4 boundary checks.
- `package.json` lines 15-18 define available validation commands: `bun test` and `bun run typecheck`.

## External Evidence

- OMO / Oh My OpenAgent research identified current concepts relevant to Supercode adaptation: Team Mode, hyperplan, security-research, ultrawork/ulw, and remove-ai-slops / ai-slop-remover.
- OMO `hyperplan` is useful as inspiration for multi-perspective adversarial planning, but Supercode should adapt it inside the existing `plan` gate.
- OMO `security-research` is useful as inspiration for risk-triggered security evidence, but Supercode should keep it bounded and trigger-based.
- OMO `ulw` / ultrawork is useful only as constrained strict completion within approved scope. Raw ultrawork behavior risks scope creep and infinite completion loops.
- OMO `/remove-ai-slops` command and `ai-slop-remover` skill are future inspiration for optional cleanup review, not Phase 3-1 scope.
- Reference URLs from prior research:
  - https://github.com/code-yeongyu/oh-my-openagent
  - https://github.com/code-yeongyu/oh-my-openagent/releases/tag/v4.0.0
  - https://github.com/code-yeongyu/oh-my-openagent/blob/dev/src/features/builtin-commands/templates/remove-ai-slops.ts
  - https://github.com/code-yeongyu/oh-my-openagent/blob/dev/src/features/builtin-skills/skills/ai-slop-remover.ts

## Checked Scope

- Current `main` repository after Phase 2 merge.
- Core skill docs relevant to Phase 3-1: `plan`, `pre-execute-alignment`, `execute`, `final-review`, `todo-sync`.
- Phase 2 helper pattern in `src/hooks/workflow-artifacts.ts`.
- Phase 2 contract/current-work test pattern in `src/__tests__/`.
- Package verification scripts.
- Public OMO research summarized earlier in the conversation for updated concepts and remove-ai-slops behavior.

## Unchecked Scope

- Full source implementation of OMO Team Mode internals.
- All historical OMO releases beyond the researched current sources.
- Complete Supercode agent prompt set outside the skill files and tests listed above.
- Runtime behavior of future Phase 3 helpers, because Phase 3-1 has not been implemented yet.
- CI environment behavior beyond local `bun test` and `bun run typecheck` scripts.

## Unresolved Uncertainty

- Whether mailbox and ownership helpers should live in one module or separate modules is intentionally left for planning.
- Exact ownership artifact shape should be finalized during planning to balance enforceability and simplicity.
- Whether security trigger implementation remains documentation-only or includes a lightweight checker in Phase 3-1 should be decided during planning, but must remain bounded.
- Phase 3-2 automation details are intentionally deferred.
