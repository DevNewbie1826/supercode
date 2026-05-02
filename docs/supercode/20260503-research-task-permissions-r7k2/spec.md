# Work ID

20260503-research-task-permissions-r7k2

# Objective

Convert Supercode research flow from orchestrator-mediated research handoff to direct, bounded research delegation by subagents, while preserving Supercode's existing roles, workflow gates, context isolation goals, and implementation/review authority boundaries.

At the same time, harden the relevant agent and skill prompts using the prompt-quality lessons from OMO, OpenAI GPT-5.5 guidance, and context-engineering principles. The goal is not to rewrite Supercode's identity or workflow, but to make the existing roles easier for agents to follow through clearer outcomes, success criteria, tool contracts, stop rules, evidence standards, concise output contracts, and product-complete implementation expectations.

This includes:

1. Updating default `task` permissions so every built-in non-research subagent, excluding the orchestrator, can call only the two research agents: `explorer` and `librarian`.
2. Completely deleting the `orchestrator-mediated-research` skill and replacing all active references with `research-delegation`.
3. Adding a replacement `research-delegation` skill that teaches bounded use of research agents.
4. Updating agent and skill prompts so non-research subagents know when and how to delegate research directly.
5. Updating `explorer` and `librarian` rules so research agents do not recursively delegate to other agents.
6. Strengthening prompts across the workflow so each role has clearer outcome-first instructions, constraints, verification expectations, and stop conditions.
7. Adding product-completeness guardrails so user-facing work is not satisfied by bare text, placeholder UI, or literal-only implementation when a more integrated product outcome is implied.
8. Adding fresh-session rules for reviewer, checker, verifier, and final-review agents so independent artifact judgment is not polluted by prior context.
9. Using OMO prompt patterns as explicit reference material when Supercode agents face similar situations, while adapting them to Supercode's workflow and authority model instead of copying them wholesale.
10. Preserving the existing Supercode stage gates and review discipline.

# Current State

Supercode currently centralizes broad research through `orchestrator-mediated-research`:

- Subagents are instructed to return a `<needs_research>` XML handoff when they lack evidence.
- The orchestrator is responsible for routing internal research to `explorer` and external research to `librarian`.
- Evidence is returned to the requesting subagent through the orchestrator.
- Many reviewer and checker agents currently have `task: "deny"`.
- `executor` and `planner` currently do not define a `task` permission.
- `explorer` and `librarian` are research agents and currently deny task delegation.
- `orchestrator` is the primary workflow coordinator and is not part of the requested subagent permission change.

Observed practical issue from usage:

- The `<needs_research>` / orchestrator handoff loop has not been observed to materially drive real subagent research in the current workflow.
- The pattern adds ceremony and latency while preventing OMO-style direct, parallel research delegation by task-owning subagents.

Relevant confirmed files from repository investigation:

- `src/agents/definitions/*.agent.ts`: built-in agent default permissions.
- `src/agents/types.ts`: permission types support nested permission maps.
- `src/skills/orchestrator-mediated-research/SKILL.md`: current research handoff skill.
- `src/agents/prompt-text/*.md`: agent role and research behavior prompts.
- `src/skills/*/SKILL.md`: workflow stage prompts that currently reference orchestrator-mediated research.
- `src/__tests__/*`: existing tests around built-in agents, config generation, registry behavior, and permissions.

Prompt-quality issues identified from prior review:

- `explorer-prompt.md` is comparatively thin and lacks explicit retrieval budget and stop rules.
- `librarian-prompt.md` has useful request classification but needs clearer phase boundaries, research budgets, and sufficient-evidence criteria.
- Reviewer/checker prompts have output formats but generally lack hard limits and concise blocker-reporting contracts.
- `plan-challenger` needs a clearer “blocker-finder, not perfectionist” stop rule.
- `executor` can better define its completion report as an evidence artifact for downstream review.
- Workflow skill prompts reference `orchestrator-mediated-research` and need to be realigned to `research-delegation`.
- Orchestrator prompt should preserve gatekeeping while no longer acting as the default research broker.
- Current prompts do not sufficiently force spec/planning/execution/review to identify product-facing completeness needs when a user asks for a feature. This can lead to literal-only outputs, such as placing unintegrated text on a webpage instead of delivering a coherent UI feature.
- Reviewer/checker/verifier agents may sometimes be reused across judgments, which can weaken context isolation by carrying prior findings, executor narratives, or stale assumptions into what should be a fresh artifact-focused judgment.

