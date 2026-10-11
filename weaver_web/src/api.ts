export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Session {
  id: string
  canvas: string
  mode: string
}

export type VisualizerEvent =
  | { type: 'text'; text: string; partial: boolean }
  | { type: 'tool_call'; name: string }
  | { type: 'control'; action: 'refresh_canvas' }
  | { type: 'error'; message: string }
  | { type: 'done' }

export async function createSession(): Promise<Session> {
  const res = await fetch(`${API_URL}/session`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`Failed to create session (${res.status})`)
  }
  return res.json()
}

export function canvasUrl(sessionId: string): string {
  return `${API_URL}/session/${sessionId}/canvas`
}

export async function getCode(sessionId: string): Promise<string> {
  const res = await fetch(`${API_URL}/session/${sessionId}/code`)
  if (!res.ok) {
    throw new Error(`Failed to load code (${res.status})`)
  }
  return res.text()
}

export async function sendVisualizerMessage(
  sessionId: string,
  message: string,
  onEvent: (event: VisualizerEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/session/${sessionId}/visualizer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Visualizer request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload) continue
        try {
          onEvent(JSON.parse(payload) as VisualizerEvent)
        } catch {
          // Ignore malformed frames rather than killing the stream.
        }
      }
    }
  }
}
