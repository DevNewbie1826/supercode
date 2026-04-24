import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { createConfigHandler } from "./config-handler"
import { createTools } from "./tools"
import { createSessionRoleResolver } from "./hooks/session-role-resolver"
import { createBootstrapTransform } from "./hooks/skill-bootstrap"
import { createTodoToolGuard } from "./hooks/todo-tool-guard"
import { createTodoContinuationEnforcer } from "./hooks/todo-continuation-enforcer"

const defaultModuleDir = dirname(fileURLToPath(import.meta.url))

function getModuleDir(options: Record<string, unknown> | undefined): string {
  return typeof options?.moduleDir === "string" ? options.moduleDir : defaultModuleDir
}

export const SupercodePlugin: Plugin = async ({ directory, worktree, client }, options) => {
  const moduleDir = getModuleDir(options)
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

  return {
    config: createConfigHandler(worktree ?? directory, directory, { moduleDir }),
    tool: createTools(),
    event: async ({ event }) => {
      roleResolver.observe(event)
      await enforcer.handler({ event })
    },
    "experimental.chat.messages.transform": bootstrapTransform,
    "tool.execute.before": guard.before,
    "tool.execute.after": guard.after,
  }
}

export default SupercodePlugin