# Desired Outcome

Research becomes directly delegated by the subagent that needs evidence:

```text
Subagent lacks evidence
→ uses research-delegation rules
→ directly calls explorer and/or librarian with bounded scope
→ receives evidence
→ continues assigned task
→ reports research used, unchecked scope, and unresolved uncertainty
```

The old pattern is removed from active prompts and skills:

```text
Subagent lacks evidence
→ returns <needs_research>
→ orchestrator routes explorer/librarian
→ orchestrator returns evidence
→ subagent resumes
```

## Default task permission target

Every built-in non-research subagent, excluding `orchestrator`, must have:

```ts
task: {
  "*": "deny",
  explorer: "allow",
  librarian: "allow",
}
```

Target agents:

- `executor`
- `planner`
- `plan-checker`
- `plan-challenger`
- `code-quality-reviewer`
- `code-spec-reviewer`
- `spec-reviewer`
- `completion-verifier`
- `final-reviewer`
- `systematic-debugger`
- `task-compliance-checker`

Excluded agents:

- `explorer`: remains a research agent and must not delegate recursively.
- `librarian`: remains a research agent and must not delegate recursively.
- `orchestrator`: remains the primary workflow coordinator and is not assigned the restricted subagent task pattern by this work.

# Scope

In scope:

## Permission changes

- Update default permissions for all target non-research subagents to allow only `explorer` and `librarian` through `task`.
- Preserve existing non-task permissions.
- Keep `explorer` and `librarian` task delegation denied.
- Keep `orchestrator` excluded from this specific permission pattern.
- Add or update tests for the permission policy.

## Skill changes

- Completely remove `src/skills/orchestrator-mediated-research/` from the repository.
- Remove any skill registration, export, generated index entry, test fixture, or documentation reference that treats `orchestrator-mediated-research` as an available active skill.
- Replace active workflow references to `orchestrator-mediated-research` with `research-delegation` where research guidance is still needed.
- Add a replacement skill tentatively named `research-delegation`.
- The new skill must define:
  - when to use `explorer`;
  - when to use `librarian`;
  - when to use both, with internal research first;
  - research delegation prompt contract;
  - budget rules;
  - stop rules;
  - evidence standards;
  - output expectations;
  - recursive delegation prohibition for research agents.

## Agent prompt changes

- Update all non-research subagent prompts so they can use `research-delegation` and directly call `explorer` / `librarian` when task evidence is missing.
- Remove instructions that require subagents to return `<needs_research>` to the orchestrator as the normal broad-research path.
- Preserve read-only / write-enabled authority boundaries.
- Preserve reviewer artifact-focus and context-isolation requirements.
- Add bounded research reporting expectations where appropriate:
  - research used;
  - sources or paths checked;
  - not checked;
  - unresolved uncertainty.
- Update `explorer` and `librarian` prompts to explicitly prohibit recursive agent delegation and clarify they are terminal research agents.

## General prompt hardening

Apply OMO/OpenAI/context-engineering prompt improvements across relevant agent and skill prompts while preserving existing roles and behavior:

- Outcome-first role framing:
  - Put the role's concrete deliverable and success condition near the top.
  - Avoid vague role-play language when a testable outcome can be stated.
- Success criteria and completion contracts:
  - Define what counts as complete for each role.
  - Treat unsupported claims as incomplete when evidence is required.
- Evidence-based completion:
  - Reinforce “NO EVIDENCE = NOT COMPLETE” for reviewers, verifiers, executor reports, and research outputs.
  - Require paths, command outputs, links, or explicit unchecked scope where applicable.
