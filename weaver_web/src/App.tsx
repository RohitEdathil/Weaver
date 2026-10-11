import { useEffect, useState } from 'react'
import { canvasUrl, getCode } from './api'
import { VisualizerAgentPanel } from './components/VisualizerAgentPanel'
import { useSession } from './hooks/useSession'
import './App.css'

type View = 'canvas' | 'code'

function App() {
  const { session, error } = useSession()
  const [panelOpen, setPanelOpen] = useState(true)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [view, setView] = useState<View>('canvas')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  useEffect(() => {
    if (!session || view !== 'code') return

    let cancelled = false
    getCode(session.id)
      .then((text) => {
        if (!cancelled) {
          setCode(text)
          setCodeError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCodeError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [session, view, canvasVersion])

  if (error) {
    return (
      <main className="app">
        <p className="status error">{error}</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="app">
        <p className="status">Initializing session…</p>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Weaver</h1>
        <span className="mode-badge">{session.mode}</span>
        <code className="session-id">{session.id}</code>
        <div className="view-switcher" role="group" aria-label="View">
          <button
            type="button"
            className={view === 'canvas' ? 'active' : undefined}
            onClick={() => setView('canvas')}
          >
            Canvas
          </button>
          <button
            type="button"
            className={view === 'code' ? 'active' : undefined}
            onClick={() => setView('code')}
          >
            Code
          </button>
        </div>
        <button
          type="button"
          className="app-panel-toggle"
          onClick={() => setPanelOpen((open) => !open)}
          aria-label={
            panelOpen ? 'Collapse visualizer agent' : 'Expand visualizer agent'
          }
        >
          {panelOpen ? '›' : '‹'}
        </button>
      </header>

      <div className="app-body">
        <section className="canvas-frame">
          {view === 'canvas' ? (
            <iframe
              key={`${session.id}:${canvasVersion}`}
              title="Weaver canvas"
              className="canvas"
              src={canvasUrl(session.id)}
            />
          ) : codeError ? (
            <p className="status error">{codeError}</p>
          ) : (
            <pre className="code-view">{code}</pre>
          )}
        </section>

        <VisualizerAgentPanel
          sessionId={session.id}
          open={panelOpen}
          onCanvasUpdate={() => setCanvasVersion((version) => version + 1)}
        />
      </div>
    </main>
  )
}

export default App
