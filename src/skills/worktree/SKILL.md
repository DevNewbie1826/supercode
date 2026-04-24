---
name: worktree
description: Use when approved work must move into an isolated git worktree before planning or implementation continues.
---

## Purpose

The `worktree` skill creates and validates an isolated git worktree for the current approved work item.

It exists to ensure that all downstream work happens in a clean, separate workspace instead of the current working directory.

This skill is owned by the `orchestrator`.

It should run immediately after `spec` is approved and committed, and before `plan` begins. Its behavior is based primarily on easycode’s stricter local `.worktrees/` convention and safety-first setup flow, with the useful baseline-verification discipline also seen in superpowers. :contentReference[oaicite:0]{index=0}

---

## Primary Agent

- `orchestrator`

No other stage agent owns this skill.

---

## Inputs

This skill requires:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- the commit containing the approved spec
- the target branch name for the isolated worktree

Optional inputs:
- known setup commands or environment notes
- known baseline issues already discovered

---

## Output

This skill must produce:
- an isolated git worktree
- a verified baseline status for that worktree
- a planning-ready workspace reference

The orchestrator must report at minimum:
- `work_id`
- base branch
- feature branch
- full worktree path
- setup commands run or skipped
- baseline verification command used
- baseline verification result
- final status: `ready` or `blocked`

---

## Core Principle

Always create worktrees inside the repository-local `.worktrees/` directory.

Never:
- ask the user where to create the worktree
- use another directory name
- use a global worktree location
- continue without safety verification

This follows easycode’s stricter convention rather than superpowers’ more flexible directory selection. That stricter local convention is better for predictable orchestration. :contentReference[oaicite:1]{index=1}

---

## Directory Rule

Always use:

```bash
.worktrees/
```

The worktree path for a work item must be:

```bash
.worktrees/<work_id>
```

Examples:
- `.worktrees/20260424-auth-refresh-a1b2`
- `.worktrees/20260424-checkout-timeout-f83d`

Do not use:
- `worktrees/`
- a user-chosen alternate directory
- a global worktree directory

---

## Safety Verification

Before creating a worktree, verify that `.worktrees/` is ignored:

```bash
git check-ignore -q .worktrees
```

If `.worktrees/` is not ignored:

1. add `.worktrees/` to `.gitignore`
2. commit that change immediately
3. then continue with worktree creation

Example:

```bash
printf "\n.worktrees/\n" >> .gitignore
git add .gitignore
git commit -m "chore: ignore local git worktrees"
```

This prevents accidental tracking of worktree contents and polluted repository status. :contentReference[oaicite:2]{index=2}

---

## Workflow

1. Confirm that the approved spec exists at `docs/supercode/<work_id>/spec.md`.
2. Confirm that the spec has been committed.
3. Detect the repository root.
4. Ensure `.worktrees/` exists under the repository root.
5. Verify that `.worktrees/` is ignored.
6. Fix `.gitignore` and commit immediately if needed.
7. Create the new worktree at `.worktrees/<work_id>`.
8. Check out or create the intended feature branch there.
9. Enter the worktree.
10. Auto-detect and run project setup commands.
11. Run a baseline verification command.
12. Classify the worktree as `ready` or `blocked`.
13. Hand off to `plan` only when the worktree is `ready`, or when the orchestrator has explicitly accepted a degraded baseline.

---

## Reference Commands

### 1. Detect project root

```bash
root=$(git rev-parse --show-toplevel)
```

### 2. Ensure `.worktrees/` exists

```bash
mkdir -p "$root/.worktrees"
```

### 3. Create worktree

```bash
path="$root/.worktrees/$WORK_ID"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

Use `work_id` for the directory name and the workflow’s chosen branch name for the branch.

---

## Project Setup

After entering the worktree, auto-detect and run appropriate setup.

Examples:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

Do not hardcode one ecosystem’s setup steps if the project indicates another. :contentReference[oaicite:3]{index=3}

---

## Baseline Verification

After setup, verify that the worktree starts from a known baseline.

Use a project-appropriate verification command, for example:

```bash
npm test
cargo test
pytest
go test ./...
```

If baseline verification fails:
- report failures clearly
- classify the worktree as `blocked`
- do not silently continue
- let the orchestrator decide whether to investigate first or explicitly proceed with a documented degraded baseline

If baseline verification passes:
- classify the worktree as `ready`

This preserves the core “clean baseline before downstream work” discipline present in both referenced skills. :contentReference[oaicite:4]{index=4}

---

## Hard Rules

1. Only `orchestrator` runs this skill.
2. Do not run this skill before `spec` is complete.
3. The approved spec must already be committed.
4. Always use `.worktrees/`.
5. Always name the worktree directory with `work_id`.
6. Always verify `.worktrees/` is ignored before creation.
7. Immediately fix `.gitignore` if `.worktrees/` is not ignored.
8. Always run setup detection before declaring readiness.
9. Always run baseline verification before handoff.
10. Do not silently proceed with failing baseline verification.
11. Do not begin `plan` until the worktree is `ready`, unless the orchestrator explicitly accepts a degraded baseline and records that decision.

---

## Completion Gate

The `worktree` skill is complete only when all of the following are true:
- `docs/supercode/<work_id>/spec.md` exists and is approved
- an isolated worktree exists
- the worktree is located inside `.worktrees/`
- the worktree is based on the approved spec state
- `.worktrees/` ignore safety has been verified
- setup has been run or explicitly skipped
- baseline verification has been run
- the resulting state has been clearly classified as `ready` or `blocked`

---

## Handoff to Next Skill

On success, hand off to `plan` with:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- active worktree path
- feature branch name
- setup status
- baseline verification result
- any known baseline caveats

Do not hand off as normal if the worktree is still `blocked`.

---

## Failure Handling

If worktree creation fails:
- stop progression
- report the failure clearly
- do not continue to `plan`

If `.worktrees/` is not ignored:
- fix `.gitignore`
- commit the fix
- then continue

If setup fails:
- report the failure
- classify the worktree as `blocked`
- do not pretend the workspace is ready

If baseline verification fails:
- report the failure
- classify the worktree as `blocked`
- do not silently continue into planning

If the worktree points to the wrong commit or wrong branch:
- treat it as failure
- recreate it from the correct approved state

---

## Common Mistakes

Never:
- create a worktree outside `.worktrees/`
- ask the user where to create the worktree
- skip ignore verification
- skip setup detection
- skip baseline verification
- proceed casually with failing baseline checks

Always:
- use `.worktrees/<work_id>`
- verify ignore safety
- fix `.gitignore` immediately if needed
- auto-detect setup
- verify baseline before handoff
