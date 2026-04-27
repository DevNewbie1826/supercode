---
name: orchestrator-mediated-research
description: Use only when additional discovery, broad investigation, cross-file tracing, or external reference evidence is needed beyond known paths; orchestrators fulfill research, while subagents emit a <needs_research> XML handoff instead of researching.
---

## Purpose

The `orchestrator-mediated-research` skill defines the safe research boundary for Supercode.

Its purpose is to:
- prevent uncontrolled broad repository or external research by subagents
- allow direct reading of exact known paths
- route internal discovery to `explorer_agent`
- route external reference investigation to `librarian_agent`
- let subagents safely hand off missing-evidence situations without guessing
- ensure the orchestrator returns evidence to the correct subagent context

This is a shared utility skill, but its behavior depends on who is using it.

---

## Evidence Packet

An Evidence Packet is the preferred way to give subagents the context they need before they start work.

The orchestrator should proactively create an Evidence Packet when a stage or task likely depends on repository structure, call sites, related tests, project conventions, external behavior, or version-specific documentation.

Recommended shape:

```markdown
## Evidence Packet

### Internal Evidence
- relevant files:
- call sites:
- related tests:
- conventions:
- impact radius:
- unresolved internal uncertainty:

### External Evidence
- official docs:
- version notes:
- API/library behavior:
- unresolved external uncertainty:

### Evidence Scope
- checked:
- not checked:
```

Subagents should use the Evidence Packet first.

If the Evidence Packet is insufficient, they should return a structured `<needs_research>` handoff instead of guessing.

---

## Role-Aware Behavior

### If you are the orchestrator

Use this skill to fulfill a research need.

You may:
- directly read exact known paths
- route repository discovery to `explorer_agent`
- route external reference investigation to `librarian_agent`
- combine explorer then librarian when both internal and external evidence are required
- return the evidence to the requesting subagent or continue the orchestrator task

### If you are a subagent

Do not perform the research yourself.

Do not call `explorer_agent` or `librarian_agent`.

First use any Evidence Packet and assigned artifacts provided by the orchestrator.

If that context is insufficient, emit a structured `<needs_research>` XML handoff and stop your current judgment until the orchestrator returns evidence.

Do not continue by manually reading around the repository when broad discovery is needed.
Do not return PASS, APPROVED, READY, completion, or routing decisions based on missing evidence.

---

## Direct Read vs Research Boundary

Known exact path reads are not research.

Direct read is allowed when the file, artifact, diff, or path is already explicitly provided in the assigned context.

Examples of direct reads:
- reading `docs/supercode/<work_id>/spec.md`
- reading `docs/supercode/<work_id>/plan.md`
- reading `docs/supercode/<work_id>/final-review.md`
- reading a file path explicitly provided by the user
- reading a changed file already included in a diff
- reading an active skill or agent prompt being edited
- reading a known file path returned by a prior research result
- reading a known `.worktrees/<work_id>/...` path

Use this skill only when additional discovery, broad investigation, cross-file tracing, or external evidence is needed.

Examples requiring this skill:
- discovering which files implement a behavior
- tracing behavior across unknown modules
- searching repository-wide patterns
- finding project conventions not already provided
- checking official external docs
- verifying OSS/API/library behavior
- comparing repository behavior against external documentation

Rule of thumb:

Known exact path -> direct read.

Unknown scope, broad discovery, implementation tracing, project convention discovery, or external evidence -> this skill.

---

## Research Agents

### explorer_agent

Use for internal repository investigation:
- codebase discovery
- pattern search
- implementation tracing
- repository structure
- configs
- tests
- internal docs
- project-specific logic
- project conventions
- cross-layer behavior

### librarian_agent

Use for external reference investigation:
- official docs
- OSS references
- APIs
- best practices
- migration notes
- version differences
- unfamiliar third-party libraries
- official behavior verification

---

## Combined Usage Rule

If both internal and external investigation are required:

1. Use `explorer_agent` first to determine how the repository actually behaves.
2. Then use `librarian_agent` to compare that behavior against official documentation, best practices, or third-party source evidence.
3. Keep scopes distinct.
4. Do not duplicate the same search across both agents.

---

## Mandatory Research Triggers

A subagent should return `<needs_research>` when any of these are true:

- it would need to inspect more than 2 unprovided files to decide safely
- file ownership, related tests, call sites, import/export paths, or project conventions are unclear
- a claim about repository behavior is not supported by assigned context or the Evidence Packet
- external library, framework, API, or version behavior affects the decision
- PASS / APPROVED / READY / completion would rely on guessing

The goal is not to maximize research calls.
The goal is to prevent expensive or judgment-oriented agents from quietly doing broad discovery or guessing.

---

## Subagent `<needs_research>` Output

When a subagent uses this skill, it must output exactly this XML handoff shape:

```xml
<needs_research>
  <type>internal|external|both</type>
  <question>[precise research question]</question>
  <why_needed>[why this evidence is required to continue safely]</why_needed>
  <current_blocker>[what cannot be judged, completed, approved, rejected, or routed safely without this evidence]</current_blocker>
</needs_research>
```

The subagent must not:
- continue by guessing
- approve, reject, route, or implement based on missing evidence
- call explorer_agent or librarian_agent directly
- treat `<needs_research>` as completion

## Orchestrator Handling of `<needs_research>`

When a subagent returns `<needs_research>`, the orchestrator must:

1. Treat it as a pause state, not completion.
2. Parse the XML fields:
   - `type`
   - `question`
   - `why_needed`
   - `current_blocker`
3. If any required field is missing, ask the same subagent to restate the `<needs_research>` block correctly.
4. Use `explorer_agent` for internal repository discovery.
5. Use `librarian_agent` for external reference evidence.
6. Use explorer first, then librarian, when `type` is `both`.
7. Return only relevant evidence to the requesting subagent context.
8. Re-dispatch or resume the subagent with that evidence.
9. Preserve reviewer context isolation.

## Orchestrator Research Result Format

When returning evidence to a subagent, provide:

```markdown
### Research Result
- type: internal | external | both
- question: [question answered]
- findings:
  - [finding]
  - [finding]
- sources_or_paths:
  - [path or reference]
  - [path or reference]
- unresolved_uncertainty:
  - [remaining uncertainty or None.]
```

Keep returned evidence scoped to the subagent's requested decision.

Do not include irrelevant research details.

---

## Failure Handling

If research cannot be completed:
- state the failure clearly
- identify what evidence is missing
- do not let the requesting subagent guess
- route to the appropriate workflow blocker or user decision if necessary

If the research request is too vague:
- narrow it if the orchestrator can do so safely
- otherwise return it for clarification

If a known exact path was all that was needed:
- do not use broad research
- read the path directly
