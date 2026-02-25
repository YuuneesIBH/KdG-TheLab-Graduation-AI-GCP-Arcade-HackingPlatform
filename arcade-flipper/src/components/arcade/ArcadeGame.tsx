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

const BASE_BLUE = '#c38a2e'
const BASE_BLUE_DARK = '#6f4317'

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

  const accentGlow  = `0 0 9px ${accent}66, 0 0 20px ${accent}22`
  const bulbPalette = React.useMemo(() => ['#ff8a3d', '#ffb347', '#ffd166', '#d1495b'], [])
  const ledColor    = (offset: number) => {
    const idx = Math.floor((ledPhase + offset) / 18) % bulbPalette.length
    return bulbPalette[(idx + bulbPalette.length) % bulbPalette.length]
  }
  const neonOpacity = marqueeFlicker ? 0.62 : 0.95

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
      background: `radial-gradient(circle at 35% 35%, #fff8d6 0%, ${ledColor(offset)} 58%, #50210e 100%)`,
      border: '1px solid rgba(56,25,10,0.72)',
      boxShadow: `0 0 5px ${ledColor(offset)}aa, inset 0 0 2px rgba(255,255,255,0.3)`,
    }} />
  )

  const ArcadeBtn = ({ color, dim }: { color: string; dim?: boolean }) => (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, ${color}${dim ? '66' : 'ff'} 0%, ${color}${dim ? '26' : '66'} 58%, #2a1208 100%)`,
      border: `2px solid ${dim ? '#4b2b1b' : '#bb7a35'}`,
      boxShadow: dim
        ? 'inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.78)'
        : `0 0 6px ${color}55, 0 3px 7px rgba(0,0,0,0.78), inset 0 1px 2px rgba(255,255,255,0.28)`,
      cursor: 'pointer',
    }} />
  )

  const Joystick = ({ flip }: { flip?: boolean }) => (
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      {/* Base disc */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #3a2b24, #120804)',
        border: '2px solid #5a3412',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.7)',
      }} />
      {/* Gate */}
      <div style={{
        position: 'absolute', inset: '12px',
        background: '#0c0603', border: '1.5px solid #342112', transform: 'rotate(45deg)',
      }} />
      {/* Shaft */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 11, height: 30, marginLeft: -5.5, marginTop: -22,
        background: 'linear-gradient(180deg, #7b6a5a, #2a1e14)',
        borderRadius: '3px 3px 2px 2px',
        border: '1px solid rgba(255,229,184,0.18)',
        transform: `rotate(${flip ? -joystickAngle : joystickAngle}deg)`,
        transformOrigin: 'bottom center', transition: 'transform 0.1s ease-out',
        boxShadow: '0 2px 6px rgba(0,0,0,0.8)',
      }}>
        {/* Ball */}
        <div style={{
          position: 'absolute', top: -8, left: -4.5,
          width: 20, height: 20, borderRadius: '50%',
          background: flip
            ? 'radial-gradient(circle at 35% 35%, #a33a2c, #2c0f0a)'
            : 'radial-gradient(circle at 35% 35%, #be4029, #3a120b)',
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
        ? 'linear-gradient(90deg, #7f1818, #bf5a24, #ffd166, #bf5a24, #7f1818)'
        : 'linear-gradient(90deg, #7f1818, #bf5a24, #ffd166, #bf5a24, #7f1818)',
      boxShadow: `0 0 9px ${ledColor(120)}66, 0 0 18px rgba(255,130,44,0.22)`,
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
            background: 'radial-gradient(circle at 50% 42%, rgba(151,80,28,0.26) 0%, rgba(18,8,4,0.93) 55%, rgba(8,3,1,0.99) 100%)',
            color: '#ffeccc',
            fontFamily: '"Courier New", monospace',
          }}>
            <div style={{ width: 'min(520px, 80vw)', display: 'grid', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 15, letterSpacing: 3, textShadow: `0 0 8px rgba(255,192,96,0.7)` }}>
                {status === 'launching' ? '◈ LOADING GAME' : '✕ LAUNCH FAILED'}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: 'rgba(255,222,188,0.82)', lineHeight: 1.65 }}>
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
                  background: `linear-gradient(90deg, #8f2e15 0%, #f6be6b 48%, #8f2e15 100%)`,
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
                        ? (i % 2 === 0 ? '#ffb347' : '#d1495b')
                        : 'rgba(84,42,18,0.55)',
                      boxShadow: i < progress / 10
                        ? `0 0 7px ${i % 2 === 0 ? '#ffb347' : '#d1495b'}`
                        : 'none',
                      transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                  <button type="button" onClick={launch} style={{
                    background: '#8a2f1a', color: '#fff', border: '1px solid #f2b46d',
                    padding: '10px 18px', cursor: 'pointer', fontSize: 11, letterSpacing: 2,
                    borderRadius: 4, boxShadow: '0 0 10px rgba(242,180,109,0.28)', fontFamily: 'inherit',
                  }}>RETRY</button>
                  <button type="button" onClick={exit} style={{
                    background: '#24150d', color: '#fff', border: '1px solid rgba(248,211,166,0.44)',
                    padding: '10px 18px', cursor: 'pointer', fontSize: 11, letterSpacing: 2,
                    borderRadius: 4, fontFamily: 'inherit',
                  }}>BACK</button>
                </div>
              )}
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,217,176,0.5)', marginTop: 4 }}>
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
          background: `
            linear-gradient(180deg, rgba(38,15,7,0.98) 0%, rgba(25,10,5,0.95) 60%, rgba(7,3,1,0.0) 100%),
            repeating-linear-gradient(90deg, rgba(127,72,37,0.2) 0px, rgba(127,72,37,0.2) 16px, rgba(74,38,18,0.22) 16px, rgba(74,38,18,0.22) 32px)
          `,
          borderBottom: `2px solid ${BASE_BLUE}`,
          boxShadow: `0 8px 0 ${BASE_BLUE_DARK}, 0 14px 28px rgba(0,0,0,0.52)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'visible',
          pointerEvents: 'auto',
        }}>
          <RgbStrip top />

          {/* Scrolling background text */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', opacity: 0.055 }}>
            <div style={{
              whiteSpace: 'nowrap', fontSize: 11, letterSpacing: 4, color: '#ffcd7a',
              transform: `translateX(${-marqueePos}px)`, willChange: 'transform',
            }}>
              {'★ THE ARCADERS ★ INSERT COIN ★ HIGH SCORE ★ PLAY NOW ★ 1UP ★ YALLA ★ KOMAAN ★ '.repeat(6)}
            </div>
          </div>

          {/* Left info */}
          <div style={{ position: 'absolute', left: 20, bottom: 18, display: 'grid', gap: 5 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,206,149,0.55)' }}>NOW PLAYING</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,242,214,0.95)', textShadow: `0 0 8px rgba(255,190,120,0.45)` }}>{title}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(232,183,120,0.6)' }}>{genre} · {year}</div>
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
              background: 'radial-gradient(ellipse at center, rgba(248,166,82,0.28) 0%, transparent 60%)',
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
                  'drop-shadow(0 0 24px rgba(247,182,94,0.95))',
                  'drop-shadow(0 0 46px rgba(215,102,38,0.5))',
                  'drop-shadow(0 4px 2px rgba(0,0,0,0.95))',
                ].join(' '),
                transition: 'opacity 0.07s',
              }}
            />
            <div style={{
              fontSize: 8, letterSpacing: 5, marginTop: 3,
              color: `rgba(255,196,122,${neonOpacity * 0.95})`,
              textShadow: '0 0 9px rgba(255,171,84,0.75)',
              transition: 'color 0.07s',
            }}>◆ ARCADE SYSTEM ◆ EST. 1992 ◆</div>
          </div>

          {/* Right info */}
          <div style={{ position: 'absolute', right: 20, bottom: 18, display: 'grid', gap: 5, textAlign: 'right' }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,206,149,0.55)' }}>CABINET</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: accent, textShadow: accentGlow }}>{players} · DIFF {difficulty}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(232,183,120,0.6)' }}>STEREO · 60HZ</div>
          </div>

          {/* Corner bolts */}
          {[{top:7,left:7},{top:7,right:7}].map((s,i) => (
            <div key={i} style={{
              position: 'absolute', ...s,
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #d5b17a, #6f4317)',
              border: '1.5px solid #3d200a',
            }} />
          ))}

          {/* Bottom fade strip (RGB) */}
          <RgbStrip bottom flip />
        </div>

        {/* ── LEFT SIDE PANEL ───────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 154, bottom: 132, left: 0, width: 68,
          background: 'linear-gradient(90deg, rgba(38,16,8,0.96) 0%, rgba(24,10,5,0.86) 65%, rgba(2,1,1,0.0) 100%)',
          borderRight: '1px solid rgba(195,138,46,0.32)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          {/* Vertical neon stripe */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 9, width: 2,
            background: 'linear-gradient(180deg, transparent, rgba(255,185,102,0.7), rgba(197,99,36,0.72), transparent)',
            opacity: 0.55,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[0,60,120,180,240,300].map(o => <LedDot key={o} offset={o} />)}
          </div>
          {/* Speaker grille */}
          <div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(220,145,72,0.62), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(232,183,120,0.56)', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>STEREO L</div>
          </div>
          {/* 1UP */}
          <div style={{
            fontSize: 8, letterSpacing: 2,
            color: coinBlink ? '#ffd166' : 'rgba(255,209,102,0.24)',
            textShadow: coinBlink ? '0 0 8px #ffd166' : 'none',
            transition: 'all 0.15s', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>1UP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
        </div>

        {/* ── RIGHT SIDE PANEL ──────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 154, bottom: 132, right: 0, width: 68,
          background: 'linear-gradient(270deg, rgba(38,16,8,0.96) 0%, rgba(24,10,5,0.86) 65%, rgba(2,1,1,0.0) 100%)',
          borderLeft: '1px solid rgba(195,138,46,0.32)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 9, width: 2,
            background: 'linear-gradient(180deg, transparent, rgba(255,185,102,0.7), rgba(197,99,36,0.72), transparent)',
            opacity: 0.55,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
          <div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(220,145,72,0.62), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(232,183,120,0.56)', textAlign: 'center', writingMode: 'vertical-rl' }}>STEREO R</div>
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
          borderRadius: 6,
          boxShadow: borderBlink
            ? `0 0 0 1px rgba(111,67,23,0.85), 0 0 20px rgba(255,173,84,0.52), inset 0 0 24px rgba(111,67,23,0.25)`
            : `0 0 0 1px rgba(111,67,23,0.7), 0 0 13px rgba(255,173,84,0.36), inset 0 0 16px rgba(111,67,23,0.18)`,
          pointerEvents: 'none',
          transition: 'box-shadow 0.14s',
        }} />

        {/* Neon side tubes */}
        <div style={{
          position: 'absolute', left: 56, top: 160, bottom: 140, width: 5,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,197,118,0.78) 24%, rgba(195,90,31,0.72) 56%, transparent 100%)',
          boxShadow: '0 0 10px rgba(255,173,84,0.45), 0 0 22px rgba(191,87,20,0.28)', opacity: 0.48, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', right: 56, top: 160, bottom: 140, width: 5,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,197,118,0.78) 24%, rgba(195,90,31,0.72) 56%, transparent 100%)',
          boxShadow: '0 0 10px rgba(255,173,84,0.45), 0 0 22px rgba(191,87,20,0.28)', opacity: 0.48, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />

        {/* ── CONTROL PANEL BOTTOM ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 132,
          background: `
            linear-gradient(0deg, rgba(26,9,4,0.98) 0%, rgba(40,16,8,0.96) 56%, rgba(7,3,1,0.0) 100%),
            repeating-linear-gradient(90deg, rgba(120,70,36,0.24) 0px, rgba(120,70,36,0.24) 18px, rgba(76,38,18,0.25) 18px, rgba(76,38,18,0.25) 36px)
          `,
          borderTop: `2px solid ${BASE_BLUE}`,
          boxShadow: '0 -10px 25px rgba(0,0,0,0.55)',
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
              <ArcadeBtn color="#d63b2f" /><ArcadeBtn color="#3975cc" />
              <ArcadeBtn color="#f0b837" /><ArcadeBtn color="#ed7f3a" />
            </div>
          </div>

          {/* Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {/* Score */}
            <div style={{
              background: 'rgba(23,9,4,0.88)', border: '1.5px solid #7a4a1f',
              borderRadius: 5, padding: '5px 16px', textAlign: 'center',
              boxShadow: 'inset 0 0 12px rgba(100,56,22,0.52)', minWidth: 150,
            }}>
              <div style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(255,186,114,0.58)', marginBottom: 2 }}>HIGH SCORE</div>
              <div style={{
                fontSize: 17, fontWeight: 900, letterSpacing: 4, color: '#ffd166',
                textShadow: '0 0 14px rgba(255,209,102,0.82), 0 0 26px rgba(214,93,44,0.34)',
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
              background: 'rgba(106,24,13,0.9)', color: '#fff',
              border: '1px solid rgba(255,181,111,0.75)',
              padding: '4px 13px', cursor: 'pointer',
              fontSize: 9, letterSpacing: 2, borderRadius: 4,
              boxShadow: '0 0 10px rgba(242,141,76,0.28)',
              fontFamily: 'inherit',
            }}>■ EXIT</button>
          </div>

          {/* P2 dimmed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexDirection: 'row-reverse' }}>
            <Joystick flip />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ArcadeBtn color="#d63b2f" dim /><ArcadeBtn color="#3975cc" dim />
              <ArcadeBtn color="#f0b837" dim /><ArcadeBtn color="#ed7f3a" dim />
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
            background: 'rgba(255,176,96,0.75)', mixBlendMode: 'screen',
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
              border: '1px solid rgba(255,197,118,0.66)', color: '#fff1d3',
              fontSize: 9, letterSpacing: 2, background: 'rgba(28,12,5,0.68)',
              textShadow: '0 0 8px rgba(255,197,118,0.55)',
            }}>P1 READY</div>
            <div style={{
              padding: '5px 9px', borderRadius: 8,
              border: '1px solid rgba(255,205,143,0.3)',
              color: 'rgba(255,226,180,0.78)', fontSize: 9, letterSpacing: 2,
              background: 'rgba(24,10,4,0.52)',
            }}>{players}</div>
          </div>
        )}

      </div>{/* end overlay layer */}

      <style>{`
        @keyframes neon-breathe {
          0%, 100% { opacity: 0.38; filter: brightness(0.95); }
          50%       { opacity: 0.62; filter: brightness(1.3); }
        }
      `}</style>
    </>
  )
}