- Retrieval budget and stop rules:
  - Add bounded search budgets to `explorer`, `librarian`, and research-capable reviewers/checkers.
  - Stop when evidence is sufficient, when sources converge, or after repeated unproductive rounds.
- 6-section delegation pattern where useful:
  - Standardize research delegation and executor/reviewer handoff wording around TASK, EXPECTED OUTCOME, REQUIRED TOOLS, MUST DO, MUST NOT DO, and CONTEXT when it improves clarity.
  - Do not force this pattern into places where it creates noise.
- Output hard limits:
  - Add concise limits for reviewer/checker/verifier outputs, such as maximum blocking findings, short summaries, and explicit unresolved uncertainty.
- QA executability:
  - Strengthen planner and plan-checker language so verification expectations are executable by agents and not dependent on vague manual user confirmation.
- Anti-AI-slop guardrails:
  - Add warnings against scope inflation, premature abstraction, documentation bloat, and unnecessary dependency additions where relevant.
- Context isolation:
  - Preserve and clarify artifact-focused reviewer judgment.
  - Reviewers may use bounded research, but must not use open-ended exploration to rewrite scope or justify subjective preferences.
  - Reviewer/checker/verifier/final-review judgments should normally use fresh sessions to avoid anchoring on prior context.
- Product completeness:
  - For user-facing or UI/product work, require agents to consider whether the literal request implies surrounding product requirements.
  - Prevent “bare minimum text on a page” implementations unless explicitly requested.
  - Require existing UI patterns, layout integration, states, accessibility, responsiveness, and user-flow verification where relevant.
- Signal-to-noise improvement:
  - Prefer shorter, sharper instructions over copying OMO prompts wholesale.
  - Remove obsolete `orchestrator-mediated-research` ceremony and replace it with actionable research delegation rules.
- OMO reference adaptation:
  - Where a Supercode agent faces a situation OMO already handles well, use the relevant OMO pattern as a design reference.
  - Adapt OMO patterns to Supercode roles, gates, tools, and authority boundaries.
  - Do not copy OMO hierarchy, tone, or long prompt blocks wholesale when a smaller Supercode-specific instruction is clearer.

Required prompt-hardening targets and minimum standards:

| Target | Required improvements | Success standard |
|---|---|---|
| `orchestrator-prompt.md` | Preserve workflow gatekeeper role; remove default research-broker instructions; explain direct research delegation supervision; keep `question` tool and finish gates intact. | Orchestrator still owns stages/gates, but no longer mediates ordinary subagent research. |
| `executor-prompt.md` | Add direct bounded research delegation instructions; keep TDD/AST/LSP; make completion report an evidence artifact; add concise research-used reporting. | Executor can call only `explorer`/`librarian` for assigned-task evidence and still cannot delegate implementation. |
| `planner-prompt.md` | Add bounded research before planning when file targets/tests/conventions are unclear; strengthen executable verification planning and anti-scope-inflation language; require product-complete task planning for user-facing work. | Plans contain agent-executable verification expectations, include relevant UI/state/flow integration tasks, and do not rely on vague manual checks. |
| `plan-checker-prompt.md` | Add bounded research for validating referenced files/tests when needed; add blocker-focused output limits; verify that user-facing plans include product-completeness expectations when relevant. | Checker reports true execution-readiness blockers, including missing product-facing acceptance criteria, with concise evidence. |
| `plan-challenger-prompt.md` | Add “blocker-finder, not perfectionist”; bounded research for hidden risks; max major risk reporting. | Challenger surfaces material risks without expanding scope endlessly. |
| `spec-reviewer-prompt.md` | Add bounded research only when planning-readiness cannot be judged from the spec; keep PASS/FAIL artifact focus; check that user-facing specs define product-complete outcomes when implied. | Reviewer does not invent scope and reports missing evidence explicitly. |
| `code-spec-reviewer-prompt.md` | Add bounded research for compliance evidence only; keep spec/plan/task focus; add concise blockers and unchecked scope. | Compliance review remains artifact-based and evidence-backed. |
| `code-quality-reviewer-prompt.md` | Add bounded research for changed-file context, conventions, and impact radius; add output hard limits; treat unintegrated placeholder/bare UI as a quality issue for user-facing work. | Quality review identifies real defects without subjective overreach. |
| `completion-verifier-prompt.md` | Add direct research delegation for fresh evidence gathering; define sufficient evidence and unchecked scope reporting. | Verification clearly distinguishes supported, unsupported, and inconclusive outcomes. |
| `final-reviewer-prompt.md` | Add bounded research only for missing final-verdict evidence; keep final PASS/FAIL gate strict. | Final verdict is evidence-backed without redoing implementation or planning. |
| `systematic-debugger-prompt.md` | Add active research delegation for root-cause tracing; define confidence/evidence expectations for routing. | Debugger returns evidence-backed root cause or narrowed candidates. |
| `task-compliance-checker-prompt.md` | Add bounded research for task references and executable verification expectations; concise READY/BLOCKED output. | Task readiness decisions do not rely on guessing file/test existence. |
| `explorer-prompt.md` | Add terminal-agent rule, retrieval budget, stop rules, absolute-path evidence format, and concise result limits. | Explorer gathers internal evidence without recursive delegation or open-ended searching. |
| `librarian-prompt.md` | Add terminal-agent rule, clearer phase boundaries, request-type budgets, stop rules, citation/permalink standards, and sufficient-evidence criteria. | Librarian gathers external evidence with bounded scope and clear sources. |

