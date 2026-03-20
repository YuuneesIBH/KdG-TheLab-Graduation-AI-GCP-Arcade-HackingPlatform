import React from 'react'
import {
  ARCADE_LEAVE_MENU_LABEL,
  isArcadeLeaveButtonPressed,
  isArcadeLeaveInput,
} from '../../shared/arcade-controls'
import { games } from './GameMenu'

type ArcadeGameProps = {
  gameId: string
  onExit: () => void
  prefetchedHint?: string
  onHintReady?: (gameId: string, content: string) => void
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
const BASE_BLUE_DARK = '#003a7a'
const GAME_SCREEN_INSET = { top: 150, left: 62, right: 62, bottom: 128 }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export function ArcadeGame({ gameId, onExit, prefetchedHint, onHintReady }: ArcadeGameProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const activeGamepadIndexRef = React.useRef<number | null>(null)
  const leaveGameArmedRef = React.useRef(false)
  const leaveGamePressedRef = React.useRef(false)

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
  const [aiVisible, setAiVisible]             = React.useState(false)
  const [aiStatus, setAiStatus]               = React.useState<'idle' | 'thinking' | 'ready' | 'error'>('idle')
  const [aiText, setAiText]                   = React.useState('')
  const [aiCachedText, setAiCachedText]       = React.useState(prefetchedHint ?? '')
  const [aiPrefetching, setAiPrefetching]     = React.useState(false)
  const [hintUnlocked, setHintUnlocked]       = React.useState(false)
  const aiPrefetchedOnce = React.useRef(false)
  const autoHintShown = React.useRef(false)

  React.useEffect(() => {
    if (prefetchedHint) {
      setAiCachedText(prefetchedHint)
      setAiStatus((s) => (s === 'idle' ? 'ready' : s))
    }
  }, [prefetchedHint])

  const game       = React.useMemo(() => games.find(g => g.id === gameId), [gameId])
  const title      = game?.title      ?? formatTitle(gameId)
  const accent     = game?.accent     ?? '#00ccff'
  const genre      = game?.genre      ?? 'ARCADE'
  const year       = game?.year       ?? '????'
  const difficulty = game?.difficulty ?? '★☆☆'
  const players    = game?.players    ?? '1P'

  const accentGlow  = `0 0 9px ${accent}66, 0 0 20px ${accent}22`
  const bulbPalette = React.useMemo(() => ['#00ccff', '#00ff88', '#66d6ff', '#2d7ff1'], [])
  const ledColor    = (offset: number) => {
    const idx = Math.floor((ledPhase + offset) / 18) % bulbPalette.length
    return bulbPalette[(idx + bulbPalette.length) % bulbPalette.length]
  }
  const neonOpacity = marqueeFlicker ? 0.62 : 0.95
  const waitForLayoutCommit = React.useCallback(
    () => new Promise<void>(resolve => {
      // Two frames give React time to commit and the browser time to paint so the
      // measured embedded viewport matches the final cabinet layout.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }), []
  )

  const getViewport = React.useCallback((): ViewportRect | undefined => {
    if (!viewportRef.current) return undefined
    const r = viewportRef.current.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
  }, [])

  const setFullscreen = React.useCallback((enabled: boolean) => {
    void window.electron?.setFullscreen?.(enabled)
  }, [])

  const stopGameIfPossible = React.useCallback(async () => {
    const api = window.electron
    if (!api) return

    const result = await api.stopGame()
    if (!result.success) {
      await api.killGame()
    }
  }, [])

  const exit = React.useCallback(() => {
    void stopGameIfPossible()
    setFullscreen(true)
    onExit()
  }, [onExit, setFullscreen, stopGameIfPossible])

  const requestAiHint = React.useCallback(async (opts?: { silent?: boolean }) => {
    const api = window.electron
    const silent = opts?.silent === true

    if (!silent) {
      setAiVisible(true)
      setAiStatus('thinking')
      setAiText('AI is aan het denken…')
    } else {
      setAiPrefetching(true)
      setAiStatus((s) => (s === 'idle' ? 'thinking' : s))
    }

    if (!api?.aiExplain) {
      setAiStatus('error')
      setAiText('AI kanaal niet beschikbaar')
      return
    }

    try {
      const response = await api.aiExplain({
        gameId,
        title,
        genre,
        difficulty
      })
      if (!response?.success) {
        setAiStatus('error')
        setAiText(response?.message ?? 'AI-call mislukt')
        return
      }
      setAiStatus('ready')
      const content = response.content ?? response.message ?? 'Geen AI-tekst ontvangen'
      setAiText(content)
      setAiCachedText(content)
      onHintReady?.(gameId, content)
    } catch (error) {
      setAiStatus('error')
      setAiText(error instanceof Error ? error.message : String(error))
    } finally {
      if (silent) setAiPrefetching(false)
    }
  }, [difficulty, gameId, genre, onHintReady, title])

  const toggleAiOverlay = React.useCallback(() => {
    if (status !== 'running') return
    if (!hintUnlocked) return
    if (aiVisible) {
      setAiVisible(false)
      return
    }
    // If we already fetched, show instantly; otherwise fetch now.
    if (aiCachedText) {
      setAiVisible(true)
      setAiStatus('thinking')
      setAiText('AI is aan het denken…')
      setTimeout(() => {
        setAiStatus('ready')
        setAiText(aiCachedText)
      }, 1200)
      return
    }
    void requestAiHint()
  }, [aiCachedText, aiVisible, hintUnlocked, requestAiHint, status])

  const launch = React.useCallback(async () => {
    if (!game) { setErrorMessage('Game not found'); setStatus('error'); return }
    const api = window.electron
    if (!api?.launchGame) {
      setErrorMessage('Electron API not available'); setStatus('error'); return
    }
    setStatus('launching'); setErrorMessage(''); setProgress(0)
    await waitForLayoutCommit()
    try {
      const viewport = getViewport()
      const result = await api.launchGame({
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
  React.useEffect(() => {
    setFullscreen(true)
    void launch()
    return () => {
      void stopGameIfPossible()
    }
  }, [launch, setFullscreen, stopGameIfPossible])

  React.useEffect(() => {
    if (status !== 'launching') return
    const t = setInterval(() => {
      setProgress(p => p >= 92 ? p : Math.min(92, p + Math.max(1, Math.floor(Math.random() * 6))))
    }, 120)
    return () => clearInterval(t)
  }, [status])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isArcadeLeaveInput(e)) { e.preventDefault(); exit(); return }
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
    let raf = 0

    const poll = () => {
      const pads = Array.from(navigator.getGamepads?.() ?? [])
        .filter((candidate): candidate is Gamepad => Boolean(candidate && candidate.connected))
        .sort((a, b) => a.index - b.index)

      if (activeGamepadIndexRef.current === null || !pads.some((pad) => pad.index === activeGamepadIndexRef.current)) {
        activeGamepadIndexRef.current = pads[0]?.index ?? null
      }

      for (const pad of pads) {
        const axisMoved = Math.abs(pad.axes[0] ?? 0) > 0.35 || Math.abs(pad.axes[1] ?? 0) > 0.35
        const buttonPressed = pad.buttons?.some((button) => button?.pressed)
        if (axisMoved || buttonPressed) {
          activeGamepadIndexRef.current = pad.index
          break
        }
      }

      const gamepad = pads.find((pad) => pad.index === activeGamepadIndexRef.current)
      const leavePressed = status === 'running' && isArcadeLeaveButtonPressed(gamepad)

      if (!leaveGameArmedRef.current) {
        if (!leavePressed) {
          leaveGameArmedRef.current = true
        }
        leaveGamePressedRef.current = leavePressed
        raf = requestAnimationFrame(poll)
        return
      }

      if (leavePressed && !leaveGamePressedRef.current) {
        leaveGameArmedRef.current = false
        leaveGamePressedRef.current = true
        exit()
        raf = requestAnimationFrame(poll)
        return
      }

      leaveGamePressedRef.current = leavePressed

      raf = requestAnimationFrame(poll)
    }

    poll()
    return () => cancelAnimationFrame(raf)
  }, [exit, status])
  React.useEffect(() => {
    if (status !== 'running') {
      setHintUnlocked(false)
      autoHintShown.current = false
    }
  }, [status])
  React.useEffect(() => {
    if (status !== 'running') return
    if (aiPrefetchedOnce.current) return
    aiPrefetchedOnce.current = true
    if (!aiCachedText) {
      void requestAiHint({ silent: true })
    }
  }, [aiCachedText, requestAiHint, status])
  React.useEffect(() => {
    if (status !== 'running') return
    const unlockTimer = window.setTimeout(() => setHintUnlocked(true), 20000)
    return () => window.clearTimeout(unlockTimer)
  }, [status])
  React.useEffect(() => {
    if (!hintUnlocked || status !== 'running' || autoHintShown.current) return
    autoHintShown.current = true
    // Auto-surface the hint once unlocked
    if (aiCachedText) {
      setAiVisible(true)
      setAiStatus('thinking')
      setAiText('AI is aan het denken…')
      window.setTimeout(() => {
        setAiStatus('ready')
        setAiText(aiCachedText)
      }, 800)
      return
    }
    setAiVisible(true)
    setAiStatus('thinking')
    setAiText('AI is aan het denken…')
    void requestAiHint()
  }, [aiCachedText, hintUnlocked, requestAiHint, status])
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        toggleAiOverlay()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [toggleAiOverlay])
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
<div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #3a2b24, #120804)',
        border: '2px solid #5a3412',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.7)',
      }} />
<div style={{
        position: 'absolute', inset: '12px',
        background: '#0c0603', border: '1.5px solid #342112', transform: 'rotate(45deg)',
      }} />
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
        ? 'linear-gradient(90deg, #00306a, #005dbb, #00c8ff, #005dbb, #00306a)'
        : 'linear-gradient(90deg, #00306a, #005dbb, #00c8ff, #005dbb, #00306a)',
      boxShadow: `0 0 9px ${ledColor(120)}66, 0 0 18px rgba(0,196,255,0.28)`,
      opacity: neonOpacity,
    }} />
  )

  const LabelChip = ({ text, tone = '#8fe8ff' }: { text: string; tone?: string }) => (
    <div style={{
      padding: '2px 7px',
      borderRadius: 999,
      border: `1px solid ${tone}66`,
      background: 'rgba(0,28,56,0.74)',
      color: tone,
      fontSize: 6,
      letterSpacing: 1.6,
      lineHeight: 1.1,
      textShadow: `0 0 6px ${tone}55`,
      whiteSpace: 'nowrap',
    }}>{text}</div>
  )

  const MiniMeter = ({ bars = 7, phase = 0, color = '#00b8ff' }: { bars?: number; phase?: number; color?: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 16 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const value = (Math.sin((ledPhase + phase + i * 14) / 10) + 1) / 2
        const h = 4 + Math.round(value * 10)
        return (
          <div key={i} style={{
            width: 4,
            height: h,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${color}, #004b8a)`,
            opacity: 0.35 + value * 0.7,
            boxShadow: `0 0 6px ${color}66`,
            transition: 'height 0.08s linear, opacity 0.08s linear',
          }} />
        )
      })}
    </div>
  )

  return (
    <>
<div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: '#000000',
        fontFamily: '"Courier New", monospace',
        filter: crtFlicker ? 'brightness(1.02) contrast(1.22)' : 'brightness(1.24) contrast(1.06)',
        transition: 'filter 0.06s',
        transform: `translateX(${pixelShift}px)`,
      }}>
