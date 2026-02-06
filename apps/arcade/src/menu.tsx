import React from 'react'

type MenuProps = {
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
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
  glow: string
}

const games: GameCard[] = [
  {
    id: 'neon-runner',
    title: 'NEON RUNNER',
    genre: 'RACING',
    badge: 'NEW',
    tagline: 'Street sprint through the midnight skyline.',
    image: 'https://images.pexels.com/photos/7026427/pexels-photo-7026427.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#00c8ff',
    glow: '#00e5ff'
  },
  {
    id: 'pixel-blaster',
    title: 'PIXEL BLASTER',
    genre: 'SHOOTER',
    badge: 'HOT',
    tagline: 'Clear waves of enemies in pure arcade chaos.',
    image: 'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#00ff88',
    glow: '#9dff00'
  },
  {
    id: 'grid-fighter',
    title: 'GRID FIGHTER',
    genre: 'FIGHT',
    badge: 'VS',
    tagline: 'Combo battles on an electric retro grid.',
    image: 'https://images.pexels.com/photos/29096083/pexels-photo-29096083.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#ffcf00',
    glow: '#ffea00'
  },
  {
    id: 'retro-quest',
    title: 'RETRO QUEST',
    genre: 'RPG',
    badge: 'EPIC',
    tagline: 'Explore dungeons and hunt legendary loot.',
    image: 'https://images.pexels.com/photos/4835419/pexels-photo-4835419.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#ff5e9e',
    glow: '#ff8ac8'
  },
  {
    id: 'sky-raid',
    title: 'SKY RAID',
    genre: 'ARCADE',
    badge: 'CO-OP',
    tagline: 'Fly low, dodge fire, and own the horizon.',
    image: 'https://images.pexels.com/photos/22845394/pexels-photo-22845394.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#7dc6ff',
    glow: '#a8dcff'
  },
  {
    id: 'tank-rush',
    title: 'TANK RUSH',
    genre: 'STRATEGY',
    badge: 'BOSS',
    tagline: 'Armor up and push through heavy resistance.',
    image: 'https://images.pexels.com/photos/25626507/pexels-photo-25626507.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
    accent: '#00ffea',
    glow: '#7ffcf2'
  }
]

function wrapIndex(index: number, length: number) {
  return (index + length) % length
}

