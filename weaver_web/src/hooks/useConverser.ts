import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AudioPlayer, MicRecorder, pcmBlobPayload } from '../audio'
import { converserSocketUrl, type ConverserEvent } from '../api'
import {
  converserLogReducer,
  initialConverserLog,
} from '../converserConversation'

const FLUSH_INTERVAL_MS = 250
const PROCESSOR_URL = `${import.meta.env.BASE_URL}audio-processor.js`

interface Options {
  onVisualizerInvoked: () => void
  onCanvasRefresh: () => void
}

export function useConverser(sessionId: string, options: Options) {
  const [log, dispatch] = useReducer(converserLogReducer, initialConverserLog)
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MicRecorder | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const flushRef = useRef<number | null>(null)
  const pendingRef = useRef<string[]>([])
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  const send = useCallback((payload: unknown) => {
    const data = JSON.stringify(payload)
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    } else {
      pendingRef.current.push(data)
    }
  }, [])

  const handleEvent = useCallback((event: ConverserEvent) => {
    if (event.type === 'audio') {
      playerRef.current?.play(event.data)
    } else if (event.type === 'interrupted') {
      playerRef.current?.stop()
    } else if (event.type === 'control') {
      if (event.action === 'open_visualizer') {
        optionsRef.current.onVisualizerInvoked()
      } else if (event.action === 'refresh_canvas') {
        optionsRef.current.onCanvasRefresh()
      }
    }
    dispatch({ type: 'event', event })
  }, [])

  const ensureSocket = useCallback((): WebSocket => {
    const existing = socketRef.current
    if (existing && existing.readyState <= WebSocket.OPEN) return existing

    const socket = new WebSocket(converserSocketUrl(sessionId))
    socket.onopen = () => {
      setConnected(true)
      for (const data of pendingRef.current) {
        socket.send(data)
      }
      pendingRef.current = []
    }
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setError('The converser connection failed.')
    socket.onmessage = (message: MessageEvent<string>) => {
      try {
        handleEvent(JSON.parse(message.data) as ConverserEvent)
      } catch {
        // Ignore malformed frames rather than killing the session.
      }
    }
    socketRef.current = socket
    return socket
  }, [handleEvent, sessionId])

  const stop = useCallback(async () => {
    if (flushRef.current !== null) {
      window.clearInterval(flushRef.current)
      flushRef.current = null
    }
    await recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
    playerRef.current?.stop()
    socketRef.current?.close()
    socketRef.current = null
    pendingRef.current = []
    setConnected(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      if (!playerRef.current) playerRef.current = new AudioPlayer()
      playerRef.current.resume()
      ensureSocket()

      const recorder = new MicRecorder()
      await recorder.start(PROCESSOR_URL)
      recorderRef.current = recorder
      setRecording(true)
      flushRef.current = window.setInterval(() => {
        const chunk = recorder.takeBuffer()
        if (chunk) send(pcmBlobPayload(chunk))
      }, FLUSH_INTERVAL_MS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      await stop()
    }
  }, [ensureSocket, send, stop])

  useEffect(() => {
    return () => {
      void stop()
    }
  }, [stop])

  return { items: log.items, connected, recording, error, start, stop }
}
