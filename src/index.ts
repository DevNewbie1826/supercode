import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { createConfigHandler } from "./config-handler"
import { createTools } from "./tools"
import { createSessionRoleResolver } from "./hooks/session-role-resolver"
import { createBootstrapTransform } from "./hooks/skill-bootstrap"
import { createTodoToolGuard } from "./hooks/todo-tool-guard"
import { createTodoContinuationEnforcer } from "./hooks/todo-continuation-enforcer"
import { createDiagnosticLogger } from "./hooks/hook-diagnostics"

const defaultModuleDir = dirname(fileURLToPath(import.meta.url))

function getModuleDir(options: Record<string, unknown> | undefined): string {
  return typeof options?.moduleDir === "string" ? options.moduleDir : defaultModuleDir
}

export const SupercodePlugin: Plugin = async ({ directory, worktree, client }, options) => {
  const moduleDir = getModuleDir(options)
  const logDiagnostic = createDiagnosticLogger((input) => client.app.log(input as Parameters<typeof client.app.log>[0]))

  const roleResolver = createSessionRoleResolver()
  const bootstrapTransform = createBootstrapTransform(
    join(moduleDir, "hooks", "skill-bootstrap"),
  )
  const guardCtx = {
    client: {
      session: {
        todo: (input: { path: { id: string } }) => client.session.todo(input),
      },
    },
  }
  const guard = createTodoToolGuard(guardCtx, { roleResolver })

  const enforcer = createTodoContinuationEnforcer(
    {
      client: {
        session: {
          todo: (input: { path: { id: string } }) => client.session.todo(input),
          prompt: async (payload: { sessionID: string; text: string }) => {
            await client.session.prompt({
              path: { id: payload.sessionID },
              body: { parts: [{ type: "text" as const, text: payload.text }] },
            })
          },
        },
      },
    },
    { getRole: (id) => roleResolver.getRole(id) },
  )

  const hooks: Hooks = {
    config: createConfigHandler(worktree ?? directory, directory, { moduleDir }),
    tool: createTools(),
    event: async ({ event }) => {
      const eventType = typeof (event as Record<string, unknown>).type === "string"
        ? (event as Record<string, unknown>).type as string
        : undefined
      const sessionID = roleResolver.extractSessionID(event)
      const eventExtra: Record<string, unknown> = {}
      if (eventType !== undefined) eventExtra.eventType = eventType
      if (sessionID !== undefined) eventExtra.sessionID = sessionID
      logDiagnostic("Supercode hook invoked: event", eventExtra)
      roleResolver.observe(event)
      await enforcer.handler({ event })
    },
    "experimental.chat.messages.transform": async (
      input: Record<string, unknown>,
      output: {
        messages: {
          info: { id: string; role: string; sessionID?: string }
          parts: { id?: string; type: string; text?: string; synthetic?: boolean }[]
        }[]
      },
    ) => {
      const messages = output.messages
      const messageCount = Array.isArray(messages) ? messages.length : 0
      const hasUserMessage = Array.isArray(messages) && messages.some((m) => m.info.role === "user")
      logDiagnostic("Supercode hook invoked: experimental.chat.messages.transform", {
        messageCount,
        hasUserMessage,
      })
      await bootstrapTransform(input, output)
    },
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: unknown },
    ) => {
      const role = roleResolver.getRole(input.sessionID)
      logDiagnostic("Supercode hook invoked: tool.execute.before", {
        tool: input.tool,
        sessionID: input.sessionID,
        callID: input.callID,
        role,
      })
      await guard.before(input, output)
    },
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string; args: unknown },
      output: { title: string; output?: unknown; metadata?: unknown },
    ) => {
      logDiagnostic("Supercode hook invoked: tool.execute.after", {
        tool: input.tool,
        sessionID: input.sessionID,
        callID: input.callID,
      })
      await guard.after(input, output)
    },
  }

  logDiagnostic("Supercode plugin initialized", {
    directory,
    worktree,
    moduleDir,
    hookKeys: Object.keys(hooks).sort(),
  })

  return hooks
}

export default SupercodePlugin
