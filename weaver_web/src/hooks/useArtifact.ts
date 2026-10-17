import { useCallback, useState } from 'react'
import { getCode } from '../api'
import { saveCanvas, updateCanvas } from '../savedCanvases'

/**
 * Tracks the artifact backing the current canvas.
 *
 * The first save creates a new document; after that the same document is
 * updated in place, so the header button flips from "Save" to "Update".
 */
export function useArtifact(deviceId: string) {
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedRefresh, setSavedRefresh] = useState(0)

  const save = useCallback(
    async (sessionId: string, title: string) => {
      setSaving(true)
      setError(null)
      try {
        const code = await getCode(sessionId)
        if (artifactId) {
          await updateCanvas(artifactId, code)
        } else {
          const id = await saveCanvas(deviceId, { title, code, sessionId })
          setArtifactId(id)
        }
        setSavedRefresh((token) => token + 1)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [artifactId, deviceId],
  )

  /** Point the button at an existing artifact (e.g. after loading one). */
  const select = useCallback((id: string | null) => {
    setArtifactId(id)
    setError(null)
  }, [])

  return { artifactId, saving, error, savedRefresh, save, select }
}
