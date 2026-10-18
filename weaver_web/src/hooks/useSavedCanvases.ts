import { useCallback, useState } from 'react'
import { listCanvases, type SavedCanvas } from '../savedCanvases'

/** Loads and refreshes the device's saved canvases. */
export function useSavedCanvases(deviceId: string) {
  const [items, setItems] = useState<SavedCanvas[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setItems(await listCanvases(deviceId))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [deviceId])

  return { items, error, refresh, setError }
}
