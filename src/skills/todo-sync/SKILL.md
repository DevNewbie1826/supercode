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
