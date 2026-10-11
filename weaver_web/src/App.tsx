import { useState } from 'react'
import { canvasUrl } from './api'
import { VisualizerAgentPanel } from './components/VisualizerAgentPanel'
import { useSession } from './hooks/useSession'
import './App.css'

function App() {
  const { session, error } = useSession()
  const [panelOpen, setPanelOpen] = useState(true)
  const [canvasVersion, setCanvasVersion] = useState(0)

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
      </header>

      <div className="app-body">
        <section className="canvas-frame">
          <iframe
            key={`${session.id}:${canvasVersion}`}
            title="Weaver canvas"
            className="canvas"
            src={canvasUrl(session.id)}
          />
        </section>

        <VisualizerAgentPanel
          sessionId={session.id}
          open={panelOpen}
          onToggle={() => setPanelOpen((open) => !open)}
          onCanvasUpdate={() => setCanvasVersion((version) => version + 1)}
        />
      </div>
    </main>
  )
}

export default App
