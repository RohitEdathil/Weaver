import { useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toolLabel } from '../visualizerConversation'
import { useVisualizerAgent } from '../hooks/useVisualizerAgent'
import './VisualizerAgentPanel.css'

interface Props {
  sessionId: string
  open: boolean
  onCanvasUpdate: () => void
}

export function VisualizerAgentPanel({
  sessionId,
  open,
  onCanvasUpdate,
}: Props) {
  const { items, streaming, error, send } = useVisualizerAgent(
    sessionId,
    onCanvasUpdate,
  )
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items, open])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || streaming) return

    setInput('')
    void send(message)
  }

  return (
    <aside className={`visualizer-agent${open ? ' open' : ''}`}>
      <div className="visualizer-agent-header">
        <h2>Visualizer Agent</h2>
      </div>

      {open && (
        <>
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
                {item.detail && (
                  <pre className="tool-detail">{item.detail}</pre>
                )}
              </div>
            ))}
            {streaming && (
              <p className="visualizer-agent-thinking">Working…</p>
            )}
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
        </>
      )}
    </aside>
  )
}
