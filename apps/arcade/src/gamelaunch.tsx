import React from 'react'
import { games } from './menu'

type GameLaunchProps = {
  gameId: string
  onBack: () => void
  onOpenDisplay: (gameId: string) => void
}

function formatTitle(gameId: string) {
  return gameId.replace(/-/g, ' ').toUpperCase()
}

export function GameLaunch({ gameId, onBack, onOpenDisplay }: GameLaunchProps) {
  const [isOpening, setIsOpening] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [pixelShift, setPixelShift] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const [scrollText, setScrollText] = React.useState(0)
  const [coinBlink, setCoinBlink] = React.useState(false)
  const [earthRotation, setEarthRotation] = React.useState(0)
  const [laserBeams, setLaserBeams] = React.useState<Array<{id: number, x: number, y: number}>>([])
  const [explosions, setExplosions] = React.useState<Array<{id: number, x: number, y: number}>>([])
  const [powerUps, setPowerUps] = React.useState<Array<{id: number, x: number, y: number, type: string, color: string}>>([])
  const [satellites, setSatellites] = React.useState<Array<{id: number, x: number, y: number, angle: number}>>([])
  const [particles, setParticles] = React.useState<Array<{id: number, x: number, y: number, vx: number, vy: number, color: string}>>([])

  const game = games.find((entry) => entry.id === gameId)
  const title = game ? game.title : formatTitle(gameId)
  const accent = game?.accent || '#00b7ff'

  const openDisplay = React.useCallback(() => {
    if (!game) {
      setErrorMessage('Game not found.')
      return
    }

    setIsOpening(true)
    setErrorMessage('')
    setTimeout(() => onOpenDisplay(game.id), 120)
  }, [game, onOpenDisplay])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack()
      }
      if (event.key === 'Enter' && !isOpening) {
        event.preventDefault()
        openDisplay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpening, onBack, openDisplay])

  // CRT flicker effect
  React.useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() < 0.03) {
        setCrtFlicker(true)
        setTimeout(() => setCrtFlicker(false), 60)
      }
    }, 100)
    return () => clearInterval(flickerInterval)
  }, [])

  // Scanline animation
  React.useEffect(() => {
    const scanlineInterval = setInterval(() => {
      setScanlineOffset(prev => (prev + 1) % 4)
    }, 50)
    return () => clearInterval(scanlineInterval)
  }, [])

  // Pixel shift glitch
  React.useEffect(() => {
    const shiftInterval = setInterval(() => {
      if (Math.random() < 0.05) {
        setPixelShift(Math.random() < 0.5 ? 2 : -2)
        setTimeout(() => setPixelShift(0), 50)
      }
    }, 200)
    return () => clearInterval(shiftInterval)
  }, [])

  // Glitch line
  React.useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        setGlitchLine(Math.floor(Math.random() * 20))
        setTimeout(() => setGlitchLine(-1), 100)
      }
    }, 300)
    return () => clearInterval(glitchInterval)
  }, [])

  // Scroll text animation
  React.useEffect(() => {
    const scrollInterval = setInterval(() => {
      setScrollText(prev => prev + 0.5)
    }, 30)
    return () => clearInterval(scrollInterval)
  }, [])

  // Coin blink
  React.useEffect(() => {
    const coinBlinkInterval = setInterval(() => {
      setCoinBlink(prev => !prev)
    }, 250)
    return () => clearInterval(coinBlinkInterval)
  }, [])

  // Earth rotation
  React.useEffect(() => {
    const rotateInterval = setInterval(() => {
      setEarthRotation(prev => (prev + 0.5) % 360)
    }, 100)
    return () => clearInterval(rotateInterval)
  }, [])

  // Satellites orbiting
  React.useEffect(() => {
    setSatellites([
      { id: 1, x: 0, y: 0, angle: 0 },
      { id: 2, x: 0, y: 0, angle: 120 },
      { id: 3, x: 0, y: 0, angle: 240 }
    ])

    const orbitInterval = setInterval(() => {
      setSatellites(prev => 
        prev.map(sat => ({
          ...sat,
          angle: (sat.angle + 1) % 360
        }))
      )
    }, 50)

    return () => clearInterval(orbitInterval)
  }, [])

  // Laser beams
  React.useEffect(() => {
    const shootLaser = () => {
      const newLaser = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: window.innerHeight
      }
      setLaserBeams(prev => [...prev, newLaser])
      
      setTimeout(() => {
        setLaserBeams(prev => prev.filter(l => l.id !== newLaser.id))
      }, 800)
    }

    const laserInterval = setInterval(() => {
      if (Math.random() < 0.4) shootLaser()
    }, 3000)

    return () => clearInterval(laserInterval)
  }, [])

  // Explosions
  React.useEffect(() => {
    const triggerExplosion = () => {
      const newExplosion = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.6
      }
      setExplosions(prev => [...prev, newExplosion])
      
      setTimeout(() => {
        setExplosions(prev => prev.filter(exp => exp.id !== newExplosion.id))
      }, 600)
    }

    const explosionInterval = setInterval(() => {
      if (Math.random() < 0.2) triggerExplosion()
    }, 4000)

    return () => clearInterval(explosionInterval)
  }, [])

  // Power-ups
  React.useEffect(() => {
    const types = [
      { type: 'SPEED', color: '#ffff00' },
      { type: 'POWER', color: '#ff00ff' },
      { type: 'SHIELD', color: '#00ffff' },
      { type: 'STAR', color: '#00ff00' }
    ]

    const spawnPowerUp = () => {
      const randomType = types[Math.floor(Math.random() * types.length)]
      const newPowerUp = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: -30,
        ...randomType
      }
      setPowerUps(prev => [...prev, newPowerUp])
    }

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.5) spawnPowerUp()
    }, 3000)

    const moveInterval = setInterval(() => {
      setPowerUps(prev => 
        prev
          .map(pu => ({ ...pu, y: pu.y + 2 }))
          .filter(pu => pu.y < window.innerHeight + 50)
      )
    }, 50)

    return () => {
      clearInterval(spawnInterval)
      clearInterval(moveInterval)
    }
  }, [])

  // Floating particles
  React.useEffect(() => {
    const colors = [accent, '#00ffff', '#ff00ff', '#ffff00', '#00ff00']
    
    const spawnParticle = () => {
      const newParticle = {
        id: Math.random(),
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      }
      setParticles(prev => [...prev.slice(-30), newParticle])
    }

    const spawnInterval = setInterval(spawnParticle, 200)

    const moveInterval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: (p.x + p.vx + window.innerWidth) % window.innerWidth,
          y: (p.y + p.vy + window.innerHeight) % window.innerHeight
        }))
      )
    }, 50)

    return () => {
      clearInterval(spawnInterval)
      clearInterval(moveInterval)
    }
  }, [accent])

  return (
    <div style={{
      background: 'linear-gradient(180deg, #001a40 0%, #000d1f 40%, #000510 70%, #000000 100%)',
      minHeight: '100vh',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      position: 'relative',
      overflow: 'hidden',
      filter: crtFlicker ? 'brightness(0.7) contrast(1.3)' : 'brightness(1) contrast(1.15)',
      transition: 'filter 0.06s',
      transform: `translateX(${pixelShift}px)`
    }}>
      {/* STARFIELD */}
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
        opacity: 0.4,
        pointerEvents: 'none'
      }} />

      {/* EARTH */}
      <div style={{
        position: 'absolute',
        right: '-15%',
        bottom: '-25%',
        width: '900px',
        height: '900px',
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 35% 35%,
            #0066cc 0%,
            #0044aa 25%,
            #003388 40%,
            #002266 55%,
            #001144 70%,
            #000822 85%,
            #000000 100%
          )
        `,
        border: '8px solid #0088ff',
        boxShadow: `
          inset -40px -40px 80px rgba(0,0,0,0.7),
          inset 40px 40px 60px rgba(0,136,255,0.3),
          0 0 100px rgba(0,136,255,0.5),
          0 0 200px rgba(0,100,200,0.3)
        `,
        opacity: 0.6,
        transform: `rotate(${earthRotation}deg)`,
        pointerEvents: 'none',
        zIndex: 100,
        imageRendering: 'pixelated'
      }}>
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '25%',
          width: '120px',
          height: '80px',
          background: '#00aa44',
          opacity: 0.7,
          clipPath: 'polygon(20% 0%, 80% 10%, 90% 50%, 70% 90%, 10% 80%, 0% 40%)',
          imageRendering: 'pixelated',
          filter: 'blur(2px)'
        }} />
        <div style={{
          position: 'absolute',
          top: '45%',
          left: '55%',
          width: '90px',
          height: '100px',
          background: '#00aa44',
          opacity: 0.7,
          clipPath: 'polygon(30% 0%, 100% 20%, 80% 70%, 40% 100%, 0% 60%)',
          imageRendering: 'pixelated',
          filter: 'blur(2px)'
        }} />
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          width: '60px',
          height: '50px',
          background: '#ffffff',
          opacity: 0.5,
          borderRadius: '50%',
          filter: 'blur(3px)'
        }} />
      </div>

      {/* SATELLITES */}
      {satellites.map(sat => {
        const radius = 550
        const centerX = window.innerWidth * 0.85 + radius * Math.cos(sat.angle * Math.PI / 180)
        const centerY = window.innerHeight * 0.75 + radius * Math.sin(sat.angle * Math.PI / 180)
        
        return (
          <div key={sat.id} style={{
            position: 'absolute',
            left: centerX,
            top: centerY,
            width: '40px',
            height: '40px',
            zIndex: 700,
            pointerEvents: 'none'
          }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '14px',
              width: '12px',
              height: '12px',
              background: '#888888',
              border: '2px solid #00ffff',
              boxShadow: '0 0 15px #00ffff'
            }} />
            <div style={{
              position: 'absolute',
              left: '0',
              top: '16px',
              width: '10px',
              height: '8px',
              background: '#0088ff',
              border: '1px solid #00aaff'
            }} />
            <div style={{
              position: 'absolute',
              right: '0',
              top: '16px',
              width: '10px',
              height: '8px',
              background: '#0088ff',
              border: '1px solid #00aaff'
            }} />
            <div style={{
              position: 'absolute',
              left: '18px',
              top: '6px',
              width: '2px',
              height: '8px',
              background: '#00ffff',
              boxShadow: '0 0 8px #00ffff'
            }} />
          </div>
        )
      })}

      {/* PARTICLES */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          width: '8px',
          height: '8px',
          background: p.color,
          boxShadow: `0 0 12px ${p.color}, 1px 1px 0 #000000`,
          pointerEvents: 'none',
          zIndex: 500
        }} />
      ))}

      {/* POWER-UPS */}
      {powerUps.map(pu => (
        <div key={pu.id} style={{
          position: 'absolute',
          left: pu.x,
          top: pu.y,
          width: '30px',
          height: '30px',
          zIndex: 720,
          pointerEvents: 'none',
          animation: 'float-rotate 2s ease-in-out infinite'
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            background: pu.color,
            border: '3px solid #000000',
            boxShadow: `0 0 20px ${pu.color}, inset 0 0 10px rgba(255,255,255,0.5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#000000'
          }}>
            {pu.type === 'STAR' ? '★' : pu.type[0]}
          </div>
        </div>
      ))}

      {/* EXPLOSIONS */}
      {explosions.map(exp => (
        <div key={exp.id} style={{
          position: 'absolute',
          left: exp.x - 50,
          top: exp.y - 50,
          width: 100,
          height: 100,
          zIndex: 850,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            inset: '20%',
            backgroundImage: `
              radial-gradient(circle,
                #ffffff 0%, #ffffff 15%,
                #ffff00 15%, #ffff00 30%,
                #ff8800 30%, #ff8800 50%,
                #ff0000 50%, #ff0000 65%,
                transparent 65%
              )
            `,
            animation: 'pixel-explode 0.6s ease-out forwards'
          }} />
        </div>
      ))}

      {/* LASERS */}
      {laserBeams.map(laser => (
        <div key={laser.id} style={{
          position: 'absolute',
          left: laser.x,
          bottom: 0,
          width: '3px',
          height: '100vh',
          background: `linear-gradient(180deg, transparent, ${accent} 20%, ${accent} 80%, transparent)`,
          boxShadow: `0 0 20px ${accent}, 0 0 40px ${accent}`,
          animation: 'laser-shoot 0.8s ease-out',
          pointerEvents: 'none',
          zIndex: 750
        }} />
      ))}

      {/* GRID BACKGROUND */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 3px, ${accent}11 3px, ${accent}11 4px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 3px, ${accent}11 3px, ${accent}11 4px)
        `,
        pointerEvents: 'none',
        transition: 'all 0.4s ease'
      }} />

      {/* VIGNETTE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.9) 100%)`,
        pointerEvents: 'none',
        zIndex: 999
      }} />

      {/* GLOW */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 100px ${accent}22, inset 0 0 50px ${accent}11`,
        pointerEvents: 'none',
        zIndex: 998,
        transition: 'all 0.4s ease'
      }} />

      {/* GRID FLOOR */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-30%',
        right: '-30%',
        height: '65%',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 38px, ${accent}aa 38px, ${accent}aa 41px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 58px, ${accent}88 58px, ${accent}88 61px)
        `,
        transform: 'perspective(350px) rotateX(68deg)',
        backgroundPosition: `0 ${(scrollText * 2.5) % 41}px`,
        opacity: 0.6,
        filter: 'blur(0.3px)',
        boxShadow: `0 -40px 100px ${accent}66, 0 -80px 150px ${accent}44`,
        animation: 'grid-pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
        transition: 'all 0.4s ease'
      }} />

      {/* HORIZON */}
      <div style={{
        position: 'absolute',
        top: '46%',
        left: '-5%',
        right: '-5%',
        height: '4px',
        background: `linear-gradient(90deg, transparent, ${accent}66 10%, ${accent} 30%, ${accent}ff 50%, ${accent} 70%, ${accent}66 90%, transparent)`,
        boxShadow: `0 0 30px ${accent}, 0 0 60px ${accent}88, 0 0 90px ${accent}44`,
        opacity: 0.85,
        animation: 'horizon-glow 2.5s ease-in-out infinite',
        pointerEvents: 'none',
        transition: 'all 0.4s ease'
      }} />

      {/* SCANLINES */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: `translateY(${scanlineOffset}px)`,
        opacity: 0.6
      }} />

      {/* GLITCH */}
      {glitchLine >= 0 && (
        <div style={{
          position: 'absolute',
          top: `${glitchLine * 5}%`,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(0,200,255,0.8)',
          mixBlendMode: 'screen',
          zIndex: 1001
        }} />
      )}

      {/* STATUS BAR */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: 0,
        right: 0,
        background: `linear-gradient(180deg, ${accent}, ${accent}dd)`,
        borderTop: `2px solid ${accent}`,
        borderBottom: `4px solid ${accent}44`,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '18px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        zIndex: 1300,
        boxShadow: `0 0 30px ${accent}, 0 6px 0 #001133`,
        transition: 'all 0.4s ease'
      }}>
        <div style={{
          color: '#ffff00',
          textShadow: '0 0 10px #ffff00, 2px 2px 0 #002244',
          animation: 'pixel-pulse 1s ease-in-out infinite'
        }}>
          PREPARE LAUNCH
        </div>
        <div style={{
          color: '#00ff88',
          textShadow: '0 0 10px #00ff88, 2px 2px 0 #002244',
          animation: 'pixel-pulse 1s ease-in-out infinite 0.5s'
        }}>
          SYSTEM READY
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
          border: `6px solid ${accent}`,
          background: '#000814',
          boxShadow: `0 0 40px ${accent}, inset 0 0 20px ${accent}33, 6px 6px 0 rgba(0,0,0,0.6)`,
          padding: '6px',
          transition: 'all 0.4s ease',
          animation: 'screen-pulse 3s ease-in-out infinite'
        }}>
          <div style={{
            border: `4px solid ${accent}88`,
            background: 'linear-gradient(180deg, #001122, #000a14)',
            boxShadow: `inset 0 0 30px ${accent}22`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.4s ease'
          }}>
            {/* TITLE BAR */}
            <div style={{
              background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
              borderBottom: `3px solid ${accent}`,
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              boxShadow: `0 3px 20px ${accent}66`,
              transition: 'all 0.4s ease'
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
                textShadow: `0 0 20px ${accent}, 3px 3px 0 #002244`,
                transition: 'all 0.4s ease',
                animation: 'text-glitch 5s infinite'
              }}>
                GAME LAUNCH
              </div>

              <button
                type="button"
                onClick={onBack}
                disabled={isOpening}
                style={{
                  background: isOpening ? '#444444' : '#1b1b1b',
                  color: '#ffffff',
                  padding: '6px 16px',
                  border: '3px solid #7a7a7a',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  boxShadow: '0 0 10px rgba(122,122,122,0.5)',
                  borderRadius: '2px',
                  cursor: isOpening ? 'default' : 'pointer',
                  opacity: isOpening ? 0.65 : 1,
                  transition: 'all 0.4s ease'
                }}
              >
                ESC
              </button>
            </div>

            {/* MAIN AREA */}
            <div style={{
              position: 'relative',
              flex: 1,
              background: '#000000',
              overflow: 'hidden',
              padding: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {game && (
                <img
                  src={game.image}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.15,
                    filter: 'saturate(0.8) contrast(0.9)',
                    imageRendering: 'pixelated',
                    pointerEvents: 'none'
                  }}
                />
              )}

              <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '900px',
                border: `6px solid ${accent}`,
                background: 'rgba(0, 8, 20, 0.95)',
                boxShadow: `0 0 0 3px #001122, 0 0 0 6px ${accent}, 0 0 40px ${accent}, 10px 10px 0 rgba(0,0,0,0.75)`,
                padding: '50px',
                display: 'grid',
                gap: '28px',
                animation: 'card-float 4s ease-in-out infinite'
              }}>
                {/* Corner decorations */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: '20px', height: '20px', background: accent, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: '20px', height: '20px', background: accent, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: '20px', height: '20px', background: accent, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, bottom: 0, width: '20px', height: '20px', background: accent, pointerEvents: 'none' }} />

                <div style={{
                  fontSize: '16px',
                  color: accent,
                  letterSpacing: '2px',
                  textShadow: `0 0 10px ${accent}`,
                  textAlign: 'center',
                  animation: 'text-flicker 2s infinite'
                }}>
                  INITIALIZING GAME DISPLAY
                </div>

                <div style={{
                  fontSize: '56px',
                  lineHeight: 1.1,
                  color: '#ffffff',
                  letterSpacing: '4px',
                  textShadow: `0 0 30px ${accent}, 6px 6px 0 #000000`,
                  fontFamily: '"Impact", "Arial Black", sans-serif',
                  textAlign: 'center',
                  animation: 'title-glow 2s ease-in-out infinite'
                }}>
                  {title}
                </div>

                {game && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      background: game.accent,
                      color: '#000000',
                      padding: '10px 16px',
                      border: '4px solid #000000',
                      fontSize: '14px',
                      letterSpacing: '1px',
                      boxShadow: `0 0 25px ${game.accent}, 3px 3px 0 #000814`,
                      fontWeight: 'bold',
                      animation: 'badge-pulse 1.5s ease-in-out infinite'
                    }}>
                      {game.badge}
                    </div>
                    <div style={{
                      background: '#000000',
                      color: game.accent,
                      padding: '10px 16px',
                      border: `4px solid ${game.accent}`,
                      fontSize: '14px',
                      letterSpacing: '2px',
                      boxShadow: `0 0 20px ${game.accent}`,
                      animation: 'badge-pulse 1.5s ease-in-out infinite 0.75s'
                    }}>
                      {game.genre}
                    </div>
                  </div>
                )}

                <div style={{
                  fontSize: '14px',
                  color: '#9fd8f3',
                  letterSpacing: '1px',
                  fontFamily: '"Courier New", monospace',
                  textAlign: 'center',
                  padding: '12px',
                  background: 'rgba(0,20,40,0.8)',
                  border: '2px solid #004488',
                  boxShadow: 'inset 0 0 20px rgba(0,136,255,0.3)'
                }}>
                  {game ? game.executable : 'Executable not configured'}
                </div>

                {errorMessage && (
                  <div style={{
                    border: '4px solid #ff5a5a',
                    background: 'rgba(60, 0, 0, 0.85)',
                    color: '#ffd0d0',
                    padding: '16px 20px',
                    fontSize: '14px',
                    boxShadow: '0 0 30px rgba(255,90,90,0.8), 4px 4px 0 #000000',
                    textAlign: 'center',
                    animation: 'error-shake 0.5s infinite'
                  }}>
                    ERROR: {errorMessage}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={isOpening}
                    style={{
                      background: '#000000',
                      color: '#ffffff',
                      border: '4px solid #7a7a7a',
                      padding: '18px 26px',
                      cursor: isOpening ? 'default' : 'pointer',
                      fontSize: '14px',
                      letterSpacing: '2px',
                      fontWeight: 'bold',
                      opacity: isOpening ? 0.65 : 1,
                      boxShadow: '0 0 20px rgba(122,122,122,0.5), 4px 4px 0 #000000',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOpening) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(122,122,122,0.8), 6px 6px 0 #000000'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(122,122,122,0.5), 4px 4px 0 #000000'
                    }}
                  >
                    BACK
                  </button>
                  <button
                    type="button"
                    onClick={openDisplay}
                    disabled={isOpening}
                    style={{
                      background: isOpening ? '#086b4f' : accent,
                      color: '#000000',
                      border: `4px solid ${isOpening ? '#00ff99' : accent}`,
                      padding: '18px 26px',
                      cursor: isOpening ? 'default' : 'pointer',
                      fontSize: '14px',
                      letterSpacing: '2px',
                      fontWeight: 'bold',
                      boxShadow: isOpening
                        ? '0 0 30px rgba(0,255,153,0.8), 4px 4px 0 #000000'
                        : `0 0 40px ${accent}, 6px 6px 0 #000000`,
                      flex: 1,
                      animation: isOpening ? 'button-loading 1s infinite' : 'button-ready 2s ease-in-out infinite',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOpening) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = `0 0 50px ${accent}, 8px 8px 0 #000000`
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = `0 0 40px ${accent}, 6px 6px 0 #000000`
                    }}
                  >
                    {isOpening ? 'OPENING DISPLAY...' : 'OPEN FULLSCREEN DISPLAY'}
                  </button>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#8bb8cc',
                  letterSpacing: '1px',
                  textAlign: 'center',
                  paddingTop: '12px',
                  borderTop: `3px solid ${accent}33`,
                  animation: 'text-flicker 3s infinite'
                }}>
                  Press ENTER to launch - ESC to go back
                </div>
              </div>
            </div>

            {/* FOOTER BAR */}
            <div style={{
              background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
              borderTop: `4px solid ${accent}`,
              padding: '18px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 -3px 25px ${accent}88`,
              transition: 'all 0.4s ease'
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
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: '4px',
                textShadow: '0 0 20px rgba(255,255,255,0.8), 4px 4px 0 #002244',
                position: 'relative',
                zIndex: 1,
                animation: 'footer-glow 2s ease-in-out infinite'
              }}>
                READY TO LAUNCH: {title}
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
            opacity: 0.6;
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
        @keyframes laser-shoot {
          0% { 
            transform: scaleY(0);
            transform-origin: bottom;
            opacity: 1;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
          100% { 
            transform: scaleY(1);
            opacity: 0;
          }
        }
        @keyframes pixel-explode {
          0% { 
            transform: scale(0.2); 
            opacity: 1;
          }
          100% { 
            transform: scale(2.5); 
            opacity: 0;
          }
        }
        @keyframes float-rotate {
          0%, 100% { 
            transform: translateY(0) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-10px) rotate(180deg) scale(1.1);
          }
        }
        @keyframes screen-pulse {
          0%, 100% {
            box-shadow: 0 0 40px var(--accent), inset 0 0 20px rgba(0,183,255,0.2), 6px 6px 0 rgba(0,0,0,0.6);
          }
          50% {
            box-shadow: 0 0 60px var(--accent), inset 0 0 30px rgba(0,183,255,0.3), 6px 6px 0 rgba(0,0,0,0.6);
          }
        }
        @keyframes text-glitch {
          0%, 90%, 100% { transform: translate(0, 0); }
          91% { transform: translate(-2px, 1px); }
          92% { transform: translate(2px, -1px); }
          93% { transform: translate(0, 0); }
        }
        @keyframes text-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes title-glow {
          0%, 100% {
            text-shadow: 0 0 30px var(--accent), 6px 6px 0 #000000;
          }
          50% {
            text-shadow: 0 0 50px var(--accent), 6px 6px 0 #000000;
          }
        }
        @keyframes badge-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes card-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes button-ready {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        @keyframes button-loading {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        @keyframes footer-glow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255,255,255,0.8), 4px 4px 0 #002244;
          }
          50% {
            text-shadow: 0 0 30px rgba(255,255,255,1), 4px 4px 0 #002244;
          }
        }
      `}</style>
    </div>
  )
}