# Disable OpenCode Default Agents By Policy

## Goal

When `supercode` is fully loaded, disable conflicting OpenCode default agents by plugin policy without requiring any `supercode.json` configuration.

## Problem

`supercode` already injects and manages its own workflow agents such as `orchestrator`, `explorer`, and `librarian`.
OpenCode default agents like `explore`, `build`, and `plan` overlap with those roles, but `supercode` currently does not disable them.
That leaves duplicate agent paths active and increases the chance of the orchestrator or users selecting the wrong agent.

## Non-Goals

- Do not add new user-facing config for this behavior.
- Do not copy `easycode` structure or behavior wholesale.
- Do not change plugin-managed agent binding semantics.
- Do not disable `general`.

## Requirements

1. `supercode` must disable the OpenCode default agents `explore`, `build`, and `plan` by default.
2. `general` must remain enabled.
3. No change to `supercode.json` schema.
4. Existing custom fields already present under `config.agent.<name>` must be preserved.
5. The new behavior must stay isolated from built-in `supercode` agent registration.

## Proposed Design

### 1. Add a dedicated policy module

Create `src/agents/builtin-policy.ts` containing a single exported policy map for OpenCode default agents:

```ts
export const builtinAgentDisablePolicy: Record<string, boolean> = {
  explore: true,
  build: true,
  plan: true,
  general: false,
}
```

This module is intentionally narrow.
It expresses plugin policy only and does not know about config parsing, bundled agent definitions, or merge mechanics.

### 2. Apply the policy in `config-handler.ts`

After `supercode` injects its own managed agents, `config-handler.ts` will apply the disable policy to `config.agent`.

Implementation rules:

- Reuse the existing merge pattern that preserves unknown fields.
- Treat `disable` as the only plugin-owned field for OpenCode default agents in this path.
- Do not attach prompt, description, mode, or permission defaults to OpenCode default agents.
- Keep this path separate from `buildBuiltinAgentEntries(...)` so plugin-managed agents and OpenCode default agents remain distinct concepts.

Resulting examples:

```json
{
  "agent": {
    "explore": { "disable": true },
    "build": { "disable": true },
    "plan": { "disable": true },
    "general": { "disable": false }
  }
}
```

If an entry already exists, merge behavior should preserve other keys:

```json
{
  "agent": {
    "explore": {
      "customField": "keep-me",
      "disable": true
    }
  }
}
```

### 3. Keep config schema unchanged

`supercode-config.ts` should not gain any new fields for this feature.

Reasoning:

- The user explicitly does not want a config knob.
- This is a plugin default policy, not user-tunable behavior.
- Keeping it out of the schema avoids unnecessary coupling between user config parsing and internal runtime policy.

## Why This Design

Compared with placing the logic directly inside `config-handler.ts`, a dedicated policy module keeps responsibilities clearer:

- `builtin-policy.ts`: declares policy
- `config-handler.ts`: applies policy during config emission
- `supercode-config.ts`: remains focused on user config only

This is the smallest change that still keeps the design maintainable.

## Testing

Add or extend config-handler tests to verify:

1. `explore`, `build`, and `plan` are emitted with `disable: true` by default.
2. `general` is not disabled by default.
3. Existing custom fields on those agent entries are preserved when policy is applied.

## Risks

### Risk: Overwriting existing agent entries

Mitigation:
Use the same preserve-unknown-fields merge style already used for plugin-managed agents.

### Risk: Mixing plugin-managed and OpenCode-managed agent concepts

Mitigation:
Keep the disable policy in a separate module and apply it in a distinct loop after built-in agent registration.

## Acceptance Criteria

- Loading `supercode` with an empty incoming config emits disabled entries for `explore`, `build`, and `plan`.
- `general` remains enabled.
- No new config fields are introduced.
- Existing tests continue to pass after the change.
