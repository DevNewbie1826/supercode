---
name: todo-sync
description: Use when an orchestrating workflow must keep the todo list synchronized before work starts, after each completed step, and at real completion.
---

Always use `todowrite` to keep the todo list aligned with actual execution.

- Initialize the todo list before the first substantive workflow action.
- Keep exactly one item `in_progress` at a time.
- When a step completes and the next step begins, mark the finished item `completed` and the next item `in_progress` in the same update.
- If the workflow moves backward, reopen the relevant earlier item immediately.
- Update the list after each completed task.
- Update it again at true terminal completion.
- If the plan changes or new tasks appear, update the list before continuing.
- Clear the todo list only when the workflow reaches a real terminal state after the final required non-`todowrite` action.

Do not continue work with stale todo state.

## Phase 2 Artifact Complement Rule

`todowrite` remains the active in-session todo source and primary task tracking mechanism. `state.json` at `docs/supercode/<work_id>/state.json` is a durable snapshot/complement for resume and review visibility, not a replacement for active `todowrite`-based todo synchronization.

If `state.json` is stale or mismatched against active `todowrite` state, report the mismatch and deliberately reconcile rather than silently trusting the stale `state.json` file. Stale or outdated state must be reported and reconciled, not silently trusted.