<div
          ref={viewportRef}
          style={{
            position: 'absolute',
            top: GAME_SCREEN_INSET.top,
            left: GAME_SCREEN_INSET.left,
            right: GAME_SCREEN_INSET.right,
            bottom: GAME_SCREEN_INSET.bottom,
          }}
        />
{status !== 'running' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'grid', placeItems: 'center',
            background: 'radial-gradient(circle at 50% 42%, rgba(151,80,28,0.24) 0%, rgba(18,8,4,0.72) 55%, rgba(8,3,1,0.86) 100%)',
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
                {status === 'launching' ? `PRESS ${ARCADE_LEAVE_MENU_LABEL} TO ABORT` : 'PRESS ENTER / R TO RETRY'}
              </div>
            </div>
          </div>
        )}
      </div>
<div style={{
        position: 'fixed', inset: 0, zIndex: 10,
        pointerEvents: 'none',
        fontFamily: '"Courier New", "Press Start 2P", monospace',
      }}>
<div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          background: `
            linear-gradient(180deg, rgba(0,25,55,0.98) 0%, rgba(0,17,39,0.95) 60%, rgba(3,8,20,0.0) 100%),
            repeating-linear-gradient(90deg, rgba(22,87,144,0.2) 0px, rgba(22,87,144,0.2) 16px, rgba(11,54,92,0.24) 16px, rgba(11,54,92,0.24) 32px)
          `,
          borderBottom: `2px solid ${BASE_BLUE}`,
          boxShadow: `0 8px 0 ${BASE_BLUE_DARK}, 0 14px 28px rgba(0,0,0,0.52)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}>
          <RgbStrip top />
<div style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', opacity: 0.055 }}>
            <div style={{
              whiteSpace: 'nowrap', fontSize: 11, letterSpacing: 4, color: '#8fe8ff',
              transform: `translateX(${-marqueePos}px)`, willChange: 'transform',
            }}>
              {'★ THE ARCADERS ★ INSERT COIN ★ HIGH SCORE ★ PLAY NOW ★ 1UP ★ READY ★ FIGHT ★ '.repeat(6)}
            </div>
          </div>
<div style={{ position: 'absolute', left: 18, top: 14, display: 'flex', gap: 6 }}>
            <LabelChip text="CRT SAFE" />
            <LabelChip text={`MODE ${status === 'running' ? 'PLAY' : 'BOOT'}`} tone={status === 'running' ? '#9bffc9' : '#8fe8ff'} />
          </div>
          <div style={{ position: 'absolute', right: 18, top: 12, display: 'grid', gap: 4, justifyItems: 'end' }}>
            <LabelChip text="AUDIO BUS" />
            <MiniMeter bars={8} phase={20} />
          </div>
<div style={{ position: 'absolute', left: 20, bottom: 18, display: 'grid', gap: 5 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(154,235,255,0.55)' }}>NOW PLAYING</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(226,249,255,0.95)', textShadow: `0 0 8px rgba(114,203,255,0.45)` }}>{title}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(154,235,255,0.6)' }}>{genre} · {year}</div>
          </div>
<div style={{
            position: 'absolute',
            top: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
<div style={{
              position: 'absolute', inset: '-18px -110px',
              background: 'radial-gradient(ellipse at center, rgba(100,203,255,0.35) 0%, transparent 60%)',
              filter: 'blur(24px)', opacity: neonOpacity,
            }} />
            <img
              src="../assets/thearcaders_logo_cropped.png"
              alt="The Arcaders"
              style={{
                position: 'relative',
                width: 'clamp(210px, 17vw, 270px)',
                height: 'auto',
                imageRendering: 'pixelated',
                display: 'block',
                margin: '0 auto',
                opacity: marqueeFlicker ? 0.55 : 1,
                filter: [
                  'drop-shadow(0 0 24px rgba(97,200,255,0.9))',
                  'drop-shadow(0 0 46px rgba(0,112,209,0.5))',
                  'drop-shadow(0 4px 2px rgba(0,0,0,0.95))',
                ].join(' '),
                transition: 'opacity 0.07s',
              }}
            />
            <div style={{
              fontSize: 7, letterSpacing: 4, marginTop: 1,
              color: `rgba(143,232,255,${neonOpacity * 0.95})`,
              textShadow: '0 0 9px rgba(97,200,255,0.75)',
              transition: 'color 0.07s',
            }}>◆ ARCADE SYSTEM ◆ EST. 1992 ◆</div>
          </div>
<div style={{ position: 'absolute', right: 20, bottom: 18, display: 'grid', gap: 5, textAlign: 'right' }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(154,235,255,0.55)' }}>CABINET</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: accent, textShadow: accentGlow }}>{players} · DIFF {difficulty}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(154,235,255,0.6)' }}>STEREO · 60HZ</div>
          </div>

          <button
            type="button"
            onClick={exit}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); exit() }}
            style={{
              position: 'absolute',
              right: 18,
              bottom: 52,
              pointerEvents: 'auto',
              background: 'linear-gradient(180deg, rgba(0,128,255,0.88), rgba(0,82,180,0.92))',
              color: '#e8f7ff',
              border: '1px solid rgba(143,232,255,0.88)',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 8,
              letterSpacing: 1.8,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0,160,255,0.35)',
              fontFamily: 'inherit',
            }}
          >EXIT</button>
{[{top:7,left:7},{top:7,right:7}].map((s,i) => (
            <div key={i} style={{
              position: 'absolute', ...s,
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #c8eeff, #005da7)',
              border: '1.5px solid #0c3f67',
            }} />
          ))}
<RgbStrip bottom flip />
        </div>
<div style={{
          position: 'absolute', top: 154, bottom: 132, left: 0, width: 68,
          background: 'linear-gradient(90deg, rgba(0,36,74,0.96) 0%, rgba(0,19,44,0.88) 65%, rgba(1,6,16,0.0) 100%)',
          borderRight: '1px solid rgba(0,136,255,0.32)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(130,220,255,0.08) 0px, rgba(130,220,255,0.08) 1px, transparent 1px, transparent 7px),
              repeating-linear-gradient(90deg, rgba(16,74,128,0.24) 0px, rgba(16,74,128,0.24) 5px, rgba(8,37,70,0.18) 5px, rgba(8,37,70,0.18) 10px)
            `,
            opacity: 0.55,
            pointerEvents: 'none',
          }} />
          {[12, 94, 176, 258].map((top, i) => (
            <div key={i} style={{
              position: 'absolute', left: 4, top,
              width: 6, height: 6, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #c8eeff, #005da7)',
              border: '1px solid rgba(10,43,71,0.9)',
              boxShadow: '0 0 3px rgba(0,0,0,0.5)',
            }} />
          ))}