function getRelativeOffset(index: number, activeIndex: number, length: number) {
  let delta = index - activeIndex
  if (delta > length / 2) delta -= length
  if (delta < -length / 2) delta += length
  return delta
}

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [pixelShift, setPixelShift] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const [scrollText, setScrollText] = React.useState(0)
  const [coinBlink, setCoinBlink] = React.useState(false)

  const activeGame = games[activeIndex]
  const oneUpScore = (activeIndex + 1) * 10000
  const hiScore = 999999

  const goTo = React.useCallback((nextIndex: number) => {
    setActiveIndex(wrapIndex(nextIndex, games.length))
  }, [])

  const goPrev = React.useCallback(() => {
    setActiveIndex(prev => wrapIndex(prev - 1, games.length))
  }, [])

  const goNext = React.useCallback(() => {
    setActiveIndex(prev => wrapIndex(prev + 1, games.length))
  }, [])

  const startSelected = React.useCallback(() => {
    onSelectGame?.(games[activeIndex].id)
  }, [activeIndex, onSelectGame])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        startSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, startSelected])

  React.useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() < 0.03) {
        setCrtFlicker(true)
        setTimeout(() => setCrtFlicker(false), 60)
      }
    }, 100)
    return () => clearInterval(flickerInterval)
  }, [])

  React.useEffect(() => {
    const scanlineInterval = setInterval(() => {
      setScanlineOffset(prev => (prev + 1) % 4)
    }, 50)
    return () => clearInterval(scanlineInterval)
  }, [])

  React.useEffect(() => {
    const shiftInterval = setInterval(() => {
      if (Math.random() < 0.05) {
        setPixelShift(Math.random() < 0.5 ? 2 : -2)
        setTimeout(() => setPixelShift(0), 50)
      }
    }, 200)
    return () => clearInterval(shiftInterval)
  }, [])

  React.useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        setGlitchLine(Math.floor(Math.random() * 20))
        setTimeout(() => setGlitchLine(-1), 100)
      }
    }, 300)
    return () => clearInterval(glitchInterval)
  }, [])

  React.useEffect(() => {
    const scrollInterval = setInterval(() => {
      setScrollText(prev => prev + 0.5)
    }, 30)
    return () => clearInterval(scrollInterval)
  }, [])

  React.useEffect(() => {
    const coinBlinkInterval = setInterval(() => {
      setCoinBlink(prev => !prev)
    }, 250)
    return () => clearInterval(coinBlinkInterval)
  }, [])

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a1a2f 0%, #050b16 55%, #020306 100%)',
      minHeight: '100vh',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      position: 'relative',
      overflow: 'hidden',
      filter: crtFlicker ? 'brightness(0.72) contrast(1.25)' : 'brightness(1) contrast(1.1)',
      transition: 'filter 0.06s',
      transform: `translateX(${pixelShift}px)`
    }}>
      <div style={{
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
        opacity: 0.35,
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,136,255,0.05) 3px, rgba(0,136,255,0.05) 4px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,136,255,0.05) 3px, rgba(0,136,255,0.05) 4px)
        `,
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        inset: '8px',
        border: '6px solid #1f6fb4',
        boxShadow: 'inset 0 0 0 3px #0b2642, inset 0 0 0 7px #03101f, 8px 8px 0 rgba(0,0,0,0.7)',
        zIndex: 1180,
        pointerEvents: 'none'
      }} />
      <div style={{ position: 'absolute', left: '8px', top: '8px', width: '18px', height: '18px', background: '#1f6fb4', zIndex: 1181, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '8px', top: '8px', width: '18px', height: '18px', background: '#1f6fb4', zIndex: 1181, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '8px', bottom: '8px', width: '18px', height: '18px', background: '#1f6fb4', zIndex: 1181, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '8px', bottom: '8px', width: '18px', height: '18px', background: '#1f6fb4', zIndex: 1181, pointerEvents: 'none' }} />

      <div style={{
        position: 'absolute',
        bottom: '-18%',
        left: '-30%',
        right: '-30%',
        height: '64%',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 38px, #0099ff 38px, #0099ff 41px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 58px, #0066ff 58px, #0066ff 61px)
        `,
        transform: 'perspective(350px) rotateX(68deg)',
        backgroundPosition: `0 ${(scrollText * 2.5) % 41}px`,
        opacity: 0.58,
        filter: 'none',
        boxShadow: '0 -20px 0 rgba(0,70,140,0.35)',
        animation: 'grid-pulse 3s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        top: '46%',
        left: '-5%',
        right: '-5%',
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #0066ff 10%, #0099ff 30%, #00ccff 50%, #0099ff 70%, #0066ff 90%, transparent)',
        boxShadow: '0 0 0 2px rgba(0,102,190,0.45)',
        opacity: 0.85,
        animation: 'none',
        pointerEvents: 'none'
      }} />

      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
        width: '8px',
        height: '8px',
        background: p.color,
        boxShadow: '1px 1px 0 #000000',
        pointerEvents: 'none'
      }} />
      ))}

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.42) 0px, rgba(0,0,0,0.42) 2px, transparent 2px, transparent 4px)',
        pointerEvents: 'none',
        zIndex: 1200,
        transform: `translateY(${scanlineOffset}px)`,
        opacity: 0.75
      }} />

      {glitchLine >= 0 && (
        <div style={{
          position: 'absolute',
          top: `${glitchLine * 5}%`,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(0,200,255,0.8)',
          mixBlendMode: 'screen',
          zIndex: 1201
        }} />
      )}

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 52%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.92) 100%)',
        pointerEvents: 'none',
        zIndex: 1199
      }} />

      <div style={{
        position: 'absolute',
        top: '16px',
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, #0066cc, #004499)',
        borderTop: '2px solid #00aaff',
        borderBottom: '4px solid #002266',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '18px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        zIndex: 1300,
        boxShadow: '0 0 20px rgba(0,136,255,0.4), 0 6px 0 #001133'
      }}>
        <div style={{ color: '#ffff00', textShadow: '0 0 10px #ffff00, 2px 2px 0 #002244', animation: 'pixel-pulse 1s ease-in-out infinite' }}>
          1UP {String(oneUpScore).padStart(8, '0')}
        </div>
        <div style={{ color: '#00ff88', textShadow: '0 0 10px #00ff88, 2px 2px 0 #002244', animation: 'pixel-pulse 1s ease-in-out infinite 0.5s' }}>
          HI {String(hiScore).padStart(8, '0')}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '86px',
        paddingBottom: '56px'
      }}>
        <div style={{
          position: 'relative',
          width: 'min(1700px, 96vw)',
          height: 'min(940px, calc(100vh - 150px))',
          border: '6px solid #0088ff',
          background: '#000814',
          boxShadow: '0 0 30px rgba(0,136,255,0.45), inset 0 0 20px rgba(0,136,255,0.2), 8px 8px 0 rgba(0,0,0,0.75)',
          padding: '6px'
        }}>
          <div style={{
            border: '4px solid #004488',
            background: 'linear-gradient(180deg, #001122, #000a14)',
            boxShadow: 'inset 0 0 30px rgba(0,68,136,0.25)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              background: 'linear-gradient(180deg, #0088ff, #0066cc)',
              borderBottom: '3px solid #00aaff',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              boxShadow: '0 3px 15px rgba(0,136,255,0.35)'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                width: '12px',
                height: '12px',
                background: coinBlink ? '#ffff00' : '#666600',
                border: '2px solid #ffff00',
                boxShadow: coinBlink ? '0 0 15px #ffff00' : 'none'
              }} />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                background: coinBlink ? '#ffff00' : '#666600',
                border: '2px solid #ffff00',
                boxShadow: coinBlink ? '0 0 15px #ffff00' : 'none'
              }} />

              <div style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '4px',
                textShadow: '0 0 15px #00ccff, 3px 3px 0 #002244'
              }}>
                ▓▒░ GAME SELECT ░▒▓
              </div>

              <button
                type="button"
                onClick={startSelected}
                style={{
                  background: 'linear-gradient(180deg, #00ff88, #00cc66)',
                  color: '#001122',
                  padding: '6px 16px',
                  border: '3px solid #00ff88',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  boxShadow: '0 0 15px rgba(0,255,136,0.45)',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                START
              </button>
            </div>

            <div style={{
              position: 'relative',
              flex: 1,
              background: '#000000',
              overflow: 'hidden',
              padding: '14px',
              perspective: '1800px'
            }}>
              <img
                src={activeGame.image}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.2,
                  filter: 'saturate(0.95) contrast(0.95)',
                  imageRendering: 'pixelated',
                  pointerEvents: 'none'
                }}
              />

              {games.map((game, index) => {
                const rel = getRelativeOffset(index, activeIndex, games.length)
                const isCenter = rel === 0
                const isVisible = Math.abs(rel) <= 1
                const frameColor = isCenter ? game.accent : '#1a6db4'

                let transform = 'translate(-50%, -50%) scale(0.6)'
                let opacity = 0
                let zIndex = 10
                let pointerEvents: 'auto' | 'none' = 'none'
                let filter = 'brightness(0.7)'

                if (isCenter) {
                  transform = 'translate(-50%, -50%) translateX(0) scale(1) rotateY(0deg)'
                  opacity = 1
                  zIndex = 30
                  pointerEvents = 'auto'
                  filter = 'none'
                } else if (rel === -1) {
                  transform = 'translate(-50%, -50%) translateX(calc(-1 * min(500px, 30vw))) scale(0.78) rotateY(26deg) rotateZ(-1deg)'
                  opacity = 0.68
                  zIndex = 20
                  pointerEvents = 'auto'
                  filter = 'brightness(0.76)'
                } else if (rel === 1) {
                  transform = 'translate(-50%, -50%) translateX(min(500px, 30vw)) scale(0.78) rotateY(-26deg) rotateZ(1deg)'
                  opacity = 0.68
                  zIndex = 20
                  pointerEvents = 'auto'
                  filter = 'brightness(0.76)'
                }

                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (!isVisible) return
                      if (isCenter) return
                      goTo(index)
                    }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 'min(1420px, 86vw)',
                      height: 'min(760px, calc(100vh - 330px))',
                      border: `6px solid ${frameColor}`,
                      background: '#000814',
                      boxShadow: isCenter
                        ? `0 0 0 3px #001122, 0 0 0 6px ${frameColor}, 0 0 0 10px #000000, 10px 10px 0 rgba(0,0,0,0.75)`
                        : '0 0 0 3px #001122, 0 0 0 6px #1a6db4, 8px 8px 0 rgba(0,0,0,0.65)',
                      overflow: 'hidden',
                      transform,
                      opacity,
                      zIndex,
                      transition: 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.35s ease',
                      pointerEvents,
                      cursor: isCenter ? 'default' : 'pointer',
                      filter
                    }}
                  >
                    <img
                      src={game.image}
                      alt={game.title}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        imageRendering: 'pixelated',
                        pointerEvents: 'none'
                      }}
                    />

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.62) 62%, rgba(0,0,0,0.9) 100%)',
                      pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'absolute', left: 0, top: 0, width: '14px', height: '14px', background: frameColor, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: 0, top: 0, width: '14px', height: '14px', background: frameColor, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', left: 0, bottom: 0, width: '14px', height: '14px', background: frameColor, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: 0, bottom: 0, width: '14px', height: '14px', background: frameColor, pointerEvents: 'none' }} />

                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        background: game.accent,
                        color: '#001122',
                        padding: '7px 12px',
                        border: '2px solid rgba(0,0,0,0.65)',
                        fontSize: '12px',
                        letterSpacing: '1px',
                        boxShadow: '2px 2px 0 #000814'
                      }}>
                        {game.badge}
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.65)',
                        color: game.accent,
                        padding: '7px 12px',
                        border: `2px solid ${game.accent}`,
                        fontSize: '12px',
                        letterSpacing: '2px'
                      }}>
                        {game.genre}
                      </div>
                    </div>

                    <div style={{
                      position: 'absolute',
                      left: '32px',
                      right: '32px',
                      bottom: '32px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      gap: '20px'
                    }}>
                      <div style={{ maxWidth: '72%' }}>
                        <div style={{
                          fontSize: 'clamp(42px, 5vw, 78px)',
                          lineHeight: '1.03',
                          color: '#ffffff',
                          letterSpacing: '3px',
                          textShadow: '4px 4px 0 #000814',
                          fontFamily: '"Impact", "Arial Black", sans-serif'
                        }}>
                          {game.title}
                        </div>
                        <div style={{
                          marginTop: '12px',
                          fontSize: '13px',
                          color: '#d8f7ff',
                          letterSpacing: '1px'
                        }}>
                          {game.tagline}
                        </div>
                      </div>

                      {isCenter ? (
                        <button
                          type="button"
                          onClick={startSelected}
                          style={{
                            background: game.accent,
                            color: '#001122',
                            border: '4px solid #001122',
                            padding: '16px 22px',
                            fontSize: '14px',
                            letterSpacing: '2px',
                            cursor: 'pointer',
                            boxShadow: '4px 4px 0 #000000'
                          }}
                        >
                          PLAY NOW
                        </button>
                      ) : (
                        <div style={{
                          background: 'rgba(0,0,0,0.6)',
                          color: game.accent,
                          border: `2px solid ${game.accent}`,
                          padding: '11px 14px',
                          fontSize: '11px',
                          letterSpacing: '2px',
                          boxShadow: '3px 3px 0 #000000'
                        }}>
                          VIEW
                        </div>
                      )}
                    </div>

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 3px)',
                      pointerEvents: 'none',
                      opacity: 0.35
                    }} />
                  </div>
                )
              })}

              <button
                type="button"
                onClick={goPrev}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '18px',
                  transform: 'translateY(-50%)',
                  zIndex: 1400,
                  width: '66px',
                  height: '66px',
                  borderRadius: '0',
                  border: `4px solid ${activeGame.accent}`,
                  background: 'rgba(0,10,25,0.92)',
                  color: activeGame.accent,
                  fontSize: '34px',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0 #000000',
                  imageRendering: 'pixelated'
                }}
                aria-label="Previous game"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={goNext}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '18px',
                  transform: 'translateY(-50%)',
                  zIndex: 1400,
                  width: '66px',
                  height: '66px',
                  borderRadius: '0',
                  border: `4px solid ${activeGame.accent}`,
                  background: 'rgba(0,10,25,0.92)',
                  color: activeGame.accent,
                  fontSize: '34px',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0 #000000',
                  imageRendering: 'pixelated'
                }}
                aria-label="Next game"
              >
                ›
              </button>

              <div style={{
                position: 'absolute',
                left: '50%',
                bottom: '16px',
                transform: 'translateX(-50%)',
                zIndex: 1400,
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.5)',
                border: '3px solid #0088ff',
                padding: '8px 12px',
                boxShadow: '4px 4px 0 #000000',
                imageRendering: 'pixelated'
              }}>
                {games.map((game, index) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => goTo(index)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '0',
                      border: `2px solid ${index === activeIndex ? game.accent : '#2f6da6'}`,
                      background: index === activeIndex ? game.accent : '#00152b',
                      boxShadow: index === activeIndex ? '2px 2px 0 #000000' : 'none',
                      cursor: 'pointer',
                      imageRendering: 'pixelated'
                    }}
                    aria-label={`Show ${game.title}`}
                  />
                ))}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(180deg, #0088ff, #0066cc)',
              borderTop: '4px solid #00aaff',
              padding: '16px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 -3px 20px rgba(0,136,255,0.5)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.2) 20px, rgba(0,0,0,0.2) 40px)',
                animation: 'stripe-move 2s linear infinite',
                opacity: 0.4,
                pointerEvents: 'none'
              }} />
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: '3px',
                textShadow: '0 0 20px rgba(255,255,255,0.8), 3px 3px 0 #002244',
                position: 'relative',
                zIndex: 1
              }}>
                ★ SELECTED: {activeGame.title} ★
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pixel-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes stripe-move {
          from { transform: translateX(0); }
          to { transform: translateX(40px); }
        }
        @keyframes starfield-drift {
          from {
            background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px;
          }
          to {
            background-position: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px, 200px 380px, 90px 420px;
          }
        }
        @keyframes grid-pulse {
          0%, 100% {
            opacity: 0.58;
            box-shadow: 0 -40px 100px rgba(0,136,255,0.4), 0 -80px 150px rgba(0,102,255,0.3);
          }
          50% {
            opacity: 0.75;
            box-shadow: 0 -40px 120px rgba(0,136,255,0.5), 0 -80px 180px rgba(0,102,255,0.4);
          }
        }
        @keyframes horizon-glow {
          0%, 100% {
            box-shadow: 0 0 30px #0088ff, 0 0 60px #0066ff, 0 0 90px rgba(0,136,255,0.3);
          }
          50% {
            box-shadow: 0 0 40px #00aaff, 0 0 80px #0088ff, 0 0 120px rgba(0,136,255,0.5);
          }
        }
      `}</style>
    </div>
  )
}
