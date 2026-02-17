import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BootScreen } from "./components/arcade/boot";
import { MenuScreen } from "./components/arcade/menu";
import { GameLaunch } from "./components/arcade/gamelaunch";
import { GameDisplay } from "./components/arcade/gamedisplay";

function App() {
  const [isBooting, setIsBooting] = useState(true)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [displayGame, setDisplayGame] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [time, setTime] = useState(0)
  const [highScore, setHighScore] = useState(999999)
  const [scrollText, setScrollText] = useState(0)
  const [explosions, setExplosions] = useState<Array<{x: number, y: number, id: number}>>([])
  const [particles, setParticles] = useState<Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>>([])
  const [crtFlicker, setCrtFlicker] = useState(false)
  const [scanlineOffset, setScanlineOffset] = useState(0)
  const [pixelShift, setPixelShift] = useState(0)
  const [borderBlink, setBorderBlink] = useState(false)
  const [coinBlink, setCoinBlink] = useState(false)
  const [glitchLine, setGlitchLine] = useState(-1)
  const [logoShake, setLogoShake] = useState({x: 0, y: 0})

  const bootLines = [
    'ARCADE-TRONIX BIOS v2.41',
    'Copyright (C) 1991-1996',
    '',
    'Testing RAM............OK',
    'Testing ROM............OK', 
    'Testing VRAM...........OK',
    'Init Sound Blaster.....OK',
    'Init Joystick..........OK',
    'Init Coin Mech.........OK',
    'Loading game data......',
    '',
    'Press COIN to continue...'
  ]

  const marqueeText = '★ ARCADE ZONE ★ INSERT COIN ★ PLAY TO WIN ★ HIGH SCORES ★ '
  const scrollingMarquee = (marqueeText + marqueeText + marqueeText).substring(
    Math.floor(scrollText / 3) % marqueeText.length
  )

  const bootLineCount = Math.min(bootLines.length, Math.floor(time / 7))
  const progress = Math.min(100, coins * 10)

  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#000'
    document.body.style.imageRendering = 'pixelated'
    document.body.style.imageRendering = '-moz-crisp-edges'
    document.body.style.imageRendering = 'crisp-edges'

    // Logo shake - meer aggressive
    const logoShakeInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLogoShake({
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 6
        })
        setTimeout(() => setLogoShake({x: 0, y: 0}), 100)
      }
    }, 150)

    // CRT flicker
    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        setCrtFlicker(true)
        setTimeout(() => setCrtFlicker(false), 60)
      }
    }, 80)

    // Border blink animation
    const borderInterval = setInterval(() => {
      setBorderBlink(b => !b)
    }, 400)

    // Coin blink
    const coinBlinkInterval = setInterval(() => {
      setCoinBlink(b => !b)
    }, 250)

    // Scanline wobble
    const scanlineInterval = setInterval(() => {
      setScanlineOffset(Math.random() * 2)
    }, 50)

    // Pixel drift
    const pixelInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        setPixelShift(Math.random() * 3 - 1.5)
        setTimeout(() => setPixelShift(0), 100)
      }
    }, 150)

    // Random glitch line
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.92) {
        setGlitchLine(Math.floor(Math.random() * 20))
        setTimeout(() => setGlitchLine(-1), 100)
      }
    }, 200)

    // Particles update
    const particleInterval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.2
        }))
        .filter(p => p.y < window.innerHeight + 50)
      )
    }, 30)

    // COIN ANIMATIE met NEON PARTICLES
    const coinInterval = setInterval(() => {
      setCoins(prev => {
        if (prev < 10) {
          const newExplosion = {
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
            id: Date.now() + Math.random()
          }
          setExplosions(e => [...e, newExplosion])
          
          // NEON particles
          const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080', '#80ff00']
          for(let i = 0; i < 20; i++) {
            setTimeout(() => {
              setParticles(p => [...p, {
                x: newExplosion.x,
                y: newExplosion.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                id: Date.now() + Math.random()
              }])
            }, i * 15)
          }

          setTimeout(() => {
            setExplosions(e => e.filter(exp => exp.id !== newExplosion.id))
          }, 800)
        }
        if (prev >= 10) {
          clearInterval(coinInterval)
          // MEGA NEON explosion burst
          for(let i = 0; i < 40; i++) {
            setTimeout(() => {
              const x = Math.random() * window.innerWidth
              const y = Math.random() * window.innerHeight
              setExplosions(e => [...e, {
                x, y,
                id: Date.now() + Math.random()
              }])
              
              const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080']
              for(let j = 0; j < 10; j++) {
                setParticles(p => [...p, {
                  x, y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8 - 3,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  id: Date.now() + Math.random() + j
                }])
              }
            }, i * 40)
          }
          return 10
        }
        return prev + 1
      })
    }, 350)

    // TIME TICKER
    const timeInterval = setInterval(() => {
      setTime(t => t + 1)
      setHighScore(h => Math.max(0, h - 5))
      setScrollText(s => s + 1)
    }, 50)

    return () => {
      clearInterval(coinInterval)
      clearInterval(timeInterval)
      clearInterval(flickerInterval)
      clearInterval(scanlineInterval)
      clearInterval(pixelInterval)
      clearInterval(borderInterval)
      clearInterval(coinBlinkInterval)
      clearInterval(glitchInterval)
      clearInterval(particleInterval)
      clearInterval(logoShakeInterval)
    }
  }, [])

  if (isBooting) {
    return (
      <BootScreen
        coins={coins}
        time={time}
        highScore={highScore}
        scrollText={scrollText}
        explosions={explosions}
        particles={particles}
        crtFlicker={crtFlicker}
        scanlineOffset={scanlineOffset}
        pixelShift={pixelShift}
        borderBlink={borderBlink}
        coinBlink={coinBlink}
        glitchLine={glitchLine}
        logoShake={logoShake}
        bootLines={bootLines}
        bootLineCount={bootLineCount}
        progress={progress}
        scrollingMarquee={scrollingMarquee}
        onStart={() => setIsBooting(false)}
      />
    )
  }

  if (displayGame) {
    return (
      <GameDisplay
        gameId={displayGame}
        onExit={() => {
          setDisplayGame(null)
          setSelectedGame(null)
        }}
      />
    )
  }

  return (
    selectedGame ? (
      <GameLaunch
        gameId={selectedGame}
        onBack={() => setSelectedGame(null)}
        onOpenDisplay={setDisplayGame}
      />
    ) : (
      <MenuScreen particles={particles} onSelectGame={setSelectedGame} />
    )
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
