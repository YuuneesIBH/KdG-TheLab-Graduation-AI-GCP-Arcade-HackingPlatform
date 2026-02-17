import React, { useEffect, useRef, useState } from 'react'

const MENU_ITEMS = [
  { key: 'scan',     label: 'RF SCANNER',    prefix: '[ 01 ]', color: '#00ff88' },
  { key: 'nfc',      label: 'NFC / RFID',    prefix: '[ 02 ]', color: '#00ccff' },
  { key: 'subghz',   label: 'SUB-GHZ',       prefix: '[ 03 ]', color: '#00ccff' },
  { key: 'badusb',   label: 'BAD USB',        prefix: '[ 04 ]', color: '#ff4444' },
  { key: 'ir',       label: 'INFRARED',       prefix: '[ 05 ]', color: '#00ccff' },
  { key: 'bt',       label: 'BLUETOOTH',      prefix: '[ 06 ]', color: '#00ccff' },
  { key: 'gpio',     label: 'GPIO CONTROL',   prefix: '[ 07 ]', color: '#ffff00' },
  { key: 'terminal', label: 'OPEN TERMINAL',  prefix: '[ 08 ]', color: '#00ff88' },
]

// ── Matrix rain background ────────────────────────────────────────
function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()

    const CHARS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF></?!@#$%^&*'
    const COL_W = 16
    const cols  = Math.ceil(canvas.width / COL_W)
    const drops = Array.from({ length: cols }, () => Math.random() * -80)
    const spds  = Array.from({ length: cols }, () => 0.3 + Math.random() * 0.6)

    let raf: number
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < cols; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.fillStyle  = Math.random() > 0.97 ? '#ffffff' : i % 11 === 0 ? '#00ffaa' : '#00ff41'
        ctx.shadowColor = '#00ff41'
        ctx.shadowBlur  = 4
        ctx.font = `${COL_W}px "Courier New", monospace`
        ctx.fillText(char, i * COL_W, drops[i] * COL_W)
        ctx.shadowBlur = 0
        if (drops[i] * COL_W > canvas.height && Math.random() > 0.978) drops[i] = 0
        drops[i] += spds[i]
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none' }} />
}

// ── Typewriter hook ───────────────────────────────────────────────
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])
  return displayed
}

