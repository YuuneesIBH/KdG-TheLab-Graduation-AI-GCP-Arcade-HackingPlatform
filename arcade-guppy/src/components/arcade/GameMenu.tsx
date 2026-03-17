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

const isActionKey = (key: string) => ['enter', ' ', 'spacebar', 'w', 'x', 'c', 'v', 'b', 'n'].includes(key.toLowerCase())

const games: GameCard[] = [
  { id: 'pong', title: 'PONG', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Classic pong game.', image: '../assets/pong.png', accent: '#00ccff', executable: 'games/pong.py', difficulty: '★☆☆', players: '2P', year: '1972' },
  { id: 'pac-man', title: 'PAC-MAN', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Eat all pellets and dodge the ghosts.', image: '../assets/TrollPacMan.png', accent: '#ffde00', executable: 'games/PacMan/pacman.py', difficulty: '★★☆', players: '1P', year: '1980' },
  { id: 'flappy-bird', title: 'RETRO BIRD', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Tap to flap and dodge the pipes!', image: '../assets/retrobird.png', accent: '#ff00aa', executable: 'games/RetroBird/main.py', difficulty: '★★★', players: '1P', year: '2013' },
  { id: 'mario-nes', title: 'Pixel Quest Adventure', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Spring door de klassieke levels en versla Bowser!', image: '../assets/pixelquest_adventure.png', accent: '#ff2e2e', executable: 'games/SuperMarioNES/Mario.jar', difficulty: '★★☆', players: '1P', year: '1985' },
  { id: 'car-racing-extreme', title: 'EXTREME RACING', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Adrenaline at high speed!', image: '../assets/extremeracing.png', accent: '#ff6600', executable: 'games/CarRacingUltraMaxExtremeLevel1000/main.py', difficulty: '★★★', players: '1P', year: '1992' },
  { id: 'block-storm', title: 'BLOCK STORM', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Arrange falling blocks to clear lines.', image: '../assets/blockstorm.png', accent: '#ffff00', executable: 'games/BlockStorm/main.py', difficulty: '★☆☆', players: '1P', year: '1984' },
  { id: 'retro-race-game', title: 'RETRO RACE', genre: 'CONSOLE', badge: 'CONSOLE', tagline: 'Classic pseudo-3D race action in Java.', image: '../assets/retroracinggame.png', accent: '#44bbff', executable: 'games/RetroRaceGame/RetroRaceGame.jar', difficulty: '★★☆', players: '1P', year: '2024' },
  { id: 'angry-walls', title: 'ANGRY WALLS', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Explore dungeons and hunt loot.', image: '../assets/angrywalls.png', accent: '#aa44ff', executable: 'games/AngryWalls/main.py', difficulty: '★★☆', players: '1P', year: '1996' },
  { id: 'elemental-clash', title: 'ELEMENTAL CLASH', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Arcane duel between warrior and wizard.', image: '../assets/elementalclash.png', accent: '#ff5500', executable: 'games/ElementalClash/src/main.py', difficulty: '★★★', players: '2P', year: '2025' },
  { id: 'space-invader', title: 'SPACE INVADER', genre: 'ARCADE', badge: 'ARCADE', tagline: 'Defend Earth from the alien invasion!', image: '../assets/spaceinvaders.png', accent: '#00ff88', executable: 'games/spaceinvaders.py', difficulty: '★★☆', players: '1P', year: '1978' },
  { id: 'emulator', title: 'EMULATOR', genre: 'SYSTEM', badge: 'EMULATOR', tagline: 'Start de ingebouwde MAME emulator.', image: '../assets/emulator.png', accent: '#4de0ff', executable: 'games/Mame_Emulator/mame.exe', difficulty: '★★★', players: 'Multi', year: '1997' },
]

export { games }

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  const [selectedId, setSelectedId] = React.useState<string>(games[0]?.id ?? '')

  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const gamepadDirRef = React.useRef(0)
  const gamepadFireRef = React.useRef(false)
  const gamepadLastFireRef = React.useRef(0)
  const lastStartRef = React.useRef(0)
  const activeGamepadIndexRef = React.useRef<number | null>(null)
  const gamepadStartArmedRef = React.useRef(false)
  const menuMountedAtRef = React.useRef(Date.now())
  const [isLaunching, setIsLaunching] = React.useState(false)

  const list = games

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

  const selectedIndex = React.useMemo(() => {
    const i = list.findIndex(g => g.id === selectedId)
    return i >= 0 ? i : 0
  }, [list, selectedId])

  React.useEffect(() => {
    if (!list.some(g => g.id === selectedId)) setSelectedId(list[0]?.id ?? '')
  }, [list.length])

  const focusId = selectedId
  const focusGame = React.useMemo(() => list.find(g => g.id === focusId) ?? list[0], [list, focusId])

  const accent = focusGame?.accent ?? '#00ccff'

  const launchGame = React.useCallback((targetId: string | null) => {
    if (!targetId) return
    if (isLaunching) return
    const now = Date.now()
    if (now - lastStartRef.current < 800) return
    lastStartRef.current = now
    setIsLaunching(true)
    setSelectedId(targetId)
    onSelectGame?.(targetId)

    // small window to block double fire
    window.setTimeout(() => setIsLaunching(false), 700)
  }, [isLaunching, onSelectGame])

  const startSelected = React.useCallback(() => {
    launchGame(selectedId)
  }, [launchGame, selectedId])

  const wrapIndex = React.useCallback((i: number, len: number) => {
    if (len <= 0) return 0
    return (i % len + len) % len
  }, [])

  const moveSelection = React.useCallback((dir: number) => {
    if (!list.length) return
    const ni = wrapIndex(selectedIndex + dir, list.length)
    const target = list[ni]
    if (target) {
      setSelectedId(target.id)
    }
  }, [list, selectedIndex, wrapIndex])

  React.useEffect(() => {
    menuMountedAtRef.current = Date.now()
    gamepadStartArmedRef.current = false
    gamepadFireRef.current = false
    gamepadDirRef.current = 0
  }, [])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1) }
      if (isActionKey(e.key) || e.code === 'NumpadEnter') { e.preventDefault(); startSelected() }
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

  React.useEffect(() => {
    let raf = 0

    const poll = () => {
      const pads = Array.from(navigator.getGamepads?.() ?? [])
        .filter((g): g is Gamepad => Boolean(g && g.connected))
        .sort((a, b) => a.index - b.index)

      // keep active index if still present, otherwise smallest index
      if (activeGamepadIndexRef.current === null || !pads.some((p) => p.index === activeGamepadIndexRef.current)) {
        activeGamepadIndexRef.current = pads[0]?.index ?? null
      }

      // allow pad that moves/presses first to claim control
      for (const p of pads) {
        const axisMoved = Math.abs(p.axes[1] ?? 0) > 0.35 || Math.abs(p.axes[0] ?? 0) > 0.35
        const buttonPressed = p.buttons?.some((b) => b?.pressed)
        if (axisMoved || buttonPressed) {
          activeGamepadIndexRef.current = p.index
          break
        }
      }

      const gamepad = pads.find((p) => p.index === activeGamepadIndexRef.current)
      if (gamepad) {
        const axisY = gamepad.axes[1] ?? 0
        const pressed = (btn: number) => Boolean(gamepad.buttons[btn]?.pressed)

        const dir = axisY < -0.55 || pressed(12)
          ? -1
          : axisY > 0.55 || pressed(13)
            ? 1
            : 0

        if (dir !== 0 && gamepadDirRef.current === 0) {
          moveSelection(dir)
        }

        gamepadDirRef.current = dir

        const fire = pressed(0) || pressed(9) // A of START
        const now = Date.now()
        // Ignore held start/select from boot screen until we see a clean release.
        if (!gamepadStartArmedRef.current) {
          if (!fire && now - menuMountedAtRef.current > 220) {
            gamepadStartArmedRef.current = true
          }
          gamepadFireRef.current = fire
          raf = requestAnimationFrame(poll)
          return
        }

        if (dir === 0 && fire && !gamepadFireRef.current && now - gamepadLastFireRef.current > 400) {
          startSelected()
          gamepadLastFireRef.current = now
        }
        gamepadFireRef.current = fire
      }
      raf = requestAnimationFrame(poll)
    }

    poll()
    return () => cancelAnimationFrame(raf)
  }, [moveSelection, startSelected])

  const visibleRange = 4
  const itemSpacing = 140
  const iconSize = 132

  const infoScale = 2.5
  const titleFont = Math.round(34 * infoScale)
  const taglineFont = Math.round(17 * infoScale)
  const playFont = Math.round(15 * infoScale)

  const titleGlow = Math.round(18 * infoScale)
  const titleOffset = Math.round(3 * infoScale)
  const taglineGlow = Math.round(10 * infoScale)

  const playPadY = Math.round(18 * infoScale)
  const playPadX = Math.round(30 * infoScale)
  const playBorder = Math.max(3, Math.round(3 * infoScale))
  const playShadow = Math.round(28 * infoScale)

  const barHeight = Math.round(6 * infoScale)
  const barGlow = Math.round(26 * infoScale)

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
          filter: crtFlicker ? 'brightness(1.18) contrast(1.14)' : 'brightness(1.36) contrast(1.08)',
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
            opacity: 0.62,
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
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(0,0,0,0.28) 88%, rgba(0,0,0,0.62) 100%)',
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
            opacity: 0.28,
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
              background: '#06132a',
              boxShadow: '0 0 32px rgba(0,136,255,0.55), inset 0 0 22px rgba(0,136,255,0.24), 6px 6px 0 rgba(0,0,0,0.5)',
                padding: 6,
                borderRadius: 18,
                height: '100%',
              }}
            >
              <div
                style={{
              border: '4px solid #004488',
              background: 'linear-gradient(180deg, #0a2040, #021020)',
              boxShadow: 'inset 0 0 34px rgba(0,68,136,0.36)',
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
                    const isFocus = g.id === selectedId
                    const isSelected = g.id === selectedId

                    return (
                      <div
                        key={g.id}
                        onMouseEnter={() => setSelectedId(g.id)}
                        onClick={() => setSelectedId(g.id)}
                        onDoubleClick={() => launchGame(g.id)}
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
                          filter: isFocus ? 'brightness(1.24) saturate(1.16)' : 'brightness(1.04) saturate(1)',
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

              </div>
            </div>
          </div>

          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
              border: '6px solid #0088ff',
              background: '#06132a',
              boxShadow: '0 0 32px rgba(0,136,255,0.55), inset 0 0 22px rgba(0,136,255,0.24), 6px 6px 0 rgba(0,0,0,0.5)',
                padding: 6,
                borderRadius: 18,
                height: '100%',
              }}
            >
              <div
                style={{
              border: '4px solid #004488',
              background: 'linear-gradient(180deg, #0a2040, #021020)',
              boxShadow: 'inset 0 0 34px rgba(0,68,136,0.36)',
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
                      filter: 'brightness(1.42) saturate(1.08)',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, transparent 48%, rgba(0,0,0,0.56) 100%)' }} />
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
                          color: 'rgba(200,230,255,0.9)',
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
                    boxShadow: `0 0 ${playShadow}px ${accent}33`,
                        fontFamily: 'inherit',
                        flex: '0 0 auto',
                        textShadow: `${Math.round(2 * infoScale)}px ${Math.round(2 * infoScale)}px 0 rgba(0,0,0,0.6)`,
                      }}
                    >
                      PLAY
                    </button>
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
