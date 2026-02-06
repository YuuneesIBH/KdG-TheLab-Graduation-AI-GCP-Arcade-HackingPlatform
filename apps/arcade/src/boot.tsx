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
      background: 'radial-gradient(circle at 50% 50%, #1a0033, #000000)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Courier New", "Fixedsys", monospace',
      position: 'relative',
      overflow: 'hidden',
      filter: crtFlicker 
        ? 'brightness(0.6) contrast(1.3) saturate(1.5)' 
        : 'brightness(1) contrast(1.1) saturate(1.3)',
      transition: 'filter 0.06s',
      transform: `translateX(${pixelShift}px)`
    }}>
      
      {/* NEON GRID FLOOR - CYAN/MAGENTA */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-20%',
        right: '-20%',
        height: '70%',
        backgroundImage: `
          repeating-linear-gradient(0deg,
            transparent 0px,
            transparent 18px,
            #00ffff 18px,
            #00ffff 20px,
            transparent 20px,
            transparent 38px,
            #ff00ff 38px,
            #ff00ff 40px
          ),
          repeating-linear-gradient(90deg,
            transparent 0px,
            transparent 38px,
            #00ffff 38px,
            #00ffff 40px,
            transparent 40px,
            transparent 78px,
            #ff00ff 78px,
            #ff00ff 80px
          )
        `,
        transform: 'perspective(400px) rotateX(70deg)',
        backgroundPosition: `0 ${(scrollText * 2) % 40}px`,
        opacity: 0.6,
        filter: 'blur(0.5px)',
        boxShadow: '0 -50px 100px rgba(0,255,255,0.3), 0 -100px 150px rgba(255,0,255,0.2)',
        animation: 'grid-pulse 2s ease-in-out infinite'
      }} />

      {/* NEON HORIZON GLOW */}
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '-10%',
        right: '-10%',
        height: '6px',
        background: 'linear-gradient(90deg, transparent, #ff00ff, #00ffff, #ffff00, #ff00ff, transparent)',
        boxShadow: '0 0 30px #ff00ff, 0 0 60px #00ffff',
        opacity: 0.8,
        animation: 'horizon-pulse 2s ease-in-out infinite'
      }} />

      {/* NEON PARTICLES */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          width: '10px',
          height: '10px',
          background: p.color,
          boxShadow: `0 0 15px ${p.color}, 0 0 25px ${p.color}`,
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />
      ))}

      {/* NEON EXPLOSIONS */}
      {explosions.map(exp => (
        <div key={exp.id} style={{
          position: 'absolute',
          left: exp.x - 50,
          top: exp.y - 50,
          width: 100,
          height: 100,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            inset: '15%',
            backgroundImage: `
              radial-gradient(circle,
                #ffffff 0%, #ffffff 10%,
                #ffff00 10%, #ffff00 25%,
                #ff00ff 25%, #ff00ff 45%,
                #00ffff 45%, #00ffff 65%,
                transparent 65%
              )
            `,
            animation: 'explosion-core 0.8s ease-out forwards',
            boxShadow: '0 0 40px #ffff00, 0 0 60px #ff00ff'
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '5px solid #00ffff',
            borderRadius: '50%',
            animation: 'explosion-ring 0.8s ease-out forwards',
            boxShadow: '0 0 20px #00ffff, inset 0 0 20px #ff00ff'
          }} />
        </div>
      ))}

      {/* SCANLINES */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 3px, transparent 3px, transparent 6px)',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: `translateY(${scanlineOffset}px)`,
        opacity: 0.8,
        animation: 'scanline-drift 8s linear infinite'
      }} />

      {/* GLITCH LINE */}
      {glitchLine >= 0 && (
        <div style={{
          position: 'absolute',
          top: `${glitchLine * 5}%`,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(255,255,255,0.9)',
          mixBlendMode: 'screen',
          zIndex: 1001,
          boxShadow: '0 0 10px #00ffff'
        }} />
      )}

      {/* CRT CURVE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.9) 100%)',
        pointerEvents: 'none',
        zIndex: 998
      }} />

      {/* VIGNETTE */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        zIndex: 999
      }} />

      {/* MASSIVE ARCADE LOGO - TOP CENTER */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '50%',
        transform: `translate(-50%, 0) translate(${logoShake.x}px, ${logoShake.y}px)`,
        zIndex: 200,
        animation: 'logo-float 3s ease-in-out infinite'
      }}>
        <div style={{
          fontSize: '96px',
          fontWeight: 'black',
          letterSpacing: '12px',
          textAlign: 'center',
          position: 'relative',
          filter: 'contrast(1.3)'
        }}>
          {/* Shadow layers */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            color: '#000000',
            zIndex: 1
          }}>ARCADE</div>
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            color: '#ff00ff',
            zIndex: 2
          }}>ARCADE</div>
          <div style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            background: 'linear-gradient(180deg, #ffff00, #ff8800)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            zIndex: 3,
            textShadow: '0 0 40px #ffff00, 0 0 80px #ff8800',
            filter: 'drop-shadow(0 0 20px #ffff00)'
          }}>ARCADE</div>
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '8px',
          textAlign: 'center',
          marginTop: '10px',
          color: '#00ffff',
          textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 3px 3px 0 #000',
          animation: 'subtitle-glow 2s ease-in-out infinite'
        }}>
          ★ ENTERTAINMENT SYSTEM ★
        </div>
      </div>

      {/* SCROLLING MARQUEE TOP */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, #ff00ff, #cc00cc)',
        borderBottom: '5px solid #ffff00',
        padding: '10px 0',
        overflow: 'hidden',
        zIndex: 101,
        boxShadow: '0 0 20px #ff00ff, 0 8px 0 #000'
      }}>
        <div style={{
          color: '#ffff00',
          fontSize: '20px',
          fontWeight: 'bold',
          letterSpacing: '6px',
          textShadow: '0 0 15px #ffff00, 3px 3px 0 #000',
          whiteSpace: 'nowrap',
          animation: 'marquee-scroll 20s linear infinite'
        }}>
          {scrollingMarquee}
        </div>
      </div>

      {/* STATUS BAR - NEON */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, #00ffff, #00cccc)',
        borderTop: '3px solid #ffff00',
        borderBottom: '5px solid #ff00ff',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '22px',
        fontWeight: 'bold',
        letterSpacing: '4px',
        zIndex: 100,
        boxShadow: '0 0 30px #00ffff, 0 8px 0 #000'
      }}>
        <div style={{
          color: '#ffff00',
          textShadow: '0 0 15px #ffff00, 3px 3px 0 #000',
          animation: 'score-pulse 1s ease-in-out infinite'
        }}>
          1UP {String(coins * 10000).padStart(8, '0')}
        </div>
        <div style={{
          color: '#ff00ff',
          textShadow: '0 0 15px #ff00ff, 3px 3px 0 #000',
          animation: 'score-pulse 1s ease-in-out infinite 0.5s'
        }}>
          HI {String(highScore).padStart(8, '0')}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: 'min(850px, 90vw)',
        marginTop: '280px',
        animation: 'panel-entrance 1s ease-out'
      }}>
        
        {/* NEON OUTER BORDER */}
        <div style={{
          border: '6px solid #00ffff',
          borderRadius: '0',
          background: '#000000',
          boxShadow: `
            0 0 40px #00ffff,
            inset 0 0 30px rgba(0,255,255,0.3),
            8px 8px 0 rgba(0,0,0,0.6),
            ${borderBlink ? '0 0 60px #ffff00' : '0 0 20px #00ffff'}
          `,
          padding: '8px',
          transition: 'box-shadow 0.1s'
        }}>
          
          {/* INNER BORDER */}
          <div style={{
            border: '5px solid #ff00ff',
            background: 'linear-gradient(180deg, #1a0033, #000033)',
            boxShadow: 'inset 0 0 40px rgba(255,0,255,0.3)',
            padding: '0'
          }}>
            
            {/* TITLE BAR */}
            <div style={{
              background: 'linear-gradient(180deg, #ff00ff, #cc00cc)',
              borderBottom: '4px solid #00ffff',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(255,0,255,0.5)'
            }}>
              {/* NEON Corner indicators */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '14px',
                height: '14px',
                background: coinBlink ? '#ffff00' : '#886600',
                border: '3px solid #ffff00',
                boxShadow: coinBlink ? '0 0 20px #ffff00' : '0 0 5px #ffff00',
                transition: 'all 0.1s'
              }} />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '14px',
                height: '14px',
                background: coinBlink ? '#ffff00' : '#886600',
                border: '3px solid #ffff00',
                boxShadow: coinBlink ? '0 0 20px #ffff00' : '0 0 5px #ffff00',
                transition: 'all 0.1s'
              }} />

              <div style={{
                color: '#ffff00',
                fontSize: '26px',
                fontWeight: 'bold',
                letterSpacing: '5px',
                textShadow: '0 0 20px #ffff00, 4px 4px 0 #000',
                animation: 'title-glitch 5s ease-in-out infinite'
              }}>
                ░▒▓ SYSTEM BOOT ▓▒░
              </div>
              <div style={{
                background: 'linear-gradient(180deg, #00ffff, #00aaaa)',
                color: '#000000',
                padding: '8px 18px',
                border: '4px outset #00ffff',
                fontSize: '18px',
                fontWeight: 'black',
                letterSpacing: '3px',
                boxShadow: '0 0 20px #00ffff, inset 0 0 10px rgba(255,255,255,0.3)',
                animation: 'button-press 2s ease-in-out infinite'
              }}>
                BOOT
              </div>
            </div>

            {/* CONTENT */}
            <div style={{
              background: '#000000',
              padding: '28px',
              minHeight: '400px'
            }}>
              
              {/* BOOT TEXT - CYAN PHOSPHOR */}
              <div style={{
                fontSize: '19px',
                lineHeight: '1.5',
                color: '#00ffff',
                textShadow: '0 0 12px #00ffff, 2px 2px 0 #003333',
                fontFamily: '"Courier New", monospace',
                marginBottom: '32px',
                letterSpacing: '1px'
              }}>
                {bootLines.slice(0, bootLineCount).map((line, i) => (
                  <div key={i} style={{
                    marginBottom: line === '' ? '14px' : '5px',
                    animation: `line-flicker 0.1s ease-out ${i * 0.05}s`
                  }}>
                    {line && (
                      <>
                        <span style={{ color: '#00ff00', textShadow: '0 0 10px #00ff00' }}>C:\&gt;</span>
                        <span style={{
                          color: line.includes('OK') ? '#00ff00' :
                                 line.includes('Press COIN') ? '#ffff00' : '#00ffff',
                          textShadow: line.includes('OK') ? '0 0 10px #00ff00' :
                                     line.includes('Press COIN') ? '0 0 15px #ffff00' : '0 0 10px #00ffff',
                          animation: line.includes('Press COIN') ? 'text-urgent-blink 0.6s infinite' : 'none'
                        }}> {line}</span>
                      </>
                    )}
                  </div>
                ))}
                {bootLineCount > 0 && (
                  <span style={{
                    animation: 'cursor-blink 0.8s steps(2) infinite',
                    color: '#00ffff',
                    backgroundColor: '#00ffff',
                    display: 'inline-block',
                    width: '14px',
                    height: '22px',
                    marginLeft: '5px',
                    boxShadow: '0 0 15px #00ffff'
                  }}></span>
                )}
              </div>

              {/* COIN COUNTER - NEON STYLE */}
              <div style={{
                background: 'linear-gradient(180deg, #ff00ff, #cc00cc)',
                border: '6px solid #ffff00',
                borderRadius: '0',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: `
                  0 0 40px #ff00ff,
                  inset 0 0 30px rgba(255,255,0,0.3),
                  8px 8px 0 rgba(0,0,0,0.4)
                `,
                animation: 'coin-box-pulse 1.5s ease-in-out infinite'
              }}>
                <div style={{
                  color: '#ffff00',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  marginBottom: '12px',
                  textShadow: '0 0 20px #ffff00, 3px 3px 0 #000',
                  animation: 'text-flicker 3s ease-in-out infinite'
                }}>
                  ╔═══ CREDITS ═══╗
                </div>
                <div style={{
                  fontSize: '84px',
                  fontWeight: 'black',
                  color: '#00ffff',
                  textAlign: 'center',
                  textShadow: `
                    0 0 30px #00ffff,
                    0 0 60px #00ffff,
                    6px 6px 0 #000
                  `,
                  lineHeight: '1',
                  animation: 'number-glow 0.5s ease-out'
                }}>
                  {String(coins).padStart(2, '0')}
                </div>
              </div>

              {/* LOADING BAR - NEON */}
              <div style={{
                background: '#000000',
                border: '5px solid #00ffff',
                borderRadius: '0',
                padding: '10px',
                boxShadow: '0 0 30px #00ffff, inset 0 0 20px rgba(0,255,255,0.2)'
              }}>
                <div style={{
                  height: '36px',
                  background: '#001a1a',
                  border: '3px solid #003333',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* NEON Progress blocks */}
                  {Array.from({length: 10}).map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${i * 10}%`,
                      top: 0,
                      width: '9.5%',
                      height: '100%',
                      background: i < progress / 10 
                        ? (i % 2 === 0 ? '#ffff00' : '#00ff00')
                        : '#003300',
                      border: '1px solid #000',
                      boxShadow: i < progress / 10
                        ? `0 0 ${i < progress / 10 - 1 ? 10 : 25}px ${i % 2 === 0 ? '#ffff00' : '#00ff00'}`
                        : 'none',
                      transition: 'all 0.2s',
                      animation: i < progress / 10 ? `block-pulse 1s ease-in-out infinite ${i * 0.1}s` : 'none'
                    }} />
                  ))}
                  {/* Loading shimmer */}
                  {progress < 100 && (
                    <div style={{
                      position: 'absolute',
                      left: `${progress}%`,
                      top: 0,
                      width: '25%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.6), transparent)',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      filter: 'blur(4px)'
                    }} />
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  color: '#00ffff',
                  fontSize: '18px',
                  letterSpacing: '3px',
                  textShadow: '0 0 10px #00ffff, 2px 2px 0 #000'
                }}>
                  <span style={{ animation: 'text-flicker 2s ease-in-out infinite' }}>LOADING...</span>
                  <span style={{ 
                    color: progress === 100 ? '#00ff00' : '#00ffff',
                    textShadow: progress === 100 ? '0 0 20px #00ff00' : '0 0 10px #00ffff',
                    animation: progress === 100 ? 'complete-flash 0.5s ease-out' : 'none'
                  }}>{progress}%</span>
                </div>
              </div>

            </div>

            {/* BOTTOM STATUS - MEGA NEON */}
            <div style={{
              background: progress < 100 
                ? 'linear-gradient(180deg, #ff00ff, #cc00cc)' 
                : 'linear-gradient(180deg, #00ff00, #00cc00)',
              borderTop: '5px solid #ffff00',
              padding: '20px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: progress < 100
                ? '0 -4px 30px rgba(255,0,255,0.6)'
                : '0 -4px 30px rgba(0,255,0,0.6)'
            }}>
              {/* Animated stripes */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 25px, rgba(0,0,0,0.3) 25px, rgba(0,0,0,0.3) 50px)',
                animation: 'stripe-scroll 2s linear infinite',
                opacity: 0.6
              }} />
              
              <div style={{
                fontSize: '36px',
                fontWeight: 'black',
                color: '#ffff00',
                letterSpacing: '6px',
                textShadow: '0 0 30px #ffff00, 0 0 60px #ffff00, 5px 5px 0 #000',
                animation: progress < 100 ? 'text-urgent-blink 0.8s infinite' : 'ready-bounce 0.6s ease-in-out infinite',
                position: 'relative',
                zIndex: 1
              }}>
                {progress < 100
                  ? '▓▓▓ INSERT COIN ▓▓▓'
                  : '★★★ GAME READY ★★★'
                }
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* FOOTER - NEON */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '15px',
        color: '#00ffff',
        letterSpacing: '3px',
        textShadow: '0 0 15px #00ffff, 2px 2px 0 #000',
        zIndex: 100,
        animation: 'footer-fade 3s ease-in-out infinite'
      }}>
        (C) 1993 ARCADE-TRONIX • VGA • 640x480 • STEREO SOUND
      </div>

      <style>{`
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes text-urgent-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.98); }
        }
        @keyframes ready-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.03); }
        }
        @keyframes explosion-core {
          0% { 
            transform: scale(0.2) rotate(0deg); 
            opacity: 1;
          }
          50% { 
            transform: scale(1.2) rotate(180deg); 
            opacity: 0.9;
          }
          100% { 
            transform: scale(2.5) rotate(360deg); 
            opacity: 0;
          }
        }
        @keyframes explosion-ring {
          0% { 
            transform: scale(0.4); 
            opacity: 1;
          }
          100% { 
            transform: scale(3); 
            opacity: 0;
          }
        }
        @keyframes logo-float {
          0%, 100% { transform: translate(-50%, 0) translateY(0); }
          50% { transform: translate(-50%, 0) translateY(-12px); }
        }
        @keyframes subtitle-glow {
          0%, 100% { 
            textShadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 3px 3px 0 #000;
          }
          50% { 
            textShadow: 0 0 30px #00ffff, 0 0 60px #00ffff, 3px 3px 0 #000;
          }
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        @keyframes score-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes panel-entrance {
          from { 
            transform: translateY(40px) scale(0.94); 
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1); 
            opacity: 1;
          }
        }
        @keyframes title-glitch {
          0%, 90%, 100% { transform: translateX(0); }
          92% { transform: translateX(-4px); }
          94% { transform: translateX(4px); }
          96% { transform: translateX(-3px); }
        }
        @keyframes button-press {
          0%, 100% { 
            transform: translateY(0); 
            border-style: outset;
          }
          50% { 
            transform: translateY(3px); 
            border-style: inset;
          }
        }
        @keyframes line-flicker {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes text-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes number-glow {
          0% { 
            transform: scale(1.4); 
            filter: brightness(2);
          }
          100% { 
            transform: scale(1); 
            filter: brightness(1);
          }
        }
        @keyframes coin-box-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes block-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes complete-flash {
          0% { 
            color: #00ffff; 
            transform: scale(1.3); 
            filter: brightness(2);
          }
          100% { 
            color: #00ff00; 
            transform: scale(1); 
            filter: brightness(1);
          }
        }
        @keyframes stripe-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(50px); }
        }
        @keyframes footer-fade {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
        @keyframes horizon-pulse {
          0%, 100% { 
            opacity: 0.8; 
            boxShadow: 0 0 30px #ff00ff, 0 0 60px #00ffff;
          }
          50% { 
            opacity: 1; 
            boxShadow: 0 0 50px #ff00ff, 0 0 100px #00ffff;
          }
        }
        @keyframes scanline-drift {
          from { transform: translateY(0); }
          to { transform: translateY(6px); }
        }
      `}</style>
    </div>
  )
}
