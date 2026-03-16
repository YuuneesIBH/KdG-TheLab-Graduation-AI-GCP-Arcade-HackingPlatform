import { useEffect, useRef, useState } from 'react'
type Phase = 'idle' | 'crt-roll' | 'matrix' | 'breach' | 'done'
function MatrixCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const CHARS  = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF></?!@#$%^&*][{}|;:,.~'
    const COL_W  = 16
    const cols   = Math.ceil(canvas.width / COL_W)
    const drops  = Array.from({ length: cols }, () => Math.random() * -60)
    const speeds = Array.from({ length: cols }, () => 0.5 + Math.random() * 1.1)

    let raf = 0
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.07)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < cols; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const y    = drops[i] * COL_W

        if (Math.random() > 0.92) {
          ctx.fillStyle  = '#ffffff'
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur  = 18
        } else if (i % 9 === 0) {
          ctx.fillStyle  = '#00ffaa'
          ctx.shadowColor = '#00ffaa'
          ctx.shadowBlur  = 10
        } else {
          ctx.fillStyle  = '#00ff41'
          ctx.shadowColor = '#00ff41'
          ctx.shadowBlur  = 6
        }

        ctx.font = `bold ${COL_W}px "Courier New", monospace`
        ctx.fillText(char, i * COL_W, y)
        ctx.shadowBlur = 0

        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i] += speeds[i]
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
const HACK_LINES = [
  'INITIALIZING EXPLOIT CHAIN...',
  'BYPASSING FIREWALL LAYER 1... [OK]',
  'BYPASSING FIREWALL LAYER 2... [OK]',
  'CRACKING AES-256 HANDSHAKE...',
  'INJECTING PAYLOAD: 0xDEADBEEF',
  'GPIO BUS PROBE: ACTIVE CHANNELS VERIFIED',
  'IR TX/RX MODULE LINK: SYNCHRONIZED 100%',
  'NFC CLONE OPERATION: SUCCESS',
  'ELEVATING PRIVILEGES TO ROOT...',
  '> ROOT ACCESS GRANTED',
  '> WELCOME TO GUPPY TERMINAL',
]

