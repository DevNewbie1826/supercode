---
name: test-driven-development
description: Use before implementing any feature, bug fix, refactor, or behavior change so production code is driven by a failing test first.
---

## Purpose

The `test-driven-development` skill defines the test-first implementation discipline used during `execute`.

Its purpose is to ensure that production code is written only after a relevant test exists and has been observed failing for the expected reason.

This is a supporting execution skill.
It should be invoked by `executor` whenever behavior, production code, tests, bugs, regressions, or refactors are involved.

---

## Reference Documents

When adding mocks, test utilities, or test-only seams, also read:

- `testing-anti-patterns.md`

Use that reference to avoid:
- testing mock behavior instead of real behavior
- adding test-only methods to production classes
- mocking without understanding dependencies
- incomplete mocks that hide structural assumptions

---

## Core Principle

Test what the code does, not what the mocks do.

Tests must verify real behavior.
Mocks are allowed only as a means to isolate behavior.
Mocks are not the behavior being tested.

---

## Iron Law

```text
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

If production code was written before the failing test:
- delete that production code
- do not keep it as reference
- do not adapt it into the final implementation
- restart from the failing test

Delete means delete.

---

## When to Use

Use this skill for:
- new features
- bug fixes
- refactors
- behavior changes
- regression fixes
- changes made after review feedback when behavior is affected

Exceptions require explicit human approval:
- throwaway prototypes
- generated code
- configuration-only changes
- documentation-only changes

If you are thinking “just this once,” stop.
That is rationalization.

---

## Required Cycle

Every behavior change should follow:

1. RED
2. VERIFY RED
3. GREEN
4. VERIFY GREEN
5. REFACTOR
6. VERIFY STILL GREEN
7. REPEAT

Do not skip steps.

---

## RED — Write the Failing Test

Write one minimal test that expresses one behavior.

A good RED test:
- has a clear behavior-based name
- tests one behavior
- demonstrates the desired API or outcome
- prefers real code over mocks unless mocks are unavoidable
- fails because the behavior is missing

Avoid:
- vague names
- broad multi-behavior tests
- tests that mostly verify mock setup
- tests that mirror the implementation instead of the requirement

Rule of thumb:
- if the test name contains “and,” consider splitting it.

---

## VERIFY RED — Watch It Fail

Run the focused test and confirm it fails correctly.

You must confirm:
- the test fails
- the failure is expected
- the failure is caused by the missing behavior
- the failure is not caused by typo, setup error, import error, mock mismatch, or incorrect assertion

If the test passes immediately:
- the behavior already exists, or
- the test was written too late, or
- the test is not testing the intended behavior

Do not continue to implementation until RED is real.

If the test errors instead of failing for the intended reason:
- fix the test or setup
- re-run until it fails for the correct reason

---

## GREEN — Write Minimal Code

Write the smallest production change that makes the failing test pass.

Do:
- implement only the behavior under test
- keep the change narrow
- avoid speculative flexibility
- avoid unrelated cleanup

Do not:
- add extra features
- refactor unrelated code
- introduce broad abstractions
- solve future hypothetical problems
- improve nearby code “while you are there”

The goal of GREEN is correctness for the test, not elegance.

---

## VERIFY GREEN — Watch It Pass

Run the focused test again.

Confirm:
- the new test passes
- relevant existing tests still pass
- output is clean
- no unexpected errors or warnings appear

If the new test fails:
- fix the code, not the test, unless the test is proven wrong

If unrelated tests fail:
- stop and investigate
- do not hide or ignore failures
- use `systematic-debugging` when the cause is unclear

---

## REFACTOR — Clean Up After Green

Refactor only after tests are green.

Allowed refactoring:
- remove duplication
- improve naming
- simplify structure
- extract helpers when clearly justified
- align with existing local conventions

Do not change behavior during refactor.

After each refactor:
- run the relevant tests again
- keep the suite green

If refactor causes failure:
- either fix the refactor immediately or revert it
- do not continue on a broken state

---

## Bug Fix Rule

Never fix a bug without first reproducing it with a failing test.

For bugs:
1. write a test that reproduces the bug
2. verify the test fails for the expected reason
3. implement the smallest fix
4. verify the test passes
5. keep the test as regression protection

If the bug is hard to reproduce:
- narrow the reproduction
- use `systematic-debugging` if the failure mechanism is unclear
- do not apply speculative fixes first

---

## Existing Code Rule

When changing existing untested code:
- add a characterization or behavior test first when practical
- observe the test fail if the desired behavior is missing
- if preserving existing behavior, establish a test that protects the behavior before refactoring
- avoid broad rewrites without test protection

If existing code is hard to test:
- treat that as design feedback
- improve testability only within the assigned task scope

---

## Mocks and Test Utilities

When adding mocks, stubs, spies, fixtures, fake implementations, or test utilities:
- read `testing-anti-patterns.md`
- verify that the test still checks real behavior
- avoid asserting that mocks exist or were rendered unless that is the actual behavior contract
- do not add test-only methods to production classes
- do not mock dependencies you do not understand
- avoid incomplete mocks that hide structural assumptions

Mocking is acceptable only when it isolates behavior.
Mocking is wrong when it becomes the thing being tested.

---

## Exploration Rule

If exploration is necessary:
- explore separately
- do not treat exploratory code as production code
- discard exploratory implementation
- restart production implementation from a failing test

Do not keep exploratory code as reference implementation.

---

## Todo Integration

When used inside `execute`, the `executor` must reflect TDD progress in `todo-sync`.

The task-level todo list should track:
- identify behavior to test
- write failing test
- verify RED
- write minimal implementation
- verify GREEN
- refactor if needed
- verify still green
- prepare task for review

Update todo state when each TDD step completes.

---

## Research Rule

Use the Evidence Packet provided by the orchestrator before deciding whether more research is needed.

Known exact path reads are not research.

Agents may directly inspect files, diffs, artifacts, exact known paths, and evidence explicitly provided in their assigned context.

If the Evidence Packet and assigned context are insufficient, and additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, call-site discovery, related-test discovery, impact-radius discovery, or external reference evidence is required, the agent must use `orchestrator-mediated-research`.

When used by a subagent, `orchestrator-mediated-research` must produce a structured `<needs_research>` XML handoff for the orchestrator to fulfill.

Mandatory research triggers:
- the agent would need to inspect more than 2 unprovided files to make the decision safely
- file ownership, related tests, call sites, import/export paths, or project conventions are unclear
- a claim about repository behavior is not supported by provided evidence
- external library, framework, API, or version behavior affects the decision
- PASS / APPROVED / READY / completion would rely on guessing

Required handoff shape:

```xml
<needs_research>
  <type>internal|external|both</type>
  <question>[precise research question]</question>
  <why_needed>[why this evidence is required to continue safely]</why_needed>
  <current_blocker>[the judgment or action that cannot be completed without this evidence]</current_blocker>
