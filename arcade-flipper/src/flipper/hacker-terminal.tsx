import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './hacker-terminal.css'
import Menu from './menu'

const BOOT_SEQUENCE = [
  '> FLIPPER ZERO TERMINAL v2.4.1',
  '> Initializing RF subsystems...',
  '> Loading BadUSB payloads... [OK]',
  '> Infrared library loaded... [OK]',
  '> Sub-GHz radio activated... [OK]',
  '> GPIO pins initialized... [OK]',
  '> NFC/RFID reader online... [OK]',
  '> Bluetooth stack ready... [OK]',
  '> === SYSTEM READY ===',
]

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const cols = Math.floor(canvas.width / 14)
    const drops = Array(cols).fill(1)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF></?!@#$%^&*'
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = i % 5 === 0 ? '#ffffff' : '#00ff41'
        ctx.font = '12px monospace'
        ctx.fillText(char, i * 14, y * 14)
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }
    const interval = setInterval(draw, 50)
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { clearInterval(interval); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="matrix-canvas" />
}

function BootScreen({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const [booted, setBooted] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const [fading, setFading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const triggered = useRef(false)
  const bootStarted = useRef(false)  // ← nieuw

  useEffect(() => {
    if (bootStarted.current) return  // ← voorkom dubbel
    bootStarted.current = true

    let i = 0
    const boot = () => {
      if (i < BOOT_SEQUENCE.length) {
        const line = BOOT_SEQUENCE[i]  // ← capture voor i++
        setLines(prev => [...prev, line])
        i++
        setTimeout(boot, 180)
      } else {
        setBooted(true)
      }
    }
    setTimeout(boot, 500)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 150)
    }, 4000)
    return () => clearInterval(glitchInterval)
  }, [])

  useEffect(() => {
    if (!booted) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !triggered.current) {
        triggered.current = true
        setFading(true)
        setTimeout(onDone, 800)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [booted, onDone])

  return (
    <div
      className={`terminal-wrapper ${glitch ? 'glitch' : ''} ${fading ? 'fade-out' : ''}`}
      style={{ width: '100vw', height: '100vh' }}
    >
      <MatrixRain />
      <div className="scanlines" />
      <div className="terminal-container" style={{ width: '100vw', height: '100vh', borderRadius: 0, border: 'none' }}>
        <div className="terminal-header">
          <div className="header-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="header-title">FLIPPER ZERO // HACK TERMINAL</span>
          <span className="header-status">◉ ONLINE</span>
        </div>
        <div className="terminal-body">
          <div className="terminal-output">
            {lines.map((line, i) => (
              <div key={i} className={`line ${line.includes('[OK]') ? 'ok' : line.includes('===') ? 'highlight' : ''}`}>
                {line}
              </div>
            ))}
            {booted && (
              <div className="press-enter">
                [ PRESS ENTER TO ACCESS TERMINAL ]
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState<'boot' | 'menu'>('boot')

  console.log('Current screen:', screen)  // ← voeg dit toe

  return screen === 'boot'
    ? <BootScreen onDone={() => {
        console.log('onDone called!')  // ← en dit
        setScreen('menu')
      }} />
    : <Menu />
}

createRoot(document.getElementById('hacker-root')!).render(<App />)