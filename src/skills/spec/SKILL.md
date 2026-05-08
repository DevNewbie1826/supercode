---
name: spec
description: Use when a development request must be clarified, researched, and converted into an approved, planning-ready spec document for a unique work_id before worktree creation and planning.
---

## Purpose

The `spec` skill turns an initial development request into a reviewed, approved, planning-ready specification.

Outcome contract: the stage is successful only when the approved spec artifact contains enough evidence, scope boundaries, constraints, and success criteria for `plan` to proceed without guessing.

This skill is the first public workflow stage.
It must complete before `worktree`, `plan`, or any implementation begins.

Its job is to:
- clarify the request
- aggressively gather missing evidence
- reduce ambiguity through an explicit clarification loop
- assign a unique `work_id`
- explore viable design approaches when the problem has real alternatives
- produce a bounded, planning-ready spec artifact
- get approval before downstream execution

It must not:
- implement code
- create an implementation plan
- create execution tasks
- proceed to `worktree` before approval and commit
- satisfy product-facing requests with literal wording only when the user's intent implies a coherent user-visible outcome

---

## Primary Agents

- `orchestrator`
- `spec-reviewer`

This skill is orchestrator-led.

The orchestrator is responsible for:
- exploring project context first
- clarifying the request
- aggressively gathering evidence
- assigning `work_id`
- presenting 2–3 meaningful approaches when appropriate
- drafting the spec
- invoking `spec-reviewer`
- explaining the spec to the user
- obtaining approval
- saving and committing the spec
- handing off to `worktree`

`spec-reviewer` is a dedicated read-only review agent used only to judge whether the spec is truly planning-ready.

---

## Work ID Rule

Before finalizing the spec, assign a unique `work_id`.

The `work_id` must:
- uniquely identify the work item
- remain stable throughout the workflow
- be reused by `worktree`, `plan`, `pre-execute-alignment`, `execute`, `final-review`, and `finish`

Recommended shape:
- `<YYYYMMDD>-<short-slug>-<short-suffix>`

Example:
- `20260424-auth-refresh-a1b2`

---

## Output Artifact

This skill must save the spec to:

`docs/supercode/<work_id>/spec.md`

This file is the authoritative spec artifact for the current work item.

Do not use a shared static path.

---

## Required Structure

The spec must contain:

- Work ID
- Objective
- Current State
- Desired Outcome
- Scope
- Non-Goals
- Constraints
- Success Criteria
- Risks / Unknowns
- Revisions

The spec must also contain:

- **Readiness Score**: a section in the spec artifact that scores each required dimension (intent, outcome, scope, constraints, success criteria, and repository context when applicable) using the fixed 0/1/2 rubric defined in the Readiness Scoring section below.
- **Decision Boundaries** (when applicable): a section defining what downstream agents may decide autonomously versus what requires user approval or routing back. Required when the request involves trade-offs, architectural choices, or behavioral decisions that affect user intent. For simple, low-ambiguity changes, an explicit statement that no special decision boundaries are needed is sufficient.

---

## Hard Rules

1. Do not begin implementation.
2. Do not begin implementation planning.
3. Explore current project context before asking detailed questions.
4. Ask exactly one clarification question per message.
5. Every clarification question must reduce real planning uncertainty.
6. Prefer narrow, high-leverage questions over broad exploratory questions.
7. Aggressively investigate uncertainty instead of waiting passively for the user to volunteer everything.
8. Use `explorer_agent` aggressively for internal repository reality.
9. Use `librarian_agent` aggressively for external behavior, docs, and third-party semantics.
10. If research is needed, use `research-delegation`.
11. Do not proceed while core ambiguity still forces downstream guessing.
12. Do not present assumptions as facts.
13. Do not force the user to read the raw file by default; explain the spec clearly first.
14. Save the spec only to `docs/supercode/<work_id>/spec.md`.
15. Do not hand off until the request is truly planning-ready.

---

## Clarification Targets

Clarify only what is required for safe downstream planning.

Priority order:
1. scope boundary
2. constraints
3. success criteria
4. current state vs target state
5. goal wording refinement

Required for handoff:
- clear goal
- bounded scope
- meaningful constraints
- current state
- desired outcome
- minimally usable success criteria

