import { useEffect, useState } from 'react'
import { setCode } from '../api'
import { useSavedCanvases } from '../hooks/useSavedCanvases'
import { deleteCanvas, type SavedCanvas } from '../savedCanvases'
import './SavedCanvasesPanel.css'

interface Props {
  sessionId: string
  firebaseEnabled: boolean
  deviceId: string
  /** Bumped by the header's Save/Update button to refresh the list. */
  refreshToken: number
  /** Called after a saved canvas is loaded into the session. */
  onArtifactLoaded: (artifact: SavedCanvas) => void
}

function formatDate(canvas: SavedCanvas): string {
  const stamp = canvas.updatedAt ?? canvas.createdAt
  return stamp ? stamp.toDate().toLocaleString() : 'unsaved'
}

export function SavedCanvasesPanel({
  sessionId,
  firebaseEnabled,
  deviceId,
  refreshToken,
  onArtifactLoaded,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const { items, error, refresh, setError } = useSavedCanvases(deviceId)

  useEffect(() => {
    void refresh()
  }, [refresh, refreshToken])

  const handleLoad = async (canvas: SavedCanvas) => {
    if (busy) return
    setBusy(true)
    setStatus(null)
    setError(null)
    try {
      await setCode(sessionId, canvas.code)
      onArtifactLoaded(canvas)
      setStatus(`Loaded “${canvas.title}”.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (canvas: SavedCanvas) => {
    if (busy) return
    setBusy(true)
    setStatus(null)
    setError(null)
    try {
      await deleteCanvas(canvas.id)
      await refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!firebaseEnabled) {
    return (
      <div className="saved-content">
        <p className="saved-note">
          Saving is disabled. Set the <code>VITE_FIREBASE_*</code> environment
          variables to enable it.
        </p>
      </div>
    )
  }

  return (
    <div className="saved-content">
      {status && <p className="saved-status">{status}</p>}
      {error && <p className="saved-error">{error}</p>}

      <div className="saved-list">
        {items.length === 0 ? (
          <p className="saved-note">
            No saved artifacts yet. Use “Save artifact” in the top bar.
          </p>
        ) : (
          items.map((canvas) => (
            <div key={canvas.id} className="saved-item">
              <div className="saved-item-info">
                <span className="saved-item-title">{canvas.title}</span>
                <span className="saved-item-date">{formatDate(canvas)}</span>
              </div>
              <div className="saved-item-actions">
                <button
                  type="button"
                  onClick={() => void handleLoad(canvas)}
                  disabled={busy}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="saved-danger"
                  onClick={() => void handleDelete(canvas)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
