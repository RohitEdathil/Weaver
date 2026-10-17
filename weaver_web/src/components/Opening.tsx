import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import './Opening.css'

const FADE_MS = 700
const ENGAGE_MS = 1000

// x / top / height of each voice-waveform bar (viewBox 0 0 80 80).
const VOICE_BARS = [
  { x: 7, y: 35, h: 10 },
  { x: 12, y: 29, h: 22 },
  { x: 17, y: 33, h: 14 },
  { x: 22, y: 23, h: 34 },
  { x: 27, y: 31, h: 18 },
  { x: 32, y: 18, h: 44 },
  { x: 37, y: 27, h: 26 },
  { x: 42, y: 34, h: 12 },
  { x: 47, y: 21, h: 38 },
  { x: 52, y: 29, h: 22 },
  { x: 57, y: 16, h: 48 },
  { x: 62, y: 27, h: 26 },
  { x: 67, y: 33, h: 14 },
  { x: 72, y: 36, h: 8 },
]

type OpeningProps = {
  /** True once the backend session exists and the workspace can be shown. */
  ready: boolean
  /** Called after the intro has faded out and should be unmounted. */
  onFinish: () => void
}

export function Opening({ ready, onFinish }: OpeningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: -9999, y: -9999, active: false })
  const engagedRef = useRef(false)
  const finishedRef = useRef(false)
  const [engaged, setEngaged] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    setLeaving(true)
    window.setTimeout(onFinish, FADE_MS)
  }, [onFinish])

  const engage = useCallback(() => {
    if (engagedRef.current || !ready) return
    engagedRef.current = true
    setEngaged(true)

    // Briefly pull the woven field inward, then let it settle.
    const canvas = canvasRef.current
    if (canvas) {
      pointerRef.current.x = canvas.clientWidth / 2
      pointerRef.current.y = canvas.clientHeight / 2
      pointerRef.current.active = true
    }
    window.setTimeout(() => {
      if (engagedRef.current) pointerRef.current.active = false
    }, 1100)

    window.setTimeout(finish, ENGAGE_MS)
  }, [ready, finish])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.x = event.clientX
    pointerRef.current.y = event.clientY
    pointerRef.current.active = true
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false
  }, [])

  // Woven-thread backdrop: a fine two-directional grid that breathes, flowing
  // strands across the middle, twinkling knots, and a cursor energy bloom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = pointerRef.current
    let w = 0
    let h = 0
    let t = 0
    let raf = 0
    let stars: Array<{ x: number; y: number; r: number; a: number; p: number }> = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = []
      const count = Math.max(38, Math.min(100, Math.round((w * h) / 15000)))
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.6,
          a: 0.08 + Math.random() * 0.26,
          p: Math.random() * Math.PI * 2,
        })
      }
    }

    const thread = (y: number, phase: number, amp: number, opacity: number, bright: boolean) => {
      ctx.beginPath()
      for (let px = -20; px <= w + 20; px += 8) {
        const dx = px / w
        const wave = Math.sin(dx * 6.2 + phase) * amp + Math.sin(dx * 2.4 - phase * 0.7) * amp * 0.42
        const influence = pointer.active
          ? Math.exp(-Math.pow((px - pointer.x) / 170, 2)) * Math.sin((px - pointer.x) * 0.025 + t * 2) * 18
          : 0
        const py = y + wave + influence
        if (px === -20) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = bright ? `rgba(177,104,255,${opacity})` : `rgba(99,61,148,${opacity})`
      ctx.lineWidth = bright ? 1.05 : 0.7
      ctx.shadowBlur = bright ? 12 : 0
      ctx.shadowColor = 'rgba(152,61,255,.65)'
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      t += reduced ? 0.002 : 0.007

      const spacing = Math.max(22, Math.min(34, w / 42))

      for (let x = -spacing; x < w + spacing; x += spacing) {
        ctx.beginPath()
        for (let y = -10; y < h + 10; y += 10) {
          const ripple = Math.sin(y * 0.009 + t * 1.15 + x * 0.012) * 7 + Math.cos(y * 0.017 - t * 0.8) * 2.5
          const pull = pointer.active
            ? Math.exp(-Math.pow((y - pointer.y) / 180, 2)) * Math.exp(-Math.pow((x - pointer.x) / 240, 2)) * 22
            : 0
          const px = x + ripple + pull
          if (y === -10) ctx.moveTo(px, y)
          else ctx.lineTo(px, y)
        }
        const alpha = 0.055 + Math.sin(x * 0.025 + t) * 0.015
        ctx.strokeStyle = `rgba(151,106,206,${alpha})`
        ctx.lineWidth = 0.65
        ctx.stroke()
      }

      for (let y = spacing * 0.5; y < h + spacing; y += spacing) {
        ctx.beginPath()
        for (let x = -10; x < w + 10; x += 10) {
          const ripple = Math.sin(x * 0.009 - t * 1.1 + y * 0.012) * 6 + Math.cos(x * 0.016 + t * 0.8) * 2.5
          const pull = pointer.active
            ? Math.exp(-Math.pow((x - pointer.x) / 190, 2)) * Math.exp(-Math.pow((y - pointer.y) / 190, 2)) * 25
            : 0
          const py = y + ripple + pull
          if (x === -10) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.strokeStyle = 'rgba(113,78,164,.065)'
        ctx.lineWidth = 0.65
        ctx.stroke()
      }

      const center = h * 0.51
      for (let i = -3; i <= 3; i++) {
        const y = center + i * 48
        thread(y, t * (i % 2 ? 1 : -1) + i * 0.8, 8 + Math.abs(i) * 2, 0.12 - Math.abs(i) * 0.012, i === 0)
      }

      for (const s of stars) {
        const pulse = 0.55 + 0.45 * Math.sin(t * 1.8 + s.p)
        const glow = s.r * (1.2 + pulse * 1.5)
        ctx.beginPath()
        ctx.arc(s.x, s.y, glow, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(174,125,255,${s.a * pulse})`
        ctx.shadowBlur = 8 + pulse * 8
        ctx.shadowColor = 'rgba(143,56,255,.55)'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      if (pointer.active) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 190)
        g.addColorStop(0, 'rgba(135,58,230,.12)')
        g.addColorStop(1, 'rgba(135,58,230,0)')
        ctx.fillStyle = g
        ctx.fillRect(pointer.x - 190, pointer.y - 190, 380, 380)
      }

      if (engagedRef.current) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.8)
        const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7)
        g.addColorStop(0, `rgba(139,48,255,${0.08 + pulse * 0.035})`)
        g.addColorStop(1, 'rgba(7,6,12,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      raf = window.requestAnimationFrame(draw)
    }

    resize()
    raf = window.requestAnimationFrame(draw)

    const handleResize = () => resize()
    const handleVisibility = () => {
      window.cancelAnimationFrame(raf)
      if (!document.hidden && !reduced) raf = window.requestAnimationFrame(draw)
    }
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div
      className={`opening${engaged ? ' engaged' : ''}${leaving ? ' leaving' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas ref={canvasRef} className="opening-canvas" aria-hidden="true" />
      <div className="opening-vignette" aria-hidden="true" />
      <div className="opening-grain" aria-hidden="true" />

      <section className="opening-hero">
        <div className="opening-mark-wrap" aria-hidden="true">
          <div className="opening-mark-halo" />
          <svg className="opening-logo" viewBox="0 0 80 80" role="img" aria-label="Animated voice waveform">
            <defs>
              <linearGradient id="weaverWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0" stopColor="#b45bff" />
                <stop offset="0.52" stopColor="#8b35ff" />
                <stop offset="1" stopColor="#d1a4ff" />
              </linearGradient>
            </defs>
            <g className="voice-bars" fill="url(#weaverWaveGradient)">
              {VOICE_BARS.map((bar) => (
                <rect key={bar.x} x={bar.x} y={bar.y} width={3} height={bar.h} rx={1.5} />
              ))}
            </g>
          </svg>
        </div>

        <h1 className="opening-wordmark">Weaver</h1>
        <p className="opening-tagline">Speak it. Watch it weave.</p>

        <button
          type="button"
          className="opening-cta"
          onClick={engage}
          disabled={!ready || engaged}
        >
          Start weaving
        </button>

        <div className="opening-status">
          <span className={`opening-status-dot${ready ? ' ready' : ''}`} />
          <span>
            {engaged ? 'weaving in progress' : ready ? 'session ready' : 'creating your session'}
          </span>
        </div>
      </section>

    </div>
  )
}
