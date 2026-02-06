import React from 'react'

type MenuProps = {
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
  onSelectGame?: (gameId: string) => void
}

const games = [
  { id: 'neon-runner', title: 'NEON RUNNER', genre: 'RACING', badge: 'NEW', color: '#0099ff', glow: '#00ccff' },
  { id: 'pixel-blaster', title: 'PIXEL BLASTER', genre: 'SHOOTER', badge: 'HOT', color: '#00ddff', glow: '#00ffff' },
  { id: 'grid-fighter', title: 'GRID FIGHTER', genre: 'FIGHT', badge: 'VS', color: '#0088ff', glow: '#00aaff' },
  { id: 'retro-quest', title: 'RETRO QUEST', genre: 'RPG', badge: 'EPIC', color: '#00aaff', glow: '#00ddff' },
  { id: 'sky-raid', title: 'SKY RAID', genre: 'ARCADE', badge: 'CO-OP', color: '#0077ff', glow: '#00aaff' },
  { id: 'tank-rush', title: 'TANK RUSH', genre: 'STRATEGY', badge: 'BOSS', color: '#00bbff', glow: '#00eeff' }
]

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  return (
    <div style={{ 
      background: 'linear-gradient(180deg, #001a40 0%, #000d1f 40%, #000510 70%, #000000 100%)',
      minHeight: '100vh',
      margin: 0,
      padding: '0',
      fontFamily: '"Courier New", monospace',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
          radial-gradient(1px 1px at 15% 80%, #00ddff, transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 150px 150px, 250px 250px, 180px 180px, 220px 220px',
        animation: 'starfield-slow 150s linear infinite',
        opacity: 0.3,
        pointerEvents: 'none'
      }} />
      
      {/* RETRO GRID FLOOR */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-30%',
        right: '-30%',
        height: '65%',
        backgroundImage: `
          repeating-linear-gradient(0deg,
            transparent 0px,
            transparent 38px,
            #0099ff 38px,
            #0099ff 41px
          ),
          repeating-linear-gradient(90deg,
            transparent 0px,
            transparent 58px,
            #0066ff 58px,
            #0066ff 61px
          )
        `,
        transform: 'perspective(350px) rotateX(68deg)',
        backgroundPosition: '0 0',
        opacity: 0.4,
        filter: 'blur(0.3px)',
        boxShadow: '0 -40px 100px rgba(0,136,255,0.3)',
        animation: 'grid-scroll 3s linear infinite'
      }} />

      {/* HORIZON */}
      <div style={{
        position: 'absolute',
        top: '58%',
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #0099ff, #00ccff, #0099ff, transparent)',
        boxShadow: '0 0 25px #0088ff',
        opacity: 0.7,
        animation: 'horizon-pulse 2s ease-in-out infinite'
      }} />
      
      {/* SCANLINES */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: 0.6
      }} />
      
      {/* CRT VIGNETTE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.9) 100%)',
        pointerEvents: 'none',
        zIndex: 999
      }} />
      
      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          width: '8px',
          height: '8px',
          background: p.color,
          boxShadow: `0 0 12px ${p.color}`,
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />
      ))}

      {/* MAIN ARCADE CABINET */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: 'min(1400px, 95vw)',
        maxWidth: '1400px'
      }}>
        
        {/* CABINET TOP MARQUEE */}
        <div style={{
          background: 'linear-gradient(180deg, #0066cc 0%, #004499 100%)',
          borderTop: '8px solid #0088ff',
          borderLeft: '8px solid #0088ff',
          borderRight: '8px solid #0088ff',
          borderBottom: '6px solid #00aaff',
          padding: '20px 30px',
          position: 'relative',
          clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
          boxShadow: '0 0 40px rgba(0,136,255,0.6), inset 0 0 30px rgba(0,170,255,0.2)'
        }}>
          {/* Neon tubes */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '10%',
            right: '10%',
            height: '6px',
            background: 'linear-gradient(90deg, transparent, #00ffff, #ffffff, #00ffff, transparent)',
            boxShadow: '0 0 20px #00ffff',
            borderRadius: '3px',
            animation: 'neon-flicker 3s ease-in-out infinite'
          }} />
          
          <div style={{
            textAlign: 'center',
            marginTop: '6px'
          }}>
            <div style={{
              fontSize: '56px',
              fontWeight: 'black',
              color: '#ffffff',
              textShadow: `
                0 0 30px #00ffff,
                0 0 60px #0088ff,
                6px 6px 0 #002244,
                -2px -2px 0 #004488
              `,
              letterSpacing: '14px',
              lineHeight: '1',
              fontFamily: '"Impact", "Arial Black", sans-serif'
            }}>
              GAME SELECT
            </div>
            <div style={{
              fontSize: '16px',
              color: '#00ffff',
              letterSpacing: '6px',
              marginTop: '8px',
              textShadow: '0 0 15px #00ffff, 2px 2px 0 #002244'
            }}>
              ★ CHOOSE YOUR ADVENTURE ★
            </div>
          </div>
        </div>

        {/* MAIN SCREEN BEZEL */}
        <div style={{
          background: 'linear-gradient(180deg, #001a33, #000d1f)',
          border: '12px solid #002244',
          borderTop: 'none',
          boxShadow: `
            0 0 40px rgba(0,0,0,0.9),
            inset 0 0 60px rgba(0,0,0,0.8),
            inset 0 20px 40px rgba(0,136,255,0.1)
          `,
          padding: '30px',
          position: 'relative'
        }}>
          {/* Screen corner bolts */}
          {[
            {top: '15px', left: '15px'},
            {top: '15px', right: '15px'},
            {bottom: '15px', left: '15px'},
            {bottom: '15px', right: '15px'}
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              ...pos,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #0099ff, #004488)',
              border: '3px solid #002244',
              boxShadow: '0 0 12px rgba(0,136,255,0.6), inset 0 0 6px rgba(0,0,0,0.8)'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '8px',
                height: '2px',
                background: '#001122'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                width: '8px',
                height: '2px',
                background: '#001122'
              }} />
            </div>
          ))}

          {/* GAME GRID - Arcade style 2x3 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '24px',
            background: 'linear-gradient(180deg, #000510, #000000)',
            padding: '24px',
            border: '4px solid #0088ff',
            boxShadow: 'inset 0 0 40px rgba(0,136,255,0.15)',
            position: 'relative'
          }}>
            {/* CRT Glass effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,136,255,0.08) 0%, transparent 20%, transparent 80%, rgba(0,136,255,0.05) 100%)',
              pointerEvents: 'none',
              zIndex: 5
            }} />

            {games.map((game, idx) => (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGame?.(game.id)}
                className="game-slot"
                style={{
                  cursor: 'pointer',
                  background: `
                    linear-gradient(135deg, 
                      rgba(0,10,20,0.95) 0%, 
                      rgba(0,20,40,0.85) 50%, 
                      rgba(0,10,20,0.95) 100%
                    ),
                    radial-gradient(circle at 30% 40%, ${game.glow}40, transparent 70%)
                  `,
                  border: `5px solid ${game.color}`,
                  boxShadow: `
                    0 0 35px ${game.color},
                    inset 0 0 30px rgba(0,20,40,0.8),
                    0 8px 16px rgba(0,0,0,0.6)
                  `,
                  padding: '0',
                  minHeight: '220px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-6px)'
                  e.currentTarget.style.boxShadow = `
                    0 0 50px ${game.color},
                    0 0 80px ${game.glow},
                    inset 0 0 30px rgba(0,20,40,0.7),
                    0 12px 24px rgba(0,0,0,0.8)
                  `
                  e.currentTarget.style.zIndex = '10'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)'
                  e.currentTarget.style.boxShadow = `
                    0 0 35px ${game.color},
                    inset 0 0 30px rgba(0,20,40,0.8),
                    0 8px 16px rgba(0,0,0,0.6)
                  `
                  e.currentTarget.style.zIndex = '1'
                }}
              >
                {/* Slot number */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '32px',
                  height: '32px',
                  background: 'rgba(0,0,0,0.8)',
                  border: `2px solid ${game.color}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'black',
                  color: game.color,
                  textShadow: `0 0 10px ${game.color}`,
                  zIndex: 3
                }}>
                  {idx + 1}
                </div>

                {/* Badge */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: game.color,
                  color: '#000814',
                  fontSize: '11px',
                  fontWeight: 'black',
                  padding: '4px 10px',
                  letterSpacing: '1px',
                  border: '2px solid rgba(0,0,0,0.5)',
                  boxShadow: `0 0 15px ${game.color}, inset 0 0 8px rgba(255,255,255,0.3)`,
                  zIndex: 3
                }}>
                  {game.badge}
                </div>

                {/* Game Title Area */}
                <div style={{
                  padding: '50px 16px 20px',
                  textAlign: 'center',
                  flex: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {/* Title */}
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'black',
                    color: '#ffffff',
                    letterSpacing: '3px',
                    textShadow: `
                      0 0 25px ${game.color},
                      0 0 50px ${game.glow},
                      4px 4px 0 #000814,
                      -1px -1px 0 ${game.color}40
                    `,
                    lineHeight: '1.2',
                    marginBottom: '12px',
                    fontFamily: '"Impact", "Arial Black", sans-serif'
                  }}>
                    {game.title}
                  </div>

                  {/* Genre tag */}
                  <div style={{
                    display: 'inline-block',
                    margin: '0 auto',
                    padding: '6px 16px',
                    background: 'rgba(0,0,0,0.7)',
                    border: `2px solid ${game.color}`,
                    borderRadius: '3px',
                    fontSize: '13px',
                    color: game.color,
                    letterSpacing: '2px',
                    fontWeight: 'bold',
                    textShadow: `0 0 8px ${game.color}`,
                    boxShadow: `inset 0 0 12px rgba(0,0,0,0.6)`
                  }}>
                    {game.genre}
                  </div>
                </div>

                {/* Insert Coin footer */}
                <div style={{
                  padding: '12px',
                  background: `linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.8))`,
                  borderTop: `3px solid ${game.color}`,
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#00ffff',
                  letterSpacing: '3px',
                  textShadow: '0 0 12px #00ffff, 2px 2px 0 #000814',
                  animation: 'insert-blink 1.5s ease-in-out infinite',
                  zIndex: 2
                }}>
                  ▶ PRESS START
                </div>

                {/* Animated scan line */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${game.color}, transparent)`,
                  boxShadow: `0 0 8px ${game.color}`,
                  animation: `scan-down-${idx} 3s linear infinite`,
                  opacity: 0.6,
                  pointerEvents: 'none',
                  zIndex: 4
                }} />

                {/* Pixel grid overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)',
                  pointerEvents: 'none',
                  opacity: 0.5,
                  zIndex: 4
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* CONTROL PANEL */}
        <div style={{
          background: 'linear-gradient(180deg, #003366, #001a33)',
          border: '8px solid #0088ff',
          borderTop: 'none',
          padding: '24px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '30px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8), inset 0 4px 20px rgba(0,136,255,0.2)',
          clipPath: 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)'
        }}>
          {/* Player 1 Controls */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Joystick */}
            <div style={{
              width: '70px',
              height: '70px',
              background: 'radial-gradient(circle at 40% 40%, #001a33, #000814)',
              borderRadius: '50%',
              border: '5px solid #0088ff',
              boxShadow: '0 0 25px rgba(0,136,255,0.6), inset 0 0 20px rgba(0,0,0,0.8)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                background: 'radial-gradient(circle at 30% 30%, #0099ff, #004488)',
                borderRadius: '50%',
                border: '3px solid #002244',
                boxShadow: '0 0 15px rgba(0,153,255,0.8)'
              }} />
            </div>
            
            {/* Action Buttons */}
            {['#0099ff', '#00ccff', '#00ddff'].map((color, i) => (
              <div key={i} style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${color}, ${color}bb)`,
                border: '4px solid #002244',
                boxShadow: `0 0 20px ${color}aa, inset 0 -3px 8px rgba(0,0,0,0.5)`,
                position: 'relative',
                top: i === 1 ? '-8px' : '0'
              }} />
            ))}
          </div>

          {/* Center Display */}
          <div style={{
            flex: '1',
            textAlign: 'center',
            padding: '12px 24px',
            background: 'rgba(0,0,0,0.6)',
            border: '3px solid #0088ff',
            borderRadius: '4px',
            boxShadow: 'inset 0 0 20px rgba(0,136,255,0.2)'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#00ffff',
              letterSpacing: '3px',
              textShadow: '0 0 12px #00ffff',
              fontWeight: 'bold'
            }}>
              SELECT GAME • PRESS START • INSERT COIN
            </div>
          </div>

          {/* Coin Slot */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '100px',
              height: '50px',
              background: 'linear-gradient(180deg, #000814, #001122)',
              border: '4px solid #0088ff',
              borderRadius: '6px',
              boxShadow: '0 0 20px rgba(0,136,255,0.4), inset 0 0 15px rgba(0,0,0,0.9)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '4px',
                background: '#002244',
                boxShadow: 'inset 0 0 4px #000'
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: '#00ffff',
              letterSpacing: '2px',
              textShadow: '0 0 8px #00ffff'
            }}>
              CREDITS: ∞
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes starfield-slow {
          from { backgroundPosition: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px; }
          to { backgroundPosition: 0 300px, 40px 360px, 130px 570px, 70px 400px, 150px 350px, 200px 480px; }
        }
        
        @keyframes grid-scroll {
          from { backgroundPosition: 0 0; }
          to { backgroundPosition: 0 41px; }
        }
        
        @keyframes horizon-pulse {
          0%, 100% { opacity: 0.7; boxShadow: 0 0 25px #0088ff; }
          50% { opacity: 0.9; boxShadow: 0 0 40px #00aaff; }
        }
        
        @keyframes neon-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
          75% { opacity: 0.95; }
        }
        
        @keyframes insert-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes scan-down-0 { from { top: 0; } to { top: 100%; } }
        @keyframes scan-down-1 { from { top: 0; } to { top: 100%; } }
        @keyframes scan-down-2 { from { top: 0; } to { top: 100%; } }
        @keyframes scan-down-3 { from { top: 0; } to { top: 100%; } }
        @keyframes scan-down-4 { from { top: 0; } to { top: 100%; } }
        @keyframes scan-down-5 { from { top: 0; } to { top: 100%; } }
        
        @media (max-width: 1200px) {
          .game-slot {
            min-height: 180px !important;
          }
        }
        
        @media (max-width: 900px) {
          .game-slot {
            min-height: 160px !important;
          }
        }
      `}</style>
    </div>
  )
}