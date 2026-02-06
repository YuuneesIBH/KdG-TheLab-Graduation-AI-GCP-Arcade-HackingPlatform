import React from 'react'

type MenuProps = {
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
  onSelectGame?: (gameId: string) => void
}

const games = [
  { id: 'neon-runner', title: 'NEON RUNNER', genre: 'RACING', badge: 'NEW', color: '#00ffff', glow: '#00e5ff' },
  { id: 'pixel-blaster', title: 'PIXEL BLASTER', genre: 'SHOOTER', badge: 'HOT', color: '#ff00ff', glow: '#ff3cff' },
  { id: 'grid-fighter', title: 'GRID FIGHTER', genre: 'FIGHT', badge: 'VS', color: '#ffff00', glow: '#ffe400' },
  { id: 'retro-quest', title: 'RETRO QUEST', genre: 'RPG', badge: 'EPIC', color: '#00ff00', glow: '#00d455' },
  { id: 'sky-raid', title: 'SKY RAID', genre: 'ARCADE', badge: 'CO-OP', color: '#ff0080', glow: '#ff3a9d' },
  { id: 'tank-rush', title: 'TANK RUSH', genre: 'STRATEGY', badge: 'BOSS', color: '#80ff00', glow: '#b7ff3a' }
]

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  return (
    <div style={{ 
      background: 'radial-gradient(circle at 50% 40%, #1c0030, #050008 55%, #000000)',
      minHeight: '100vh',
      margin: 0,
      padding: '0',
      fontFamily: '"Courier New", monospace',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* SCANLINES */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 3px, transparent 3px, transparent 6px)',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'scanline-drift 8s linear infinite'
      }} />
      {/* SOFT NEON HAZE */}
      <div style={{
        position: 'absolute',
        inset: '-10%',
        background: 'radial-gradient(circle at 20% 30%, rgba(255,0,140,0.12), transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,255,255,0.12), transparent 50%)',
        animation: 'haze-drift 12s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      {/* DOT MATRIX */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '8px 8px',
        opacity: 0.35,
        pointerEvents: 'none',
        zIndex: 2
      }} />
      {/* CRT CURVE + VIGNETTE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.85) 100%)',
        pointerEvents: 'none',
        zIndex: 999
      }} />
      {/* VHS NOISE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
        mixBlendMode: 'screen',
        opacity: 0.25,
        pointerEvents: 'none',
        zIndex: 998
      }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          width: '10px',
          height: '10px',
          background: p.color,
          boxShadow: `0 0 15px ${p.color}`,
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />
      ))}
      
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto'
      }}>
        {/* MARQUEE HEADER */}
        <div style={{
          padding: '14px 28px 10px',
          borderBottom: '8px solid #fff',
          background: 'linear-gradient(180deg, #b10000, #ff3300, #ff9900)',
          boxShadow: '0 10px 30px rgba(255,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Bulb row */}
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={`bulb-top-${i}`} style={{
              position: 'absolute',
              bottom: '6px',
              left: `${i * 3.57}%`,
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: ['#fff', '#ffff00', '#ff0000'][(i + 2) % 3],
              boxShadow: `0 0 10px ${['#fff', '#ffff00', '#ff0000'][(i + 2) % 3]}`,
              opacity: 0.9,
              animation: 'bulb-blink 0.6s infinite',
              animationDelay: `${i * 0.05}s`
            }} />
          ))}
          {/* 90s chrome strips */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '6px',
            height: '6px',
            background: 'linear-gradient(90deg, transparent, #fff, transparent)',
            opacity: 0.7
          }} />
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '26px',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #ffff00, transparent)',
            opacity: 0.7
          }} />
          <div style={{
            fontSize: '46px',
            color: '#ffff00',
            textShadow: '0 0 30px #ffff00, 0 0 60px #ff9900, 6px 6px 0 #000',
            letterSpacing: '10px',
            animation: 'title-glitch 5s ease-in-out infinite',
            whiteSpace: 'nowrap',
            zIndex: 2
          }}>
            ▓▓ GAME SELECT ▓▓
          </div>
          <div style={{
            fontSize: '18px',
            color: '#fff',
            textShadow: '0 0 15px #fff, 3px 3px 0 #000',
            letterSpacing: '4px',
            zIndex: 2
          }}>
            CLICK A BANNER TO START
          </div>
        </div>

        {/* CABINET FRAME */}
        <div style={{
          padding: '18px',
          background: 'linear-gradient(180deg, #2a003b, #0b0013)',
          borderTop: '6px solid #111',
          borderBottom: '6px solid #111',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Side panels */}
          {['left', 'right'].map(side => (
            <div key={side} style={{
              position: 'absolute',
              top: '16px',
              bottom: '16px',
              [side]: '12px',
              width: '84px',
              background: 'linear-gradient(180deg, #22002a, #120018)',
              border: '4px solid #000',
              boxShadow: 'inset 0 0 20px rgba(255,0,255,0.3)',
              display: 'grid',
              gap: '14px',
              padding: '14px',
              zIndex: 2
            }}>
              <div style={{
                height: '52px',
                background: 'linear-gradient(180deg, #ff0000, #990000)',
                borderRadius: '6px',
                border: '3px solid #000',
                boxShadow: '0 0 12px #ff0000'
              }} />
              <div style={{
                height: '36px',
                background: 'linear-gradient(180deg, #ffff00, #aa8800)',
                borderRadius: '6px',
                border: '3px solid #000',
                boxShadow: '0 0 12px #ffff00'
              }} />
              <div style={{
                height: '80px',
                borderRadius: '6px',
                border: '3px solid #000',
                background: 'linear-gradient(180deg, #00ffff, #0088aa)',
                boxShadow: '0 0 12px #00ffff'
              }} />
            </div>
          ))}

          <div style={{
            border: '10px solid #111',
            boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.8)',
            background: 'linear-gradient(180deg, #120018, #050008)',
            padding: '18px',
            margin: '0 108px',
            position: 'relative'
          }}>
            {/* Bezel corners */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
              <div key={corner} style={{
                position: 'absolute',
                [corner.includes('top') ? 'top' : 'bottom']: '-6px',
                [corner.includes('left') ? 'left' : 'right']: '-6px',
                width: '18px',
                height: '18px',
                background: '#ffcc00',
                border: '3px solid #000',
                boxShadow: '0 0 12px #ffcc00'
              }} />
            ))}
            <div
              className="menu-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(280px, 1fr))',
                gap: '18px',
                alignItems: 'stretch',
                maxWidth: '1500px',
                width: '100%',
                margin: '0 auto'
              }}
            >
          {games.map(game => (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelectGame?.(game.id)}
              className="arcade-card"
              style={{
                cursor: 'pointer',
                border: `5px solid ${game.color}`,
                background: 'linear-gradient(180deg, #0b0018, #050010)',
                boxShadow: `0 0 25px ${game.color}, inset 0 0 25px rgba(0,0,0,0.7), 6px 6px 0 rgba(0,0,0,0.6)`,
                padding: '0',
                textAlign: 'left',
                minHeight: '260px',
                color: '#ffffff',
                position: 'relative',
                transition: 'transform 0.12s, box-shadow 0.12s',
                display: 'grid',
                gridTemplateRows: 'auto 1fr auto',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
                e.currentTarget.style.boxShadow = `0 0 45px ${game.color}, inset 0 0 25px rgba(0,0,0,0.6)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = `0 0 25px ${game.color}, inset 0 0 20px rgba(0,0,0,0.6)`
              }}
            >
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: game.color,
                color: '#000',
                fontWeight: 'bold',
                padding: '4px 8px',
                border: '2px solid #000',
                boxShadow: `0 0 15px ${game.color}`,
                letterSpacing: '2px',
                zIndex: 2
              }}>
                {game.badge}
              </div>

              {/* Banner art area */}
              <div style={{
                height: '120px',
                background: `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), radial-gradient(circle at 20% 30%, ${game.glow}, transparent 60%)`,
                borderBottom: `3px solid ${game.color}`,
                boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.6)`,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  bottom: '14px',
                  fontSize: '26px',
                  fontWeight: 'bold',
                  letterSpacing: '4px',
                  textShadow: `0 0 15px ${game.color}, 3px 3px 0 #000`
                }}>
                  {game.title}
                </div>
                <div style={{
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  top: '0',
                  height: '100%',
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 4px)',
                  opacity: 0.5,
                  pointerEvents: 'none'
                }} />
              </div>

              {/* Body */}
              <div style={{
                padding: '16px 18px',
                display: 'grid',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#00ffff',
                  letterSpacing: '3px'
                }}>
                  GENRE
                </div>
                <div style={{
                  fontSize: '18px',
                  color: game.color,
                  letterSpacing: '3px'
                }}>
                  {game.genre}
                </div>
                <div style={{
                  marginTop: '6px',
                  height: '6px',
                  background: 'rgba(0,0,0,0.7)',
                  border: `1px solid ${game.color}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: '45%',
                    background: `linear-gradient(90deg, ${game.color}, ${game.glow})`,
                    boxShadow: `0 0 10px ${game.color}`
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 18px',
                borderTop: `3px solid ${game.color}`,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.8))',
                fontSize: '14px',
                color: '#00ffff',
                letterSpacing: '2px',
                textAlign: 'right'
              }}>
                ▶ START
              </div>
              {/* Sweep glow */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.08) 45%, transparent 60%)',
                animation: 'card-sweep 3.5s linear infinite',
                pointerEvents: 'none'
              }} />
            </button>
          ))}
            </div>
          </div>
        </div>

        {/* CONTROL DECK */}
        <div style={{
          padding: '14px 28px 18px',
          color: '#00ffff',
          fontSize: '14px',
          letterSpacing: '3px',
          textShadow: '0 0 12px #00ffff, 2px 2px 0 #000',
          borderTop: '6px solid #ff00ff',
          background: 'linear-gradient(180deg, #3b001a, #120008)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff0000, #880000)',
              border: '4px solid #000',
              boxShadow: '0 0 15px #ff0000'
            }} />
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #00ffff, #0088aa)',
              border: '4px solid #000',
              boxShadow: '0 0 15px #00ffff'
            }} />
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ffff00, #aa8800)',
              border: '4px solid #000',
              boxShadow: '0 0 15px #ffff00'
            }} />
          </div>
          <div style={{
            fontSize: '14px',
            letterSpacing: '3px'
          }}>
            TIP: Use mouse or touch to select • Press ESC to return
          </div>
          <div style={{
            display: 'grid',
            gap: '6px'
          }}>
            <div style={{
              width: '86px',
              height: '16px',
              background: '#111',
              border: '3px solid #000',
              boxShadow: 'inset 0 0 10px #000'
            }} />
            <div style={{
              width: '86px',
              height: '16px',
              background: '#111',
              border: '3px solid #000',
              boxShadow: 'inset 0 0 10px #000'
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .menu-grid { grid-template-columns: repeat(2, minmax(260px, 1fr)); }
        }
        @media (max-width: 760px) {
          .menu-grid { grid-template-columns: 1fr; }
        }
        .arcade-card { animation: card-glow 2.4s ease-in-out infinite; }
        @keyframes bulb-blink {
          0%, 90% { opacity: 1; }
          95%, 100% { opacity: 0.4; }
        }
        @keyframes haze-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 8px); }
        }
        @keyframes card-sweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes card-glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }
      `}</style>
    </div>
  )
}
