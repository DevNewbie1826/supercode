# Work ID

20260426-default-orchestrator-d4f2

# Objective

Make the Supercode orchestrator agent become OpenCode's default primary agent as soon as the Supercode plugin is installed and loaded, without requiring users to manually edit OpenCode configuration documentation or add `default_agent` themselves.

# Current State

- The Supercode plugin entrypoint is `src/index.ts` and registers a `config` hook via `createConfigHandler(...)`.
- `src/config-handler.ts` is the current startup-time config mutation point. It injects built-in MCP entries, built-in agent entries, disabled default OpenCode agent policy entries, and skill paths.
- Built-in agents are generated through `buildBuiltinAgentEntries(...)` from `src/agents/config.ts`.
- The orchestrator agent is already defined in `src/agents/definitions/orchestrator.agent.ts` with `name: "orchestrator"` and `mode: "primary"`.
- `src/agents/builtin-policy.ts` currently disables conflicting OpenCode default agents (`explore`, `build`, `plan`) but does not set the top-level OpenCode `default_agent` field.
- OpenCode supports a top-level `default_agent` config key. It must reference an existing primary agent.

# Desired Outcome

When OpenCode loads the Supercode plugin, the plugin's config hook should set the top-level OpenCode config default agent to `orchestrator` whenever doing so is safe. New OpenCode sessions should therefore start with the Supercode orchestrator by default after plugin installation.

# Scope

In scope:

- Update Supercode's config injection path so it sets `config.default_agent` to `"orchestrator"` by default.
- Ensure the behavior only applies when the orchestrator agent is present and not disabled by Supercode configuration.
- Preserve an explicitly configured user `default_agent` value.
- Add or update tests covering the new default-agent behavior.

Out of scope:

- Changing the orchestrator prompt or workflow rules.
- Adding a new installer, postinstall script, or file-writing setup step.
- Changing OpenCode itself.
- Renaming agents or changing the built-in agent registry architecture.
- Reworking the default OpenCode agent disable policy except where directly necessary for this feature.

# Constraints

- The implementation must use the existing OpenCode plugin `config` hook path rather than requiring users to edit `opencode.json` manually.
- The orchestrator must remain a primary agent.
- Existing user-defined `default_agent` values must not be overwritten unless they are missing, blank, or invalidly non-string.
- If Supercode configuration disables the orchestrator agent, Supercode must not set it as `default_agent`.
- The change should be small and localized to the config handler path where possible.
- Existing agent, MCP, and skill registration behavior must continue to work.

# Success Criteria

- With an empty OpenCode config object, running `createConfigHandler(...)(config)` results in `config.default_agent === "orchestrator"`.
- The generated `config.agent.orchestrator` remains present with `mode: "primary"`.
- If `config.default_agent` already contains a non-empty string, the handler preserves that value.
- If Supercode config disables `agent.orchestrator.enabled`, the handler does not set `default_agent` to `"orchestrator"`.
- Existing config-handler tests continue to pass.
- New tests cover the default-agent behavior.
- Type checking passes.

# Risks / Unknowns

- OpenCode versions older than the dependency range may not support `default_agent`; the current package depends on `@opencode-ai/plugin` `^1.14.24`, and current OpenCode documentation/schema support the key.
- If OpenCode changes default-agent resolution semantics later, this plugin-level config mutation may need to be adjusted.
- A user could explicitly set `default_agent` to an agent disabled elsewhere; preserving user intent is still the desired default behavior for this change.

# Revisions

- Initial spec drafted for unattended implementation.
