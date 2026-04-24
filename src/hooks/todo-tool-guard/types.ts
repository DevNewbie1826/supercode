import type { SessionRole } from "../session-role-resolver"

export interface RoleResolver {
  getRole: (sessionID: string) => SessionRole
}

export interface BeforeInput {
  tool: string
  sessionID: string
  callID: string
}

export interface BeforeOutput {
  args: unknown
}

export interface AfterInput {
  tool: string
  sessionID: string
  callID: string
  args: unknown
}

export interface AfterOutput {
  title: string
  output?: unknown
  metadata?: unknown
}
