# Testing Anti-Patterns

**Load this reference when:** writing tests, changing tests, adding mocks, or feeling tempted to add test-only methods to production code.

## Overview

Tests must verify real behavior, not mock behavior.

Mocks are tools for isolation. They are not the thing being tested.

**Core principle:** Test what the system does, not what the mocks do.

Strict TDD prevents most of these anti-patterns before they appear.

## The Iron Laws

```text
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding the dependency
```

## Anti-Pattern 1: Testing Mock Behavior

**The violation:**
```typescript
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**Why this is wrong:**
- It verifies that the mock rendered, not that the real behavior is correct
- It tells you nothing useful about the actual component
- It creates false confidence

**The fix:**
```typescript
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

If the dependency truly must be mocked, do not assert on the mock itself. Assert on the behavior of the unit under test.

### Gate Check

Before asserting on a mock:
- Ask: "Am I testing real behavior or just mock existence?"
- If the answer is mock existence, stop and rewrite the test

## Anti-Pattern 2: Test-Only Methods in Production Code

**The violation:**
```typescript
class Session {
  async destroy() {
    await this._workspaceManager?.destroyWorkspace(this.id);
  }
}
```

```typescript
afterEach(() => session.destroy());
```

**Why this is wrong:**
- It pollutes production code with test-only behavior
- It creates risky APIs that do not belong in the production model
- It violates separation of concerns

**The fix:**
```typescript
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}
```

```typescript
afterEach(() => cleanupSession(session));
```

### Gate Check

Before adding a method to production code:
- Ask: "Is this method only used in tests?"
- If yes, stop and move it to test utilities
- Ask: "Does this class truly own this lifecycle?"
- If no, stop and move the logic elsewhere

## Anti-Pattern 3: Mocking Without Understanding the Dependency

**The violation:**
```typescript
test('detects duplicate server', () => {
  vi.mock('ToolCatalog', () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
  }));

  await addServer(config);
  await addServer(config);
});
```

**Why this is wrong:**
- The mocked method may have side effects the test depends on
- Over-mocking can break the behavior you intended to verify
- The test may fail mysteriously or pass for the wrong reason

**The fix:**
```typescript
test('detects duplicate server', () => {
  vi.mock('MCPServerManager');

  await addServer(config);
  await addServer(config);
});
```

Mock the slow or external dependency, not the higher-level behavior your test relies on.

### Gate Check

Before mocking any method:
1. Ask what side effects the real method has
2. Ask whether the test depends on any of those side effects
3. Ask whether you fully understand that dependency chain

If you do not understand the dependency, do not mock it yet.

Run the test with the real implementation first when possible. Then mock only what is necessary.

## Anti-Pattern 4: Incomplete Mocks

**The violation:**
```typescript
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
};
```

**Why this is wrong:**
- It hides structural assumptions
- Downstream code may depend on omitted fields
- Tests may pass while real integrations fail

**The rule:** Mock the full shape of the real data structure, not just the fields used by the immediate assertion.

**The fix:**
```typescript
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
};
```

### Gate Check

Before creating a mock response:
- Check the real schema
- Mirror the complete structure
- Include all fields downstream code may read

If you do not understand the full shape, you are not ready to mock it safely.

## Anti-Pattern 5: Treating Integration Tests as Optional Follow-Up

**The violation:**
```text
✅ Implementation complete
❌ No tests written
"Ready for testing"
```

**Why this is wrong:**
- Testing is part of implementation
- "We'll test later" is not completion
- TDD would have prevented this state

**The fix:**
```text
1. Write the failing test
2. Implement to pass
3. Refactor
4. Then claim completion
```

## When Mocks Become Too Complex

Warning signs:
- Mock setup is longer than the test logic
- You are mocking everything just to make the test run
- The mocks do not match the real objects
- The test fails when the mock changes, even though behavior did not

At that point, ask:
- Do we actually need a mock here?
- Would a real dependency or a higher-level integration test be simpler?

Complex mocks are often a design smell.

## Why TDD Prevents These Problems

TDD helps because it forces you to:
1. Define the behavior first
2. Watch the test fail against real behavior
3. Implement only what is required
4. Add isolation only when needed

If you are testing mock behavior, you almost certainly drifted away from TDD.

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Asserting on mock elements | Test real behavior instead |
| Adding test-only methods to production code | Move them to test utilities |
| Mocking without understanding dependencies | Understand the side effects first |
| Using incomplete mocks | Mirror the full real structure |
| Treating tests as follow-up work | Use TDD from the start |
| Building complex mock scaffolding | Consider integration tests instead |

## Red Flags

- Assertions against `*-mock` elements
- Production methods only used in test files
- Mock setup takes more space than the test
- You cannot explain why the mock is necessary
- You mocked something "just to be safe"
- Removing the mock completely breaks your understanding of the test

## Bottom Line

Mocks are tools for isolation, not the thing being verified.

If the test mostly proves that the mock behaves as configured, the test is wrong.

Test real behavior instead.
