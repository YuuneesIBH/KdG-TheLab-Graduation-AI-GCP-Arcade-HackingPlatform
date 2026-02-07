import React from 'react'

type GameLaunchProps = {
  gameId: string
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
  onBack: () => void
}

function formatTitle(gameId: string) {
  return gameId.replace(/-/g, ' ').toUpperCase()
}

export function GameLaunch({ gameId, particles, onBack }: GameLaunchProps) {
  const [progress, setProgress] = React.useState(0)
  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [pixelShift, setPixelShift] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const [coinBlink, setCoinBlink] = React.useState(false)

  const title = formatTitle(gameId)
  const ready = progress >= 100

  React.useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 2))
    }, 60)
    return () => clearInterval(progressInterval)
  }, [])

  React.useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() < 0.06) {
        setCrtFlicker(true)
        setTimeout(() => setCrtFlicker(false), 60)
      }
    }, 120)
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
      if (Math.random() < 0.12) {
        setGlitchLine(Math.floor(Math.random() * 20))
        setTimeout(() => setGlitchLine(-1), 100)
      }
    }, 300)
    return () => clearInterval(glitchInterval)
  }, [])

  React.useEffect(() => {
    const coinBlinkInterval = setInterval(() => {
      setCoinBlink(prev => !prev)
    }, 250)
    return () => clearInterval(coinBlinkInterval)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return (
    <div style={{
      background: 'linear-gradient(180deg, #001a40 0%, #000d1f 40%, #000510 70%, #000000 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '90px 40px 60px',
      fontFamily: '"Courier New", "Press Start 2P", monospace',
      position: 'relative',
      overflow: 'hidden',
      filter: crtFlicker
        ? 'brightness(0.75) contrast(1.25)'
        : 'brightness(1) contrast(1.1)',
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
          radial-gradient(1px 1px at 90% 60%, #00aaff, transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 150px 150px, 250px 250px, 180px 180px',
        backgroundPosition: '0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px',
        animation: 'starfield-drift 120s linear infinite',
        opacity: 0.4,
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px)
        `,
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.9) 100%)',
        pointerEvents: 'none',
        zIndex: 999
      }} />

      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          width: '8px',
          height: '8px',
          background: p.color,
          boxShadow: `0 0 12px ${p.color}`,
          pointerEvents: 'none'
        }} />
      ))}

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: `translateY(${scanlineOffset}px)`,
        opacity: 0.6
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
          zIndex: 1001
        }} />
      )}

      <div style={{
        position: 'absolute',
        top: '20px',
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
        zIndex: 5,
        boxShadow: '0 0 20px rgba(0,136,255,0.4), 0 6px 0 #001133'
      }}>
        <div style={{
          color: '#ffff00',
          textShadow: '0 0 10px #ffff00, 2px 2px 0 #002244',
          animation: 'pixel-pulse 1s ease-in-out infinite'
        }}>
          1UP 00000000
        </div>
        <div style={{
          color: '#00ff88',
          textShadow: '0 0 10px #00ff88, 2px 2px 0 #002244',
          animation: 'pixel-pulse 1s ease-in-out infinite 0.5s'
        }}>
          HI 999999
        </div>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: 'min(900px, 92vw)'
      }}>
        <div style={{
          border: '6px solid #0088ff',
          background: '#000814',
          boxShadow: `
            0 0 30px rgba(0,136,255,0.5),
            inset 0 0 20px rgba(0,136,255,0.2),
            6px 6px 0 rgba(0,0,0,0.6)
          `,
          padding: '6px'
        }}>
          <div style={{
            border: '4px solid #004488',
            background: 'linear-gradient(180deg, #001122, #000a14)',
            boxShadow: 'inset 0 0 30px rgba(0,68,136,0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(180deg, #0088ff, #0066cc)',
              borderBottom: '3px solid #00aaff',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              boxShadow: '0 3px 15px rgba(0,136,255,0.4)'
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
                ▓▒░ LAUNCH SEQUENCE ░▒▓
              </div>
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: 'linear-gradient(180deg, #00ff88, #00cc66)',
                  color: '#001122',
                  padding: '6px 16px',
                  border: '3px solid #00ff88',
                  fontSize: '16px',
                  fontWeight: 'black',
                  letterSpacing: '2px',
                  boxShadow: '0 0 15px rgba(0,255,136,0.5)',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                BACK
              </button>
            </div>

            <div style={{
              background: '#000000',
              padding: '28px',
              display: 'grid',
              gap: '22px'
            }}>
              <div style={{
                fontSize: '18px',
                color: '#00ccff',
                textShadow: '0 0 10px #00ccff',
                letterSpacing: '2px'
              }}>
                BOOTING CARTRIDGE
              </div>

              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #00ccff, 4px 4px 0 #002244',
                letterSpacing: '4px'
              }}>
                {title}
              </div>

              <div style={{
                border: '3px solid #0088ff',
                padding: '18px',
                background: 'rgba(0,20,40,0.6)',
                boxShadow: '0 0 15px rgba(0,136,255,0.3), inset 0 0 10px rgba(0,136,255,0.1)'
              }}>
                <div style={{
                  height: '26px',
                  background: '#001122',
                  border: '2px solid #002244',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #00ff88, #00ccff)',
                    boxShadow: '0 0 12px rgba(0,255,136,0.6)',
                    transition: 'width 0.08s'
                  }} />
                </div>
                <div style={{
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  letterSpacing: '2px',
                  color: '#00ccff',
                  textShadow: '0 0 8px #00ccff'
                }}>
                  <span>LOADING...</span>
                  <span style={{
                    color: ready ? '#00ff88' : '#00ccff',
                    textShadow: ready ? '0 0 15px #00ff88' : '0 0 8px #00ccff'
                  }}>
                    {progress}%
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '16px',
                  color: ready ? '#00ff88' : '#ffff00',
                  textShadow: ready ? '0 0 12px #00ff88' : '0 0 12px #ffff00',
                  letterSpacing: '3px',
                  animation: ready ? 'ready-pulse 0.6s ease-in-out infinite' : 'urgent-blink 0.8s infinite'
                }}>
                  {ready ? 'READY TO PLAY' : 'PREPARING SYSTEM'}
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    background: 'transparent',
                    color: '#ffffff',
                    border: '3px solid #00ccff',
                    padding: '10px 18px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    cursor: 'pointer',
                    textShadow: '0 0 10px #00ccff',
                    boxShadow: '0 0 15px rgba(0,204,255,0.4), inset 0 0 10px rgba(0,204,255,0.2)'
                  }}
                >
                  BACK TO MENU
                </button>
              </div>
            </div>

            <div style={{
              background: ready
                ? 'linear-gradient(180deg, #00ff88, #00cc66)'
                : 'linear-gradient(180deg, #0088ff, #0066cc)',
              borderTop: '4px solid #00aaff',
              padding: '16px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: ready
                ? '0 -3px 20px rgba(0,255,136,0.5)'
                : '0 -3px 20px rgba(0,136,255,0.5)'
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
                position: 'relative',
                zIndex: 1,
                fontSize: '22px',
                fontWeight: 'black',
                color: '#ffffff',
                letterSpacing: '4px',
                textShadow: '0 0 20px rgba(255,255,255,0.8), 3px 3px 0 #002244'
              }}>
                {ready ? 'SYSTEM ONLINE' : 'LOADING SYSTEM'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '13px',
        color: '#0088ff',
        letterSpacing: '2px',
        textShadow: '0 0 10px #0088ff',
        zIndex: 100
      }}>
        © 1992 THE ARCADERS • LICENSED NINTENDO • STEREO
      </div>

      <style>{`
        @keyframes pixel-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes urgent-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ready-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes stripe-move {
          from { transform: translateX(0); }
          to { transform: translateX(40px); }
        }
        @keyframes starfield-drift {
          from {
            backgroundPosition: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px;
          }
          to {
            backgroundPosition: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px;
          }
        }
      `}</style>
    </div>
  )
}
