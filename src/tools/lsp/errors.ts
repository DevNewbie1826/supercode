export type LspErrorCode =
  | "FILE_NOT_FOUND"
  | "SERVER_NOT_FOUND"
  | "SERVER_START_FAILED"
  | "REQUEST_TIMEOUT"
  | "NOT_SUPPORTED"

export class LspError extends Error {
  readonly code: LspErrorCode
  readonly details: Record<string, unknown>

  private constructor(code: LspErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = "LspError"
    this.code = code
    this.details = details
  }

  static fileNotFound(filePath: string): LspError {
    return new LspError("FILE_NOT_FOUND", `File not found: ${filePath}`, { filePath })
  }

  static serverNotFound(serverId: string, hint: string): LspError {
    return new LspError("SERVER_NOT_FOUND", `LSP server '${serverId}' not found. ${hint}`, { serverId, hint })
  }

  static startFailed(serverId: string, cause: string): LspError {
    return new LspError("SERVER_START_FAILED", `Failed to start LSP server '${serverId}': ${cause}`, { serverId, cause })
  }

  static requestTimeout(method: string, timeoutMs: number): LspError {
    return new LspError("REQUEST_TIMEOUT", `LSP request '${method}' timed out after ${timeoutMs}ms`, { method, timeoutMs })
  }

  static notSupported(methodName: string): LspError {
    return new LspError("NOT_SUPPORTED", `LSP server does not support '${methodName}'`, { methodName })
  }
}

export function isLspError(value: unknown): value is LspError {
  return value instanceof LspError
}

export function formatLspError(error: LspError): string {
  if (error.code === "REQUEST_TIMEOUT") {
    return `${error.message}. Retry in a few seconds.`
  }
  return error.message
}
