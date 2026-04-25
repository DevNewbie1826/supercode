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

Known exact path reads are not research.

Use direct reads for exact files, artifacts, diffs, or paths already provided by the user, the active workflow, or prior evidence.

Use `orchestrator-mediated-research` only when additional repository discovery, cross-file investigation, implementation tracing, project convention discovery, or external reference evidence is needed beyond known paths and provided context.

If a subagent returns `NEEDS_RESEARCH`, the orchestrator must fulfill that request through `orchestrator-mediated-research` and then resume or re-dispatch the subagent with the returned evidence.

Do not let the stage proceed based on missing evidence or guessing.
---

## Verification Checklist

Before claiming task completion, confirm:

- [ ] every new behavior has a test where practical
- [ ] each new behavior test was observed failing before implementation
- [ ] each failing test failed for the expected reason
- [ ] production code was written only after RED
- [ ] minimal code was written to pass
- [ ] relevant tests pass
- [ ] output is clean
- [ ] tests verify behavior, not just mocks
- [ ] edge cases or error cases required by the task are covered
- [ ] refactors were performed only after GREEN
- [ ] tests stayed green after refactor
- [ ] `testing-anti-patterns.md` was consulted when mocks or test utilities were involved

If the checklist cannot be satisfied, do not claim TDD completion.
Escalate the exception to the orchestrator.

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