Required prompt-quality principles to apply where relevant:

- Outcome-first: state deliverable and success condition before detailed process.
- Concise instructions: reduce duplicated ceremony and avoid copying large OMO text blocks.
- Success criteria: define completion, failure, and insufficient-evidence states.
- Constraints: preserve authority boundaries, read-only status, TDD, gates, and finish rules.
- Tool-use rules: direct research calls must target only `explorer`/`librarian`; research agents cannot call agents.
- Retrieval budget: set bounded rounds or focused-call expectations for research-capable roles.
- Stop rules: stop after sufficient evidence, converging sources, or repeated unproductive search.
- Verification loop: require evidence before completion claims where verification is part of the role.
- Context isolation: reviewers judge artifacts/evidence and must not rely on executor effort narrative.
- Fresh judgment: reviewer/checker/verifier/final-review agents should normally be launched fresh for independent judgments; reuse is limited to clarification or tightly scoped re-checks.
- Formatting: use concise structured outputs with max blocker counts or short summaries where useful.
- Anti-AI-slop: avoid scope inflation, premature abstraction, unnecessary dependencies, and documentation bloat.
- Product completeness: user-facing work should define and verify a coherent product outcome, not just literal text/function existence.
- OMO reference use: planner/executor/reviewer/research prompt updates should explicitly consider analogous OMO patterns such as Sisyphus/Atlas delegation structure, Metis anti-AI-slop planning checks, Momus blocker-focused review, Explore/Librarian bounded research behavior, Oracle concise advisory output, and Hephaestus autonomous execution discipline.

## OMO Reference Mapping

Use OMO as a reference library for similar prompt situations, adapted to Supercode:

| Supercode need | OMO reference pattern | Adaptation rule |
|---|---|---|
| Research delegation | Explore/Librarian scoped research and evidence reporting | Convert to `research-delegation` skill and terminal research-agent prompts. |
| Task delegation clarity | Sisyphus/Atlas 6-section delegation | Use TASK / EXPECTED OUTCOME / REQUIRED TOOLS / MUST DO / MUST NOT DO / CONTEXT where it reduces ambiguity. |
| Planning quality | Metis intent classification and anti-AI-slop checks | Add scope, product completeness, and executable QA checks without adding a new planning stage. |
| Plan/review judgment | Momus blocker-finder posture | Make reviewers/checkers concise blocker finders, not perfectionists. |
| Advisory concision | Oracle output limits and pragmatic minimalism | Add short, evidence-backed output contracts where useful. |
| Autonomous implementation | Hephaestus explore-plan-execute-verify discipline | Improve executor prompt while preserving TDD, AST/LSP, and executor-only write authority. |
| Context continuity | OMO task/session continuity lessons | Reuse executor/debugger where useful, but use fresh reviewer/verifier sessions for independent judgments. |

