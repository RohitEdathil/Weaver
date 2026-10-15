import { useCallback, useReducer, useState } from 'react'
import {
  getVisualizerConversation,
  sendVisualizerMessage,
  type VisualizerEvent,
} from '../api'
import { deliverSnapshot } from '../canvasSnapshot'
import { initialLogState, logReducer } from '../visualizerConversation'

export function useVisualizerAgent(
  sessionId: string,
  onCanvasUpdate: () => void,
  onRequestSnapshot: () => Promise<string>,
) {
  const [log, dispatch] = useReducer(logReducer, initialLogState)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onEvent = useCallback(
    (event: VisualizerEvent) => {
      if (event.type === 'control') {
        if (event.action === 'refresh_canvas') {
          onCanvasUpdate()
        } else if (event.action === 'capture_canvas') {
          void deliverSnapshot(sessionId, onRequestSnapshot)
        }
      }
      dispatch({ type: 'event', event })
    },
    [onCanvasUpdate, onRequestSnapshot, sessionId],
  )

  const send = useCallback(
    async (message: string) => {
      setError(null)
      setStreaming(true)
      dispatch({ type: 'user', text: message })

      try {
        await sendVisualizerMessage(sessionId, message, onEvent)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        dispatch({ type: 'end' })
        setStreaming(false)
      }
    },
    [onEvent, sessionId],
  )

  const load = useCallback(async () => {
    try {
      const turns = await getVisualizerConversation(sessionId)
      dispatch({ type: 'load', turns })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [sessionId])

  return { items: log.items, streaming, error, send, load }
}