Also clarify when relevant:
- dependencies
- risks
- assumptions requiring explicit acceptance
- whether the request is too large and must be decomposed into subprojects

For user-facing product, UI, or UX requests, also clarify and document the minimum product-complete outcome:
- the intended user-visible path or interaction
- required states such as empty, loading, error, and success when in scope
- acceptance criteria beyond raw text, placeholder UI, or mere function presence

Do not add these product-completeness requirements for internal, prompt, config-only, tooling-only, or backend-only work unless the user request makes them part of scope.

---

## Readiness Scoring

Before invoking `spec-reviewer`, assign a lightweight readiness score to the spec using the fixed rubric below.

This score is a readiness aid, not a fake-precision estimation framework. It identifies dimensions that need clarification. It does not require arbitrary numerical precision beyond the fixed level meanings.

### Fixed Rubric

Score each dimension using these fixed levels:

- 0 = missing or unclear
- 1 = partially specified or carries material uncertainty
- 2 = clear enough for the next gate to act without guessing

### Required Dimensions

Score each of the following dimensions individually:

- **Intent**: what the request is actually trying to achieve
- **Outcome**: what the target state looks like
- **Scope**: what is in scope and what is out of scope
- **Constraints**: technical, product, compatibility, operational, or other constraints that materially affect planning
- **Success Criteria**: concrete, testable criteria for judging completion
- **Repository Context** (when applicable): relevant repository reality including existing implementation, tests, conventions, call sites, and file targets when they materially affect execution

### Scoring Guidance

- A dimension may be scored `2` based on a short, clear statement; length is not the measure.
- For simple, well-understood changes, several dimensions may be `2` with minimal prose. Do not force elaboration when the spec is already planning-ready.
- Block or reroute to clarification only when low scores (`0` or `1`) or internally inconsistent scores leave planning-blocking uncertainty unresolved.
- Do not use the score to justify blocking when the underlying spec text is clearly sufficient for planning.

### Presentation

The readiness score belongs in `docs/supercode/<work_id>/spec.md` as a durable section of the spec artifact. `spec-reviewer` reviews `spec.md`, so the score must be present there — not only in a transient self-review summary. Show each dimension and its score with a brief justification for any dimension scored below `2`. For simple specs where most dimensions are clearly `2`, a compact inline table or short list is sufficient; do not pad with unnecessary prose.

---

## Non-Goals and Scope Control

The spec must include a `Non-Goals` section that is more than a placeholder.

Non-goals are required when their absence would permit scope drift, unauthorized downstream agent decisions, or downstream guessing about what the work does not cover. For small, tightly scoped changes with no plausible drift risk, a brief non-goals statement or explicit scope boundary is sufficient.

Strengthen non-goals when:
- the request touches multiple systems or concerns and the boundary could be misread
- a reasonable planner or executor might assume adjacent work is in scope
- the request could be interpreted as license for broad refactoring, architectural change, or feature expansion

---

## Decision Boundaries

The spec must include a `Decision Boundaries` section when downstream agents (planner, executor, reviewers) would otherwise need to guess what they may decide autonomously versus what requires user approval or routing back.

Define explicitly:
- what downstream agents may decide autonomously within the approved scope
- what requires user approval before proceeding
- what requires routing back to an earlier gate (spec or clarification)

Decision boundaries are required when:
- the request involves trade-offs that could affect user intent or product direction
- an executor or planner might reasonably make architectural or design choices without explicit user sign-off
- the scope includes configuration, defaults, or behavioral decisions that affect the user experience

For simple, low-ambiguity changes where no meaningful autonomous decision exists, decision boundaries may be implicit in the bounded scope and constraints. State this explicitly: "No special decision boundaries; downstream agents may proceed within the approved scope."

---

## Phase 2 Artifact Lifecycle

The `spec` stage is responsible for creating and initializing the Phase 2 artifact set under `docs/supercode/<work_id>/`.

### Spec Stage: Artifact Responsibilities

- **Responsible actor**: spec/orchestrator
- **Artifact action**: create/update `docs/supercode/<work_id>/evidence.md`; initialize the artifact set when `work_id` is stable
- **Minimum ledger event**: `artifact_initialized` or `evidence_captured`
- **State fields updated**: `work_id`, `active_stage`, `active_gate_or_status`, `blockers`, `next_route`, `last_updated`

