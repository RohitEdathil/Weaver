import { useCallback, useEffect, useRef } from 'react'
import { converserToolLabel } from '../converserConversation'
import { useConverser } from '../hooks/useConverser'
import './ConverserPanel.css'

interface Props {
  sessionId: string
  onVisualizerInvoked: () => void
  onCanvasRefresh: () => void
}

export function ConverserPanel({
  sessionId,
  onVisualizerInvoked,
  onCanvasRefresh,
}: Props) {
  const { items, connected, recording, error, start, stop } = useConverser(
    sessionId,
    { onVisualizerInvoked, onCanvasRefresh },
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items])

  const toggleMic = useCallback(() => {
    if (recording) {
      void stop()
    } else {
      void start()
    }
  }, [recording, start, stop])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'BUTTON'
      ) {
        return
      }
      event.preventDefault()
      toggleMic()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleMic])

  const status = recording ? 'Listening…' : connected ? 'Connected' : 'Idle'

  return (
    <div className="converser">
      <div className="converser-log" ref={scrollRef}>
        {items.length === 0 && (
          <p className="converser-empty">
            Tap the microphone and start talking. Ask Weaver for a visualization
            and it will build it on the canvas.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className={`msg ${item.role}`}>
            {item.role === 'tool' ? (
              <span className="tool-chip">
                {converserToolLabel(item.name ?? '')}
              </span>
            ) : (
              item.text
            )}
          </div>
        ))}
      </div>

      {error && <p className="converser-error">{error}</p>}

      <div className="converser-controls">
        <button
          type="button"
          className={`converser-mic${recording ? ' recording' : ''}`}
          onClick={toggleMic}
        >
          <svg
            className="converser-mic-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2H13v-2.08A7 7 0 0 0 19 11Z" />
          </svg>
          {recording ? 'Stop' : 'Talk'}
        </button>
        <span className={`converser-status${connected ? ' online' : ''}`}>
          {status}
        </span>
      </div>
    </div>
  )
}