function GlitchLines({ active }: { active: boolean }) {
  const [visible, setVisible]     = useState<string[]>([])
  const [glitchIdx, setGlitchIdx] = useState(-1)

  useEffect(() => {
    if (!active) { setVisible([]); return }
    let i = 0
    let addTimer = 0
    let glitchTimer = 0
    const add = () => {
      if (i >= HACK_LINES.length) return
      setVisible(prev => [...prev, HACK_LINES[i]])
      setGlitchIdx(i)
      glitchTimer = window.setTimeout(() => setGlitchIdx(-1), 100)
      i++
      addTimer = window.setTimeout(add, 130 + Math.random() * 100)
    }
    addTimer = window.setTimeout(add, 300)
    return () => {
      clearTimeout(addTimer)
      clearTimeout(glitchTimer)
    }
  }, [active])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '0 12vw',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      {visible.map((line, idx) => {
        const isGlitching = idx === glitchIdx
        const isSuccess   = line.includes('SUCCESS') || line.includes('GRANTED') || line.includes('WELCOME') || line.includes('ROOT')
        const isWarning   = line.includes('DETECTED') || line.includes('CAPTURED')
        return (
          <div key={idx} style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 'clamp(11px, 1.3vw, 16px)',
            letterSpacing: '2px',
            color: isSuccess ? '#00ff88' : isWarning ? '#ffff00' : '#00ccff',
            textShadow: isGlitching
              ? '3px 0 #ff003c, -3px 0 #00ffff, 0 0 25px currentColor'
              : '0 0 8px currentColor',
            marginBottom: '7px',
            transform: isGlitching
              ? `translateX(${(Math.random() - 0.5) * 14}px)`
              : 'none',
            transition: 'transform 0.04s',
            opacity: idx < visible.length - 1 ? 0.8 : 1,
          }}>
            <span style={{ color: '#00ff41', marginRight: '10px', opacity: 0.7 }}>&gt;</span>
            {line}
            {idx === visible.length - 1 && (
              <span style={{ animation: 'htBlink 0.5s steps(2) infinite', marginLeft: '6px', color: '#00ff41' }}>▌</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
function BreachSplash({ active }: { active: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      pointerEvents: 'none',
      opacity: active ? 1 : 0,
      transition: 'opacity 0.25s',
    }}>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 'clamp(28px, 5.5vw, 68px)',
        fontWeight: 900,
        letterSpacing: '8px',
        color: '#00ff88',
        textShadow: '0 0 40px #00ff88, 0 0 80px #00ff88, 5px 0 #ff003c, -5px 0 #00ffff',
        animation: active ? 'htShake 0.12s infinite' : 'none',
        textAlign: 'center',
        lineHeight: 1.1,
      }}>
        ACCESS GRANTED
      </div>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 'clamp(10px, 1.4vw, 16px)',
        color: '#00ccff',
        letterSpacing: '5px',
        marginTop: '24px',
        textShadow: '0 0 15px #00ccff',
        animation: 'htBlink 0.45s steps(2) infinite',
      }}>
        GUPPY TERMINAL - READY
      </div>
<div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 'clamp(11px, 1.2vw, 15px)',
        color: '#00ff88',
        letterSpacing: '6px',
        marginTop: '48px',
        textShadow: '0 0 20px #00ff88',
        animation: 'htBlink 0.8s steps(2) infinite',
        border: '1px solid #00ff88',
        padding: '10px 28px',
        boxShadow: '0 0 20px rgba(0,255,136,0.3), inset 0 0 10px rgba(0,255,136,0.05)',
      }}>
        [ PRESS ENTER TO CONTINUE ]
      </div>
    </div>
  )
}
export function HackButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: hover
          ? 'linear-gradient(135deg, #001a00, #003300)'
          : 'linear-gradient(135deg, #000d00, #001800)',
        border: `2px solid ${hover ? '#00ff88' : '#00aa44'}`,
        color: hover ? '#00ff88' : '#00cc55',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        padding: '8px 18px',
        cursor: 'pointer',
        textShadow: hover ? '0 0 12px #00ff88, 0 0 25px #00ff88' : '0 0 8px #00cc55',
        boxShadow: hover
          ? '0 0 20px rgba(0,255,136,0.5), inset 0 0 12px rgba(0,255,136,0.1)'
          : '0 0 8px rgba(0,200,80,0.2)',
        transition: 'all 0.15s ease',
        clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 7,
        width: 5, height: 5,
        background: hover ? '#00ff88' : '#00aa44',
        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        transition: 'all 0.15s',
      }} />
      ⬡ HACK TERMINAL
    </button>
  )
}
export function HackTransition({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase]           = useState<Phase>('idle')
  const [rollHeight, setRollHeight] = useState(0)
  const [scanlines, setScanlines]   = useState(0)
  const rollRef                     = useRef<number | null>(null)
  const phaseRef                    = useRef(phase)
  const activePadIndexRef           = useRef<number | null>(null)
  phaseRef.current = phase
  const trigger = () => {
    if (phaseRef.current !== 'idle') return
    setPhase('crt-roll')
  }

  useEffect(() => {
    window.__hackTransitionTrigger = trigger
    return () => { delete window.__hackTransitionTrigger }
  }, [])
  useEffect(() => {
    if (phase !== 'crt-roll') return
    let h = 0
    let matrixTimer = 0
    const step = () => {
      h = Math.min(h + 3.5, 100)
      setRollHeight(h)
      if (h < 100) {
        rollRef.current = requestAnimationFrame(step)
      } else {
        matrixTimer = window.setTimeout(() => setPhase('matrix'), 80)
      }
    }
    rollRef.current = requestAnimationFrame(step)
    return () => {
      if (rollRef.current !== null) cancelAnimationFrame(rollRef.current)
      clearTimeout(matrixTimer)
    }
  }, [phase])
  useEffect(() => {
    if (phase !== 'matrix') return
    let y = 0
    const iv = setInterval(() => { y = (y + 1) % 8; setScanlines(y) }, 60)
    const t  = setTimeout(() => setPhase('breach'), 2800)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [phase])
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => {
    if (phase !== 'breach') return
    let active = true
    let armed  = false
    let raf = 0
    let actionWasPressed = false

    const complete = () => {
      if (!active || !armed) return
      active = false
      window.removeEventListener('keydown', handleKey, true)
      cancelAnimationFrame(raf)
      clearTimeout(armTimer)
      setPhase('done')
      onCompleteRef.current()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (!active || !armed) return
      const key = e.key.toLowerCase()
      const isActionKey = key === 'enter' || key === ' ' || key === 'spacebar' || ['w', 'x', 'c', 'v', 'b', 'n'].includes(key)
      if (!isActionKey && e.code !== 'NumpadEnter') return
      e.stopImmediatePropagation()
      complete()
    }

    const pollGamepad = () => {
      if (!active) return
      const pads = Array.from(navigator.getGamepads?.() ?? [])
        .filter((pad): pad is Gamepad => Boolean(pad && pad.connected))
        .sort((a, b) => a.index - b.index)

      if (activePadIndexRef.current === null || !pads.some((pad) => pad.index === activePadIndexRef.current)) {
        activePadIndexRef.current = pads[0]?.index ?? null
      }

      for (const pad of pads) {
        const axisMoved = Math.abs(pad.axes[1] ?? 0) > 0.35 || Math.abs(pad.axes[0] ?? 0) > 0.35
        const buttonPressed = pad.buttons?.some((button) => button?.pressed)
        if (axisMoved || buttonPressed) {
          activePadIndexRef.current = pad.index
          break
        }
      }

      const gamepad = pads.find((pad) => pad.index === activePadIndexRef.current)
      const actionPressed = Boolean(gamepad?.buttons[0]?.pressed) || Boolean(gamepad?.buttons[9]?.pressed)

      if (armed && actionPressed && !actionWasPressed) {
        complete()
        return
      }

      actionWasPressed = actionPressed
      raf = requestAnimationFrame(pollGamepad)
    }

    window.addEventListener('keydown', handleKey, true)
    const armTimer = window.setTimeout(() => { armed = true }, 500)
    pollGamepad()

    return () => {
      active = false
      clearTimeout(armTimer)
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', handleKey, true)
    }
  }, [phase])
  const [removed, setRemoved] = useState(false)
  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(() => setRemoved(true), 450)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'idle' || removed) return null

  const showMatrix = phase === 'matrix' || phase === 'breach' || phase === 'done'
  const showBreach = phase === 'breach'
  const isDone     = phase === 'done'

  return (
    <>
      <style>{`
        @keyframes htBlink {
          0%,49%  { opacity:1; }
          50%,100% { opacity:0; }
        }
        @keyframes htShake {
          0%   { transform: translate(0,0)      skewX(0deg);    }
          20%  { transform: translate(-3px,1px)  skewX(-1deg);   }
          40%  { transform: translate(3px,-1px)  skewX(1deg);    }
          60%  { transform: translate(-2px,2px)  skewX(-0.5deg); }
          80%  { transform: translate(2px,-1px)  skewX(0.5deg);  }
          100% { transform: translate(0,0)       skewX(0deg);    }
        }
        @keyframes htCrtOn {
          0%   { transform: scaleY(0.02) scaleX(1.04); filter: brightness(4); }
          40%  { transform: scaleY(1) scaleX(1);        filter: brightness(1.3); }
          100% { transform: scaleY(1) scaleX(1);        filter: brightness(1); }
        }
        @keyframes htFlicker {
          0%,100% { opacity:1;    }
          8%      { opacity:0.82; }
          9%      { opacity:1;    }
          50%     { opacity:0.94; }
          51%     { opacity:1;    }
        }
        @keyframes htGlitchBar {
          0%   { top:10%; width:60%; opacity:0.7; }
          25%  { top:35%; width:30%; opacity:0.5; }
          50%  { top:72%; width:80%; opacity:0.8; }
          75%  { top:55%; width:45%; opacity:0.6; }
          100% { top:10%; width:60%; opacity:0.7; }
        }
        @keyframes htGlitchBar2 {
          0%   { top:80%; width:40%; }
          33%  { top:20%; width:70%; }
          66%  { top:50%; width:20%; }
          100% { top:80%; width:40%; }
        }
      `}</style>
<div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: phase === 'crt-roll' ? `${rollHeight}vh` : '100vh',
        zIndex: 9000,
        overflow: 'hidden',
        animation: showMatrix ? 'htCrtOn 0.35s ease-out forwards' : 'none',
        opacity: isDone ? 0 : 1,
        transition: isDone ? 'opacity 0.4s ease-out' : 'none',
        pointerEvents: isDone ? 'none' : 'auto',
      }}>
