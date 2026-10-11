import { useCallback, useReducer, useState } from 'react'
import { sendVisualizerMessage, type VisualizerEvent } from '../api'
import { initialLogState, logReducer } from '../visualizerConversation'

export function useVisualizerAgent(
  sessionId: string,
  onCanvasUpdate: () => void,
) {
  const [log, dispatch] = useReducer(logReducer, initialLogState)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onEvent = useCallback(
    (event: VisualizerEvent) => {
      if (event.type === 'control' && event.action === 'refresh_canvas') {
        onCanvasUpdate()
      }
      dispatch({ type: 'event', event })
    },
    [onCanvasUpdate],
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

  return { items: log.items, streaming, error, send }
}
