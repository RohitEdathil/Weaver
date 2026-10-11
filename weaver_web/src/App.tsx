import { useEffect, useRef, useState } from 'react'
import { canvasUrl, createSession, type Session } from './api'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const init = async () => {
      try {
        setSession(await createSession())
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    init()
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Weaver</h1>
        {session && <code className="session-id">{session.id}</code>}
      </header>

      <section className="canvas-frame">
        {error && <p className="status error">{error}</p>}
        {!session && !error && <p className="status">Initializing session…</p>}
        {session && (
          <iframe
            title="Weaver canvas"
            className="canvas"
            src={canvasUrl(session.id)}
          />
        )}
      </section>
    </main>
  )
}

export default App