<div style={{
            position: 'absolute', top: 0, bottom: 0, left: 9, width: 2,
            background: 'linear-gradient(180deg, transparent, rgba(0,198,255,0.74), rgba(0,104,214,0.74), transparent)',
            opacity: 0.55,
          }} />
          <div style={{
            position: 'absolute', top: 108, left: 16, right: 12,
            border: '1px solid rgba(114,203,255,0.7)',
            background: 'rgba(0,28,56,0.82)',
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
            borderRadius: 3,
            padding: '4px 3px 3px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 5, letterSpacing: 1.1, color: 'rgba(168,229,255,0.8)' }}>CRED</div>
            <div style={{
              marginTop: 1,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: coinBlink ? '#8fe8ff' : 'rgba(143,232,255,0.45)',
              textShadow: coinBlink ? '0 0 6px rgba(143,232,255,0.8)' : 'none',
            }}>{coinBlink ? '01' : '00'}</div>
          </div>
          <div style={{
            position: 'absolute', bottom: 154, left: 16, right: 12,
            border: '1px solid rgba(114,203,255,0.55)',
            background: 'rgba(0,25,49,0.75)',
            borderRadius: 3,
            padding: '2px 0',
            textAlign: 'center',
            fontSize: 5,
            letterSpacing: 1.5,
            color: 'rgba(168,229,255,0.78)',
          }}>PLAYER 1</div>
          <div style={{
            position: 'absolute', bottom: 214, left: 12, right: 10,
            border: '1px solid rgba(114,203,255,0.52)',
            background: 'rgba(0,22,44,0.78)',
            borderRadius: 3,
            padding: '3px 4px',
            display: 'grid',
            gap: 3,
          }}>
            <div style={{ fontSize: 5, letterSpacing: 1.1, color: 'rgba(168,229,255,0.74)', textAlign: 'center' }}>POWER BUS</div>
            <MiniMeter bars={6} phase={96} />
          </div>
          <div style={{
            position: 'absolute', bottom: 136, left: 12, right: 10,
            border: '1px solid rgba(94,191,255,0.5)',
            borderRadius: 3,
            background: 'repeating-linear-gradient(90deg, rgba(8,34,68,0.88) 0 6px, rgba(0,136,255,0.55) 6px 12px)',
            fontSize: 5,
            letterSpacing: 1.4,
            textAlign: 'center',
            color: '#d7f4ff',
            padding: '2px 0',
          }}>HV LOCK</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[0,60,120,180,240,300].map(o => <LedDot key={o} offset={o} />)}
          </div>
<div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(114,203,255,0.65), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(168,229,255,0.62)', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>STEREO L</div>
          </div>
<div style={{
            fontSize: 8, letterSpacing: 2,
            color: coinBlink ? '#8fe8ff' : 'rgba(143,232,255,0.26)',
            textShadow: coinBlink ? '0 0 8px #8fe8ff' : 'none',
            transition: 'all 0.15s', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>1UP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
        </div>
<div style={{
          position: 'absolute', top: 154, bottom: 132, right: 0, width: 68,
          background: 'linear-gradient(270deg, rgba(0,36,74,0.96) 0%, rgba(0,19,44,0.88) 65%, rgba(1,6,16,0.0) 100%)',
          borderLeft: '1px solid rgba(0,136,255,0.32)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(130,220,255,0.08) 0px, rgba(130,220,255,0.08) 1px, transparent 1px, transparent 7px),
              repeating-linear-gradient(90deg, rgba(16,74,128,0.24) 0px, rgba(16,74,128,0.24) 5px, rgba(8,37,70,0.18) 5px, rgba(8,37,70,0.18) 10px)
            `,
            opacity: 0.55,
            pointerEvents: 'none',
          }} />
          {[12, 94, 176, 258].map((top, i) => (
            <div key={i} style={{
              position: 'absolute', right: 4, top,
              width: 6, height: 6, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #c8eeff, #005da7)',
              border: '1px solid rgba(10,43,71,0.9)',
              boxShadow: '0 0 3px rgba(0,0,0,0.5)',
            }} />
          ))}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 9, width: 2,
            background: 'linear-gradient(180deg, transparent, rgba(0,198,255,0.74), rgba(0,104,214,0.74), transparent)',
            opacity: 0.55,
          }} />
          <div style={{
            position: 'absolute', top: 108, left: 12, right: 16,
            border: '1px solid rgba(114,203,255,0.7)',
            background: 'rgba(0,28,56,0.82)',
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
            borderRadius: 3,
            padding: '4px 3px 3px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 5, letterSpacing: 1.1, color: 'rgba(168,229,255,0.8)' }}>TEMP</div>
            <div style={{
              marginTop: 1,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: !coinBlink ? '#8fe8ff' : 'rgba(143,232,255,0.45)',
              textShadow: !coinBlink ? '0 0 6px rgba(143,232,255,0.8)' : 'none',
            }}>{!coinBlink ? 'HI' : 'OK'}</div>
          </div>
          <div style={{
            position: 'absolute', bottom: 154, left: 12, right: 16,
            border: '1px solid rgba(114,203,255,0.55)',
            background: 'rgba(0,25,49,0.75)',
            borderRadius: 3,
            padding: '2px 0',
            textAlign: 'center',
            fontSize: 5,
            letterSpacing: 1.2,
            color: 'rgba(168,229,255,0.78)',
          }}>INSERT COIN</div>
          <div style={{
            position: 'absolute', bottom: 214, left: 10, right: 12,
            border: '1px solid rgba(114,203,255,0.52)',
            background: 'rgba(0,22,44,0.78)',
            borderRadius: 3,
            padding: '3px 4px',
            display: 'grid',
            gap: 3,
          }}>
            <div style={{ fontSize: 5, letterSpacing: 1.1, color: 'rgba(168,229,255,0.74)', textAlign: 'center' }}>NET LINK</div>
            <MiniMeter bars={6} phase={134} color="#34b6ff" />
          </div>
          <div style={{
            position: 'absolute', bottom: 136, left: 10, right: 12,
            border: '1px solid rgba(94,191,255,0.5)',
            borderRadius: 3,
            background: 'repeating-linear-gradient(90deg, rgba(8,34,68,0.88) 0 6px, rgba(0,136,255,0.55) 6px 12px)',
            fontSize: 5,
            letterSpacing: 1.4,
            textAlign: 'center',
            color: '#d7f4ff',
            padding: '2px 0',
          }}>SYNC OK</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[300,240,180,120,60,0].map(o => <LedDot key={o} offset={o} />)}
          </div>
          <div style={{ width: 46, display: 'flex', flexDirection: 'column', gap: 5, opacity: 0.38 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(114,203,255,0.65), transparent)' }} />
            ))}
            <div style={{ marginTop: 4, fontSize: 6, letterSpacing: 1, color: 'rgba(168,229,255,0.62)', textAlign: 'center', writingMode: 'vertical-rl' }}>STEREO R</div>
          </div>
          <div style={{
            fontSize: 8, letterSpacing: 2,
            color: !coinBlink ? '#8fe8ff' : 'rgba(143,232,255,0.2)',
            textShadow: !coinBlink ? '0 0 8px #8fe8ff' : 'none',
            transition: 'all 0.15s', writingMode: 'vertical-rl',
          }}>2UP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {[0,60,120,180,240,300].map(o => <LedDot key={o} offset={o} />)}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: GAME_SCREEN_INSET.top,
          left: GAME_SCREEN_INSET.left,
          right: GAME_SCREEN_INSET.right,
          bottom: GAME_SCREEN_INSET.bottom,
          border: `2px solid ${BASE_BLUE}`,
          borderRadius: 6,
          boxShadow: borderBlink
            ? `0 0 0 1px rgba(0,58,122,0.9), 0 0 22px rgba(0,170,255,0.6), inset 0 0 24px rgba(0,58,122,0.35)`
            : `0 0 0 1px rgba(0,58,122,0.72), 0 0 14px rgba(0,170,255,0.42), inset 0 0 16px rgba(0,58,122,0.22)`,
          pointerEvents: 'none',
          transition: 'box-shadow 0.14s',
        }} />
{[
          { top: GAME_SCREEN_INSET.top - 6, left: GAME_SCREEN_INSET.left - 6, borderTop: true, borderLeft: true },
          { top: GAME_SCREEN_INSET.top - 6, right: GAME_SCREEN_INSET.right - 6, borderTop: true, borderRight: true },
          { bottom: GAME_SCREEN_INSET.bottom - 6, left: GAME_SCREEN_INSET.left - 6, borderBottom: true, borderLeft: true },
          { bottom: GAME_SCREEN_INSET.bottom - 6, right: GAME_SCREEN_INSET.right - 6, borderBottom: true, borderRight: true },
        ].map((corner, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 22,
            height: 22,
            ...corner,
            borderTop: corner.borderTop ? '2px solid rgba(120,224,255,0.9)' : 'none',
            borderBottom: corner.borderBottom ? '2px solid rgba(120,224,255,0.9)' : 'none',
            borderLeft: corner.borderLeft ? '2px solid rgba(120,224,255,0.9)' : 'none',
            borderRight: corner.borderRight ? '2px solid rgba(120,224,255,0.9)' : 'none',
            boxShadow: '0 0 7px rgba(0,170,255,0.35)',
            pointerEvents: 'none',
          }} />
        ))}
        <div style={{
          position: 'absolute', top: GAME_SCREEN_INSET.top - 18, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 7, letterSpacing: 2.2,
          color: 'rgba(154,235,255,0.86)',
          textShadow: '0 0 8px rgba(0,196,255,0.55)',
          pointerEvents: 'none',
        }}>SYNC LOCK</div>
        <div style={{
          position: 'absolute', top: '50%', left: GAME_SCREEN_INSET.left - 23,
          transform: 'translateY(-50%)',
          fontSize: 11, letterSpacing: 1,
          color: 'rgba(154,235,255,0.78)',
          textShadow: '0 0 8px rgba(0,196,255,0.55)',
          pointerEvents: 'none',
        }}>▶▶</div>
        <div style={{
          position: 'absolute', top: '50%', right: GAME_SCREEN_INSET.right - 23,
          transform: 'translateY(-50%)',
          fontSize: 11, letterSpacing: 1,
          color: 'rgba(154,235,255,0.78)',
          textShadow: '0 0 8px rgba(0,196,255,0.55)',
          pointerEvents: 'none',
        }}>◀◀</div>
<div style={{
          position: 'absolute', left: 56, top: 160, bottom: 140, width: 5,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,208,255,0.82) 24%, rgba(0,112,224,0.74) 56%, transparent 100%)',
          boxShadow: '0 0 10px rgba(0,184,255,0.48), 0 0 22px rgba(0,96,214,0.3)', opacity: 0.52, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', right: 56, top: 160, bottom: 140, width: 5,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,208,255,0.82) 24%, rgba(0,112,224,0.74) 56%, transparent 100%)',
          boxShadow: '0 0 10px rgba(0,184,255,0.48), 0 0 22px rgba(0,96,214,0.3)', opacity: 0.52, borderRadius: 999,
          animation: 'neon-breathe 2.6s ease-in-out infinite',
        }} />
<div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 132,
          background: `
            linear-gradient(0deg, rgba(0,14,30,0.98) 0%, rgba(0,29,58,0.96) 56%, rgba(3,9,20,0.0) 100%),
            repeating-linear-gradient(90deg, rgba(0,110,190,0.24) 0px, rgba(0,110,190,0.24) 18px, rgba(0,64,116,0.26) 18px, rgba(0,64,116,0.26) 36px)
          `,
          borderTop: `2px solid ${BASE_BLUE}`,
          boxShadow: '0 -10px 25px rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 30px', gap: 12,
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}>
<div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(0,0,0,0.07) 8px, rgba(0,0,0,0.07) 9px),
              repeating-linear-gradient(90deg, transparent 0, transparent 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 9px)
            `,
            pointerEvents: 'none',
          }} />
          <RgbStrip top />
<div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <Joystick />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ArcadeBtn color="#d63b2f" /><ArcadeBtn color="#3975cc" />
              <ArcadeBtn color="#f0b837" /><ArcadeBtn color="#ed7f3a" />
            </div>
          </div>
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
<div style={{
              background: 'rgba(0,20,43,0.9)', border: '1.5px solid rgba(114,203,255,0.72)',
              borderRadius: 5, padding: '5px 16px', textAlign: 'center',
              boxShadow: 'inset 0 0 12px rgba(0,104,194,0.5)', minWidth: 150,
            }}>
              <div style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(168,229,255,0.72)', marginBottom: 2 }}>HIGH SCORE</div>
              <div style={{
                fontSize: 17, fontWeight: 900, letterSpacing: 4, color: '#8fe8ff',
                textShadow: '0 0 14px rgba(143,232,255,0.82), 0 0 26px rgba(0,121,199,0.38)',
              }}>000000</div>
            </div>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <LabelChip text="CAB LINK" tone="#9cdfff" />
              <MiniMeter bars={9} phase={160} color="#42beff" />
            </div>
<div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #9ed9ff, #005c9f)',
                border: '1.5px solid #2b75b8', boxShadow: '0 0 7px rgba(0,169,255,0.5)',
              }} />
              <div style={{
                fontSize: 8, letterSpacing: 3,
                color: coinBlink ? '#9be9ff' : 'rgba(155,233,255,0.18)',
                textShadow: coinBlink ? '0 0 9px rgba(155,233,255,0.95)' : 'none',
                transition: 'all 0.15s',
              }}>INSERT COIN</div>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #9ed9ff, #005c9f)',
                border: '1.5px solid #2b75b8', boxShadow: '0 0 7px rgba(0,169,255,0.5)',
              }} />
            </div>
