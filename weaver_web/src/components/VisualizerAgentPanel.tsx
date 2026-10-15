import { useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toolLabel } from '../visualizerConversation'
import { useVisualizerAgent } from '../hooks/useVisualizerAgent'
import './VisualizerAgentPanel.css'

interface Props {
  sessionId: string
  refreshToken: number
  onCanvasUpdate: () => void
  onRequestSnapshot: () => Promise<string>
}

export function VisualizerAgentPanel({
  sessionId,
  refreshToken,
  onCanvasUpdate,
  onRequestSnapshot,
}: Props) {
  const { items, streaming, error, send, load } = useVisualizerAgent(
    sessionId,
    onCanvasUpdate,
    onRequestSnapshot,
  )
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items])

  useEffect(() => {
    if (streaming) return
    void load()
  }, [refreshToken, streaming, load])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || streaming) return

    setInput('')
    void send(message)
  }

  return (
    <div className="visualizer-agent-content">
      <div className="visualizer-agent-log" ref={scrollRef}>
        {items.length === 0 && (
          <p className="visualizer-agent-empty">
            Ask the visualizer to build or edit the canvas.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className={`msg ${item.role}`}>
            {item.role === 'tool' ? (
              <span className="tool-chip">{toolLabel(item.name ?? '')}</span>
            ) : item.role === 'assistant' || item.role === 'user' ? (
              <div className="msg-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.text ?? ''}
                </ReactMarkdown>
              </div>
            ) : (
              item.text
            )}
          </div>
        ))}
        {streaming && <p className="visualizer-agent-thinking">Working…</p>}
      </div>

      {error && <p className="visualizer-agent-error">{error}</p>}

      <form className="visualizer-agent-input" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe a visualization…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