export default function Menu({ onSelect }: { onSelect?: (key: string) => void }) {
  const [selected, setSelected]     = useState(0)
  const [entered, setEntered]       = useState(false)
  const [glitch, setGlitch]         = useState(false)
  const [scanlineY, setScanlineY]   = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [booting, setBooting]       = useState(true)   // brief "ACCESS GRANTED → menu" flash

  const titleText  = useTypewriter(booting ? '' : 'FLIPPER ZERO // SELECT MODULE', 35)

  // Boot-in delay
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 400)
    return () => clearTimeout(t)
  }, [])

  // Scanline crawl
  useEffect(() => {
    const iv = setInterval(() => setScanlineY(y => (y + 1) % 6), 80)
    return () => clearInterval(iv)
  }, [])

  // Cursor blink
  useEffect(() => {
    const iv = setInterval(() => setShowCursor(v => !v), 530)
    return () => clearInterval(iv)
  }, [])

  // Random glitch
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 100)
    }, 5000 + Math.random() * 3000)
    return () => clearInterval(iv)
  }, [])

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp')   setSelected(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length)
      if (e.key === 'ArrowDown') setSelected(prev => (prev + 1) % MENU_ITEMS.length)
      if (e.key === 'Enter') {
        setEntered(true)
        setTimeout(() => setEntered(false), 200)
        onSelect?.(MENU_ITEMS[selected].key)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selected])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#000000',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
      filter: glitch ? 'hue-rotate(90deg) brightness(1.3)' : 'none',
      transition: 'filter 0.05s',
    }}>
      {/* Matrix bg */}
      <MatrixBg />

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 2px, transparent 2px, transparent 4px)',
        transform: `translateY(${scanlineY}px)`,
        pointerEvents: 'none', zIndex: 10, opacity: 0.7,
      }} />

      {/* CRT vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.95) 100%)',
        pointerEvents: 'none', zIndex: 11,
      }} />

      {/* Glitch bar */}
      {glitch && (
        <div style={{
          position: 'absolute', top: `${20 + Math.random() * 60}%`,
          left: 0, right: 0, height: '2px',
          background: 'rgba(0,255,136,0.6)', mixBlendMode: 'screen', zIndex: 12,
        }} />
      )}

      {/* ── HEADER BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, #001a00, #000d00)',
        borderBottom: '2px solid #00ff41',
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 20,
        boxShadow: '0 0 20px rgba(0,255,65,0.3)',
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 8px #ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', boxShadow: '0 0 8px #ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28ca41', boxShadow: '0 0 8px #28ca41' }} />
        </div>

        {/* Title */}
        <div style={{
          color: '#00ff41',
          fontSize: '14px',
          letterSpacing: '4px',
          textShadow: '0 0 12px #00ff41',
          fontWeight: 'bold',
        }}>
          {titleText}{showCursor ? '█' : ' '}
        </div>

        {/* Status */}
        <div style={{
          color: '#00ff88',
          fontSize: '12px',
          letterSpacing: '3px',
          textShadow: '0 0 8px #00ff88',
          animation: 'menu-pulse 2s ease-in-out infinite',
        }}>
          ◉ ROOT ACCESS
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
        paddingTop: '60px',
        paddingBottom: '40px',
      }}>

        {/* ASCII logo */}
        <pre style={{
          color: '#00ff41',
          textShadow: '0 0 10px #00ff41',
          fontSize: 'clamp(5px, 0.85vw, 11px)',
          lineHeight: 1.2,
          letterSpacing: '1px',
          marginBottom: '28px',
          textAlign: 'center',
          userSelect: 'none',
          animation: 'menu-logo-glow 3s ease-in-out infinite',
        }}>{`
███████╗██╗     ██╗██████╗ ██████╗ ███████╗██████╗
██╔════╝██║     ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗
█████╗  ██║     ██║██████╔╝██████╔╝█████╗  ██████╔╝
██╔══╝  ██║     ██║██╔═══╝ ██╔═══╝ ██╔══╝  ██╔══██╗
██║     ███████╗██║██║     ██║     ███████╗██║  ██║
╚═╝     ╚══════╝╚═╝╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═╝`}
        </pre>

        {/* Subtitle */}
        <div style={{
          color: '#00ccff',
          fontSize: '11px',
          letterSpacing: '5px',
          textShadow: '0 0 10px #00ccff',
          marginBottom: '32px',
          opacity: 0.8,
        }}>
          ↑ ↓ NAVIGATE &nbsp;│&nbsp; ENTER SELECT &nbsp;│&nbsp; ESC BACK
        </div>

        {/* Menu panel */}
        <div style={{
          border: '1px solid #00ff41',
          background: 'rgba(0,10,0,0.85)',
          boxShadow: '0 0 30px rgba(0,255,65,0.2), inset 0 0 20px rgba(0,255,65,0.05)',
          padding: '6px',
          width: 'min(480px, 88vw)',
          backdropFilter: 'blur(4px)',
        }}>
          {/* Panel header */}
          <div style={{
            background: 'linear-gradient(90deg, #003300, #001a00)',
            borderBottom: '1px solid #004400',
            padding: '8px 16px',
            marginBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#00ff41', fontSize: '11px', letterSpacing: '3px' }}>MODULE SELECT</span>
            <span style={{ color: '#004400', fontSize: '10px', letterSpacing: '2px' }}>v2.4.1</span>
          </div>

          {/* Items */}
          {MENU_ITEMS.map((item, i) => {
            const isSelected = i === selected
            const isEntering = isSelected && entered
            return (
              <div
                key={item.key}
                onClick={() => setSelected(i)}
                onDoubleClick={() => onSelect?.(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 16px',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'linear-gradient(90deg, rgba(0,255,65,0.12), rgba(0,255,65,0.04))'
                    : 'transparent',
                  borderLeft: isSelected ? `3px solid ${item.color}` : '3px solid transparent',
                  transition: 'all 0.08s ease',
                  transform: isEntering ? 'translateX(4px)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Scan line on hover */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(90deg, ${item.color}08, transparent)`,
                    animation: 'menu-scan 1.5s linear infinite',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Arrow */}
                <span style={{
                  color: item.color,
                  fontSize: '12px',
                  width: '16px',
                  textShadow: isSelected ? `0 0 10px ${item.color}` : 'none',
                  flexShrink: 0,
                }}>
                  {isSelected ? '▶' : ' '}
                </span>

                {/* Prefix */}
                <span style={{
                  color: isSelected ? item.color : '#003300',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  marginRight: '12px',
                  textShadow: isSelected ? `0 0 8px ${item.color}` : 'none',
                  flexShrink: 0,
                  transition: 'all 0.08s',
                }}>
                  {item.prefix}
                </span>

                {/* Label */}
                <span style={{
                  color: isSelected ? '#ffffff' : '#00aa33',
                  fontSize: '13px',
                  letterSpacing: '3px',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  textShadow: isSelected ? `0 0 12px ${item.color}, 0 0 25px ${item.color}` : 'none',
                  flex: 1,
                  transition: 'all 0.08s',
                }}>
                  {item.label}
                </span>

                {/* Cursor */}
                {isSelected && (
                  <span style={{
                    color: item.color,
                    fontSize: '13px',
                    opacity: showCursor ? 1 : 0,
                    textShadow: `0 0 8px ${item.color}`,
                    marginLeft: '8px',
                  }}>
                    ▌
                  </span>
                )}
              </div>
            )
          })}

          {/* Panel footer */}
          <div style={{
            borderTop: '1px solid #002200',
            marginTop: '4px',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#003300', fontSize: '10px', letterSpacing: '2px' }}>
              {String(selected + 1).padStart(2, '0')}/{String(MENU_ITEMS.length).padStart(2, '0')}
            </span>
            <span style={{
              color: '#00ff41',
              fontSize: '10px',
              letterSpacing: '2px',
              animation: 'menu-pulse 1.2s steps(2) infinite',
            }}>
              PRESS ENTER TO EXECUTE
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <div style={{
          marginTop: '20px',
          color: '#002200',
          fontSize: '10px',
          letterSpacing: '3px',
          textAlign: 'center',
        }}>
          FLIPPER ZERO TERMINAL &nbsp;//&nbsp; UNAUTHORIZED ACCESS PROHIBITED
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, transparent, rgba(0,255,65,0.04))',
        borderTop: '1px solid #001a00',
        padding: '6px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 20,
      }}>
        <span style={{ color: '#002200', fontSize: '10px', letterSpacing: '2px' }}>SYS::ACTIVE</span>
        <span style={{ color: '#002200', fontSize: '10px', letterSpacing: '2px' }}>MEM::OK</span>
        <span style={{ color: '#002200', fontSize: '10px', letterSpacing: '2px' }}>RF::STANDBY</span>
      </div>

      <style>{`
        @keyframes menu-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes menu-logo-glow {
          0%, 100% { text-shadow: 0 0 10px #00ff41; }
          50%      { text-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41; }
        }
        @keyframes menu-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}