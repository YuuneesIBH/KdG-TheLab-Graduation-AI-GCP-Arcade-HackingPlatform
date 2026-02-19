import React, { useEffect, useRef, useState, useCallback } from 'react'

const MENU_ITEMS = [
  { key: 'nfc',      cmd: 'flipper run nfc_clone',       desc: 'Read/emulate NFC & RFID cards',    color: '#00ccff', tag: '[NFC]'  },
  { key: 'badusb',   cmd: 'flipper run badusb_inject',   desc: 'HID keystroke injection',           color: '#ff4444', tag: '[USB]'  },
  { key: 'ir',       cmd: 'flipper run ir_blast',        desc: 'Infrared signal transmitter',       color: '#ff8800', tag: '[IR]'   },
  { key: 'gpio',     cmd: 'flipper run gpio_ctrl',       desc: 'GPIO pin control & logic analyzer', color: '#ffff00', tag: '[GPIO]' },
  { key: 'terminal', cmd: 'flipper shell --root',        desc: 'Open interactive root shell',       color: '#00ff88', tag: '[SH]'   },
]

type DeviceStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

type HackerMenuProps = {
  onSelect?: (key: string) => void
  onBack?: () => void
  deviceStatus?: DeviceStatus
  lastDeviceLine?: string
}

function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const CHARS = 'アイウエオカキクケコ0123456789ABCDEF></?!@#$%^&*'
    const COL_W = 16
    const cols = Math.ceil(canvas.width / COL_W)
    const drops = Array.from({ length: cols }, () => Math.random() * -80)
    const spds = Array.from({ length: cols }, () => 0.3 + Math.random() * 0.5)
    let raf: number
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.055)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < cols; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.fillStyle = Math.random() > 0.97 ? '#ffffff' : i % 11 === 0 ? '#00ffaa' : '#00ff41'
        ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 3
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
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }} />
}

