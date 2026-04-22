export type JsonRpcMessage = Record<string, unknown>

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const MAX_JSONRPC_CONTENT_LENGTH = 16 * 1024 * 1024

export function encodeMessage(message: JsonRpcMessage): Uint8Array {
  const body = encoder.encode(JSON.stringify(message))
  const header = encoder.encode(`Content-Length: ${body.length}\r\n\r\n`)
  const combined = new Uint8Array(header.length + body.length)
  combined.set(header)
  combined.set(body, header.length)
  return combined
}

export function parseMessages(
  buffer: Uint8Array,
  maxContentLength = MAX_JSONRPC_CONTENT_LENGTH,
): { consumed: number; messages: JsonRpcMessage[] } {
  const messages: JsonRpcMessage[] = []
  let offset = 0

  while (offset < buffer.length) {
    const headerEnd = findHeaderEnd(buffer, offset)
    if (headerEnd < 0) break

    const header = decoder.decode(buffer.subarray(offset, headerEnd))
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      offset = headerEnd + 4
      continue
    }

    const contentLength = Number.parseInt(match[1], 10)
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      throw new Error("Invalid Content-Length header")
    }
    if (contentLength > maxContentLength) {
      throw new Error(`Content-Length ${contentLength} exceeds max ${maxContentLength}`)
    }

    const bodyStart = headerEnd + 4
    if (buffer.length < bodyStart + contentLength) break

    try {
      messages.push(JSON.parse(decoder.decode(buffer.subarray(bodyStart, bodyStart + contentLength))))
    } catch {
      // Ignore malformed payloads to keep the stream recoverable.
    }

    offset = bodyStart + contentLength
  }

  return { consumed: offset, messages }
}

function findHeaderEnd(buffer: Uint8Array, start: number): number {
  for (let index = start; index < buffer.length - 3; index++) {
    if (buffer[index] === 0x0d && buffer[index + 1] === 0x0a && buffer[index + 2] === 0x0d && buffer[index + 3] === 0x0a) {
      return index
    }
  }
  return -1
}
