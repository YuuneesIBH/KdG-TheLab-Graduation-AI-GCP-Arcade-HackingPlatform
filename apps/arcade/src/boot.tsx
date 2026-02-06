import React from 'react'

type BootProps = {
  coins: number
  time: number
  highScore: number
  scrollText: number
  explosions: Array<{x: number, y: number, id: number}>
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
  crtFlicker: boolean
  scanlineOffset: number
  pixelShift: number
  borderBlink: boolean
  coinBlink: boolean
  glitchLine: number
  logoShake: {x: number, y: number}
  bootLines: string[]
  bootLineCount: number
  progress: number
  scrollingMarquee: string
}

export function BootScreen({
  coins,
  time,
  highScore,
  scrollText,
  explosions,
  particles,
  crtFlicker,
  scanlineOffset,
  pixelShift,
  borderBlink,
  coinBlink,
  glitchLine,
  logoShake,
  bootLines,
  bootLineCount,
  progress,
  scrollingMarquee
}: BootProps) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #001a40 0%, #000d1f 40%, #000510 70%, #000000 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '90px',  // <-- VOEG DIT TOE! Ruimte voor status bar + extra
      paddingBottom: '60px', // <-- VOEG DIT TOE! Ruimte onderaan
      fontFamily: '"Courier New", "Press Start 2P", monospace',
      position: 'relative',
      overflow: 'auto',  // <-- Verander van 'hidden' naar 'auto' voor scrollen indien nodig
      filter: crtFlicker 
        ? 'brightness(0.7) contrast(1.3)' 
        : 'brightness(1) contrast(1.15)',
      transition: 'filter 0.06s',
      transform: `translateX(${pixelShift}px)`
    }}>
      
      {/* STARFIELD - 90s arcade style */}
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
      
      {/* PIXEL GRID BACKGROUND */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,136,255,0.04) 3px, rgba(0,136,255,0.04) 4px)
        `,
        pointerEvents: 'none'
      }} />

      {/* CRT VIGNETTE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.9) 100%)',
        pointerEvents: 'none',
        zIndex: 999
      }} />

      {/* RETRO GRID FLOOR - Enhanced 90s style */}
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
        backgroundPosition: `0 ${(scrollText * 2.5) % 41}px`,
        opacity: 0.6,
        filter: 'blur(0.3px)',
        boxShadow: '0 -40px 100px rgba(0,136,255,0.4), 0 -80px 150px rgba(0,102,255,0.3)',
        animation: 'grid-pulse 3s ease-in-out infinite'
      }} />

      {/* HORIZON LINE - Glowing 90s style */}
      <div style={{
        position: 'absolute',
        top: '46%',
        left: '-5%',
        right: '-5%',
        height: '4px',
        background: 'linear-gradient(90deg, transparent, #0066ff 10%, #0099ff 30%, #00ccff 50%, #0099ff 70%, #0066ff 90%, transparent)',
        boxShadow: '0 0 30px #0088ff, 0 0 60px #0066ff, 0 0 90px rgba(0,136,255,0.3)',
        opacity: 0.85,
        animation: 'horizon-glow 2.5s ease-in-out infinite'
      }} />

      {/* PARTICLES */}
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

      {/* EXPLOSIONS */}
      {explosions.map(exp => (
        <div key={exp.id} style={{
          position: 'absolute',
          left: exp.x - 40,
          top: exp.y - 40,
          width: 80,
          height: 80,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            inset: '20%',
            backgroundImage: `
              radial-gradient(circle,
                #ffffff 0%, #ffffff 15%,
                #00ddff 15%, #00ddff 35%,
                #0088ff 35%, #0088ff 60%,
                transparent 60%
              )
            `,
            animation: 'pixel-explode 0.6s ease-out forwards'
          }} />
        </div>
      ))}

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

      {/* GLITCH LINE */}
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

      {/* RETRO STATUS BAR */}
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
          1UP {String(coins * 10000).padStart(8, '0')}
        </div>
        <div style={{
          color: '#00ff88',
          textShadow: '0 0 10px #00ff88, 2px 2px 0 #002244',
          animation: 'pixel-pulse 1s ease-in-out infinite 0.5s'
        }}>
          HI {String(highScore).padStart(8, '0')}
        </div>
      </div>

      {/* LOGO + BOOT PANEL WRAPPER */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        width: 'min(850px, 88vw)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
      }}>
        {/* LOGO (nested divs om transform-conflict te vermijden) */}
        <div style={{
          transform: `translate(${logoShake.x}px, ${logoShake.y}px)`,
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            animation: 'title-float 3s ease-in-out infinite'
          }}>
            <img
              src="./thearcaders_logo.png"
              alt="The Arcaders"
              style={{
                width: '720px',
                maxWidth: '92vw',
                height: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(77,166,255,1)) drop-shadow(0 0 60px rgba(204,51,255,0.8))',
                imageRendering: 'pixelated',
                display: 'block'
              }}
            />
          </div>
        </div>

        {/* MAIN BOOT PANEL */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          marginTop: 0
        }}>
        
          {/* OUTER BORDER - ARCADE STYLE */}
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
            
            {/* INNER BORDER */}
            <div style={{
              border: '4px solid #004488',
              background: 'linear-gradient(180deg, #001122, #000a14)',
              boxShadow: 'inset 0 0 30px rgba(0,68,136,0.3)'
            }}>
              
              {/* TITLE BAR */}
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
                {/* Corner pixels */}
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
                  ▓▒░ SYSTEM BOOT ░▒▓
                </div>
                <div style={{
                  background: 'linear-gradient(180deg, #00ff88, #00cc66)',
                  color: '#001122',
                  padding: '6px 16px',
                  border: '3px solid #00ff88',
                  fontSize: '16px',
                  fontWeight: 'black',
                  letterSpacing: '2px',
                  boxShadow: '0 0 15px rgba(0,255,136,0.5)',
                  borderRadius: '2px'
                }}>
                  START
                </div>
              </div>

              {/* CONTENT */}
              <div style={{
                background: '#000000',
                padding: '24px',
                minHeight: '380px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: '20px'
              }}>
                {/* LEFT: BOOT LOG */}
                <div style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#00ccff',
                  textShadow: '0 0 10px #00ccff',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  border: '3px solid #0088ff',
                  padding: '14px',
                  boxShadow: '0 0 15px rgba(0,136,255,0.3), inset 0 0 10px rgba(0,136,255,0.1)',
                  background: 'rgba(0,20,40,0.5)'
                }}>
                  {bootLines.slice(0, bootLineCount).map((line, i) => (
                    <div key={i} style={{
                      marginBottom: line === '' ? '10px' : '4px',
                      animation: `line-appear 0.1s ease-out ${i * 0.05}s backwards`
                    }}>
                      {line && (
                        <>
                          <span style={{ color: '#00ff88' }}>C:\&gt;</span>
                          <span style={{
                            color: line.includes('OK') ? '#00ff88' :
                                   line.includes('Press COIN') ? '#ffff00' : '#00ccff',
                            textShadow: line.includes('OK') ? '0 0 8px #00ff88' :
                                       line.includes('Press COIN') ? '0 0 12px #ffff00' : '0 0 8px #00ccff',
                            animation: line.includes('Press COIN') ? 'urgent-blink 0.6s infinite' : 'none'
                          }}> {line}</span>
                        </>
                      )}
                    </div>
                  ))}
                  {bootLineCount > 0 && (
                    <span style={{
                      animation: 'pixel-cursor 0.8s steps(2) infinite',
                      color: '#00ccff',
                      backgroundColor: '#00ccff',
                      display: 'inline-block',
                      width: '12px',
                      height: '18px',
                      marginLeft: '4px'
                    }}></span>
                  )}
                </div>

                {/* RIGHT: CART SLOT & STATS */}
                <div style={{
                  display: 'grid',
                  gap: '14px',
                  alignContent: 'start'
                }}>
                  {/* CARTRIDGE SLOT */}
                  <div style={{
                    border: '4px solid #0088ff',
                    background: 'linear-gradient(180deg, #001a2a, #000a14)',
                    padding: '14px',
                    boxShadow: '0 0 20px rgba(0,136,255,0.3)'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      color: '#00ccff',
                      letterSpacing: '3px',
                      textShadow: '0 0 10px #00ccff',
                      marginBottom: '8px'
                    }}>
                      CART SLOT
                    </div>
                    <div style={{
                      height: '100px',
                      border: '3px solid #004488',
                      background: 'linear-gradient(180deg, #000814, #000408)',
                      position: 'relative',
                      boxShadow: 'inset 0 0 15px rgba(0,68,136,0.2)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '10%',
                        right: '10%',
                        top: '10px',
                        height: '10px',
                        background: '#1a1a1a',
                        border: '2px solid #000'
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: '15%',
                        right: '15%',
                        bottom: '12px',
                        height: '20px',
                        background: 'linear-gradient(180deg, #0088ff, #0066cc)',
                        border: '2px solid #000',
                        boxShadow: '0 0 12px rgba(0,136,255,0.5)'
                      }} />
                    </div>
                  </div>

                  {/* COIN COUNTER */}
                  <div style={{
                    background: 'linear-gradient(180deg, #0088ff, #0066cc)',
                    border: '5px solid #00aaff',
                    padding: '16px',
                    boxShadow: `
                      0 0 30px rgba(0,136,255,0.5),
                      inset 0 0 20px rgba(0,170,255,0.3),
                      6px 6px 0 rgba(0,0,0,0.4)
                    `
                  }}>
                    <div style={{
                      color: '#ffff00',
                      fontSize: '14px',
                      letterSpacing: '3px',
                      marginBottom: '8px',
                      textShadow: '0 0 15px #ffff00, 2px 2px 0 #002244'
                    }}>
                      ╔═ CREDITS ═╗
                    </div>
                    <div style={{
                      fontSize: '60px',
                      fontWeight: 'black',
                      color: '#ffffff',
                      textAlign: 'center',
                      textShadow: `
                        0 0 25px #00ccff,
                        0 0 50px #0088ff,
                        5px 5px 0 #002244
                      `,
                      lineHeight: '1'
                    }}>
                      {String(coins).padStart(2, '0')}
                    </div>
                  </div>

                  {/* LOADING BAR */}
                  <div style={{
                    background: '#000814',
                    border: '4px solid #0088ff',
                    padding: '8px',
                    boxShadow: '0 0 20px rgba(0,136,255,0.3)'
                  }}>
                    <div style={{
                      height: '30px',
                      background: '#001122',
                      border: '2px solid #002244',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {Array.from({length: 10}).map((_, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: `${i * 10}%`,
                          top: 0,
                          width: '9.5%',
                          height: '100%',
                          background: i < progress / 10 
                            ? (i % 2 === 0 ? '#00ff88' : '#00ccff')
                            : '#002244',
                          border: '1px solid #000',
                          boxShadow: i < progress / 10
                            ? `0 0 10px ${i % 2 === 0 ? '#00ff88' : '#00ccff'}`
                            : 'none',
                          transition: 'all 0.2s'
                        }} />
                      ))}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      color: '#00ccff',
                      fontSize: '14px',
                      letterSpacing: '2px',
                      textShadow: '0 0 8px #00ccff'
                    }}>
                      <span>LOADING...</span>
                      <span style={{ 
                        color: progress === 100 ? '#00ff88' : '#00ccff',
                        textShadow: progress === 100 ? '0 0 15px #00ff88' : '0 0 8px #00ccff'
                      }}>{progress}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* BOTTOM STATUS */}
              <div style={{
                background: progress < 100 
                  ? 'linear-gradient(180deg, #0088ff, #0066cc)' 
                  : 'linear-gradient(180deg, #00ff88, #00cc66)',
                borderTop: '4px solid #00aaff',
                padding: '18px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: progress < 100
                  ? '0 -3px 20px rgba(0,136,255,0.5)'
                  : '0 -3px 20px rgba(0,255,136,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.2) 20px, rgba(0,0,0,0.2) 40px)',
                  animation: 'stripe-move 2s linear infinite',
                  opacity: 0.4
                }} />
                
                <div style={{
                  fontSize: '30px',
                  fontWeight: 'black',
                  color: '#ffffff',
                  letterSpacing: '5px',
                  textShadow: '0 0 25px rgba(255,255,255,0.8), 4px 4px 0 #002244',
                  animation: progress < 100 ? 'urgent-blink 0.8s infinite' : 'ready-pulse 0.6s ease-in-out infinite',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {progress < 100
                    ? '▓▓ INSERT CARTRIDGE ▓▓'
                    : '★ READY TO START ★'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
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
        @keyframes pixel-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes urgent-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ready-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
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
        @keyframes line-appear {
          0% { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pixel-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes stripe-move {
          from { transform: translateX(0); }
          to { transform: translateX(40px); }
        }
        @keyframes title-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes subtitle-glow {
          0%, 100% { 
            boxShadow: 0 0 15px rgba(0,136,255,0.4), inset 0 0 10px rgba(0,200,255,0.2);
          }
          50% { 
            boxShadow: 0 0 25px rgba(0,136,255,0.7), inset 0 0 15px rgba(0,200,255,0.4);
          }
        }
        @keyframes starfield-drift {
          from { 
            backgroundPosition: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px;
          }
          to { 
            backgroundPosition: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px, 200px 380px, 90px 420px;
          }
        }
        @keyframes grid-pulse {
          0%, 100% { 
            opacity: 0.6;
            boxShadow: 0 -40px 100px rgba(0,136,255,0.4), 0 -80px 150px rgba(0,102,255,0.3);
          }
          50% { 
            opacity: 0.75;
            boxShadow: 0 -40px 120px rgba(0,136,255,0.5), 0 -80px 180px rgba(0,102,255,0.4);
          }
        }
        @keyframes horizon-glow {
          0%, 100% { 
            boxShadow: 0 0 30px #0088ff, 0 0 60px #0066ff, 0 0 90px rgba(0,136,255,0.3);
          }
          50% { 
            boxShadow: 0 0 40px #00aaff, 0 0 80px #0088ff, 0 0 120px rgba(0,136,255,0.5);
          }
        }
      `}</style>
    </div>
  )
}