export default function Menu({ onSelect, onBack, deviceStatus, lastDeviceLine }: HackerMenuProps) {
  const [selected, setSelected]   = useState(0)
  const [entered, setEntered]     = useState(false)
  const [glitch, setGlitch]       = useState(false)
  const [scanY, setScanY]         = useState(0)
  const [blink, setBlink]         = useState(true)
  const [booted, setBooted]       = useState(false)
  const [bootLines, setBootLines] = useState<string[]>([])
  const selectedRef               = useRef(selected)
  selectedRef.current = selected

  const BOOT = [
    '> Flipper Zero OS v0.91.1  —  ARM Cortex-M4 @ 64MHz',
    '> Checking hardware...  Flash: OK  RAM: OK  SD: MOUNTED',
    '> ST25R3916: OK  |  IR: OK  |  GPIO: OK',
    '> Root access granted. Loading module selector...',
    '',
  ]

  useEffect(() => {
    let i = 0
    const next = () => {
      if (i >= BOOT.length) { setBooted(true); return }
      setBootLines(p => [...p, BOOT[i++]])
      setTimeout(next, 110)
    }
    setTimeout(next, 300)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setScanY(y => (y + 1) % 6), 80)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setBlink(v => !v), 500)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true); setTimeout(() => setGlitch(false), 80)
    }, 5000 + Math.random() * 4000)
    return () => clearInterval(iv)
  }, [])

  const moveUp   = useCallback(() => setSelected(p => (p - 1 + MENU_ITEMS.length) % MENU_ITEMS.length), [])
  const moveDown = useCallback(() => setSelected(p => (p + 1) % MENU_ITEMS.length), [])
  const confirm  = useCallback(() => {
    setEntered(true)
    setTimeout(() => setEntered(false), 150)
    onSelect?.(MENU_ITEMS[selectedRef.current].key)
  }, [onSelect])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveUp() }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveDown() }
      if (e.key === 'Enter')     confirm()
      if (e.key === 'Escape')    onBack?.()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [moveUp, moveDown, confirm])

  useEffect(() => {
    let raf: number; let cd = 0
    const poll = () => {
      const gp = Array.from(navigator.getGamepads?.() ?? []).find(g => g?.connected)
      if (gp) {
        const now = Date.now(); const ay = gp.axes[1] ?? 0
        if (now > cd) {
          if (ay < -0.5 || gp.buttons[12]?.pressed) { moveUp();   cd = now + 170 }
          if (ay >  0.5 || gp.buttons[13]?.pressed) { moveDown(); cd = now + 170 }
          if (gp.buttons[0]?.pressed)               { confirm();  cd = now + 400 }
        }
      }
      raf = requestAnimationFrame(poll)
    }
    poll()
    return () => cancelAnimationFrame(raf)
  }, [moveUp, moveDown, confirm])

  const item = MENU_ITEMS[selected]
  const hardwareLabel = deviceStatus?.connected
    ? `HW::ONLINE ${deviceStatus.portPath ?? ''}`.trim()
    : deviceStatus?.connecting
      ? 'HW::CONNECTING'
      : 'HW::OFFLINE'
  const hardwareColor = deviceStatus?.connected
    ? '#00ff88'
    : deviceStatus?.connecting
      ? '#ffff00'
      : '#ff4444'

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#000',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Courier New", Courier, monospace',
      filter: glitch ? 'hue-rotate(80deg) brightness(1.3)' : 'none',
      transition: 'filter 0.04s',
    }}>
      <MatrixBg />

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
        backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.42) 0px,rgba(0,0,0,0.42) 2px,transparent 2px,transparent 4px)',
        transform: `translateY(${scanY}px)`, opacity: 0.7,
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
        background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.97) 100%)',
      }} />

      {glitch && <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px', zIndex: 7,
        top: `${25 + Math.random() * 50}%`,
        background: 'rgba(0,255,136,0.55)', mixBlendMode: 'screen',
      }} />}

      {/* HEADER */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        borderBottom: '1px solid #00ff41',
        background: 'rgba(0,6,0,0.97)',
        padding: '6px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 0 16px rgba(0,255,65,0.15)',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#ff5f57','#ffbd2e','#28ca41'].map((c,i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, boxShadow:`0 0 5px ${c}` }} />
          ))}
        </div>
        <span style={{ color:'#00ff41', fontSize:'11px', letterSpacing:'4px', textShadow:'0 0 10px #00ff41', fontWeight:'bold' }}>
          FLIPPER ZERO // TERMINAL
        </span>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <span style={{ color: hardwareColor, fontSize:'10px', letterSpacing:'2px', textShadow:`0 0 6px ${hardwareColor}` }}>
            {hardwareLabel}
          </span>
          <span style={{ color:'#00ff88', fontSize:'10px', letterSpacing:'2px', textShadow:'0 0 6px #00ff88' }}>◉ ROOT</span>
          <button onClick={() => onBack?.()} style={{
            background:'transparent', border:'1px solid #ff4444',
            color:'#ff4444', fontFamily:'inherit', fontSize:'10px',
            letterSpacing:'2px', padding:'2px 8px', cursor:'pointer',
          }}>✕ EXIT</button>
        </div>
      </div>

      {/* TERMINAL BODY */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingTop: '40px', paddingBottom: '32px',
        zIndex: 15,
      }}>
        <div style={{ width: 'min(820px, 90vw)', display: 'flex', flexDirection: 'column' }}>

          {/* Boot lines */}
          <div style={{ marginBottom: '14px' }}>
            {bootLines.map((line, i) => (
              <div key={i} style={{
                fontSize: '11px', lineHeight: '1.85',
                color: '#3a5a3a', letterSpacing: '0.5px',
              }}>{line || '\u00A0'}</div>
            ))}
          </div>

          {booted && (
            <div style={{
              border: '1px solid #00ff41',
              background: 'rgba(0,4,0,0.95)',
              boxShadow: '0 0 28px rgba(0,255,65,0.1), inset 0 0 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              {/* Titlebar */}
              <div style={{
                background: '#00ff41', color: '#000',
                padding: '3px 12px', fontSize: '10px',
                letterSpacing: '3px', fontWeight: 'bold',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>root@flipper:~  —  module-selector</span>
                <span>↑↓ NAV  |  ENTER RUN  |  ESC BACK</span>
              </div>

              {/* ls-style prompt */}
              <div style={{ padding: '10px 18px 4px', display:'flex', gap:'4px', alignItems:'center' }}>
                <span style={{ color:'#00cc44', fontSize:'12px' }}>root@flipper</span>
                <span style={{ color:'#555', fontSize:'12px' }}>:</span>
                <span style={{ color:'#4466cc', fontSize:'12px' }}>~</span>
                <span style={{ color:'#888', fontSize:'12px' }}>$</span>
                <span style={{ color:'#ddd', fontSize:'12px', letterSpacing:'1px' }}>flipper --list-modules</span>
              </div>
              <div style={{ padding:'0 18px 10px', fontSize:'10px', color:'#334433', letterSpacing:'0.5px', borderBottom:'1px solid #0a1a0a' }}>
                {MENU_ITEMS.length} modules available. Navigate with ↑↓ or joystick, press ENTER to execute.
              </div>

              {/* Items */}
              <div style={{ padding: '4px 0' }}>
                {MENU_ITEMS.map((it, i) => {
                  const isSel = i === selected
                  const isEntering = isSel && entered
                  return (
                    <div
                      key={it.key}
                      onClick={() => { setSelected(i); setTimeout(() => onSelect?.(it.key), 80) }}
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: '8px 18px',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(0,255,65,0.06)' : 'transparent',
                        borderLeft: `3px solid ${isSel ? it.color : 'transparent'}`,
                        transform: isEntering ? 'translateX(5px)' : 'none',
                        transition: 'background 0.06s, transform 0.06s',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {isSel && (
                        <div style={{
                          position:'absolute', inset:0, pointerEvents:'none',
                          background:`linear-gradient(90deg, ${it.color}10 0%, transparent 50%)`,
                          animation:'scanrow 2s linear infinite',
                        }} />
                      )}

                      {/* Line nr */}
                      <span style={{ fontSize:'10px', color:'#1a2a1a', width:'28px', flexShrink:0, userSelect:'none' }}>
                        {String(i + 1).padStart(2,' ')}
                      </span>

                      {/* Cursor */}
                      <span style={{
                        fontSize:'12px', color:it.color,
                        width:'16px', flexShrink:0,
                        textShadow: isSel ? `0 0 8px ${it.color}` : 'none',
                        opacity: isSel ? 1 : 0,
                        transition:'opacity 0.06s',
                      }}>▶</span>

                      {/* Tag */}
                      <span style={{
                        fontSize:'10px', letterSpacing:'1px', fontWeight:'bold',
                        color: isSel ? it.color : '#1d3a1d',
                        width:'54px', flexShrink:0,
                        textShadow: isSel ? `0 0 8px ${it.color}` : 'none',
                        transition:'all 0.06s',
                      }}>{it.tag}</span>

                      {/* THE COMMAND — main element */}
                      <span style={{
                        fontSize:'14px', letterSpacing:'2px',
                        color: isSel ? '#ffffff' : '#009922',
                        fontWeight: isSel ? 'bold' : 'normal',
                        textShadow: isSel ? `0 0 14px ${it.color}, 0 0 28px ${it.color}66` : 'none',
                        flex: 1,
                        transition:'all 0.06s',
                      }}>{it.cmd}</span>

                      {/* Comment */}
                      <span style={{
                        fontSize:'10px',
                        color: isSel ? '#3a5a3a' : '#162216',
                        letterSpacing:'0.5px',
                        textAlign:'right',
                        transition:'all 0.06s',
                        flexShrink:0,
                      }}># {it.desc}</span>

                      {/* Blink cursor */}
                      {isSel && (
                        <span style={{
                          fontSize:'14px', color:it.color,
                          marginLeft:'8px', flexShrink:0,
                          opacity: blink ? 1 : 0,
                          textShadow:`0 0 8px ${it.color}`,
                        }}>▌</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Active prompt at bottom */}
              <div style={{
                borderTop:'1px solid #081408',
                padding:'10px 18px',
                display:'flex', alignItems:'center', gap:'6px',
              }}>
                <span style={{ color:'#00cc44', fontSize:'12px' }}>root@flipper</span>
                <span style={{ color:'#555', fontSize:'12px' }}>:</span>
                <span style={{ color:'#4466cc', fontSize:'12px' }}>~</span>
                <span style={{ color:'#888', fontSize:'12px' }}>$</span>
                <span style={{
                  color: item.color, fontSize:'14px', letterSpacing:'2px',
                  fontWeight:'bold',
                  textShadow:`0 0 12px ${item.color}`,
                  transition:'all 0.12s',
                }}>{item.cmd}</span>
                <span style={{
                  fontSize:'14px', color: item.color,
                  opacity: blink ? 1 : 0,
                  textShadow:`0 0 8px ${item.color}`,
                }}>▌</span>
              </div>
            </div>
          )}

          {booted && (
            <div style={{ marginTop:'8px', display:'flex', gap:'20px', color:'#1a2a1a', fontSize:'10px', letterSpacing:'2px' }}>
              <span>↑↓  navigate</span>
              <span>ENTER  execute</span>
              <span>JOYSTICK  supported</span>
              <span>ESC  back</span>
              {lastDeviceLine && (
                <span style={{ maxWidth:'260px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  RX::{lastDeviceLine}
                </span>
              )}
              <span style={{ marginLeft:'auto' }}>{String(selected+1).padStart(2,'0')}/{String(MENU_ITEMS.length).padStart(2,'0')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:20,
        borderTop:'1px solid #0a140a',
        background:'rgba(0,0,0,0.85)',
        padding:'4px 20px',
        display:'flex', justifyContent:'space-between',
      }}>
        {['SYS::ACTIVE','MEM::OK','NFC::IDLE','IR::IDLE',hardwareLabel].map(s => (
          <span key={s} style={{ color:'#0d1a0d', fontSize:'9px', letterSpacing:'2px' }}>{s}</span>
        ))}
      </div>

      <style>{`
        @keyframes scanrow {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}
