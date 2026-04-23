export type AgentPermissionValue = "allow" | "ask" | "deny"

export type AgentPermissionRule = AgentPermissionValue | Record<string, AgentPermissionValue>

export type AgentPermission = Record<string, AgentPermissionRule>

export type AgentDefinition = {
  name: string
  description: string
  prompt: string
  mode: "primary" | "subagent"
  defaults?: {
    color?: string
    temperature?: number
    permission?: AgentPermission
  }
}

export type AgentConfigBinding = {
  enabled?: boolean
  model?: string
  variant?: string
  color?: string
  temperature?: number
  permission?: AgentPermission
}