</needs_research>
```

Use this boundary:
- Known exact path or provided artifact -> direct read / inspect
- Unknown scope, broad discovery, implementation tracing, project convention discovery, or external evidence -> `<needs_research>`

---

## Red Flags

Stop and correct course if any of these occur:

- production code exists before the test
- test was added after implementation
- test passed immediately
- you cannot explain why the test failed
- tests are being deferred until later
- you are relying on manual testing instead of repeatable verification
- you are keeping exploratory code as reference
- you are rationalizing an exception
- the test mostly checks mock behavior
- the verification command was not run
- failing tests are being ignored
- test-only production methods are being added
- mocks are being asserted instead of user-visible or domain behavior

---

## When Stuck

If you do not know how to test the behavior:
- write the assertion first
- design the API from the desired use
- look for existing project test patterns
- request orchestrator-mediated research if needed

If the test is too complicated:
- the design may be too complicated
- simplify the interface if within task scope

If everything must be mocked:
- the code may be too coupled
- consider whether a small seam or dependency injection is justified within task scope
- consult `testing-anti-patterns.md`

If setup is too large:
- extract test helpers only when useful
- avoid adding production-only test hooks unless explicitly justified

---

## Anti-Patterns

Avoid:
- testing mocks instead of behavior
- adding test-only methods to production code
- mocking without understanding dependencies
- incomplete mocks that hide structural assumptions
- changing tests to match incorrect implementation
- writing broad snapshot tests as the only verification
- over-mocking without understanding dependency behavior
- asserting implementation details when behavior assertions are possible
- adding sleeps instead of condition-based waiting
- testing multiple unrelated behaviors in one test

For details and examples, read `testing-anti-patterns.md`.

---

## Completion Standard

This skill is complete for a task only when:
- RED was observed for required behavior
- GREEN was observed after minimal implementation
- refactor, if performed, preserved GREEN
- relevant verification passed
- anti-pattern checks were applied when mocks or test utilities were involved
- any exception to TDD was explicitly approved or documented

---

## Final Rule

```text
Production code → test exists and failed first.
Otherwise → not TDD.
```