When the Evidence Packet is materialized, save it as `docs/supercode/<work_id>/evidence.md` with these required sections:
- Internal evidence: repository evidence supporting the workflow
- External evidence: external research, library docs, or third-party behavior evidence
- Checked scope: evidence scope that has been directly verified
- Unchecked scope: evidence scope where verification is missing or indirect
- Unresolved uncertainty: risks or unknowns that could not be resolved through available evidence

The spec stage must include the evidence.md section validation that confirms internal evidence, external evidence, checked scope, unchecked scope, and unresolved uncertainty sections are present.

---

## Evidence Packet Behavior

During `spec`, the orchestrator should create an Evidence Packet when repository reality or external behavior materially affects clarification.

Use explorer-backed internal evidence for existing implementation, project structure, tests, and conventions.
Use librarian-backed external evidence for library/framework/API behavior and version-specific constraints.

Do not wait for `spec-reviewer` to discover missing evidence if the need is already obvious.

Materialize the Evidence Packet as `docs/supercode/<work_id>/evidence.md` so downstream stages can read persisted evidence without depending on conversation context.

---

## Search Behavior

Use internal discovery aggressively when the request depends on repository reality.

Use external discovery aggressively when the request depends on:
- framework behavior
- library semantics
- version-specific behavior
- official best practices
- documented constraints

If both are needed:
1. use `explorer_agent` first
2. then use `librarian_agent`
3. keep scopes distinct
4. do not duplicate the same search twice

---

## Clarification Loop

Repeat this loop until the request is planning-ready:

1. Read the latest user message.
2. Identify the highest-value remaining ambiguity.
3. Decide whether internal evidence, external evidence, or both are needed.
4. Use `research-delegation` when evidence is needed.
5. Reconcile user statements with gathered evidence.
6. Update the current understanding of:
   - known facts
   - open ambiguities
   - scope
   - constraints
   - success criteria
   - current state
   - target state
7. Summarize progress in this format:

### Established
- [confirmed fact or boundary]
- [confirmed fact or boundary]

### Open
- [remaining ambiguity]
- [remaining ambiguity]

8. Ask exactly one next clarification question.

End the loop only when the spec is genuinely planning-ready.

---

## Stalled Clarification Handling

If clarification is not progressing:

1. Do not stop by default.
2. Diagnose why progress stalled:
   - the question was too broad
   - the question stayed at the wrong abstraction level
   - internal evidence is missing
   - external evidence is missing
   - user intent and wording are still misaligned
3. Restate what is established and what remains open.
4. Change the angle:
   - ask a narrower question
   - gather better evidence
   - surface the contradiction directly
5. Continue the loop.

Stop and route back to the user instead of drafting if the remaining ambiguity affects scope, user-visible acceptance, product-completeness expectations, or planning safety.

If temporary assumptions are necessary, they must be:
- clearly labeled
- explicitly temporary
- accepted by the user before being treated as operational

---

## Assumptions and Contradictions

If user statements and gathered evidence do not align:

1. Do not guess.
2. Surface the mismatch clearly.
3. Ask the most direct resolving question.
4. Do not proceed while major contradictions remain unresolved unless they are explicitly documented and accepted.

---

## Scale Check

Before finalizing the spec, assess whether the request is too large for a single implementation cycle.

If it describes multiple independent systems or a scope too broad for one plan:
- decompose it into subprojects
- explain the decomposition
- choose the first bounded subproject
- write the spec only for that subproject

---

## Design Exploration

When the problem has meaningful design alternatives, present 2–3 approaches before finalizing the spec.

For each approach, cover:
- what it is
- why it might fit
- main trade-offs
- recommendation

Lead with the recommended option when possible.

Do not manufacture fake alternatives for trivial choices.

---

## Drafting

When the request is clear enough, draft the spec at:

`docs/supercode/<work_id>/spec.md`

The spec must be:
- implementation-neutral
- planning-ready
- explicit about assumptions
- bounded in scope
- internally consistent
- free of placeholders and fake clarity

---

## Self-Review

Before invoking `spec-reviewer`, perform an inline self-review.

Check:
1. placeholder scan
2. internal consistency
3. scope fitness for a single planning cycle
4. ambiguity that would force the planner to guess

Fix issues inline before review.

---

