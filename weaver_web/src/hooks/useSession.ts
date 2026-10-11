import { useEffect, useRef, useState } from 'react'
import { createSession, type Session } from '../api'

export function useSession() {
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

  return { session, error }
}
