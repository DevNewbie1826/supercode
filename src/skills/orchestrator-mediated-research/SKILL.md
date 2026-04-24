---
name: orchestrator-mediated-research
description: Use when a subagent needs repository or external evidence and all research must be routed centrally through the orchestrator instead of being performed directly by subagents.
---

## Purpose

The `orchestrator-mediated-research` skill centralizes research through the orchestrator.

Its purpose is to:
- prevent uncontrolled direct research by subagents
- route internal and external investigation through the correct research agents
- avoid duplicated search effort
- ensure research results are returned to the correct requesting subagent session

This is a shared utility skill, not a main workflow stage.

---

## Core Rule

Subagents must not perform direct research on their own.

If research is needed, they must send a structured `research_request` to the orchestrator.

The orchestrator is the only agent allowed to delegate research to:
- `explorer_agent`
- `librarian_agent`

---

## Identity Rule

When subagents are created through the Task tool, the returned `task_id` is the primary unique identifier for that subagent session.

Use:
- `requested_by_task_id` as the primary routing identity
- `request_id` as the unique id for the research request itself

Do not route research results using only role name or stage name.

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
- a subagent needs repository evidence it cannot safely infer
- a subagent needs external documentation or third-party reference evidence
- a stage requires verification against actual codebase behavior
- a stage requires official or external confirmation
- both repository reality and external reference knowledge are needed

Do not use this skill when:
- the answer is already explicit in the current task context
- the needed information is already available from a prior returned result
- the task does not require repository or external investigation

---

## Required Request Schema

Use this exact schema:

```xml
<research_request>
  <request_id></request_id>
  <requested_by_task_id></requested_by_task_id>
  <type>internal|external|both</type>
  <question></question>
  <why_needed></why_needed>
</research_request>
```

---

## Field Definitions

### request_id
Unique identifier for this specific research request.

### requested_by_task_id
The unique `task_id` returned when that subagent session was created through the Task tool.

This is mandatory.

### type
Allowed values:
- `internal`
- `external`
- `both`

### question
A precise research question.

Good:
- `Which files currently implement token refresh and retry handling?`
- `What does the official framework documentation say about pending navigation state in the version we use?`

Bad:
- `Look into auth`
- `Research this library`

### why_needed
Why the requesting agent needs this evidence.

---

## Orchestrator Responsibilities

When receiving a `research_request`, the orchestrator must:

1. Validate that the request is specific enough.
2. Preserve `request_id` and `requested_by_task_id` exactly.
3. Decide whether the scope is internal, external, or both.
4. Delegate to the correct research agent(s).
5. Avoid duplicated search effort.
6. Return the result only to the matching requesting subagent session.

The orchestrator must not:
- silently drop valid research requests
- route by role name alone
- broadcast one result to multiple same-role agents
- perform overlapping research twice without reason

---

## Required Response Schema

The orchestrator must return results in this structure:

```xml
<research_response>
  <request_id></request_id>
  <requested_by_task_id></requested_by_task_id>
  <type>internal|external|both</type>
  <findings></findings>
  <sources_or_paths></sources_or_paths>
  <unresolved_uncertainty></unresolved_uncertainty>
</research_response>
```

---

## Routing Rules

- A response must match exactly one prior request.
- Matching must be done by `request_id`.
- `requested_by_task_id` must also match.
- If either is missing or ambiguous, do not deliver the result.
- Do not route by role name alone.

---

## Returned Evidence Rules

### findings
The main result of the research.

### sources_or_paths
Relevant file paths, documentation references, or source locations.

### unresolved_uncertainty
Any important uncertainty that remains after research.

If none remains, say `None.`

---

## Subagent Rules

Any subagent using this skill must follow these rules:

1. Do not search directly.
2. Always include `request_id`.
3. Always include your exact `requested_by_task_id`.
4. Keep the question specific and task-relevant.
5. Resume work only after the orchestrator returns a matching `research_response`.

---

## Orchestrator Triage Rule

If a research request is weak or underspecified, the orchestrator should:
1. refine it into a narrower operational question when possible
2. otherwise return a request for refinement to the subagent

Do not send low-quality research requests downstream if they can be improved centrally first.

---

## Completion Condition

This skill is complete for a given request when:
- a valid `research_request` has been submitted
- the orchestrator has routed it correctly
- research has been performed by the appropriate agent(s)
- the evidence has been returned to the correct requesting subagent session

---

## Failure Handling

If the orchestrator cannot route a result safely:
- do not guess
- do not deliver the response to a same-role fallback agent
- do not broadcast to multiple active subagents
- surface a routing error
- require exact identifier recovery before continuation

---

## Example Internal Request

```xml
<research_request>
  <request_id>req-001</request_id>
  <requested_by_task_id>ses_241b366a0ffefepLX2MU95Ia3E</requested_by_task_id>
  <type>internal</type>
  <question>Which files currently implement token refresh and retry handling?</question>
  <why_needed>Need exact file targets for the assigned execution task.</why_needed>
</research_request>
```

## Example Matching Response

```xml
<research_response>
  <request_id>req-001</request_id>
  <requested_by_task_id>ses_241b366a0ffefepLX2MU95Ia3E</requested_by_task_id>
  <type>internal</type>
  <findings>Primary refresh logic is implemented in auth/session.ts and api/retry-client.ts.</findings>
  <sources_or_paths>src/auth/session.ts; src/api/retry-client.ts</sources_or_paths>
  <unresolved_uncertainty>None.</unresolved_uncertainty>
</research_response>
```
