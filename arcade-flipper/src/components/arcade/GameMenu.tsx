import React from 'react'

type MenuProps = {
  particles: Array<{ x: number; y: number; vx: number; vy: number; color: string; id: number }>
  onSelectGame?: (gameId: string) => void
}

type GameCard = {
  id: string
  title: string
  genre: string
  badge: string
  tagline: string
  image: string
  accent: string
  executable: string
  difficulty: string
  players: string
  year?: string
}

const games: GameCard[] = [
  { id: 'space-invader', title: 'SPACE INVADER', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Defend Earth from the alien invasion!', image: '../assets/spaceinvaders.png', accent: '#00ff88', executable: 'games/spaceinvaders.py', difficulty: '★★☆', players: '1P', year: '1978' },
  { id: 'pac-man', title: 'PAC-MAN', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Eat all pellets and dodge the ghosts.', image: '../assets/TrollPacMan.png', accent: '#ffde00', executable: 'games/PacMan/pacman.py', difficulty: '★★☆', players: '1P', year: '1980' },
  { id: 'flappy-bird', title: 'RETRO BIRD', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Tap to flap and dodge the pipes!', image: '../assets/retrobird.png', accent: '#ff00aa', executable: 'games/RetroBird/main.py', difficulty: '★★★', players: '1P', year: '2013' },
  { id: 'super-mario', title: 'SUPER MARIO', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Jump, run, and rescue the kingdom!', image: '../assets/spaceinvaders.png', accent: '#ff4444', executable: 'games/super-mario-python/main.py', difficulty: '★★☆', players: '1P', year: '1985' },
  { id: 'car-racing-extreme', title: 'EXTREME RACING', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Adrenaline at high speed!', image: '../assets/extremeracing.png', accent: '#ff6600', executable: 'games/CarRacingUltraMaxExtremeLevel1000/main.py', difficulty: '★★★', players: '1P', year: '1992' },
  { id: 'BlockStorm', title: 'BLOCK STORM', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Arrange falling blocks to clear lines.', image: '../assets/blockstorm.png', accent: '#ffff00', executable: 'games/BlockStorm/main.py', difficulty: '★☆☆', players: '1P', year: '1984' },
  { id: 'retro-race-game', title: 'RETRO RACE', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Classic pseudo-3D race action in Java.', image: '../assets/extremeracing.png', accent: '#44bbff', executable: 'games/RetroRaceGame/RetroRaceGame.jar', difficulty: '★★☆', players: '1P', year: '2024' },
  { id: 'AngryWalls', title: 'ANGRY WALLS', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Explore dungeons and hunt loot.', image: '../assets/angrywalls.png', accent: '#aa44ff', executable: 'games/AngryWalls/main.py', difficulty: '★★☆', players: '1P', year: '1996' },
  { id: 'PONG', title: 'PONG', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Classic pong game.', image: '../assets/pong.png', accent: '#00ccff', executable: 'games/pong.py', difficulty: '★☆☆', players: '2P', year: '1972' },
]

export { games }

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string>(games[0]?.id ?? '')

  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)

  const list = games

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

  const selectedIndex = React.useMemo(() => {
    const i = list.findIndex(g => g.id === selectedId)
    return i >= 0 ? i : 0
  }, [list, selectedId])

  React.useEffect(() => {
    if (!list.some(g => g.id === selectedId)) setSelectedId(list[0]?.id ?? '')
    setHoveredId(null)
  }, [list.length])

  const focusId = hoveredId ?? selectedId
  const focusGame = React.useMemo(() => list.find(g => g.id === focusId) ?? list[0], [list, focusId])

  const accent = focusGame?.accent ?? '#00ccff'

  const startSelected = React.useCallback(() => {
    if (selectedId) onSelectGame?.(selectedId)
  }, [onSelectGame, selectedId])

  const wrapIndex = React.useCallback((i: number, len: number) => {
    if (len <= 0) return 0
    return (i % len + len) % len
  }, [])

  const moveSelection = React.useCallback((dir: number) => {
    if (!list.length) return
    const ni = wrapIndex(selectedIndex + dir, list.length)
    const target = list[ni]
    if (target) setSelectedId(target.id)
  }, [list, selectedIndex, wrapIndex])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1) }
      if (e.key === 'Enter') { e.preventDefault(); startSelected() }
      if (e.key === 'Escape') { e.preventDefault(); setHoveredId(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [moveSelection, startSelected])

  React.useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.02) {
        setCrtFlicker(true)
        setTimeout(() => setCrtFlicker(false), 60)
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

  const visibleRange = 4
  const itemSpacing = 140
  const iconSize = 132

  const INFO_SCALE = 2.5
  const titleFont = Math.round(34 * INFO_SCALE)
  const taglineFont = Math.round(17 * INFO_SCALE)
  const playFont = Math.round(15 * INFO_SCALE)
  const yallaFont = Math.round(13 * INFO_SCALE)

  const titleGlow = Math.round(18 * INFO_SCALE)
  const titleOffset = Math.round(3 * INFO_SCALE)
  const taglineGlow = Math.round(10 * INFO_SCALE)

  const playPadY = Math.round(18 * INFO_SCALE)
  const playPadX = Math.round(30 * INFO_SCALE)
  const playBorder = Math.max(3, Math.round(3 * INFO_SCALE))
  const playShadow = Math.round(28 * INFO_SCALE)

  const yallaGlow = Math.round(10 * INFO_SCALE)
  const barHeight = Math.round(6 * INFO_SCALE)
  const barGlow = Math.round(26 * INFO_SCALE)

  const circularOffset = React.useCallback((idx: number, sel: number, len: number) => {
    if (len <= 0) return 0
    let d = idx - sel
    const half = len / 2
    if (d > half) d -= len
    if (d < -half) d += len
    return d
  }, [])

  const wheelItems = React.useMemo(() => {
    const len = list.length
    const out: Array<{ g: GameCard; offset: number; idx: number }> = []
    for (let idx = 0; idx < len; idx++) {
      const offset = circularOffset(idx, selectedIndex, len)
      if (Math.abs(offset) <= visibleRange) out.push({ g: list[idx], offset, idx })
    }
    out.sort((a, b) => a.offset - b.offset)
    return out
  }, [list, selectedIndex, circularOffset])

  const wheelAccum = React.useRef(0)
  const onWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    wheelAccum.current += e.deltaY
    if (wheelAccum.current > 32) { wheelAccum.current = 0; moveSelection(1) }
    if (wheelAccum.current < -32) { wheelAccum.current = 0; moveSelection(-1) }
  }, [moveSelection])

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
          filter: crtFlicker ? 'brightness(0.8) contrast(1.25)' : 'brightness(1) contrast(1.15)',
          transition: 'filter 0.06s',
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
            zIndex: 1,
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
            zIndex: 2,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.5) 82%, rgba(0,0,0,0.92) 100%)',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
            pointerEvents: 'none',
            zIndex: 60,
            transform: `translateY(${scanlineOffset}px)`,
            opacity: 0.55,
          }}
        />

        {glitchLine >= 0 && (
          <div
            style={{
              position: 'absolute',
              top: `${glitchLine * 5}%`,
              left: 0,
              right: 0,
              height: '3px',
              background: 'rgba(0,200,255,0.85)',
              mixBlendMode: 'screen',
              zIndex: 61,
              pointerEvents: 'none',
            }}
          />
        )}

        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 8,
              height: 8,
              background: p.color,
              boxShadow: `0 0 12px ${p.color}`,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: 'grid',
            gridTemplateColumns: '0.44fr 1.56fr',
            gap: 12,
          }}
        >
          <div onWheel={onWheel} style={{ position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                border: '6px solid #0088ff',
                background: '#000814',
                boxShadow: '0 0 30px rgba(0,136,255,0.45), inset 0 0 20px rgba(0,136,255,0.18), 6px 6px 0 rgba(0,0,0,0.6)',
                padding: 6,
                borderRadius: 18,
                height: '100%',
              }}
            >
              <div
                style={{
                  border: '4px solid #004488',
                  background: 'linear-gradient(180deg, #001122, #000a14)',
                  boxShadow: 'inset 0 0 30px rgba(0,68,136,0.28)',
                  borderRadius: 14,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 4,
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src="../assets/thearcaders_logo.png"
                    alt="The Arcaders"
                    style={{
                      width: 540,
                      maxWidth: '75%',
                      height: 'auto',
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 0 26px rgba(77,166,255,0.95)) drop-shadow(0 0 42px rgba(204,51,255,0.55))',
                      opacity: 0.98,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    top: '55%',
                    transform: 'translateY(-50%)',
                    height: 900,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 34,
                      top: '50%',
                      width: 8,
                      height: iconSize,
                      transform: 'translateY(-50%)',
                      borderRadius: 999,
                      background: `linear-gradient(180deg, transparent, ${accent}88, transparent)`,
                      boxShadow: `0 0 22px ${accent}22`,
                    }}
                  />

                  {wheelItems.map(({ g, offset }) => {
                    const abs = Math.abs(offset)
                    const y = offset * itemSpacing
                    const curve = -28 * (abs * abs)
                    const x = 118 + curve
                    const scale = clamp(1 - abs * 0.08, 0.56, 1)
                    const opacity = clamp(1 - abs * 0.20, 0.22, 1)
                    const rot = clamp(offset * 3.1, -12, 12)
                    const isFocus = g.id === (hoveredId ?? selectedId)
                    const isSelected = g.id === selectedId

                    return (
                      <div
                        key={g.id}
                        onMouseEnter={() => setHoveredId(g.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedId(g.id)}
                        onDoubleClick={startSelected}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: `translate(${x}px, ${y}px) translateY(-50%) rotate(${rot}deg) scale(${scale})`,
                          transformOrigin: 'center',
                          transition: 'transform 0.14s ease, opacity 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease, border 0.14s ease',
                          opacity,
                          cursor: 'pointer',
                          width: iconSize,
                          height: iconSize,
                          borderRadius: 28,
                          overflow: 'hidden',
                          border: isFocus ? `3px solid ${g.accent}` : '1px solid rgba(120,160,220,0.14)',
                          background: 'rgba(0,0,0,0.35)',
                          boxShadow: isFocus
                            ? `0 0 0 1px rgba(0,0,0,0.75), 0 0 40px ${g.accent}30`
                            : isSelected
                              ? `0 0 22px ${g.accent}18`
                              : 'none',
                          filter: isFocus ? 'brightness(1.02) saturate(1.08)' : 'brightness(0.78) saturate(0.92)',
                          willChange: 'transform',
                        }}
                      >
                        <img
                          src={g.image}
                          alt={g.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>
                    )
                  })}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    zIndex: 4,
                    padding: '10px 10px',
                    background: 'transparent',
                  }}
                >
                  <div style={{ color: 'rgba(190,220,255,0.70)', fontWeight: 900, letterSpacing: 2, fontSize: 13, textShadow: '0 0 10px rgba(0,204,255,0.25)' }}>
                    ↑/↓ (arriba/abajo) · SCROLL
                  </div>
                  <div style={{ color: '#ffff00', fontWeight: 950, letterSpacing: 2, fontSize: 13, textShadow: '0 0 12px rgba(255,255,0,0.45)' }}>
                    ENTER = PLAY
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                border: '6px solid #0088ff',
                background: '#000814',
                boxShadow: '0 0 30px rgba(0,136,255,0.45), inset 0 0 20px rgba(0,136,255,0.18), 6px 6px 0 rgba(0,0,0,0.6)',
                padding: 6,
                borderRadius: 18,
                height: '100%',
              }}
            >
              <div
                style={{
                  border: '4px solid #004488',
                  background: 'linear-gradient(180deg, #001122, #000a14)',
                  boxShadow: 'inset 0 0 30px rgba(0,68,136,0.28)',
                  borderRadius: 14,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  <img
                    src={focusGame?.image}
                    alt={focusGame?.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      imageRendering: 'pixelated',
                      filter: 'brightness(0.96) saturate(1.02)',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 35%, rgba(0,0,0,0.88) 100%)' }} />
                </div>

                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 520px' }}>
                      <div
                        style={{
                          color: '#ffffff',
                          fontWeight: 950,
                          letterSpacing: 2,
                          fontSize: titleFont,
                          lineHeight: 0.98,
                          textShadow: `0 0 ${titleGlow}px ${accent}22, ${titleOffset}px ${titleOffset}px 0 rgba(0,0,0,0.55)`,
                          whiteSpace: 'normal',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {focusGame?.title ?? '—'}
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          color: 'rgba(200,230,255,0.78)',
                          fontWeight: 800,
                          letterSpacing: 1.2,
                          fontSize: taglineFont,
                          lineHeight: 1.08,
                          textShadow: `0 0 ${taglineGlow}px rgba(0,204,255,0.22)`,
                          whiteSpace: 'normal',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {focusGame?.tagline ?? ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={startSelected}
                      style={{
                        cursor: 'pointer',
                        padding: `${playPadY}px ${playPadX}px`,
                        borderRadius: 2,
                        border: `${playBorder}px solid ${accent}`,
                        background: `linear-gradient(180deg, ${accent}22, rgba(0,8,20,0.65))`,
                        color: '#ffffff',
                        fontWeight: 950,
                        letterSpacing: 3,
                        fontSize: playFont,
                        boxShadow: `0 0 ${playShadow}px ${accent}22`,
                        fontFamily: 'inherit',
                        flex: '0 0 auto',
                        textShadow: `${Math.round(2 * INFO_SCALE)}px ${Math.round(2 * INFO_SCALE)}px 0 rgba(0,0,0,0.6)`,
                      }}
                    >
                      PLAY
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ color: '#00ccff', fontWeight: 900, letterSpacing: 2, fontSize: yallaFont, textShadow: `0 0 ${yallaGlow}px rgba(0,204,255,0.35)` }}>
                      yalla (هيا) select & go
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: barHeight,
                    background: `linear-gradient(90deg, transparent, ${accent}aa 12%, ${accent}55 50%, ${accent}aa 88%, transparent)`,
                    opacity: 0.7,
                    boxShadow: `0 0 ${barGlow}px ${accent}25`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 15,
            color: '#0088ff',
            letterSpacing: 2,
            textShadow: '0 0 10px rgba(0,136,255,0.6)',
            zIndex: 70,
            pointerEvents: 'none',
          }}
        >
          © 1992 THE ARCADERS • GAME SELECT • STEREO
        </div>
      </div>

      <style>{`
        @keyframes starfield-drift {
          from { background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px; }
          to   { background-position: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px, 200px 380px, 90px 420px; }
        }
      `}</style>
    </>
  )
}
