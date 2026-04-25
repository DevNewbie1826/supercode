---
name: orchestrator-mediated-research
description: Use when additional repository discovery, implementation tracing, project convention discovery, or external reference evidence is needed beyond known files and provided context; orchestrators fulfill research, while subagents receive a NEEDS_RESEARCH handoff instead of performing research themselves.
---

## Purpose

The `orchestrator-mediated-research` skill defines the safe research boundary for Supercode.

It exists to:
- distinguish direct reads from actual research
- prevent subagents from doing uncontrolled broad discovery
- let subagents safely signal that additional evidence is required
- let the orchestrator fulfill that request through `explorer_agent` and/or `librarian_agent`
- avoid duplicated investigation
- preserve reviewer and executor context isolation

This is a shared utility skill, not a main workflow stage.

---

## Core Boundary

Known exact path reads are not research.

An agent may directly inspect files, diffs, artifacts, or evidence that are explicitly provided in its assigned context.

Examples of direct reads:
- reading `docs/supercode/<work_id>/spec.md`
- reading `docs/supercode/<work_id>/plan.md`
- reading `docs/supercode/<work_id>/final-review.md`
- reading a file path explicitly provided by the user
- reading a changed file or diff already provided to a reviewer
- reading an active skill or agent prompt being edited
- reading a known file path returned by a prior research result

Use this skill only when additional discovery or external evidence is needed.

Examples that require this skill:
- discovering which files implement a behavior
- tracing behavior across unknown modules
- searching repository-wide patterns
- finding project conventions not already provided
- checking official external docs
- verifying OSS/API/library behavior
- comparing repository behavior against external documentation

Rule of thumb:

```text
Known exact path -> direct read.
Unknown scope, broad discovery, implementation tracing, project convention discovery, or external evidence -> orchestrator-mediated-research.
```

---

## Role-Aware Behavior

This skill behaves differently depending on who is using it.

### If you are the orchestrator

Fulfill the research.

The orchestrator may:
- route internal repository discovery to `explorer_agent`
- route external reference checks to `librarian_agent`
- use both when internal reality and external documentation must be compared
- return an evidence summary to the requesting subagent or continue the current orchestrator task

### If you are a subagent

Do not perform the research yourself.

Do not call `explorer_agent`.
Do not call `librarian_agent`.
Do not do broad repository discovery.
Do not search external references directly.

Instead, return a `NEEDS_RESEARCH` handoff and stop the current judgment until the orchestrator provides evidence.

Use this exact format:

```markdown
### Status
NEEDS_RESEARCH

### Research Needed
- type: internal | external | both
- question: [precise research question]
- why_needed: [why this evidence is required to continue safely]

### Current Blocker
- [what cannot be judged, planned, implemented, reviewed, verified, or routed safely without this evidence]
```

Do not return PASS, APPROVED, READY, COMPLETE, or a final judgment while the required evidence is missing.

---

## Research Agents

### explorer_agent
Alias: `Contextual Grep`

Use for:
- internal codebase discovery
- pattern search
- implementation tracing
- repository structure
- configs
- tests
- internal docs
- project-specific logic
- project-specific conventions
- cross-layer behavior

Prefer this agent when the primary question is about how the current repository actually works.

### librarian_agent
Alias: `Reference Grep`

Use for:
- external docs
- OSS references
- APIs
- best practices
- migration notes
- version differences
- unfamiliar third-party libraries
- official behavior verification

Prefer this agent when the primary question is about official or external behavior rather than current repository behavior.

---

## Combined Usage Rule

If both internal and external investigation are required:

1. Use `explorer_agent` first.
2. Then use `librarian_agent`.
3. Keep the scopes distinct.
4. Do not duplicate the same search across both agents.

---

## When to Use

Use this skill when:
- additional repository discovery is needed beyond provided context
- cross-file investigation is required
- implementation tracing is required
- project convention discovery is required
- external documentation or third-party reference evidence is needed
- a decision would otherwise rely on guessing

Do not use this skill when:
- an exact known file path only needs to be read
- the user explicitly provided the file path to inspect
- the required file, diff, artifact, or evidence is already in the assigned context
- the needed information is already available from a prior returned result
- the issue is purely a formatting or local artifact inspection task

---

## Orchestrator Responsibilities

When using this skill as orchestrator:

1. Determine whether the need is internal, external, or both.
2. Refine weak research questions into precise operational questions when possible.
3. Use `explorer_agent` for internal repository discovery.
4. Use `librarian_agent` for external reference checks.
5. Use explorer first and librarian second when both are needed.
6. Keep scopes distinct.
7. Return only the evidence needed by the requesting subagent.
8. Preserve context isolation by not sending irrelevant narrative or unrelated findings.
9. Do not treat `NEEDS_RESEARCH` as task completion.

---

## Evidence Return Format

When the orchestrator fulfills research, return evidence in this structure:

```markdown
### Research Result
- type: internal | external | both

### Findings
- [key finding]
- [key finding]

### Sources or Paths
- [file path, symbol, doc reference, or source location]
- [file path, symbol, doc reference, or source location]

### Unresolved Uncertainty
- [remaining uncertainty]
- or `None.`
```

Keep the result focused on the requesting task.

---

## Subagent Rules

When this skill is used by a subagent:

1. Do not investigate directly.
2. Return `NEEDS_RESEARCH`.
3. Ask one precise research question.
4. Explain why the evidence is required.
5. State the current blocker.
6. Stop the current judgment until the orchestrator returns evidence.

Do not use this skill to avoid ordinary direct reads of provided files or artifacts.

---

## Completion Condition

For an orchestrator-led research request, this skill is complete when:
- the correct research agent(s) have been used
- duplicated search was avoided
- relevant evidence has been returned
- unresolved uncertainty is stated

For a subagent-led invocation, this skill is complete when:
- a clear `NEEDS_RESEARCH` handoff has been returned to the orchestrator

---

## Failure Handling

If the research question is too vague:
- narrow it if possible
- otherwise ask the requesting agent to clarify the required evidence

If research cannot be completed:
- return the attempted scope
- return what was checked
- return what remains unknown
- do not fabricate evidence

If a subagent invokes this skill for a known exact path:
- do not perform broad research
- indicate that direct read of the provided path is allowed
- continue only if the assigned context actually includes the file or path
