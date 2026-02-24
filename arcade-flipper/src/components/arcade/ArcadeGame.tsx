import React from 'react'
import { games } from './GameMenu'

type ArcadeGameProps = {
  gameId: string
  onExit: () => void
}

function formatTitle(gameId: string) {
  return gameId.replace(/-/g, ' ').toUpperCase()
}

type ViewportRect = {
  x: number
  y: number
  width: number
  height: number
}

const BASE_BLUE = '#0088ff'
const BASE_BLUE_DARK = '#004488'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export function ArcadeGame({ gameId, onExit }: ArcadeGameProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)

  const [status, setStatus]             = React.useState<'launching' | 'running' | 'error'>('launching')
  const [progress, setProgress]         = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState('')

  const [crtFlicker, setCrtFlicker]           = React.useState(false)
  const [scanlineOffset, setScanlineOffset]   = React.useState(0)
  const [glitchLine, setGlitchLine]           = React.useState(-1)
  const [pixelShift, setPixelShift]           = React.useState(0)
  const [borderBlink, setBorderBlink]         = React.useState(false)
  const [marqueeFlicker, setMarqueeFlicker]   = React.useState(false)
  const [ledPhase, setLedPhase]               = React.useState(0)
  const [joystickAngle, setJoystickAngle]     = React.useState(0)
  const [coinBlink, setCoinBlink]             = React.useState(false)
  const [marqueePos, setMarqueePos]           = React.useState(0)

  const game       = React.useMemo(() => games.find(g => g.id === gameId), [gameId])
  const title      = game?.title      ?? formatTitle(gameId)
  const accent     = game?.accent     ?? '#00ccff'
  const genre      = game?.genre      ?? 'ARCADE'
  const year       = game?.year       ?? '????'
  const difficulty = game?.difficulty ?? '★☆☆'
  const players    = game?.players    ?? '1P'

  const accentGlow  = `0 0 14px ${accent}66, 0 0 34px ${accent}22`
  const ledColor    = (offset: number) => `hsl(${(ledPhase * 1.5 + offset) % 360}, 100%, 60%)`
  const neonOpacity = marqueeFlicker ? 0.35 : 1

  // ── Electron helpers ──────────────────────────────────────────────
  const waitForLayoutCommit = React.useCallback(
    () => new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }), []
  )

  const getViewport = React.useCallback((): ViewportRect | undefined => {
    if (!viewportRef.current) return undefined
    const r = viewportRef.current.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
  }, [])

  const stopGameIfPossible = React.useCallback(() => {
    const api = (window as any).electron
    api?.stopGame?.()
    api?.killGame?.()
  }, [])

  const exit = React.useCallback(() => {
    stopGameIfPossible()
    ;(window as any).electron?.setFullscreen?.(false)
    onExit()
  }, [onExit, stopGameIfPossible])

  const launch = React.useCallback(async () => {
    if (!game) { setErrorMessage('Game not found'); setStatus('error'); return }
    if (!window.electron?.launchGame) {
      setErrorMessage('Electron API not available'); setStatus('error'); return
    }
    setStatus('launching'); setErrorMessage(''); setProgress(0)
    await waitForLayoutCommit()
    try {
      const viewport = getViewport()
      const result = await window.electron.launchGame({
        gamePath: game.executable,
        mode: viewport ? 'embedded' : 'external',
        viewport,
      })
      if (result?.success) { setProgress(100); setStatus('running'); return }
      setErrorMessage(result?.message ?? 'Launch failed')
      setStatus('error')
    } catch (err) {
      setErrorMessage(String(err))
      setStatus('error')
    }
  }, [game, getViewport, waitForLayoutCommit])

  // ── Effects ──────────────────────────────────────────────────────
  React.useEffect(() => {
    ;(window as any).electron?.setFullscreen?.(true)
    launch()
    return () => stopGameIfPossible()
  }, [launch, stopGameIfPossible])

  React.useEffect(() => {
    if (status !== 'launching') return
    const t = setInterval(() => {
      setProgress(p => p >= 92 ? p : Math.min(92, p + Math.max(1, Math.floor(Math.random() * 6))))
    }, 120)
    return () => clearInterval(t)
  }, [status])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); exit() }
      if ((e.key === 'Enter' || e.key === 'r' || e.key === 'R') && status === 'error') { e.preventDefault(); launch() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [exit, launch, status])

  React.useEffect(() => {
    const cleanup = window.electron?.onGameExit?.(() => exit())
    return () => cleanup?.()
  }, [exit])

  React.useEffect(() => {
    if (status !== 'running') return
    const api = (window as any).electron
    const update = () => { const v = getViewport(); if (!v) return; api?.updateGameViewport?.(v); api?.resizeGame?.(v) }
    update()
    window.addEventListener('resize', update)
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      ro = new ResizeObserver(update)
      ro.observe(viewportRef.current)
    }
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [getViewport, status])

  // Visual FX
  React.useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.02) {
        setCrtFlicker(true)
        setPixelShift(Math.random() < 0.5 ? -1 : 1)
        setTimeout(() => { setCrtFlicker(false); setPixelShift(0) }, 60)
      }
    }, 120)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => setScanlineOffset(p => (p + 1) % 6), 60)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.06) {
        setGlitchLine(Math.floor(Math.random() * 18))
        setTimeout(() => setGlitchLine(-1), 80)
      }
    }, 520)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => { setBorderBlink(true); setTimeout(() => setBorderBlink(false), 140) }, 1800)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => {
      setLedPhase(p => (p + 1) % 240)
      if (Math.random() < 0.03) { setMarqueeFlicker(true); setTimeout(() => setMarqueeFlicker(false), 70) }
    }, 36)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => setJoystickAngle(Math.sin(Date.now() / 2000) * 7), 50)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => setCoinBlink(v => !v), 650)
    return () => clearInterval(t)
  }, [])
  React.useEffect(() => {
    const t = setInterval(() => setMarqueePos(p => (p + 1) % 600), 22)
    return () => clearInterval(t)
  }, [])

  // ── Shared sub-components ─────────────────────────────────────────
  const LedDot = ({ offset }: { offset: number }) => (
    <div style={{
      width: 9, height: 9, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, #fff, ${ledColor(offset)})`,
      boxShadow: `0 0 6px ${ledColor(offset)}, 0 0 12px ${ledColor(offset)}44`,
    }} />
  )

  const ArcadeBtn = ({ color, dim }: { color: string; dim?: boolean }) => (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, ${color}${dim ? '44' : 'dd'}, ${color}${dim ? '14' : '44'})`,
      border: `2px solid ${color}${dim ? '28' : '88'}`,
      boxShadow: dim
        ? '0 2px 5px rgba(0,0,0,0.7)'
        : `0 0 10px ${color}55, 0 3px 6px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.2)`,
      cursor: 'pointer',
    }} />
  )

  const Joystick = ({ flip }: { flip?: boolean }) => (
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      {/* Base disc */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #1e2e44, #07101c)',
        border: '2px solid #1a3050',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.7)',
      }} />
      {/* Gate */}
      <div style={{
        position: 'absolute', inset: '12px',
        background: '#04080f', border: '1.5px solid #0a1828', transform: 'rotate(45deg)',
      }} />
      {/* Shaft */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 11, height: 30, marginLeft: -5.5, marginTop: -22,
        background: 'linear-gradient(180deg, #3a5070, #152030)',
        borderRadius: '3px 3px 2px 2px',
        border: '1px solid rgba(255,255,255,0.07)',
        transform: `rotate(${flip ? -joystickAngle : joystickAngle}deg)`,
        transformOrigin: 'bottom center', transition: 'transform 0.1s ease-out',
        boxShadow: '0 2px 6px rgba(0,0,0,0.8)',
      }}>
        {/* Ball */}
        <div style={{
          position: 'absolute', top: -8, left: -4.5,
          width: 20, height: 20, borderRadius: '50%',
          background: flip
            ? 'radial-gradient(circle at 35% 35%, #604050, #160e18)'
            : 'radial-gradient(circle at 35% 35%, #486080, #0e1820)',
          border: '1.5px solid rgba(255,255,255,0.09)',
          boxShadow: '0 3px 8px rgba(0,0,0,0.7)',
        }} />
      </div>
    </div>
  )

  const RgbStrip = ({ top, bottom, flip }: { top?: boolean; bottom?: boolean; flip?: boolean }) => (
    <div style={{
      position: 'absolute',
      top: top ? 0 : 'auto',
      bottom: bottom ? 0 : 'auto',
      left: 0, right: 0, height: 4,
      background: flip
        ? `linear-gradient(90deg, ${ledColor(180)}, ${ledColor(240)}, ${ledColor(300)}, ${ledColor(0)}, ${ledColor(60)}, ${ledColor(120)}, ${ledColor(180)})`
        : `linear-gradient(90deg, ${ledColor(0)}, ${ledColor(60)}, ${ledColor(120)}, ${ledColor(180)}, ${ledColor(240)}, ${ledColor(300)}, ${ledColor(0)})`,
      boxShadow: `0 0 12px ${ledColor(120)}66`,
      opacity: neonOpacity,
    }} />
  )

  return (
    <>
      {/* ==============================================================
          LAYER 0 — GAME VIEWPORT (fills 100% of the screen)
          The electron game window embeds here, covering everything.
          ============================================================== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: '#000000',
        fontFamily: '"Courier New", monospace',
        filter: crtFlicker ? 'brightness(0.78) contrast(1.28)' : 'brightness(1) contrast(1.08)',
        transition: 'filter 0.06s',
        transform: `translateX(${pixelShift}px)`,
      }}>
        {/* ← Electron embeds the game process here */}
        <div ref={viewportRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Launching / Error overlay */}
        {status !== 'running' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'grid', placeItems: 'center',
            background: 'radial-gradient(circle at 50% 42%, rgba(0,80,180,0.2) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.98) 100%)',
            color: '#d7f3ff',
            fontFamily: '"Courier New", monospace',
          }}>
            <div style={{ width: 'min(520px, 80vw)', display: 'grid', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 15, letterSpacing: 3, textShadow: accentGlow }}>
                {status === 'launching' ? '◈ LOADING GAME' : '✕ LAUNCH FAILED'}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: 'rgba(200,230,255,0.8)', lineHeight: 1.65 }}>
                {status === 'launching'
                  ? `Mounting ${title} into the cabinet…`
                  : (errorMessage || 'Unknown error')}
              </div>
              {/* Progress bar */}
              <div style={{
                height: 12, borderRadius: 999,
                border: `1px solid ${accent}66`,
                background: 'rgba(0,0,0,0.65)', overflow: 'hidden',
                boxShadow: `0 0 18px ${accent}22`,
              }}>
                <div style={{
                  width: `${clamp(progress, 0, 100)}%`, height: '100%',
                  background: `linear-gradient(90deg, ${accent}, #fff 40%, ${accent})`,
                  boxShadow: accentGlow, transition: 'width 0.12s linear',
                }} />
              </div>
              {/* Segment dots */}
              {status === 'launching' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 7, borderRadius: 4,
                      background: i < progress / 10
                        ? (i % 2 === 0 ? '#00ff88' : accent)
                        : 'rgba(0,50,100,0.55)',
                      boxShadow: i < progress / 10
                        ? `0 0 7px ${i % 2 === 0 ? '#00ff88' : accent}`
                        : 'none',
                      transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                  <button type="button" onClick={launch} style={{
                    background: '#00a65a', color: '#fff', border: '1px solid #00ff99',
                    padding: '10px 18px', cursor: 'pointer', fontSize: 11, letterSpacing: 2,
                    borderRadius: 10, boxShadow: '0 0 14px rgba(0,255,150,0.22)', fontFamily: 'inherit',
                  }}>RETRY</button>
                  <button type="button" onClick={exit} style={{
                    background: '#181818', color: '#fff', border: '1px solid rgba(255,255,255,0.28)',
                    padding: '10px 18px', cursor: 'pointer', fontSize: 11, letterSpacing: 2,
                    borderRadius: 10, fontFamily: 'inherit',
                  }}>BACK</button>
                </div>
              )}
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(190,220,255,0.45)', marginTop: 4 }}>
                {status === 'launching' ? 'PRESS ESC TO ABORT' : 'PRESS ENTER / R TO RETRY'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          LAYER 1 — CABINET OVERLAY
          Floats on top of the game. Center is transparent / cut out.
          All cabinet chrome lives here.
          ============================================================== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10,
        pointerEvents: 'none',
        fontFamily: '"Courier New", "Press Start 2P", monospace',
      }}>

        {/* ── TOP MARQUEE ───────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          // Fade from solid dark at top to transparent at bottom
          background: 'linear-gradient(180deg, rgba(5,10,22,0.97) 0%, rgba(4,8,18,0.93) 60%, rgba(2,5,12,0.0) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'visible',
          pointerEvents: 'auto',
        }}>
          <RgbStrip top />

          {/* Scrolling background text */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', opacity: 0.055 }}>
            <div style={{
              whiteSpace: 'nowrap', fontSize: 11, letterSpacing: 4, color: '#00ccff',
              transform: `translateX(${-marqueePos}px)`, willChange: 'transform',
            }}>
              {'★ THE ARCADERS ★ INSERT COIN ★ HIGH SCORE ★ PLAY NOW ★ 1UP ★ YALLA ★ KOMAAN ★ '.repeat(6)}
            </div>
          </div>

          {/* Left info */}
          <div style={{ position: 'absolute', left: 20, bottom: 18, display: 'grid', gap: 5 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(130,170,255,0.4)' }}>NOW PLAYING</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(210,240,255,0.9)', textShadow: accentGlow }}>{title}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(150,190,255,0.45)' }}>{genre} · {year}</div>
          </div>

          {/* ═══ LOGO — big, centered, floats over game ═══ */}
          <div style={{
            position: 'absolute',
            top: -290,          // pull it UP so it bleeds above the bar
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            {/* Glow halo */}
            <div style={{
              position: 'absolute', inset: '-40px -120px',
              background: 'radial-gradient(ellipse at center, rgba(0,110,255,0.25) 0%, transparent 60%)',
              filter: 'blur(24px)', opacity: neonOpacity,
            }} />
            <img
              src="../assets/thearcaders_logo.png"
              alt="The Arcaders"
              style={{
                position: 'relative',
                width: 'min(680px, 52vw)',
                height: 'auto',
                imageRendering: 'pixelated',
                display: 'block',
                opacity: marqueeFlicker ? 0.55 : 1,
                filter: [
                  'drop-shadow(0 0 24px rgba(77,166,255,0.98))',
                  'drop-shadow(0 0 48px rgba(0,204,255,0.50))',
                  'drop-shadow(0 4px 2px rgba(0,0,0,0.95))',
                ].join(' '),
                transition: 'opacity 0.07s',
              }}
            />
            <div style={{
              fontSize: 8, letterSpacing: 5, marginTop: 3,
              color: `rgba(0,195,255,${neonOpacity * 0.9})`,
              textShadow: '0 0 9px rgba(0,195,255,0.7)',
              transition: 'color 0.07s',
            }}>◆ ARCADE SYSTEM ◆ EST. 1992 ◆</div>
          </div>

          {/* Right info */}
          <div style={{ position: 'absolute', right: 20, bottom: 18, display: 'grid', gap: 5, textAlign: 'right' }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(130,170,255,0.4)' }}>CABINET</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: accent, textShadow: accentGlow }}>{players} · DIFF {difficulty}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(150,190,255,0.45)' }}>STEREO · 60HZ</div>
          </div>

          {/* Corner bolts */}
          {[{top:7,left:7},{top:7,right:7}].map((s,i) => (
            <div key={i} style={{
              position: 'absolute', ...s,
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #3a5a7a, #0a1a2a)',
              border: '1.5px solid #1a3050',
            }} />
          ))}

          {/* Bottom fade strip (RGB) */}
          <RgbStrip bottom flip />
        </div>

        {/* ── LEFT SIDE PANEL ───────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 154, bottom: 132, left: 0, width: 68,
          background: 'linear-gradient(90deg, rgba(5,10,22,0.96) 0%, rgba(4,8,18,0.85) 65%, rgba(2,5,12,0.0) 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          {/* Vertical neon stripe */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 9, width: 2,
            background: `linear-gradient(180deg, transparent, ${ledColor(0)}77, ${ledColor(120)}77, transparent)`,
            opacity: 0.55,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[0,60,120,180,240,300].map(o => <LedDot key={o} offset={o} />)}
          </div>
          {/* Speaker grille */}
          <div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(0,136,255,0.5), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(0,136,255,0.38)', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>STEREO L</div>
          </div>
          {/* 1UP */}
          <div style={{
            fontSize: 8, letterSpacing: 2,
            color: coinBlink ? '#00ff88' : 'rgba(0,255,136,0.2)',
            textShadow: coinBlink ? '0 0 8px #00ff88' : 'none',
            transition: 'all 0.15s', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>1UP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
        </div>

        {/* ── RIGHT SIDE PANEL ──────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 154, bottom: 132, right: 0, width: 68,
          background: 'linear-gradient(270deg, rgba(5,10,22,0.96) 0%, rgba(4,8,18,0.85) 65%, rgba(2,5,12,0.0) 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 9, width: 2,
            background: `linear-gradient(180deg, transparent, ${ledColor(180)}77, ${ledColor(300)}77, transparent)`,
            opacity: 0.55,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
          <div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(0,136,255,0.5), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(0,136,255,0.38)', textAlign: 'center', writingMode: 'vertical-rl' }}>STEREO R</div>
          </div>
          <div style={{
            fontSize: 8, letterSpacing: 2,
            color: !coinBlink ? '#ff4444' : 'rgba(255,68,68,0.2)',
            textShadow: !coinBlink ? '0 0 8px #ff4444' : 'none',
            transition: 'all 0.15s', writingMode: 'vertical-rl',
          }}>2UP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[0,60,120,180,240,300].map(o => <LedDot key={o} offset={o} />)}
          </div>
        </div>

        {/* ── SCREEN BORDER GLOW ────────────────────────────────────── */}
        {/* Thin neon frame that traces the game area */}
        <div style={{
          position: 'absolute',
          top: 150, left: 62, right: 62, bottom: 128,
          border: `2px solid ${BASE_BLUE}`,
          borderRadius: 4,
          boxShadow: borderBlink
            ? `0 0 28px rgba(0,136,255,0.65), 0 0 56px rgba(0,136,255,0.22), inset 0 0 28px rgba(0,136,255,0.08)`
            : `0 0 18px rgba(0,136,255,0.45), 0 0 40px rgba(0,136,255,0.14), inset 0 0 18px rgba(0,136,255,0.05)`,
          pointerEvents: 'none',
          transition: 'box-shadow 0.14s',
        }} />

        {/* Neon side tubes */}
        <div style={{
          position: 'absolute', left: 56, top: 160, bottom: 140, width: 5,
          background: `linear-gradient(180deg, transparent, ${accent}66, transparent)`,
          boxShadow: accentGlow, opacity: 0.4, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', right: 56, top: 160, bottom: 140, width: 5,
          background: `linear-gradient(180deg, transparent, ${accent}66, transparent)`,
          boxShadow: accentGlow, opacity: 0.4, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />

        {/* ── CONTROL PANEL BOTTOM ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 132,
          background: 'linear-gradient(0deg, rgba(5,10,22,0.98) 0%, rgba(4,8,18,0.95) 55%, rgba(2,5,12,0.0) 100%)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 30px', gap: 12,
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}>
          {/* Texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(0,0,0,0.07) 8px, rgba(0,0,0,0.07) 9px),
              repeating-linear-gradient(90deg, transparent 0, transparent 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 9px)
            `,
            pointerEvents: 'none',
          }} />
          <RgbStrip top />

          {/* P1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <Joystick />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ArcadeBtn color="#ff3b3b" /><ArcadeBtn color="#00ccff" />
              <ArcadeBtn color="#ffdd00" /><ArcadeBtn color="#00ff88" />
            </div>
          </div>

          {/* Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {/* Score */}
            <div style={{
              background: 'rgba(0,2,7,0.88)', border: '1.5px solid #071525',
              borderRadius: 5, padding: '5px 16px', textAlign: 'center',
              boxShadow: 'inset 0 0 12px rgba(0,28,55,0.7)', minWidth: 150,
            }}>
              <div style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(0,140,255,0.38)', marginBottom: 2 }}>HIGH SCORE</div>
              <div style={{
                fontSize: 17, fontWeight: 900, letterSpacing: 4, color: '#ffdd00',
                textShadow: '0 0 14px rgba(255,220,0,0.9), 0 0 30px rgba(255,180,0,0.4)',
              }}>000000</div>
            </div>
            {/* Coin insert */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #c8a020, #5a4008)',
                border: '1.5px solid #7a5010', boxShadow: '0 0 7px rgba(200,160,32,0.5)',
              }} />
              <div style={{
                fontSize: 8, letterSpacing: 3,
                color: coinBlink ? '#ffdd00' : 'rgba(255,220,0,0.18)',
                textShadow: coinBlink ? '0 0 9px rgba(255,220,0,0.95)' : 'none',
                transition: 'all 0.15s',
              }}>INSERT COIN</div>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #c8a020, #5a4008)',
                border: '1.5px solid #7a5010', boxShadow: '0 0 7px rgba(200,160,32,0.5)',
              }} />
            </div>
            {/* Exit */}
            <button type="button" onClick={exit} style={{
              background: 'rgba(130,0,0,0.82)', color: '#fff',
              border: '1px solid rgba(255,90,90,0.7)',
              padding: '4px 13px', cursor: 'pointer',
              fontSize: 9, letterSpacing: 2, borderRadius: 7,
              boxShadow: '0 0 10px rgba(255,30,30,0.2)',
              fontFamily: 'inherit',
            }}>■ EXIT</button>
          </div>

          {/* P2 dimmed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexDirection: 'row-reverse' }}>
            <Joystick flip />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ArcadeBtn color="#ff3b3b" dim /><ArcadeBtn color="#00ccff" dim />
              <ArcadeBtn color="#ffdd00" dim /><ArcadeBtn color="#00ff88" dim />
            </div>
          </div>
        </div>

        {/* ── SCANLINES (full screen, very subtle) ──────────────────── */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 3px)',
          transform: `translateY(${scanlineOffset}px)`,
          pointerEvents: 'none', zIndex: 20, opacity: 0.3,
        }} />

        {/* Glitch line */}
        {glitchLine >= 0 && (
          <div style={{
            position: 'absolute', top: `${glitchLine * 5}%`, left: 0, right: 0, height: 2,
            background: 'rgba(0,200,255,0.7)', mixBlendMode: 'screen',
            pointerEvents: 'none', zIndex: 21,
          }} />
        )}

        {/* ── RUNNING: P1 status badge (top-left of game area) ─────── */}
        {status === 'running' && (
          <div style={{
            position: 'absolute', top: 158, left: 76,
            display: 'flex', gap: 7, alignItems: 'center',
            pointerEvents: 'none', zIndex: 15,
          }}>
            <div style={{
              padding: '5px 9px', borderRadius: 8,
              border: `1px solid ${accent}55`, color: '#d9f4ff',
              fontSize: 9, letterSpacing: 2, background: 'rgba(0,0,0,0.6)',
              textShadow: accentGlow,
            }}>P1 READY</div>
            <div style={{
              padding: '5px 9px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(200,230,255,0.75)', fontSize: 9, letterSpacing: 2,
              background: 'rgba(0,0,0,0.5)',
            }}>{players}</div>
          </div>
        )}

      </div>{/* end overlay layer */}

      <style>{`
        @keyframes neon-breathe {
          0%, 100% { opacity: 0.30; filter: brightness(1); }
          50%       { opacity: 0.60; filter: brightness(1.4); }
        }
      `}</style>
    </>
  )
}