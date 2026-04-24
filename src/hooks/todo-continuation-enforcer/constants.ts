/**
 * Continuation enforcer constants.
 */

/** Default countdown before prompting an idle session (seconds). */
export const DEFAULT_COUNTDOWN_SECONDS = 120

/** Target roles that should be continuation-prompted. */
export const TARGET_ROLES: ReadonlySet<string> = new Set(["orchestrator", "executor"])

/** Continuation prompt text sent to idle sessions with incomplete work. */
export const CONTINUATION_PROMPT = `[SYSTEM DIRECTIVE: TODO_CONTINUATION]

Incomplete todos remain. Resume the next pending or in-progress todo.

Follow your role authority:
- Orchestrator: continue the workflow with the correct Supercode skill. Use \`question\` for blocking user decisions. Do not edit implementation code.
- Executor: continue only the assigned task. Do not ask the user directly. Return blockers to the orchestrator. Do not bypass TDD, AST/LSP, verification, or scope rules.
- Reviewer/verifier: continue only assigned review or verification. Do not modify files. Return blockers to the orchestrator.

Universal rules:
- Keep todo state updated.
- Mark todos complete only after verification.
- Do not claim completion while todos remain pending, in-progress, or unverified.
- If you think work is complete, skeptically re-check the todo list and verify each item.
- Use \`orchestrator-mediated-research\` for missing evidence.
- Use or request \`systematic-debugging\` for unclear failures.
- Do not bypass workflow gates or safety rules just to clear todos.

Stop only when all todos within your role authority are complete and verified, or when blocked by a required decision, failed gate, missing evidence, failed verification, scope ambiguity, or routing requirement.`
