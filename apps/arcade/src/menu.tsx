import React from 'react'

type MenuProps = {
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
}

export function MenuScreen({ particles }: MenuProps) {
  return (
    <div style={{ 
      background: 'radial-gradient(circle at 50% 50%, #1a0033, #000000)',
      minHeight: '100vh',
      margin: 0,
      padding: '40px',
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
        background: '#000000',
        border: '8px solid #00ffff',
        padding: '8px',
        maxWidth: '900px',
        margin: '0 auto',
        boxShadow: '0 0 50px #00ffff, 16px 16px 0 rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 10,
        animation: 'panel-entrance 1s ease-out'
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #1a0033, #000033)',
          border: '5px solid #ff00ff',
          padding: '50px',
          textAlign: 'center',
          boxShadow: 'inset 0 0 50px rgba(255,0,255,0.3)'
        }}>
          <h1 style={{
            fontSize: '72px',
            color: '#ffff00',
            textShadow: '0 0 40px #ffff00, 0 0 80px #ffff00, 8px 8px 0 #000',
            marginBottom: '35px',
            letterSpacing: '10px',
            animation: 'title-glitch 5s ease-in-out infinite'
          }}>
            ▓▓ GAME SELECT ▓▓
          </h1>
          <p style={{
            fontSize: '38px',
            color: '#00ffff',
            textShadow: '0 0 30px #00ffff, 0 0 60px #00ffff, 5px 5px 0 #000',
            letterSpacing: '6px',
            animation: 'ready-bounce 0.8s ease-in-out infinite'
          }}>
            PRESS START!
          </p>
        </div>
      </div>
    </div>
  )
}
