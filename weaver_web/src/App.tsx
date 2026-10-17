import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasUrl, getCode, getVisualizerConversation } from './api'
import { captureCanvas } from './canvasSnapshot'
import { Opening } from './components/Opening'
import { SidePanel, type PanelTab } from './components/SidePanel'
import { getDeviceId } from './deviceId'
import { firebaseEnabled } from './firebase'
import { useArtifact } from './hooks/useArtifact'
import { useSession } from './hooks/useSession'
import type { SavedCanvas } from './savedCanvases'
import './App.css'

type View = 'canvas' | 'code'

const TITLE_MAX_LENGTH = 48

function truncateTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > TITLE_MAX_LENGTH
    ? `${clean.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : clean
}

function App() {
  const { session, error } = useSession()
  const [introVisible, setIntroVisible] = useState(true)
  const deviceId = getDeviceId()
  const {
    artifactId,
    saving,
    error: artifactError,
    savedRefresh,
    save: saveArtifact,
    select: selectArtifact,
  } = useArtifact(deviceId)
  const [panelOpen, setPanelOpen] = useState(true)
  const [tab, setTab] = useState<PanelTab>('converser')
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [visualizerRefresh, setVisualizerRefresh] = useState(0)
  const [view, setView] = useState<View>('canvas')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadWaitersRef = useRef<Array<() => void>>([])

  useEffect(() => {
    if (!session) return

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
  }, [session, canvasVersion])

  // Derive a friendly title from the first user turn of the session. Best
  // effort: retries while the conversation is still empty, then stops.
  useEffect(() => {
    if (!session || title) return

    let cancelled = false
    getVisualizerConversation(session.id)
      .then((turns) => {
        if (cancelled) return
        const firstUser = turns.find(
          (turn) => turn.role === 'user' && turn.text.trim().length > 0,
        )
        if (firstUser) setTitle(truncateTitle(firstUser.text))
      })
      .catch(() => {
        // The title is cosmetic; fall back to the placeholder.
      })

    return () => {
      cancelled = true
    }
  }, [session, visualizerRefresh, title])

  const refreshConversation = useCallback(() => {
    setVisualizerRefresh((token) => token + 1)
  }, [])

  const refreshCanvas = useCallback(() => {
    setCanvasVersion((version) => version + 1)
    setVisualizerRefresh((token) => token + 1)
  }, [])

  const hasCanvasContent =
    code.trim().length > 0 && code.trim() !== (session?.canvas.trim() ?? '')

  const handleSaveArtifact = useCallback(() => {
    if (session) void saveArtifact(session.id, title ?? 'Untitled artifact')
  }, [session, title, saveArtifact])

  const handleArtifactLoaded = useCallback(
    (artifact: SavedCanvas) => {
      selectArtifact(artifact.id)
      refreshCanvas()
    },
    [selectArtifact, refreshCanvas],
  )

  const handleCanvasLoad = useCallback(() => {
    const waiters = loadWaitersRef.current
    loadWaitersRef.current = []
    for (const resolve of waiters) resolve()
  }, [])

  const requestSnapshot = useCallback(async () => {
    const loaded = new Promise<void>((resolve) => {
      loadWaitersRef.current.push(resolve)
    })
    setCanvasVersion((version) => version + 1)
    await loaded
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    return captureCanvas(iframeRef.current)
  }, [])

  if (error) {
    return (
      <main className="app">
        <p className="status error">{error}</p>
      </main>
    )
  }

  return (
    <main className="app">
      {session ? (
        <>
          <header className="app-header">
            <h1>Weaver</h1>
            <span className="mode-badge">{session.mode}</span>
            <span className="session-title" title={title ?? undefined}>
              {title ?? 'New session'}
            </span>
            <div className="header-center">
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
              {firebaseEnabled && (
                <button
                  type="button"
                  className="artifact-button"
                  onClick={handleSaveArtifact}
                  disabled={saving || !hasCanvasContent}
                  title={
                    artifactError ??
                    (!hasCanvasContent
                      ? 'Generate something on the canvas first'
                      : undefined)
                  }
                >
                  {artifactId ? 'Update artifact' : 'Save artifact'}
                </button>
              )}
              {artifactError && (
                <span className="artifact-error">{artifactError}</span>
              )}
            </div>
            <button
              type="button"
              className="app-panel-toggle"
              onClick={() => setPanelOpen((open) => !open)}
              aria-label={panelOpen ? 'Collapse side panel' : 'Expand side panel'}
            >
              {panelOpen ? '›' : '‹'}
            </button>
          </header>

          <div className="app-body">
            <section className={`canvas-frame${view === 'code' ? ' code' : ''}`}>
              <iframe
                ref={iframeRef}
                key={`${session.id}:${canvasVersion}`}
                title="Weaver canvas"
                className="canvas"
                sandbox="allow-scripts"
                src={canvasUrl(session.id)}
                onLoad={handleCanvasLoad}
              />
              {view === 'code' &&
                (codeError ? (
                  <p className="status error">{codeError}</p>
                ) : (
                  <pre className="code-view">{code}</pre>
                ))}
            </section>

            <SidePanel
              sessionId={session.id}
              open={panelOpen}
              tab={tab}
              onTabChange={setTab}
              visualizerRefresh={visualizerRefresh}
              onVisualizerInvoked={refreshConversation}
              onCanvasRefresh={refreshCanvas}
              onRequestSnapshot={requestSnapshot}
              firebaseEnabled={firebaseEnabled}
              deviceId={deviceId}
              savedRefresh={savedRefresh}
              onArtifactLoaded={handleArtifactLoaded}
            />
          </div>
        </>
      ) : (
        <p className="status">Initializing session…</p>
      )}

      {introVisible && (
        <Opening ready={Boolean(session)} onFinish={() => setIntroVisible(false)} />
      )}
    </main>
  )
}

export default App
