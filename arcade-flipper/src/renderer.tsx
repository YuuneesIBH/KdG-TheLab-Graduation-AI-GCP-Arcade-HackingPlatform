import { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BootScreen } from './components/arcade/boot'
import { MenuScreen } from './components/arcade/GameMenu'
import { ArcadeGame } from './components/arcade/ArcadeGame'
import HackerMenu from './components/flipper/HackerMenu'
import { games } from './components/arcade/GameMenu'
import type { DiyFlipperStatus, IrDatabaseEntry } from './electron'

type Screen = 'boot' | 'arcade-menu' | 'arcade-game' | 'hacker-menu'

const INITIAL_DIY_FLIPPER_STATUS: DiyFlipperStatus = {
  connected: false,
  connecting: false,
  autoConnect: true,
}

const BOOT_LINES = [
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
  'Press COIN to continue...',
]

type WifiApProfile = {
  ssid: string
  password: string
  channel: number
  updatedAt: string
}

function App() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const isBootScreen = screen === 'boot'

  const [diyFlipperStatus, setDiyFlipperStatus] = useState<DiyFlipperStatus>(INITIAL_DIY_FLIPPER_STATUS)
  const [diyFlipperLastLine, setDiyFlipperLastLine] = useState<string>('')
  const [diyFlipperSerialLines, setDiyFlipperSerialLines] = useState<string[]>([])
  const [toolStatus, setToolStatus] = useState<string>('Ready')
  const [lastNfcUid, setLastNfcUid] = useState<string>('')
  const [irDbEntries, setIrDbEntries] = useState<IrDatabaseEntry[]>([])
  const [wifiApProfile, setWifiApProfile] = useState<WifiApProfile | null>(null)

  // ── arcade boot state ─────────────────────────────────────────
  const [coins, setCoins] = useState(0)
  const [time, setTime] = useState(0)
  const [scrollText, setScrollText] = useState(0)
  const [explosions, setExplosions] = useState<Array<{ x: number; y: number; id: number }>>([])
  const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; color: string; id: number }>>([])
  const [crtFlicker, setCrtFlicker] = useState(false)
  const [scanlineOffset, setScanlineOffset] = useState(0)
  const [pixelShift, setPixelShift] = useState(0)
  const [coinBlink, setCoinBlink] = useState(false)
  const [glitchLine, setGlitchLine] = useState(-1)
  const [logoShake, setLogoShake] = useState({ x: 0, y: 0 })
  const [aiHints, setAiHints] = useState<Record<string, { status: 'idle' | 'loading' | 'ready' | 'error'; content?: string }>>({})

  const bootLineCount = Math.min(BOOT_LINES.length, Math.floor(time / 7))
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

  // Prefetch AI hints for all games once at startup (sequential to avoid overload)
  useEffect(() => {
    const api = window.electron
    if (!api?.aiExplain) return
    let cancelled = false

    const fetchOne = async (idx: number) => {
      if (cancelled) return
      const game = games[idx]
      if (!game) return

      setAiHints((prev) => ({
        ...prev,
        [game.id]: prev[game.id]?.status === 'ready' ? prev[game.id] : { status: 'loading' }
      }))

      try {
        const res = await api.aiExplain({
          gameId: game.id,
          title: game.title,
          genre: game.genre,
          difficulty: game.difficulty
        })
        if (cancelled) return
        setAiHints((prev) => ({
          ...prev,
          [game.id]: res.success
            ? { status: 'ready', content: res.content ?? res.message ?? '' }
            : { status: 'error', content: res.message ?? 'AI error' }
        }))
      } catch (error) {
        if (cancelled) return
        setAiHints((prev) => ({
          ...prev,
          [game.id]: { status: 'error', content: error instanceof Error ? error.message : String(error) }
        }))
      } finally {
        if (cancelled) return
        if (idx + 1 < games.length) {
          setTimeout(() => void fetchOne(idx + 1), 300)
        }
      }
    }

    void fetchOne(0)
    return () => { cancelled = true }
  }, [])

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

      const wifiProfileLoad = await window.electron!.diyFlipperLoadWifiApProfile()
      if (wifiProfileLoad.success) {
        setWifiApProfile(wifiProfileLoad.profile ?? null)
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
    const api = window.electron
    if (!api) return

    const result = await api.diyFlipperRunModule(key)
    if (!result.success) {
      setToolStatus(`Module failed (${key}): ${result.message}`)
      console.warn('[DIYFLIPPER] Module launch failed:', result.message)
      return
    }

    setToolStatus(`Module sent (${key})`)
    console.log('[DIYFLIPPER] Module command sent:', key)
  }, [])

  useEffect(() => {
    if (!window.electron) return
    if (!diyFlipperStatus.connected) return

    void window.electron.diyFlipperLoadWifiApProfile().then((result) => {
      if (result.success) {
        setWifiApProfile(result.profile ?? null)
      }
    })
  }, [diyFlipperStatus.connected])

  const handleNfcRead = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperSendCommand('NFC_READ')
    setToolStatus(result.success ? 'NFC read command sent' : `NFC read failed: ${result.message}`)
  }, [])

  const handleNfcSave = useCallback(async () => {
    const api = window.electron
    if (!api) return
    if (!lastNfcUid) {
      setToolStatus('No NFC UID captured yet')
      return
    }
    const result = await api.diyFlipperSaveNfcCapture({
      uid: lastNfcUid,
      label: `nfcCapture-${lastNfcUid}`,
      rawLine: diyFlipperLastLine
    })
    setToolStatus(result.success ? `Saved NFC capture to ${result.message}` : `NFC save failed: ${result.message}`)
  }, [lastNfcUid, diyFlipperLastLine])

  const handleIrReload = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperLoadIrMiniDb()
    if (!result.success) {
      setToolStatus(`IR DB load failed: ${result.message}`)
      return
    }
    setIrDbEntries(result.entries ?? [])
    setToolStatus(`Loaded ${result.entries?.length ?? 0} IR entries`)
  }, [])

  const handleIrSend = useCallback(async (entryId: string) => {
    const api = window.electron
    if (!api) return
    const entry = irDbEntries.find((candidate) => candidate.id === entryId)
    if (!entry) {
      setToolStatus('IR entry not found')
      return
    }
    const result = await api.diyFlipperSendIrEntry(entry)
    setToolStatus(result.success ? `IR sent: ${entry.name}` : `IR send failed: ${result.message}`)
  }, [irDbEntries])

  const handleRawSerialCommand = useCallback(async (command: string) => {
    const api = window.electron
    if (!api) return
    const trimmed = command.trim()
    if (!trimmed) return
    const result = await api.diyFlipperSendCommand(trimmed)
    setToolStatus(result.success ? `Raw command sent: ${trimmed}` : `Raw command failed: ${result.message}`)
  }, [])

  const handleReconnectHardware = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperConnect()
    setToolStatus(result.success ? result.message : `Reconnect failed: ${result.message}`)
  }, [])

  const handleClearSerialLog = useCallback(() => {
    setDiyFlipperSerialLines([])
  }, [])

  const handleWifiApSaveProfile = useCallback(async (profile: { ssid: string; password: string; channel: number }) => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperSaveWifiApProfile(profile)
    if (!result.success) {
      setToolStatus(`Wi-Fi AP profile save failed: ${result.message}`)
      return
    }
    setWifiApProfile(result.profile ?? null)
    setToolStatus('Wi-Fi AP profile saved')
  }, [])

  const handleWifiApLoadProfile = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperLoadWifiApProfile()
    if (!result.success) {
      setToolStatus(`Wi-Fi AP profile load failed: ${result.message}`)
      return
    }
    setWifiApProfile(result.profile ?? null)
    setToolStatus(result.profile ? 'Wi-Fi AP profile loaded' : 'No saved Wi-Fi AP profile')
  }, [])

  const handleWifiApStart = useCallback(async (profile: { ssid: string; password: string; channel: number }) => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperStartWifiAp(profile)
    if (!result.success) {
      setToolStatus(`Wi-Fi AP start failed: ${result.message}`)
      return
    }
    setWifiApProfile(result.profile ?? null)
    setToolStatus(result.message || 'Wi-Fi AP start command sent')
  }, [])

  const handleWifiApStop = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.diyFlipperSendCommand('WIFI_AP_STOP')
    setToolStatus(result.success ? 'Wi-Fi AP stop command sent' : `Wi-Fi AP stop failed: ${result.message}`)
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
        wifiApProfile={wifiApProfile}
        onWifiApSaveProfile={handleWifiApSaveProfile}
        onWifiApLoadProfile={handleWifiApLoadProfile}
        onWifiApStart={handleWifiApStart}
        onWifiApStop={handleWifiApStop}
      />
    )

  if (screen === 'arcade-game' && selectedGame)
    return (
      <ArcadeGame
        gameId={selectedGame}
        prefetchedHint={aiHints[selectedGame]?.content}
        onHintReady={(gameId, content) => {
          setAiHints(prev => ({ ...prev, [gameId]: { status: 'ready', content } }))
        }}
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
  return (
    <BootScreen
      coins={coins} scrollText={scrollText}
      explosions={explosions} particles={particles} crtFlicker={crtFlicker}
      scanlineOffset={scanlineOffset} pixelShift={pixelShift}
      coinBlink={coinBlink} glitchLine={glitchLine} logoShake={logoShake}
      bootLines={BOOT_LINES} bootLineCount={bootLineCount} progress={progress}
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