Implementation should preserve Supercode semantics. If an OMO pattern conflicts with Supercode gates, read-only reviewer boundaries, worktree/artifact requirements, or finish approvals, Supercode rules win.

## Product Completeness Guardrails

For user-facing, UI, UX, or product-surface work, Supercode prompts must require agents to look beyond the literal wording of the request and determine the minimum product-complete outcome needed to satisfy the user's intent.

This does not mean expanding scope arbitrarily. It means that if the requested feature appears on a web page or user-facing surface, agents must identify and plan the surrounding requirements that make the feature usable and coherent.

Required behavior by stage/role:

- Spec/orchestrator:
  - Detect when a request is user-facing or product-facing.
  - Clarify or document the minimum product-complete outcome.
  - Include relevant acceptance criteria beyond raw text/function presence.
  - Consider where the feature appears, how users reach it, and what user-visible states matter.
- Planner:
  - Convert product-facing expectations into concrete tasks.
  - Include existing UI/component/design-system pattern discovery when needed.
  - Include relevant states such as loading, empty, error, success, disabled, or permission states when applicable.
  - Include responsive/accessibility expectations when applicable.
- Executor:
  - Do not satisfy user-facing work by adding unstyled raw text, placeholder markup, or disconnected UI unless the spec explicitly asks for that.
  - Reuse existing UI patterns and components where appropriate.
  - Implement the minimum coherent user flow implied by the spec and plan.
- Reviewers/checkers:
  - Treat missing product integration as a blocker or quality issue when the spec/plan implies a user-facing feature.
  - Distinguish legitimate scope control from underbuilt literal-only implementation.
  - Avoid demanding polish beyond the requested product-complete outcome.
- Verification:
  - Prefer user-visible flow verification over checking only that text exists.
  - For web/UI work, verification should consider rendered behavior, interaction, layout integration, and relevant states when feasible.

Examples of insufficient outcomes for user-facing work unless explicitly requested:

- adding only raw text to a webpage with no layout integration;
- adding a button without connected behavior or disabled/loading state when the flow requires it;
- adding a feature in a way that ignores existing component patterns;
- verifying only that a string appears when the required outcome is an interactive user flow.

Examples of acceptable bounded product completeness:

- using the existing page/card/form patterns for a new UI feature;
- adding the minimum loading/empty/error state required by the flow;
- testing the user-visible happy path and at least one relevant failure/empty state;
- documenting explicitly when a state or UX concern is out of scope.

## Fresh Reviewer/Verifier Session Rule

To preserve context isolation, agents that judge or verify artifacts should normally be launched in a fresh session for each independent judgment.

Default fresh-session agents:

- `spec-reviewer`
- `plan-checker`
- `plan-challenger`
- `task-compliance-checker`
- `code-spec-reviewer`
- `code-quality-reviewer`
- `completion-verifier`
- `final-reviewer`

Fresh session is required for:

- first review of a new artifact;
- full re-review after implementation or plan changes;
- final review before finish;
- verification passes that must gather fresh evidence;
- any judgment where prior context could bias PASS/FAIL, READY/BLOCKED, SUPPORTED/UNSUPPORTED, or final routing.

Limited reuse is allowed only for:

- asking the same reviewer to clarify one of its own findings;
- requesting a tightly scoped re-check of a specific finding after a targeted fix;
- continuing a review where no new artifact revision occurred and no executor reasoning or unrelated history is added.

Reuse is not allowed for:

- full re-review after code, plan, or spec changes;
- final-reviewer judgment;
- completion-verifier fresh evidence gathering;
- cases where the reused context includes executor effort narrative, trial-and-error history, or stale assumptions.

Executor and debugger continuity remains allowed where useful:

- The same `executor` should normally continue the same assigned task across revisions unless replacement criteria are met.
- The same `systematic-debugger` may continue the same unclear failure investigation when continuity helps root-cause tracing.
- Planner reuse is allowed during plan revision loops when the same plan artifact is being revised, but checker/challenger judgments should be fresh unless limited-reuse criteria apply.

