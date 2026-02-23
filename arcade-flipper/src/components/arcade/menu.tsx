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
  { id: 'flappy-bird', title: 'RETRO BIRD', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Tap to flap and dodge the pipes!', image: '../assets/retrobird.png', accent: '#ff00aa', executable: 'games/RetroBird/main.py', difficulty: '★★★', players: '1P', year: '2013' },
  { id: 'car-racing-extreme', title: 'EXTREME RACING', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Adrenaline at high speed!', image: '../assets/extremeracing.png', accent: '#ff6600', executable: 'games/CarRacingUltraMaxExtremeLevel1000/main.py', difficulty: '★★★', players: '1P', year: '1992' },
  { id: 'BlockStorm', title: 'BLOCK STORM', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Arrange falling blocks to clear lines.', image: '../assets/blockstorm.png', accent: '#ffff00', executable: 'games/BlockStorm/main.py', difficulty: '★☆☆', players: '1P', year: '1984' },
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

  React.useEffect(() => { const t = setInterval(() => setScanlineOffset(p => (p + 1) % 6), 60); return () => clearInterval(t) }, [])
  React.useEffect(() => { const t = setInterval(() => { if (Math.random() < 0.06) { setGlitchLine(Math.floor(Math.random() * 16)); setTimeout(() => setGlitchLine(-1), 80) } }, 520); return () => clearInterval(t) }, [])

  const visibleRange = 4
  const itemSpacing = 140
  const iconSize = 132

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
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#050814',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
        filter: crtFlicker ? 'brightness(0.9) contrast(1.15)' : 'brightness(1)',
        transition: 'filter 0.06s',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1200px 600px at 60% 0%, rgba(100,0,180,0.28), transparent 60%), radial-gradient(900px 500px at 10% 30%, rgba(0,120,255,0.18), transparent 60%), radial-gradient(800px 500px at 90% 80%, rgba(0,255,180,0.10), transparent 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(transparent 0, transparent 33px, rgba(0,160,255,0.06) 34px), linear-gradient(90deg, transparent 0, transparent 39px, rgba(0,160,255,0.05) 40px)', backgroundSize: '100% 34px, 40px 100%', opacity: 0.35 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35, backgroundImage: 'radial-gradient(1px 1px at 8% 12%, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 23% 35%, rgba(200,220,255,0.8), transparent), radial-gradient(1px 1px at 74% 18%, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 61% 67%, rgba(200,220,255,0.7), transparent), radial-gradient(1px 1px at 90% 42%, rgba(255,255,255,0.7), transparent)' }} />

      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none', zIndex: 30 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px)', transform: `translateY(${scanlineOffset}px)`, opacity: 0.35, pointerEvents: 'none', zIndex: 31 }} />
      {glitchLine >= 0 && <div style={{ position: 'absolute', top: `${glitchLine * 6}%`, left: 0, right: 0, height: '2px', background: 'rgba(120,120,255,0.55)', zIndex: 32, pointerEvents: 'none' }} />}

      {particles.map(p => (
        <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: '5px', height: '5px', background: p.color, boxShadow: `0 0 10px ${p.color}`, pointerEvents: 'none', zIndex: 10 }} />
      ))}

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
          zIndex: 40,
          display: 'grid',
          gridTemplateColumns: '0.44fr 1.56fr',
          gap: 10,
        }}
      >
        <div
          onWheel={onWheel}
          style={{
            borderRadius: 18,
            border: '1px solid rgba(120,160,220,0.16)',
            background: 'linear-gradient(180deg, rgba(10,16,40,0.40), rgba(6,10,26,0.20))',
            boxShadow: 'inset 0 0 60px rgba(0,140,255,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(620px 360px at 35% 0%, rgba(0,160,255,0.09), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.70) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.70) 100%)' }} />

          <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
            <img
              src="../assets/thearcaders_logo.png"
              alt="The Arcaders"
              style={{
                width: '300px',
                maxWidth: '88%',
                height: 'auto',
                imageRendering: 'pixelated',
                opacity: 0.96,
                filter: 'drop-shadow(0 0 26px rgba(77,166,255,0.9)) drop-shadow(0 0 42px rgba(204,51,255,0.55))',
              }}
            />
          </div>

          <div style={{ position: 'absolute', left: 16, right: 16, top: '56%', transform: 'translateY(-50%)', height: 760 }}>
            <div style={{ position: 'absolute', left: 34, top: '50%', width: 8, height: iconSize, transform: 'translateY(-50%)', borderRadius: 999, background: `linear-gradient(180deg, transparent, ${accent}88, transparent)`, boxShadow: `0 0 22px ${accent}22` }} />

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
                      ? `0 0 0 1px rgba(0,0,0,0.7), 0 0 40px ${g.accent}30`
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

          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ color: 'rgba(190,220,255,0.55)', fontWeight: 900, letterSpacing: 1, fontSize: 11 }}>
              ↑/↓ (arriba/abajo) · SCROLL
            </div>
            <div style={{ color: accent, fontWeight: 950, letterSpacing: 1.1, fontSize: 11 }}>
              ENTER = PLAY
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${accent}33`,
            background: 'linear-gradient(180deg, rgba(10,16,40,0.55), rgba(6,10,26,0.30))',
            boxShadow: `0 0 34px ${accent}12, inset 0 0 70px ${accent}08`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(760px 420px at 70% 0%, ${accent}16, transparent 70%)`, pointerEvents: 'none' }} />

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
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 34%, rgba(0,0,0,0.86) 100%)' }} />
          </div>

          <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#e9f4ff', fontWeight: 950, letterSpacing: 1.2, fontSize: 28, textShadow: `0 0 18px ${accent}22`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {focusGame?.title ?? '—'}
                </div>
                <div style={{ marginTop: 8, color: 'rgba(200,230,255,0.72)', fontWeight: 800, letterSpacing: 1.2, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {focusGame?.tagline ?? ''}
                </div>
              </div>

              <button
                type="button"
                onClick={startSelected}
                style={{
                  cursor: 'pointer',
                  padding: '16px 26px',
                  borderRadius: 18,
                  border: `1px solid ${accent}60`,
                  background: `linear-gradient(180deg, ${accent}26, rgba(8,12,30,0.55))`,
                  color: '#e9f4ff',
                  fontWeight: 950,
                  letterSpacing: 1.6,
                  fontSize: 13,
                  boxShadow: `0 0 34px ${accent}18`,
                  fontFamily: 'inherit',
                  flex: '0 0 auto',
                }}
              >
                PLAY
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ color: 'rgba(190,220,255,0.55)', fontWeight: 900, letterSpacing: 1, fontSize: 11 }}>
                yalla (هيا) select & go
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}