## Reviewer Session Freshness Rule

`spec-reviewer` must use a fresh review session by default for each approval attempt.

Do not reuse a `spec-reviewer` session if it:
- helped draft or revise the spec
- received orchestrator reasoning, draft-writing narrative, or self-justification
- reviewed an older rejected version and cannot cleanly judge the current artifact only
- performed research or otherwise left the read-only reviewer role

---

## Reviewer Isolation Rule

`spec-reviewer` must review the spec from artifact-focused context only.

The reviewer may receive:
- `docs/supercode/<work_id>/spec.md`
- minimal necessary evidence gathered during clarification
- minimal necessary repository or external findings returned through `research-delegation`

The reviewer must not receive:
- orchestrator reasoning chains
- draft-writing narrative
- self-justification prose
- verbose explanation history unless a minimal excerpt is strictly necessary to understand an accepted assumption

The reviewer judges the spec artifact, not the effort spent producing it.

---

## Review

After self-review, invoke `spec-reviewer`.

`spec-reviewer` must determine whether the spec is truly planning-ready.

The review must check:
- objective clarity
- current state clarity
- desired outcome clarity
- scope boundaries
- constraint completeness
- success criteria quality
- internal consistency
- ambiguity burden on the planner

If review fails:
- revise the spec
- continue clarification if needed
- re-run `spec-reviewer`

The spec must not proceed to approval before review passes.

---

## Approval Flow

After `spec-reviewer` passes:

1. Explain the reviewed spec to the user in concise language.
2. Include:
   - the primary goal
   - the bounded scope
   - the most important constraints
   - up to three major risks or assumptions
3. In `normal` mode:
   - wait for explicit user approval
   - if the user requests changes, revise and re-review
4. In `unattended` mode:
   - approval is automatic after review passes

After approval:
1. save the final spec at `docs/supercode/<work_id>/spec.md`
2. commit it
3. hand off to `worktree`

---

## Completion Gate

The `spec` skill is complete only when:
- `work_id` has been assigned
- `docs/supercode/<work_id>/spec.md` exists
- a readiness score has been assigned across all required dimensions
- non-goals are present and adequate to prevent scope drift where needed
- decision boundaries are present where autonomous downstream decisions or user approval would otherwise be ambiguous
- self-review has passed
- `spec-reviewer` has passed the spec
- the spec is planning-ready
- major ambiguity has been reduced to an acceptable level
- required evidence has been gathered or explicitly determined unnecessary
- the user approves in `normal` mode, or auto-approval is applied in `unattended` mode
- the spec is committed

---

## Handoff to Next Skill

On success, hand off to `worktree` with:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approval status
- commit reference containing the spec
- known constraints
- accepted assumptions
- major surfaced risks

---

## Failure Handling

If the user rejects the explanation:
- revise the spec
- continue clarification if needed
- re-run `spec-reviewer`
- present a new explanation

If review repeatedly fails because evidence is missing:
- investigate more aggressively
- use `explorer_agent` and `librarian_agent` through `research-delegation`
- do not hand off early

---

## Phase 3-1 Security Trigger Identification

The `spec` stage should identify whether the requested work involves security-sensitive capabilities that may require additional security research or review during downstream stages. Security trigger discovery at spec time is bounded: it identifies trigger categories but does not require a full security audit.

Trigger categories to check for during spec clarification:
- authentication or authorization changes
- secrets, credentials, `.env`, or token handling
- filesystem write/delete/copy/move behavior
- shell command execution behavior
- git push/merge/PR/rebase/branch deletion behavior
- network calls or external APIs
- dependency install/update behavior
- sandbox, worktree, permission, or path traversal behavior
- generated code that handles untrusted input

If the spec touches any of these security-sensitive areas, the spec should note it so the plan and execute stages can record appropriate security trigger evidence.

### Phase 3-2 and Deferred Scope

The following Phase 3 coordination capabilities are deferred to Phase 3-2 and must not be implemented as part of any spec that targets Phase 3-1 only: automatic ownership validation, conflict preflight, mailbox routing enforcement, actual security reviewer/research execution, multi-agent hyperplan, structured machine-checkable completion matrix artifact, and AI-slop cleanup gate. The spec may mention ownership, mailbox, and coordination concepts as deferred future candidates but must not treat them as implemented features.
