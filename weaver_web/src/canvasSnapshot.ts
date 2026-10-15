import { postCanvasSnapshot } from './api'

const CAPTURE_REQUEST = 'weaver:capture-canvas'
const CAPTURE_RESPONSE = 'weaver:canvas-snapshot'
const CAPTURE_TIMEOUT_MS = 8000

interface SnapshotReply {
  type: typeof CAPTURE_RESPONSE
  requestId: number
  dataUrl?: string
  error?: string
}

let nextRequestId = 0

export function captureCanvas(
  iframe: HTMLIFrameElement | null,
): Promise<string> {
  const target = iframe?.contentWindow
  if (!target) {
    return Promise.reject(new Error('The canvas is not available.'))
  }

  return new Promise<string>((resolve, reject) => {
    const requestId = (nextRequestId += 1)
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('Timed out waiting for the canvas snapshot.'))
    }, CAPTURE_TIMEOUT_MS)

    const onMessage = (event: MessageEvent) => {
      const reply = event.data as SnapshotReply | null
      if (!reply || reply.type !== CAPTURE_RESPONSE) return
      if (reply.requestId !== requestId) return
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      if (reply.dataUrl) resolve(reply.dataUrl)
      else reject(new Error(reply.error ?? 'The canvas could not be captured.'))
    }

    window.addEventListener('message', onMessage)
    target.postMessage({ type: CAPTURE_REQUEST, requestId }, '*')
  })
}

export async function deliverSnapshot(
  sessionId: string,
  requestSnapshot: () => Promise<string>,
): Promise<void> {
  try {
    const data = await requestSnapshot()
    await postCanvasSnapshot(sessionId, { data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    try {
      await postCanvasSnapshot(sessionId, { error: message })
    } catch {
      // If delivery keeps failing the tool times out on its own.
    }
  }
}