<button
              type="button"
              onClick={exit}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); exit() }}
              style={{
              background: 'linear-gradient(180deg, rgba(0,128,255,0.88), rgba(0,82,180,0.92))', color: '#e8f7ff',
              border: '1px solid rgba(143,232,255,0.9)',
              padding: '4px 13px', cursor: 'pointer',
              fontSize: 9, letterSpacing: 2, borderRadius: 4,
              boxShadow: '0 0 10px rgba(0,160,255,0.35)',
              fontFamily: 'inherit',
            }}>■ EXIT</button>
          </div>
<div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexDirection: 'row-reverse' }}>
            <Joystick flip />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ArcadeBtn color="#d63b2f" dim /><ArcadeBtn color="#3975cc" dim />
              <ArcadeBtn color="#f0b837" dim /><ArcadeBtn color="#ed7f3a" dim />
            </div>
          </div>
        </div>
<div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 3px)',
          transform: `translateY(${scanlineOffset}px)`,
          pointerEvents: 'none', zIndex: 20, opacity: 0.12,
        }} />
{glitchLine >= 0 && (
          <div style={{
            position: 'absolute', top: `${glitchLine * 5}%`, left: 0, right: 0, height: 2,
            background: 'rgba(0,204,255,0.8)', mixBlendMode: 'screen',
            pointerEvents: 'none', zIndex: 21,
          }} />
        )}
{status === 'running' && (
          <div style={{
            position: 'absolute', top: 158, left: 76,
            display: 'flex', gap: 7, alignItems: 'center',
            pointerEvents: 'none', zIndex: 15,
          }}>
            <div style={{
              padding: '5px 9px', borderRadius: 8,
              border: '1px solid rgba(114,203,255,0.68)', color: '#e2f9ff',
              fontSize: 9, letterSpacing: 2, background: 'rgba(0,23,46,0.68)',
              textShadow: '0 0 8px rgba(114,203,255,0.55)',
            }}>P1 READY</div>
            <div style={{
              padding: '5px 9px', borderRadius: 8,
              border: '1px solid rgba(114,203,255,0.35)',
              color: 'rgba(168,229,255,0.84)', fontSize: 9, letterSpacing: 2,
              background: 'rgba(0,17,36,0.52)',
            }}>{players}</div>
          </div>
        )}
        {aiVisible && (
          <div style={{
            position: 'absolute',
            bottom: 102,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(540px, 54vw)',
            padding: '13px 18px 14px',
            borderRadius: 12,
            border: `1px solid ${accent}66`,
            background: 'linear-gradient(180deg, rgba(0,20,46,0.95), rgba(0,12,30,0.9))',
            boxShadow: `0 10px 30px rgba(0,0,0,0.55), 0 0 18px ${accent}33, inset 0 0 12px rgba(0,120,200,0.22)`,
            color: '#e6f7ff',
            pointerEvents: 'auto',
            zIndex: 32,
            backdropFilter: 'blur(5px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.8, fontWeight: 700, color: accent, textShadow: accentGlow }}>
                AI ASSIST {aiPrefetching ? '· PREFETCH' : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: '#8fd5ff', letterSpacing: 1.2 }}>
                  {aiStatus === 'thinking' ? 'DENKEN…' : aiStatus === 'error' ? 'ERROR' : 'GEREED'}
                </div>
                <button
                  type="button"
                  onClick={() => setAiVisible(false)}
                  style={{
                    background: 'rgba(0,40,80,0.8)',
                    color: '#d7f1ff',
                    border: `1px solid ${accent}55`,
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    letterSpacing: 1.4,
                    cursor: 'pointer'
                  }}
                >✕</button>
              </div>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: '#e6f7ff' }}>
              {aiText}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: '#8bbde8', letterSpacing: 1 }}>
              Tip: druk Y opnieuw om te sluiten.
            </div>
          </div>
        )}
        {!aiVisible && status === 'running' && hintUnlocked && (
          <div style={{
            position: 'absolute',
            bottom: 94,
            right: 120,
            padding: '6px 11px',
            borderRadius: 9,
            background: 'rgba(0,20,42,0.78)',
            border: `1px solid ${accent}55`,
            color: '#bfe7ff',
            fontSize: 9,
            letterSpacing: 1.6,
            textShadow: accentGlow,
            pointerEvents: 'none',
            zIndex: 28
          }}>
            Y = AI HINT
          </div>
        )}
        {status === 'running' && (
          <div style={{
            position: 'absolute',
            bottom: 94,
            left: 120,
            padding: '6px 11px',
            borderRadius: 9,
            background: 'rgba(0,20,42,0.78)',
            border: '1px solid rgba(114,203,255,0.45)',
            color: '#bfe7ff',
            fontSize: 9,
            letterSpacing: 1.6,
            textShadow: '0 0 8px rgba(114,203,255,0.45)',
            pointerEvents: 'none',
            zIndex: 28
          }}>
            MENU = {ARCADE_LEAVE_MENU_LABEL}
          </div>
        )}

      </div>

      <style>{`
        @keyframes neon-breathe {
          0%, 100% { opacity: 0.38; filter: brightness(0.95); }
          50%       { opacity: 0.62; filter: brightness(1.3); }
        }
      `}</style>
    </>
  )
}
