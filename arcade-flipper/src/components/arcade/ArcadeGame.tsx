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

  const [status, setStatus] = React.useState<'launching' | 'running' | 'error'>('launching')
  const [progress, setProgress] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState('')

  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const [pixelShift, setPixelShift] = React.useState(0)
  const [borderBlink, setBorderBlink] = React.useState(false)
  const [marqueeFlicker, setMarqueeFlicker] = React.useState(false)
  const [ledPhase, setLedPhase] = React.useState(0)

  const game = React.useMemo(() => games.find(g => g.id === gameId), [gameId])
  const title = game?.title ?? formatTitle(gameId)
  const accent = game?.accent ?? '#00ccff'
  const tagline = game?.tagline ?? 'INSERT COIN TO PLAY'
  const genre = game?.genre ?? 'ARCADE'
  const year = game?.year ?? '????'
  const difficulty = game?.difficulty ?? '★☆☆'
  const players = game?.players ?? '1P'
  const art = game?.image

  const accentGlow = `0 0 14px ${accent}66, 0 0 34px ${accent}22`
  const blueGlow = borderBlink
    ? '0 0 44px rgba(0,136,255,0.70), 0 0 90px rgba(0,136,255,0.22), 8px 10px 0 rgba(0,0,0,0.65)'
    : '0 0 34px rgba(0,136,255,0.55), 0 0 70px rgba(0,136,255,0.18), 8px 10px 0 rgba(0,0,0,0.65)'

  const waitForLayoutCommit = React.useCallback(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      }),
    []
  )

  const getViewport = React.useCallback((): ViewportRect | undefined => {
    if (!viewportRef.current) return undefined
    const rect = viewportRef.current.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }, [])

  const stopGameIfPossible = React.useCallback(() => {
    const api = (window as any).electron
    api?.stopGame?.()
    api?.killGame?.()
  }, [])

  const exit = React.useCallback(() => {
    stopGameIfPossible()
    const api = (window as any).electron
    api?.setFullscreen?.(false)
    onExit()
  }, [onExit, stopGameIfPossible])

  const launch = React.useCallback(async () => {
    if (!game) {
      setErrorMessage('Game not found')
      setStatus('error')
      return
    }

    if (!window.electron?.launchGame) {
      setErrorMessage('Electron API not available (window.electron.launchGame missing)')
      setStatus('error')
      return
    }

    setStatus('launching')
    setErrorMessage('')
    setProgress(0)

    await waitForLayoutCommit()

    try {
      const viewport = getViewport()
      const result = await window.electron.launchGame({
        gamePath: game.executable,
        mode: viewport ? 'embedded' : 'external',
        viewport
      })

      if (result?.success) {
        setProgress(100)
        setStatus('running')
        return
      }

      setErrorMessage(result?.message ?? 'Launch failed')
      setStatus('error')
    } catch (err) {
      setErrorMessage(String(err))
      setStatus('error')
    }
  }, [game, getViewport, waitForLayoutCommit])

  React.useEffect(() => {
    const api = (window as any).electron
    api?.setFullscreen?.(true)
    launch()
    return () => {
      stopGameIfPossible()
    }
  }, [launch, stopGameIfPossible])

  React.useEffect(() => {
    if (status !== 'launching') return
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p
        const bump = Math.max(1, Math.floor(Math.random() * 6))
        return Math.min(92, p + bump)
      })
    }, 120)
    return () => clearInterval(t)
  }, [status])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        exit()
      }
      if ((e.key === 'Enter' || e.key === 'r' || e.key === 'R') && status === 'error') {
        e.preventDefault()
        launch()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [exit, launch, status])

  React.useEffect(() => {
    const cleanup = window.electron?.onGameExit?.(() => {
      exit()
    })
    return () => cleanup?.()
  }, [exit])

  React.useEffect(() => {
    if (status !== 'running') return

    const api = (window as any).electron
    const update = () => {
      const viewport = getViewport()
      if (!viewport) return
      api?.updateGameViewport?.(viewport)
      api?.resizeGame?.(viewport)
    }

    update()

    const onResize = () => update()
    window.addEventListener('resize', onResize)

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      ro = new ResizeObserver(() => update())
      ro.observe(viewportRef.current)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [getViewport, status])

  React.useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.02) {
        setCrtFlicker(true)
        setPixelShift(Math.random() < 0.5 ? -1 : 1)
        setTimeout(() => {
          setCrtFlicker(false)
          setPixelShift(0)
        }, 60)
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
    const t = setInterval(() => {
      setBorderBlink(true)
      setTimeout(() => setBorderBlink(false), 140)
    }, 1800)
    return () => clearInterval(t)
  }, [])

  React.useEffect(() => {
    const t = setInterval(() => {
      setLedPhase(p => (p + 1) % 240)
      if (Math.random() < 0.03) {
        setMarqueeFlicker(true)
        setTimeout(() => setMarqueeFlicker(false), 70)
      }
    }, 36)
    return () => clearInterval(t)
  }, [])

  const ledBg = `repeating-linear-gradient(90deg,
    rgba(255,255,255,0.00) 0px,
    rgba(255,255,255,0.00) 10px,
    rgba(255,255,255,0.10) 10px,
    rgba(255,255,255,0.10) 14px
  )`

  const screenStatus = status === 'running' ? 'GAME MODE' : status === 'launching' ? 'BOOTING CABINET' : 'SYSTEM ERROR'

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(180deg, #001a40 0%, #000d1f 40%, #000510 70%, #000000 100%)',
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Courier New", "Press Start 2P", monospace',
          filter: crtFlicker ? 'brightness(0.75) contrast(1.30)' : 'brightness(1) contrast(1.15)',
          transition: 'filter 0.06s',
          transform: `translateX(${pixelShift}px)`
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(1px 1px at 20% 30%, #0088ff, transparent),
              radial-gradient(1px 1px at 60% 70%, #00ccff, transparent),
              radial-gradient(2px 2px at 50% 50%, #ffffff, transparent),
              radial-gradient(1px 1px at 80% 10%, #0088ff, transparent),
              radial-gradient(1px 1px at 90% 60%, #00aaff, transparent),
              radial-gradient(1px 1px at 15% 80%, #00ddff, transparent),
              radial-gradient(2px 2px at 35% 25%, #ffffff, transparent)
            `,
            backgroundSize: '200px 200px, 300px 300px, 150px 150px, 250px 250px, 180px 180px, 220px 220px, 280px 280px',
            backgroundPosition: '0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px',
            animation: 'starfield-drift 120s linear infinite',
            opacity: 0.45,
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px),
              repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px)
            `,
            pointerEvents: 'none',
            zIndex: 2
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-30%',
            right: '-30%',
            height: '65%',
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent 0px, transparent 38px, #0099ff 38px, #0099ff 41px),
              repeating-linear-gradient(90deg, transparent 0px, transparent 58px, #0066ff 58px, #0066ff 61px)
            `,
            transform: 'perspective(350px) rotateX(68deg)',
            backgroundPosition: `0 ${(ledPhase * 2.5) % 41}px`,
            opacity: 0.55,
            filter: 'blur(0.3px)',
            boxShadow: '0 -40px 100px rgba(0,136,255,0.38), 0 -80px 150px rgba(0,102,255,0.22)',
            animation: 'grid-pulse 3s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '46%',
            left: '-5%',
            right: '-5%',
            height: 4,
            background:
              'linear-gradient(90deg, transparent, #0066ff 10%, #0099ff 30%, #00ccff 50%, #0099ff 70%, #0066ff 90%, transparent)',
            boxShadow: '0 0 30px #0088ff, 0 0 60px #0066ff, 0 0 90px rgba(0,136,255,0.25)',
            opacity: 0.75,
            animation: 'horizon-glow 2.5s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 3
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.5) 82%, rgba(0,0,0,0.92) 100%)',
            pointerEvents: 'none',
            zIndex: 90
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
            pointerEvents: 'none',
            zIndex: 95,
            transform: `translateY(${scanlineOffset}px)`,
            opacity: 0.6
          }}
        />

        {glitchLine >= 0 && (
          <div
            style={{
              position: 'absolute',
              top: `${glitchLine * 5}%`,
              left: 0,
              right: 0,
              height: 3,
              background: 'rgba(0,200,255,0.85)',
              mixBlendMode: 'screen',
              zIndex: 96,
              pointerEvents: 'none'
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 18,
            color: 'rgba(190,220,255,0.82)',
            fontWeight: 900,
            letterSpacing: 2,
            fontSize: 13,
            textShadow: '0 0 10px rgba(0,204,255,0.25)',
            zIndex: 120,
            pointerEvents: 'none'
          }}
        >
          {screenStatus} · ESC = EXIT
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            padding: '22px'
          }}
        >
          <div
            style={{
              width: 'min(1240px, 96vw)',
              height: 'min(940px, 94vh)',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 34,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.72))',
                boxShadow: `0 40px 140px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.06), 0 0 72px rgba(0,136,255,0.14)`,
                opacity: 0.95
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                bottom: 16,
                borderRadius: 28,
                border: `6px solid ${BASE_BLUE}`,
                background: '#000814',
                boxShadow: blueGlow,
                padding: 6
              }}
            >
              <div
                style={{
                  border: `4px solid ${BASE_BLUE_DARK}`,
                  borderRadius: 22,
                  height: '100%',
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, #001122, #000a14)',
                  boxShadow: 'inset 0 0 30px rgba(0,68,136,0.28)',
                  position: 'relative',
                  display: 'grid',
                  gridTemplateRows: '190px 1fr 250px'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    borderBottom: '2px solid rgba(0,170,255,0.18)',
                    background: marqueeFlicker
                      ? 'linear-gradient(180deg, rgba(0,220,255,0.22), rgba(0,0,0,0.05))'
                      : 'linear-gradient(180deg, rgba(0,136,255,0.22), rgba(0,0,0,0.05))',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(circle at 50% 0%, ${accent}22 0%, transparent 55%)`,
                      pointerEvents: 'none'
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      left: 18,
                      top: 18,
                      width: 168,
                      height: 92,
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06), rgba(0,0,0,0.28))',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.45)',
                      opacity: 0.92
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 44,
                      top: 46,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${accent} 35%, #00121f 100%)`,
                      boxShadow: accentGlow,
                      opacity: 0.96
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 74,
                      top: 44,
                      fontSize: 10,
                      letterSpacing: 2,
                      color: '#0b0f14',
                      opacity: 0.85
                    }}
                  >
                    COIN
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 74,
                      top: 64,
                      fontSize: 10,
                      letterSpacing: 2,
                      color: '#0b0f14',
                      opacity: 0.85
                    }}
                  >
                    READY
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 18,
                      width: 210,
                      height: 92,
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.28))',
                      border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.45)',
                      opacity: 0.92
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 34,
                      top: 40,
                      display: 'grid',
                      gap: 10,
                      justifyItems: 'end'
                    }}
                  >
                    <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(190,220,255,0.78)' }}>NOW PLAYING</div>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(210,240,255,0.86)' }}>{genre} · {year}</div>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(190,220,255,0.78)' }}>{players} · DIFF {difficulty}</div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      height: 8,
                      background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.32), rgba(255,255,255,0.18), rgba(0,200,255,0.32), transparent)',
                      opacity: 0.8
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      left: 18,
                      right: 18,
                      bottom: 14,
                      height: 18,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(0,0,0,0.42)',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.55)'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: ledBg,
                        backgroundPositionX: `${-ledPhase}px`,
                        opacity: 0.75
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
                        opacity: 0.9
                      }}
                    />
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 28,
                      display: 'flex',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <img
                      src="../assets/thearcaders_logo.png"
                      alt="The Arcaders"
                      style={{
                        width: 760,
                        maxWidth: '76%',
                        height: 'auto',
                        imageRendering: 'pixelated',
                        opacity: marqueeFlicker ? 0.72 : 0.98,
                        filter:
                          'drop-shadow(0 0 26px rgba(77,166,255,0.95)) drop-shadow(0 0 52px rgba(204,51,255,0.55)) drop-shadow(0 0 22px rgba(0,255,255,0.25))'
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '164px 1fr 164px',
                    gap: 14,
                    padding: '18px'
                  }}
                >
                  <div
                    style={{
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.32))',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 10px, rgba(0,180,255,0.08) 10px, rgba(0,180,255,0.08) 12px)',
                        opacity: 0.55
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        right: 12,
                        display: 'grid',
                        gap: 10
                      }}
                    >
                      <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(190,220,255,0.78)' }}>SIDE ART</div>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 999,
                          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                          boxShadow: accentGlow,
                          opacity: 0.8
                        }}
                      />
                    </div>

                    {art ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: 10,
                          right: 10,
                          top: 56,
                          bottom: 18,
                          borderRadius: 14,
                          background: 'rgba(0,0,0,0.45)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)',
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={art}
                          alt={title}
                          style={{
                            width: '92%',
                            height: '92%',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 0 18px rgba(0,200,255,0.22))'
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          left: 12,
                          right: 12,
                          top: 64,
                          bottom: 18,
                          borderRadius: 14,
                          background: 'rgba(0,0,0,0.45)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'rgba(190,220,255,0.65)',
                          fontSize: 10,
                          letterSpacing: 2
                        }}
                      >
                        ART
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        background: `linear-gradient(180deg, transparent, ${accent}66, transparent)`,
                        boxShadow: accentGlow,
                        opacity: 0.7
                      }}
                    />
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateRows: 'auto 1fr',
                      gap: 14
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.32))',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
                        padding: '14px 16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 12,
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: '#ffffff',
                            fontWeight: 950,
                            letterSpacing: 2,
                            fontSize: 30,
                            lineHeight: 1.02,
                            textShadow: `0 0 18px ${accent}22, 3px 3px 0 rgba(0,0,0,0.55)`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {title}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            color: 'rgba(200,230,255,0.82)',
                            fontWeight: 800,
                            letterSpacing: 1.3,
                            fontSize: 13,
                            lineHeight: 1.2,
                            textShadow: '0 0 12px rgba(0,204,255,0.22)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {tagline}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={exit}
                        style={{
                          background: 'rgba(180, 0, 0, 0.78)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,130,130,0.9)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          letterSpacing: 2,
                          borderRadius: 12,
                          boxShadow: '0 0 18px rgba(255,60,60,0.22)'
                        }}
                      >
                        EXIT
                      </button>
                    </div>

                    <div
                      style={{
                        position: 'relative',
                        borderRadius: 26,
                        padding: 14,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.55))',
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: `0 24px 90px rgba(0,0,0,0.78), 0 0 0 1px rgba(0,0,0,0.55), 0 0 54px ${accent}14`
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 12,
                          right: 12,
                          top: 12,
                          height: 10,
                          borderRadius: 999,
                          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                          opacity: 0.8,
                          boxShadow: accentGlow
                        }}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          left: 12,
                          right: 12,
                          bottom: 12,
                          height: 10,
                          borderRadius: 999,
                          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                          opacity: 0.5,
                          boxShadow: accentGlow
                        }}
                      />

                      <div
                        style={{
                          borderRadius: 20,
                          padding: 18,
                          background: 'linear-gradient(180deg, #121826 0%, #04060c 100%)',
                          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.07), inset 0 0 60px rgba(0,0,0,0.85)'
                        }}
                      >
                        <div
                          style={{
                            borderRadius: 14,
                            background: '#000000',
                            overflow: 'hidden',
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            aspectRatio: '16 / 9',
                            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 36px ${accent}1f`
                          }}
                        >
                          <div
                            ref={viewportRef}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: '#000000'
                            }}
                          />

                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background:
                                'linear-gradient(120deg, rgba(255,255,255,0.10), rgba(255,255,255,0.00) 40%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.00))',
                              opacity: 0.55,
                              mixBlendMode: 'screen',
                              pointerEvents: 'none'
                            }}
                          />

                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'radial-gradient(ellipse at 50% 35%, rgba(0,180,255,0.14) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)',
                              pointerEvents: 'none'
                            }}
                          />

                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)',
                              opacity: 0.25,
                              pointerEvents: 'none'
                            }}
                          />

                          <div
                            style={{
                              position: 'absolute',
                              left: 14,
                              top: 14,
                              display: 'flex',
                              gap: 10,
                              alignItems: 'center',
                              pointerEvents: 'none',
                              opacity: 0.92,
                              zIndex: 5
                            }}
                          >
                            <div
                              style={{
                                padding: '8px 10px',
                                borderRadius: 12,
                                border: `1px solid ${accent}55`,
                                color: '#d9f4ff',
                                fontSize: 11,
                                letterSpacing: 2,
                                textShadow: accentGlow,
                                background: 'rgba(0,0,0,0.55)'
                              }}
                            >
                              P1 READY
                            </div>
                            <div
                              style={{
                                padding: '8px 10px',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.18)',
                                color: 'rgba(200,230,255,0.82)',
                                fontSize: 11,
                                letterSpacing: 2,
                                background: 'rgba(0,0,0,0.42)'
                              }}
                            >
                              {players}
                            </div>
                          </div>

                          {status !== 'running' && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'grid',
                                placeItems: 'center',
                                background: 'radial-gradient(circle at 50% 40%, rgba(0,160,255,0.18) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.95) 100%)',
                                color: '#d7f3ff',
                                zIndex: 10
                              }}
                            >
                              <div style={{ width: 'min(620px, 90%)', display: 'grid', gap: 14 }}>
                                <div style={{ fontSize: 18, letterSpacing: 3, textShadow: accentGlow }}>
                                  {status === 'launching' ? 'LOADING' : 'LAUNCH FAILED'}
                                </div>

                                <div style={{ fontSize: 12, letterSpacing: 1.4, color: 'rgba(200,230,255,0.82)', lineHeight: 1.5 }}>
                                  {status === 'launching' ? 'Mounting the game into the cabinet screen…' : (errorMessage || 'Unknown error')}
                                </div>

                                <div
                                  style={{
                                    height: 14,
                                    borderRadius: 999,
                                    border: `1px solid ${accent}66`,
                                    background: 'rgba(0,0,0,0.55)',
                                    overflow: 'hidden',
                                    boxShadow: `0 0 22px ${accent}22`
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${clamp(progress, 0, 100)}%`,
                                      height: '100%',
                                      background: `linear-gradient(90deg, ${accent} 0%, #ffffff 40%, ${accent} 100%)`,
                                      filter: 'brightness(0.9)',
                                      boxShadow: accentGlow,
                                      transition: 'width 0.12s linear'
                                    }}
                                  />
                                </div>

                                {status === 'error' && (
                                  <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={launch}
                                      style={{
                                        background: '#00a65a',
                                        color: '#ffffff',
                                        border: '1px solid #00ff99',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        letterSpacing: 2,
                                        borderRadius: 12,
                                        boxShadow: '0 0 18px rgba(0,255,150,0.22)'
                                      }}
                                    >
                                      RETRY
                                    </button>
                                    <button
                                      type="button"
                                      onClick={exit}
                                      style={{
                                        background: '#1d1d1d',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.35)',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        letterSpacing: 2,
                                        borderRadius: 12
                                      }}
                                    >
                                      BACK
                                    </button>
                                  </div>
                                )}

                                <div style={{ fontSize: 11, letterSpacing: 1.6, color: 'rgba(190,220,255,0.74)', opacity: 0.95 }}>
                                  {status === 'launching' ? 'PRESS ESC TO ABORT' : 'PRESS ENTER/R TO RETRY'}
                                </div>
                              </div>
                            </div>
                          )}

                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: 10,
                              background: `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
                              opacity: 0.75,
                              pointerEvents: 'none',
                              zIndex: 6
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.32))',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 10px, rgba(0,180,255,0.08) 10px, rgba(0,180,255,0.08) 12px)',
                        opacity: 0.55
                      }}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        right: 12,
                        display: 'grid',
                        gap: 10
                      }}
                    >
                      <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(190,220,255,0.78)', textAlign: 'right' }}>CABINET</div>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 999,
                          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                          boxShadow: accentGlow,
                          opacity: 0.8
                        }}
                      />
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        top: 58,
                        bottom: 18,
                        display: 'grid',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 14,
                          background: 'rgba(0,0,0,0.42)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: 12,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)'
                        }}
                      >
                        <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(210,240,255,0.86)' }}>STATUS</div>
                        <div style={{ marginTop: 10, fontSize: 12, letterSpacing: 2, color: '#ffffff', textShadow: accentGlow }}>
                          {status === 'running' ? 'READY' : status === 'launching' ? 'LOADING…' : 'FAILED'}
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 14,
                          background: 'rgba(0,0,0,0.42)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: 12,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)'
                        }}
                      >
                        <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(210,240,255,0.86)' }}>BUILD</div>
                        <div style={{ marginTop: 10, fontSize: 10, letterSpacing: 2, color: 'rgba(190,220,255,0.70)' }}>
                          CABINET MODE
                        </div>
                        <div style={{ marginTop: 8, fontSize: 10, letterSpacing: 2, color: 'rgba(190,220,255,0.70)' }}>
                          STEREO · 60HZ
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 14,
                          background: 'rgba(0,0,0,0.42)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: 12,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)'
                        }}
                      >
                        <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(210,240,255,0.86)' }}>TIP</div>
                        <div style={{ marginTop: 10, fontSize: 10, letterSpacing: 1.6, color: 'rgba(190,220,255,0.70)', lineHeight: 1.55 }}>
                          ESC = EXIT · ENTER/R = RETRY
                        </div>
                        <div style={{ marginTop: 8, fontSize: 10, letterSpacing: 1.6, color: 'rgba(190,220,255,0.70)' }}>
                          ركّز (focus) · yalla (komaan)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        background: `linear-gradient(180deg, transparent, ${accent}66, transparent)`,
                        boxShadow: accentGlow,
                        opacity: 0.7
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    borderTop: '2px solid rgba(0,170,255,0.18)',
                    padding: '16px 18px 18px',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,136,255,0.10))'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -22,
                      right: -22,
                      top: -38,
                      height: 70,
                      transform: 'skewX(-10deg)',
                      borderRadius: 22,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.38))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 24px 60px rgba(0,0,0,0.72)'
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 16,
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ color: 'rgba(190,220,255,0.74)', fontWeight: 900, letterSpacing: 2, fontSize: 13, textShadow: '0 0 10px rgba(0,204,255,0.25)' }}>
                        CONTROL PANEL
                      </div>
                      <div style={{ color: 'rgba(200,230,255,0.82)', fontWeight: 800, letterSpacing: 1.2, fontSize: 12, lineHeight: 1.55 }}>
                        Arcade-grade cabinet UI. No filler. Pure vibe.
                      </div>
                      <div style={{ color: 'rgba(190,220,255,0.58)', fontWeight: 900, letterSpacing: 2, fontSize: 11 }}>
                        © THE ARCADERS · NEON · STEREO
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 999,
                          background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${accent} 35%, #00121f 100%)`,
                          boxShadow: `${accentGlow}, inset 0 0 0 2px rgba(0,0,0,0.35)`
                        }}
                      />
                      <div
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 999,
                          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #ff3b3b 35%, #2a0000 100%)',
                          boxShadow: '0 0 18px rgba(255,80,80,0.55), inset 0 0 0 2px rgba(0,0,0,0.35)'
                        }}
                      />
                      <div
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 999,
                          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #ffd23b 35%, #2a1b00 100%)',
                          boxShadow: '0 0 18px rgba(255,210,80,0.45), inset 0 0 0 2px rgba(0,0,0,0.35)'
                        }}
                      />
                      <div
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 999,
                          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #00ff88 35%, #002a14 100%)',
                          boxShadow: '0 0 18px rgba(0,255,140,0.35), inset 0 0 0 2px rgba(0,0,0,0.35)'
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 18,
                      right: 18,
                      bottom: 14,
                      height: 18,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(0,0,0,0.42)',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.55)'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: ledBg,
                        backgroundPositionX: `${-(ledPhase * 1.6)}px`,
                        opacity: 0.7
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
                        opacity: 0.9
                      }}
                    />
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 18,
                      width: 220,
                      height: 70,
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.30))',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.45)',
                      opacity: 0.34,
                      pointerEvents: 'none'
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    right: 10,
                    top: 206,
                    bottom: 276,
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 0,
                      bottom: 0,
                      width: 14,
                      borderRadius: 999,
                      background: `linear-gradient(180deg, transparent, ${accent}77, transparent)`,
                      boxShadow: accentGlow,
                      opacity: 0.55,
                      animation: 'neon-breathe 2.6s ease-in-out infinite'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 0,
                      bottom: 0,
                      width: 14,
                      borderRadius: 999,
                      background: `linear-gradient(180deg, transparent, ${accent}77, transparent)`,
                      boxShadow: accentGlow,
                      opacity: 0.55,
                      animation: 'neon-breathe 2.6s ease-in-out infinite'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes starfield-drift {
          from { background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px; }
          to   { background-position: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px, 200px 380px, 90px 420px; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.48; filter: blur(0.3px) }
          50% { opacity: 0.62; filter: blur(0.15px) }
        }
        @keyframes horizon-glow {
          0%, 100% { opacity: 0.70; filter: brightness(1) }
          50% { opacity: 0.92; filter: brightness(1.25) }
        }
        @keyframes neon-breathe {
          0%, 100% { opacity: 0.45; filter: brightness(1) }
          50% { opacity: 0.72; filter: brightness(1.22) }
        }
      `}</style>
    </>
  )
}