<div style={{
          position: 'absolute',
          inset: 0,
          background: '#000000',
          animation: showMatrix ? 'htFlicker 3.5s infinite' : 'none',
        }}>
<MatrixCanvas active={showMatrix} />
<GlitchLines active={showMatrix && !showBreach} />
<BreachSplash active={showBreach} />
{showMatrix && (
            <>
              <div style={{
                position: 'absolute', left: 0, height: '2px',
                background: 'rgba(0,200,255,0.7)',
                mixBlendMode: 'screen',
                animation: 'htGlitchBar 0.9s steps(4) infinite',
                zIndex: 15,
              }} />
              <div style={{
                position: 'absolute', left: '20%', height: '1px',
                background: 'rgba(255,0,60,0.5)',
                mixBlendMode: 'screen',
                animation: 'htGlitchBar2 1.3s steps(3) infinite',
                zIndex: 15,
              }} />
            </>
          )}
<div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 2px, transparent 2px, transparent 4px)',
            transform: `translateY(${scanlines}px)`,
            pointerEvents: 'none',
            zIndex: 20, opacity: 0.65,
          }} />
<div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.92) 100%)',
            pointerEvents: 'none', zIndex: 21,
          }} />
        </div>
{phase === 'crt-roll' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px',
            background: 'linear-gradient(180deg, rgba(0,255,136,0.9) 0%, rgba(0,200,100,0.4) 60%, transparent 100%)',
            boxShadow: '0 0 20px #00ff88, 0 0 40px #00aa44',
            zIndex: 25,
          }} />
        )}
      </div>
    </>
  )
}
