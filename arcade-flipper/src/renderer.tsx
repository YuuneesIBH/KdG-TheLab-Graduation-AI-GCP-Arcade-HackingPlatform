import { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BootScreen } from './components/arcade/boot'
import { MenuScreen } from './components/arcade/GameMenu'
import { ArcadeGame } from './components/arcade/ArcadeGame'
import HackerMenu from './components/flipper/HackerMenu'

type Screen = 'boot' | 'arcade-menu' | 'arcade-game' | 'hacker-menu'
type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

type IrDatabaseEntry = {
  id: string
  name: string
  protocol: string
  address: string
  command: string
  carrierKhz?: number
  source?: string
}

function App() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const isBootScreen = screen === 'boot'

  const [diyFlipperStatus, setDiyFlipperStatus] = useState<DiyFlipperStatus>({
    connected: false,
    connecting: false,
    autoConnect: true
  })
  const [diyFlipperLastLine, setDiyFlipperLastLine] = useState<string>('')
  const [diyFlipperSerialLines, setDiyFlipperSerialLines] = useState<string[]>([])
  const [toolStatus, setToolStatus] = useState<string>('Ready')
  const [lastNfcUid, setLastNfcUid] = useState<string>('')
  const [irDbEntries, setIrDbEntries] = useState<IrDatabaseEntry[]>([])

  // ── arcade boot state ─────────────────────────────────────────
  const [coins, setCoins] = useState(0)
  const [time, setTime] = useState(0)
  const [highScore, setHighScore] = useState(999999)
  const [scrollText, setScrollText] = useState(0)
  const [explosions, setExplosions] = useState<Array<{ x: number; y: number; id: number }>>([])
  const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; color: string; id: number }>>([])
  const [crtFlicker, setCrtFlicker] = useState(false)
  const [scanlineOffset, setScanlineOffset] = useState(0)
  const [pixelShift, setPixelShift] = useState(0)
  const [coinBlink, setCoinBlink] = useState(false)
  const [glitchLine, setGlitchLine] = useState(-1)
  const [logoShake, setLogoShake] = useState({ x: 0, y: 0 })

  const bootLines = [
    'ARCADE-TRONIX BIOS v2.41', 'Copyright (C) 1991-1996', '',
    'Testing RAM............OK', 'Testing ROM............OK', 'Testing VRAM...........OK',
    'Init Sound Blaster.....OK', 'Init Joystick..........OK', 'Init Coin Mech.........OK',
    'Loading game data......', '', 'Press COIN to continue...'
  ]
  const bootLineCount = Math.min(bootLines.length, Math.floor(time / 7))
  const progress = Math.min(100, coins * 10)

  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#000'
    document.body.style.imageRendering = 'pixelated'

    if (!isBootScreen) return

    const logoShakeInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLogoShake({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 })
        setTimeout(() => setLogoShake({ x: 0, y: 0 }), 100)
      }
    }, 150)

    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.85) { setCrtFlicker(true); setTimeout(() => setCrtFlicker(false), 60) }
    }, 80)

    const coinBlinkInterval = setInterval(() => setCoinBlink(b => !b), 250)
    const scanlineInterval = setInterval(() => setScanlineOffset(Math.random() * 2), 50)

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
      clearInterval(coinBlinkInterval)
      clearInterval(glitchInterval)
      clearInterval(particleInterval)
      clearInterval(logoShakeInterval)
    }
  }, [isBootScreen])

  useEffect(() => {
    const api = window.electron
    if (!api) return

    let isMounted = true

    const readInitialStatus = async () => {
      try {
        const status = await api.diyFlipperGetStatus()
        if (!isMounted) return
        setDiyFlipperStatus(status)

        await api.diyFlipperConnect()
        const irLoad = await api.diyFlipperLoadIrMiniDb()
        if (!isMounted) return

        if (irLoad.success) {
          setIrDbEntries(irLoad.entries ?? [])
          return
        }

        setToolStatus(`IR DB load failed: ${irLoad.message}`)
      } catch (error) {
        if (!isMounted) return
        const message = error instanceof Error ? error.message : String(error)
        setToolStatus(`Hardware init failed: ${message}`)
        console.error('[DIYFLIPPER] Failed to initialize hardware state:', error)
      }
    }

    const unsubscribeStatus = api.onDiyFlipperStatus((status) => {
      setDiyFlipperStatus(status)
    })

    const unsubscribeLine = api.onDiyFlipperLine((line) => {
      setDiyFlipperLastLine(line)
      const stamp = new Date().toLocaleTimeString('en-GB', { hour12: false })
      setDiyFlipperSerialLines((prev) => {
        const next = [...prev, `[${stamp}] ${line}`]
        return next.length > 140 ? next.slice(next.length - 140) : next
      })
      const uidMatch = line.match(/(?:NFC_UID|UID)\s*[:=]\s*([0-9A-Fa-f:_-]+)/)
      if (uidMatch?.[1]) {
        const uid = uidMatch[1].toUpperCase()
        setLastNfcUid(uid)
        setToolStatus(`NFC UID captured: ${uid}`)
      }
    })

    void readInitialStatus()

    return () => {
      isMounted = false
      unsubscribeStatus()
      unsubscribeLine()
    }
  }, [])

  const goToHackerMenu = useCallback(() => setScreen('hacker-menu'), [])

  const handleModuleSelect = useCallback(async (key: string) => {
    if (!window.electron) return

    const result = await window.electron.diyFlipperRunModule(key)
    if (!result.success) {
      setToolStatus(`Module failed (${key}): ${result.message}`)
      console.warn('[DIYFLIPPER] Module launch failed:', result.message)
      return
    }

    setToolStatus(`Module sent (${key})`)
    console.log('[DIYFLIPPER] Module command sent:', key)
  }, [])

  const handleNfcRead = useCallback(async () => {
    if (!window.electron) return
    const result = await window.electron.diyFlipperSendCommand('NFC_READ')
    setToolStatus(result.success ? 'NFC read command sent' : `NFC read failed: ${result.message}`)
  }, [])

  const handleNfcSave = useCallback(async () => {
    if (!window.electron) return
    if (!lastNfcUid) {
      setToolStatus('No NFC UID captured yet')
      return
    }
    const result = await window.electron.diyFlipperSaveNfcCapture({
      uid: lastNfcUid,
      label: `nfcCapture-${lastNfcUid}`,
      rawLine: diyFlipperLastLine
    })
    setToolStatus(result.success ? `Saved NFC capture to ${result.message}` : `NFC save failed: ${result.message}`)
  }, [lastNfcUid, diyFlipperLastLine])

  const handleIrReload = useCallback(async () => {
    if (!window.electron) return
    const result = await window.electron.diyFlipperLoadIrMiniDb()
    if (!result.success) {
      setToolStatus(`IR DB load failed: ${result.message}`)
      return
    }
    setIrDbEntries(result.entries ?? [])
    setToolStatus(`Loaded ${result.entries?.length ?? 0} IR entries`)
  }, [])

  const handleIrSend = useCallback(async (entryId: string) => {
    if (!window.electron) return
    const entry = irDbEntries.find((candidate) => candidate.id === entryId)
    if (!entry) {
      setToolStatus('IR entry not found')
      return
    }
    const result = await window.electron.diyFlipperSendIrEntry(entry)
    setToolStatus(result.success ? `IR sent: ${entry.name}` : `IR send failed: ${result.message}`)
  }, [irDbEntries])

  const handleRawSerialCommand = useCallback(async (command: string) => {
    if (!window.electron) return
    const trimmed = command.trim()
    if (!trimmed) return
    const result = await window.electron.diyFlipperSendCommand(trimmed)
    setToolStatus(result.success ? `Raw command sent: ${trimmed}` : `Raw command failed: ${result.message}`)
  }, [])

  const handleReconnectHardware = useCallback(async () => {
    if (!window.electron) return
    const result = await window.electron.diyFlipperConnect()
    setToolStatus(result.success ? result.message : `Reconnect failed: ${result.message}`)
  }, [])

  const handleClearSerialLog = useCallback(() => {
    setDiyFlipperSerialLines([])
  }, [])

  // ── render ────────────────────────────────────────────────────
  if (screen === 'hacker-menu')
    return (
      <HackerMenu
        onSelect={handleModuleSelect}
        onBack={() => setScreen('boot')}
        deviceStatus={diyFlipperStatus}
        lastDeviceLine={diyFlipperLastLine}
        onNfcRead={handleNfcRead}
        onNfcSave={handleNfcSave}
        onIrReload={handleIrReload}
        onIrSend={handleIrSend}
        lastNfcUid={lastNfcUid}
        irDbEntries={irDbEntries}
        toolStatus={toolStatus}
        serialLines={diyFlipperSerialLines}
        onSendRawCommand={handleRawSerialCommand}
        onClearSerialLog={handleClearSerialLog}
        onReconnect={handleReconnectHardware}
      />
    )

  if (screen === 'arcade-game' && selectedGame)
    return (
      <ArcadeGame
        gameId={selectedGame}
        onExit={() => {
          setSelectedGame(null)
          setScreen('arcade-menu')
        }}
      />
    )

  if (screen === 'arcade-menu')
    return (
      <MenuScreen
        particles={particles}
        onSelectGame={(id) => {
          setSelectedGame(id)
          setScreen('arcade-game')
        }}
      />
    )

  // boot (default)
  return (
    <BootScreen
      coins={coins} highScore={highScore} scrollText={scrollText}
      explosions={explosions} particles={particles} crtFlicker={crtFlicker}
      scanlineOffset={scanlineOffset} pixelShift={pixelShift}
      coinBlink={coinBlink} glitchLine={glitchLine} logoShake={logoShake}
      bootLines={bootLines} bootLineCount={bootLineCount} progress={progress}
      onStart={() => setScreen('arcade-menu')}
      onGoToHacker={goToHackerMenu}
    />
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Renderer root element not found')
}

const root = ReactDOM.createRoot(rootElement)
root.render(<App />)