## Workflow skill prompt changes

- Update stage skills that currently instruct the orchestrator or subagents to use `orchestrator-mediated-research`.
- Replace those references with the new `research-delegation` model where appropriate.
- Preserve the orchestrator's workflow-gate responsibilities: spec, worktree, plan, pre-execute-alignment, execute, final-review, finish.
- Preserve the orchestrator's role as workflow gatekeeper, not research broker.
- Update workflow skill prompts for stronger clarity where they are currently vague about evidence, verification scope, or handoff expectations.

## Tests and validation

- Add/update tests proving the new default task permission policy.
- Add/update tests or snapshots that cover skill registration/removal if the repository has such tests.
- Add/update tests that ensure prompt files no longer reference active `orchestrator-mediated-research` instructions except possibly migration notes or deleted-file references.
- Run relevant repository tests and typecheck.

# Non-Goals

- Do not redesign the entire Supercode workflow.
- Do not remove the orchestrator role.
- Do not relax the rule that only `executor` can modify implementation code.
- Do not allow research agents to spawn other agents.
- Do not allow arbitrary subagent-to-subagent delegation; only `explorer` and `librarian` are allowed through `task` for target subagents.
- Do not remove final-review, finish, approval, or worktree gates.
- Do not change external plugin configuration outside the repository unless required by tests or documented setup.
- Do not leave `orchestrator-mediated-research` registered as an available skill.

# Constraints

- Maintain all existing Supercode public workflow stages:
  - `spec`
  - `worktree`
  - `plan`
  - `pre-execute-alignment`
  - `execute`
  - `final-review`
  - `finish`
- Maintain the authority split:
  - orchestrator coordinates workflow;
  - executor implements;
  - reviewers/checkers/verifiers remain read-only;
  - research agents only gather evidence.
- Direct research delegation must be bounded, not open-ended.
- Every direct research delegation should specify:
  - task/question;
  - why the evidence is needed;
  - scope;
  - budget;
  - stop condition;
  - expected output format.
- Research evidence must separate confirmed facts from inference.
- Internal evidence should use absolute paths when possible.
- External evidence should use official docs, stable links, or permalinks when possible.
- Repeated or duplicate research should be avoided.
- Prompt updates should improve signal-to-noise and not copy OMO prompts wholesale.
- Prompt hardening must not silently change agent authority, workflow stage order, approval gates, or finish behavior.

# Proposed `research-delegation` Skill Contract

The replacement skill should teach this common pattern:

```markdown
# Skill: research-delegation

Use when your assigned task requires repository discovery or external reference evidence.

## Research agents

### explorer
Use for repository structure, implementation tracing, call sites, tests, internal docs, project conventions, and impact radius.

### librarian
Use for official docs, OSS examples, API behavior, version-specific behavior, best practices, and external references.

## Delegation contract

Every research delegation must include:

1. TASK
2. QUESTION
3. WHY NEEDED
4. SCOPE
5. REQUIRED SOURCES
6. BUDGET
7. STOP CONDITION
8. EXPECTED OUTPUT

## Budget rules

- Start with one focused research call unless independent questions justify parallel calls.
- Do not ask the same question twice.
- Stop after two unproductive research rounds.
- Stop once evidence is sufficient for the assigned decision.

## Evidence rules

- Use absolute paths for internal evidence.
- Use official docs or permalinks for external evidence.
- Separate confirmed evidence from inference.
- Report unresolved uncertainty.

## Recursion rule

- explorer and librarian must not call other agents.
```

# Agent-Specific Research Policy

The detailed prompt implementation may tune language per agent, but the intended policy is:

