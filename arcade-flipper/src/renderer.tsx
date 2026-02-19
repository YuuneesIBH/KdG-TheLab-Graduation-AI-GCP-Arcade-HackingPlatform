import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BootScreen } from "./components/arcade/boot";
import { MenuScreen } from "./components/arcade/menu";
import { GameLaunch } from "./components/arcade/gamelaunch";
import { GameDisplay } from "./components/arcade/gamedisplay";
import HackerMenu from "./components/flipper/HackerMenu";

type Screen = 'boot' | 'arcade-menu' | 'game-launch' | 'game-display' | 'hacker-menu'
type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

function App() {
  const [screen, setScreen]             = useState<Screen>('boot')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [displayGame, setDisplayGame]   = useState<string | null>(null)
  const [diyFlipperStatus, setDiyFlipperStatus] = useState<DiyFlipperStatus>({
    connected: false,
    connecting: false,
    autoConnect: true
  })
  const [diyFlipperLastLine, setDiyFlipperLastLine] = useState<string>('')

  // ── arcade boot state ─────────────────────────────────────────
  const [coins, setCoins]                   = useState(0)
  const [time, setTime]                     = useState(0)
  const [highScore, setHighScore]           = useState(999999)
  const [scrollText, setScrollText]         = useState(0)
  const [explosions, setExplosions]         = useState<Array<{x: number, y: number, id: number}>>([])
  const [particles, setParticles]           = useState<Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>>([])
  const [crtFlicker, setCrtFlicker]         = useState(false)
  const [scanlineOffset, setScanlineOffset] = useState(0)
  const [pixelShift, setPixelShift]         = useState(0)
  const [borderBlink, setBorderBlink]       = useState(false)
  const [coinBlink, setCoinBlink]           = useState(false)
  const [glitchLine, setGlitchLine]         = useState(-1)
  const [logoShake, setLogoShake]           = useState({x: 0, y: 0})

  const bootLines = [
    'ARCADE-TRONIX BIOS v2.41', 'Copyright (C) 1991-1996', '',
    'Testing RAM............OK', 'Testing ROM............OK', 'Testing VRAM...........OK',
    'Init Sound Blaster.....OK', 'Init Joystick..........OK', 'Init Coin Mech.........OK',
    'Loading game data......', '', 'Press COIN to continue...'
  ]
  const marqueeText      = '★ ARCADE ZONE ★ INSERT COIN ★ PLAY TO WIN ★ HIGH SCORES ★ '
  const scrollingMarquee = (marqueeText + marqueeText + marqueeText).substring(Math.floor(scrollText / 3) % marqueeText.length)
  const bootLineCount    = Math.min(bootLines.length, Math.floor(time / 7))
  const progress         = Math.min(100, coins * 10)

  useEffect(() => {
    document.body.style.margin         = '0'
    document.body.style.padding        = '0'
    document.body.style.overflow       = 'hidden'
    document.body.style.background     = '#000'
    document.body.style.imageRendering = 'pixelated'

    const logoShakeInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLogoShake({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 })
        setTimeout(() => setLogoShake({ x: 0, y: 0 }), 100)
      }
    }, 150)
    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.85) { setCrtFlicker(true); setTimeout(() => setCrtFlicker(false), 60) }
    }, 80)
    const borderInterval    = setInterval(() => setBorderBlink(b => !b), 400)
    const coinBlinkInterval = setInterval(() => setCoinBlink(b => !b), 250)
    const scanlineInterval  = setInterval(() => setScanlineOffset(Math.random() * 2), 50)
    const pixelInterval = setInterval(() => {
      if (Math.random() > 0.9) { setPixelShift(Math.random() * 3 - 1.5); setTimeout(() => setPixelShift(0), 100) }
    }, 150)
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.92) { setGlitchLine(Math.floor(Math.random() * 20)); setTimeout(() => setGlitchLine(-1), 100) }
    }, 200)
    const particleInterval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2 }))
        .filter(p => p.y < window.innerHeight + 50))
    }, 30)
    const coinInterval = setInterval(() => {
      setCoins(prev => {
        if (prev < 10) {
          const exp = { x: window.innerWidth / 2 + (Math.random() - 0.5) * 200, y: window.innerHeight / 2 + (Math.random() - 0.5) * 200, id: Date.now() + Math.random() }
          setExplosions(e => [...e, exp])
          const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080', '#80ff00']
          for (let i = 0; i < 20; i++)
            setTimeout(() => setParticles(p => [...p, { x: exp.x, y: exp.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 4, color: colors[Math.floor(Math.random() * colors.length)], id: Date.now() + Math.random() }]), i * 15)
          setTimeout(() => setExplosions(e => e.filter(ex => ex.id !== exp.id)), 800)
        }
        if (prev >= 10) {
          clearInterval(coinInterval)
          for (let i = 0; i < 40; i++)
            setTimeout(() => {
              const x = Math.random() * window.innerWidth, y = Math.random() * window.innerHeight
              setExplosions(e => [...e, { x, y, id: Date.now() + Math.random() }])
              const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080']
              for (let j = 0; j < 10; j++)
                setParticles(p => [...p, { x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 - 3, color: colors[Math.floor(Math.random() * colors.length)], id: Date.now() + Math.random() + j }])
            }, i * 40)
          return 10
        }
        return prev + 1
      })
    }, 350)
    const timeInterval = setInterval(() => {
      setTime(t => t + 1); setHighScore(h => Math.max(0, h - 5)); setScrollText(s => s + 1)
    }, 50)

    return () => {
      clearInterval(coinInterval);    clearInterval(timeInterval)
      clearInterval(flickerInterval); clearInterval(scanlineInterval)
      clearInterval(pixelInterval);   clearInterval(borderInterval)
      clearInterval(coinBlinkInterval); clearInterval(glitchInterval)
      clearInterval(particleInterval);  clearInterval(logoShakeInterval)
    }
  }, [])

  useEffect(() => {
    if (!window.electron) return

    const readInitialStatus = async () => {
      const status = await window.electron!.diyFlipperGetStatus()
      setDiyFlipperStatus(status)
      await window.electron!.diyFlipperConnect()
    }

    const unsubscribeStatus = window.electron.onDiyFlipperStatus((status) => {
      setDiyFlipperStatus(status)
    })

    const unsubscribeLine = window.electron.onDiyFlipperLine((line) => {
      setDiyFlipperLastLine(line)
    })

    void readInitialStatus()

    return () => {
      unsubscribeStatus()
      unsubscribeLine()
    }
  }, [])

  // ── navigatie ─────────────────────────────────────────────────
  // useCallback → stabiele ref, HackTransition reset listener NIET
  const goToHackerMenu = useCallback(() => setScreen('hacker-menu'), [])

  const handleModuleSelect = useCallback(async (key: string) => {
    if (!window.electron) return

    const result = await window.electron.diyFlipperRunModule(key)
    if (!result.success) {
      console.warn('[DIYFLIPPER] Module launch failed:', result.message)
      return
    }

    console.log('[DIYFLIPPER] Module command sent:', key)
  }, [])

  // ── render ────────────────────────────────────────────────────
  if (screen === 'hacker-menu')
    return (
      <HackerMenu
        onSelect={handleModuleSelect}
        onBack={() => setScreen('boot')}
        deviceStatus={diyFlipperStatus}
        lastDeviceLine={diyFlipperLastLine}
      />
    )

  if (screen === 'game-display' && displayGame)
    return <GameDisplay gameId={displayGame} onExit={() => { setDisplayGame(null); setSelectedGame(null); setScreen('arcade-menu') }} />

  if (screen === 'game-launch' && selectedGame)
    return <GameLaunch gameId={selectedGame} onBack={() => { setSelectedGame(null); setScreen('arcade-menu') }} onOpenDisplay={(id) => { setDisplayGame(id); setScreen('game-display') }} />

  if (screen === 'arcade-menu')
    return <MenuScreen particles={particles} onSelectGame={(id) => { setSelectedGame(id); setScreen('game-launch') }} />

  // boot (default)
  return (
    <>
      <BootScreen
        coins={coins} time={time} highScore={highScore} scrollText={scrollText}
        explosions={explosions} particles={particles} crtFlicker={crtFlicker}
        scanlineOffset={scanlineOffset} pixelShift={pixelShift} borderBlink={borderBlink}
        coinBlink={coinBlink} glitchLine={glitchLine} logoShake={logoShake}
        bootLines={bootLines} bootLineCount={bootLineCount} progress={progress}
        scrollingMarquee={scrollingMarquee}
        onStart={() => setScreen('arcade-menu')}
        onGoToHacker={goToHackerMenu}
      />

    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
