export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Session {
  id: string
  canvas: string
}

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