| Agent | Direct research delegation | Notes |
|---|---:|---|
| `planner` | yes | Use to discover file targets, tests, conventions, and dependency constraints before writing plan. |
| `executor` | yes | Use to discover file ownership, call sites, patterns, tests, and external behavior needed for the assigned task. |
| `systematic-debugger` | yes | Use actively for root-cause tracing. |
| `spec-reviewer` | yes, bounded | Use only when planning-readiness cannot be judged from provided spec/evidence. |
| `plan-checker` | yes, bounded | Use mainly to verify referenced files/tests/conventions when needed. |
| `plan-challenger` | yes | Use to surface hidden risks, missing dependencies, and brittle assumptions. |
| `code-spec-reviewer` | yes, bounded | Use only to verify task/spec/plan compliance when assigned context is insufficient. |
| `code-quality-reviewer` | yes, bounded | Use only to inspect changed-file surroundings, conventions, or impact radius needed for quality judgment. |
| `completion-verifier` | yes | Use to gather fresh verification evidence. |
| `final-reviewer` | yes, bounded | Use only for missing evidence required for final verdict; must report checked and unchecked scope. |
| `task-compliance-checker` | yes, bounded | Use to verify whether planned task references and verification expectations are executable. |
| `explorer` | no | Terminal internal research agent. |
| `librarian` | no | Terminal external research agent. |

# Success Criteria

- Target non-research subagents have the exact bounded `task` permission shape allowing only `explorer` and `librarian`.
- `explorer` and `librarian` cannot delegate to other agents.
- `orchestrator` remains excluded from the target permission pattern.
- `orchestrator-mediated-research` is fully deleted from the repository and no longer registered, exported, listed, or referenced as an available active skill.
- Active workflow instructions no longer tell subagents to return `<needs_research>` to the orchestrator for ordinary broad research.
- A new `research-delegation` skill exists and is referenced by relevant non-research subagent prompts and workflow skill prompts.
- Prompt updates preserve existing Supercode roles, gates, and authority boundaries.
- Relevant agent and skill prompts are hardened using the agreed prompt-quality principles: outcome-first framing, success criteria, constraints, bounded research/tool rules, stop conditions, evidence-based completion, context isolation, concise output contracts, QA executability, and anti-AI-slop guardrails.
- `explorer` and `librarian` include clearer retrieval budgets, stop rules, evidence formats, and recursive-delegation prohibition.
- Reviewer/checker/verifier prompts include clearer blocker-focused review posture, output limits, and evidence requirements without weakening their read-only status.
- Planner/plan-checker prompts make verification expectations more executable and reduce vague manual-test language.
- Executor prompt clarifies completion reports as evidence artifacts for downstream reviewers while preserving TDD and AST/LSP requirements.
- Orchestrator prompt is updated to gate and coordinate the new direct research model without reverting to research-broker behavior.
- Subagents that directly delegate research are instructed to use budgets, stop conditions, and evidence reporting.
- Tests cover permission changes and any skill/prompt registration expectations.
- `bun test` passes.
- `bun run typecheck` passes.

# Risks / Unknowns

- The repository may have generated prompt/skill indexes that must be updated when deleting `orchestrator-mediated-research` and adding `research-delegation`.
- Existing tests may assert that reviewer/checker agents cannot use `task` at all; these tests must be updated to the new bounded research-delegation policy.
- Prompt references to `orchestrator-mediated-research` may exist in many agent and skill files.
- Broad prompt hardening can accidentally change behavior if not scoped carefully; revisions must preserve existing role authority and workflow gates.
- Adding too much OMO-style structure could increase prompt noise; improvements must be concise and role-specific.
- Removing the old skill requires updating any package exports, skill discovery tests, generated lists, or references that assume `orchestrator-mediated-research` exists.
- Direct research delegation could increase research volume unless budget and stop rules are clear.
- Reviewer independence could weaken if research delegation is too broad; bounded delegation and evidence reporting are required to mitigate this.

# Revisions

- Initial narrow permission-only spec was replaced after user clarified the full intended scope.
- Expanded scope now includes permission changes, prompt updates, deletion of `orchestrator-mediated-research`, creation of `research-delegation`, and research-agent usage rules.
- Expanded again to explicitly include overall prompt hardening based on OMO, OpenAI GPT-5.5 prompt guidance, and context-engineering principles while preserving Supercode roles and behavior.
