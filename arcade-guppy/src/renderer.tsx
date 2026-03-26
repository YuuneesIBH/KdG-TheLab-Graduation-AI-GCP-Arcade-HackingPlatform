import { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BootScreen } from './components/arcade/boot'
import { MenuScreen } from './components/arcade/GameMenu'
import { ArcadeGame } from './components/arcade/ArcadeGame'
import HackerMenu from './components/guppy/HackerMenu'
import { HackTransition } from './components/guppy/HackTransition'
import hackingSoundSrc from './assets/hackingboot_sound.mp3'
import menuMusicSrc from './assets/menumusic.mp3'
import type {
  GuppyStatus,
  IrDatabaseEntry,
  WifiApProfile,
  WifiJammerPayload,
  WifiJammerState,
  WindowsUsbInsertEvent,
} from './electron'

type Screen = 'boot' | 'arcade-menu' | 'arcade-game' | 'hacker-menu'
type AiHintState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  content?: string
}

const INITIAL_GUPPY_STATUS: GuppyStatus = {
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
  'Press ENTER or A/START to continue...',
]

const MENU_MUSIC_VOLUME = 0.4
const HACKING_MUSIC_VOLUME = 0.72
const MAX_GUPPY_SERIAL_LINES = 140
const MAX_WIFI_JAMMER_LOG_LINES = 120
const ELECTRON_API_UNAVAILABLE = 'Electron API unavailable'

function appendCappedEntry(entries: string[], entry: string, maxEntries: number) {
  const next = [...entries, entry]
  return next.length > maxEntries ? next.slice(next.length - maxEntries) : next
}

function App() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const isBootScreen = screen === 'boot'
  const [hackTransitionActive, setHackTransitionActive] = useState(false)
  const shouldPlayMenuMusic = !hackTransitionActive && (screen === 'boot' || screen === 'arcade-menu')
  const shouldPlayHackingMusic = hackTransitionActive || screen === 'hacker-menu'
  const previousGuppyConnectionRef = useRef<{ connected: boolean; portPath?: string }>({
    connected: false,
    portPath: undefined,
  })
  const menuMusicRef = useRef<HTMLAudioElement | null>(null)
  const hackingMusicRef = useRef<HTMLAudioElement | null>(null)
  const hackerOpenInFlightRef = useRef(false)

  const [guppyStatus, setGuppyStatus] = useState<GuppyStatus>(INITIAL_GUPPY_STATUS)
  const [guppyLastLine, setGuppyLastLine] = useState<string>('')
  const [guppySerialLines, setGuppySerialLines] = useState<string[]>([])
  const [toolStatus, setToolStatus] = useState<string>('Ready')
  const [irDbEntries, setIrDbEntries] = useState<IrDatabaseEntry[]>([])
  const [wifiApProfile, setWifiApProfile] = useState<WifiApProfile | null>(null)
  const [wifiJammerState, setWifiJammerState] = useState<WifiJammerState>({ running: false })
  const [wifiJammerLog, setWifiJammerLog] = useState<string[]>([])

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
  const [aiHints, setAiHints] = useState<Record<string, AiHintState>>({})

  const bootLineCount = Math.min(BOOT_LINES.length, Math.floor(time / 7))
  const progress = Math.min(100, coins * 10)

  const completeHackerMenuOpen = useCallback(() => {
    setHackTransitionActive(false)
    setSelectedGame(null)
    setScreen('hacker-menu')
  }, [])

  const playAudio = useCallback((audio: HTMLAudioElement | null, label: string) => {
    if (!audio || !audio.paused) return

    const playback = audio.play()
    if (!playback) return

    playback.catch((error: unknown) => {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      if (message.includes('interact') || message.includes('gesture') || message.includes('abort')) {
        return
      }
      console.warn(`[AUDIO] ${label} playback failed:`, error)
    })
  }, [])

  const openHackerMenuWithTransition = useCallback((statusMessage?: string) => {
    if (statusMessage) {
      setToolStatus(statusMessage)
    }

    if (screen === 'hacker-menu' || hackTransitionActive || hackerOpenInFlightRef.current) {
      return
    }

    hackerOpenInFlightRef.current = true

    void (async () => {
      try {
        const api = window.electron
        if (api) {
          const stopResult = await api.stopGame()
          if (!stopResult.success) {
            const killResult = await api.killGame()
            if (!killResult.success) {
              console.warn('[ARCADE] Failed to fully stop active game before opening hacker mode:', killResult.message)
            }
          }
          await api.setFullscreen(true)
        }

        const triggerHackTransition = window.__hackTransitionTrigger
        if (typeof triggerHackTransition === 'function') {
          triggerHackTransition()
          return
        }

        completeHackerMenuOpen()
      } catch (error) {
        console.error('[HACKER] Failed to prepare hacker mode:', error)
        completeHackerMenuOpen()
      } finally {
        hackerOpenInFlightRef.current = false
      }
    })()
  }, [completeHackerMenuOpen, hackTransitionActive, screen])

  const handleOpenHackerFromUi = useCallback(() => {
    openHackerMenuWithTransition()
  }, [openHackerMenuWithTransition])

  const playMenuMusic = useCallback(() => {
    playAudio(menuMusicRef.current, 'Menu music')
  }, [playAudio])

  const playHackingMusic = useCallback(() => {
    playAudio(hackingMusicRef.current, 'Hacking music')
  }, [playAudio])

  useEffect(() => {
    const audio = new Audio(menuMusicSrc)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = MENU_MUSIC_VOLUME
    menuMusicRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      menuMusicRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = new Audio(hackingSoundSrc)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = HACKING_MUSIC_VOLUME
    hackingMusicRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      hackingMusicRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = menuMusicRef.current
    if (!audio) return

    audio.loop = true
    audio.volume = MENU_MUSIC_VOLUME

    if (!shouldPlayMenuMusic) {
      audio.pause()
      return
    }

    const retryPlayback = () => playMenuMusic()
    playMenuMusic()

    window.addEventListener('keydown', retryPlayback)
    window.addEventListener('pointerdown', retryPlayback)
    window.addEventListener('touchstart', retryPlayback, { passive: true })
    window.addEventListener('focus', retryPlayback)

    return () => {
      window.removeEventListener('keydown', retryPlayback)
      window.removeEventListener('pointerdown', retryPlayback)
      window.removeEventListener('touchstart', retryPlayback)
      window.removeEventListener('focus', retryPlayback)
    }
  }, [playMenuMusic, shouldPlayMenuMusic])

  useEffect(() => {
    const audio = hackingMusicRef.current
    if (!audio) return

    audio.loop = true
    audio.volume = HACKING_MUSIC_VOLUME

    if (!shouldPlayHackingMusic) {
      audio.pause()
      audio.currentTime = 0
      return
    }

    const retryPlayback = () => playHackingMusic()
    playHackingMusic()

    window.addEventListener('keydown', retryPlayback)
    window.addEventListener('pointerdown', retryPlayback)
    window.addEventListener('touchstart', retryPlayback, { passive: true })
    window.addEventListener('focus', retryPlayback)

    return () => {
      window.removeEventListener('keydown', retryPlayback)
      window.removeEventListener('pointerdown', retryPlayback)
      window.removeEventListener('touchstart', retryPlayback)
      window.removeEventListener('focus', retryPlayback)
    }
  }, [playHackingMusic, shouldPlayHackingMusic])

  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#000'
    document.body.style.imageRendering = 'pixelated'

    if (!isBootScreen) return

    // The boot screen uses several small timers on purpose so the CRT effects stay
    // slightly out of sync instead of feeling like one perfectly synchronized loop.
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

  useEffect(() => {
    const api = window.electron
    if (!api) {
      setToolStatus(ELECTRON_API_UNAVAILABLE)
      return
    }

    let isMounted = true

    // Hydrate once from the bridge on mount, then keep state live via IPC so the
    // renderer follows reconnects and serial output without extra polling.
    const readInitialStatus = async () => {
      try {
        const status = await api.guppyGetStatus()
        if (!isMounted) return
        setGuppyStatus(status)

        await api.guppyConnect()
        const irLoad = await api.guppyLoadIrMiniDb()
        if (!isMounted) return

        if (irLoad.success) {
          setIrDbEntries(irLoad.entries ?? [])
        } else {
          setToolStatus(`IR DB load failed: ${irLoad.message}`)
        }

        const wifiProfileLoad = await api.guppyLoadWifiApProfile()
        if (!isMounted) return
        if (wifiProfileLoad.success) {
          setWifiApProfile(wifiProfileLoad.profile ?? null)
        } else {
          setToolStatus(`Wi-Fi AP profile load failed: ${wifiProfileLoad.message}`)
        }

        const jammerStatus = await api.guppyGetWifiJammerStatus()
        if (!isMounted) return
        if (jammerStatus.success) {
          setWifiJammerState(jammerStatus.state ?? { running: false })
        }
      } catch (error) {
        if (!isMounted) return
        const message = error instanceof Error ? error.message : String(error)
        setToolStatus(`Hardware init failed: ${message}`)
        console.error('[GUPPY] Failed to initialize hardware state:', error)
      }
    }

    const unsubscribeStatus = api.onGuppyStatus((status) => {
      setGuppyStatus(status)
    })

    const unsubscribeLine = api.onGuppyLine((line) => {
      setGuppyLastLine(line)
      const stamp = new Date().toLocaleTimeString('en-GB', { hour12: false })
      setGuppySerialLines((prev) => appendCappedEntry(prev, `[${stamp}] ${line}`, MAX_GUPPY_SERIAL_LINES))
    })

    const unsubscribeJammerState = api.onWifiJammerState((state) => {
      setWifiJammerState(state)
    })

    const unsubscribeJammerLog = api.onWifiJammerLog((line) => {
      setWifiJammerLog((prev) => appendCappedEntry(prev, line, MAX_WIFI_JAMMER_LOG_LINES))
    })

    void readInitialStatus()

    return () => {
      isMounted = false
      unsubscribeStatus()
      unsubscribeLine()
      unsubscribeJammerState()
      unsubscribeJammerLog()
    }
  }, [setToolStatus])

  useEffect(() => {
    const api = window.electron
    if (!api) return

    const unsubscribeUsbInserted = api.onWindowsUsbInserted((event: WindowsUsbInsertEvent) => {
      const driveList = event.drives.join(', ')
      openHackerMenuWithTransition(
        driveList
          ? `USB detected on ${driveList}. Hack transition started.`
          : 'USB detected. Hack transition started.'
      )
    })

    return () => {
      unsubscribeUsbInserted()
    }
  }, [openHackerMenuWithTransition])

  useEffect(() => {
    const previous = previousGuppyConnectionRef.current
    previousGuppyConnectionRef.current = {
      connected: guppyStatus.connected,
      portPath: guppyStatus.portPath,
    }

    if (!guppyStatus.connected) return

    // Only auto-open the hacker screen for a fresh connect or port switch so
    // steady-state status updates do not keep hijacking the current screen.
    const becameConnected = !previous.connected
    const connectedOnNewPort = Boolean(
      previous.connected
      && guppyStatus.portPath
      && guppyStatus.portPath !== previous.portPath
    )

    if (!becameConnected && !connectedOnNewPort) return

    openHackerMenuWithTransition(
      guppyStatus.portPath
        ? `Pico connected on ${guppyStatus.portPath}. Hack transition started.`
        : 'Pico connected. Hack transition started.'
    )
  }, [guppyStatus.connected, guppyStatus.portPath, openHackerMenuWithTransition])

  const handleModuleSelect = useCallback(async (key: string) => {
    const api = window.electron
    if (!api) {
      setToolStatus(ELECTRON_API_UNAVAILABLE)
      return
    }

    if (key === 'nfc') {
      setToolStatus('NFC backend removed. UI placeholder remains for the upcoming rewrite.')
      return
    }

    const result = await api.guppyRunModule(key)
    if (!result.success) {
      setToolStatus(`Module failed (${key}): ${result.message}`)
      console.warn('[GUPPY] Module launch failed:', result.message)
      return
    }

    setToolStatus(`Module sent (${key})`)
    console.log('[GUPPY] Module command sent:', key)
  }, [setToolStatus])

  useEffect(() => {
    const api = window.electron
    if (!api) {
      setToolStatus(ELECTRON_API_UNAVAILABLE)
      return
    }
    if (!guppyStatus.connected) return

    void api.guppyLoadWifiApProfile().then((result) => {
      if (result.success) {
        setWifiApProfile(result.profile ?? null)
      }
    })
  }, [guppyStatus.connected])

  const handleNfcRead = useCallback(() => {
    setToolStatus('NFC read is unavailable. The NFC UI is being kept as a placeholder for the rewrite.')
  }, [])

  const handleNfcSave = useCallback(() => {
    setToolStatus('NFC save is unavailable. The NFC UI is being kept as a placeholder for the rewrite.')
  }, [])

  const handleIrReload = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.guppyLoadIrMiniDb()
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
    const result = await api.guppySendIrEntry(entry)
    setToolStatus(result.success ? `IR sent: ${entry.name}` : `IR send failed: ${result.message}`)
  }, [irDbEntries])

  const handleRawSerialCommand = useCallback(async (command: string) => {
    const api = window.electron
    if (!api) return
    const trimmed = command.trim()
    if (!trimmed) return
    const result = await api.guppySendCommand(trimmed)
    setToolStatus(result.success ? `Raw command sent: ${trimmed}` : `Raw command failed: ${result.message}`)
  }, [])

  const handleReconnectHardware = useCallback(async () => {
    const api = window.electron
    if (!api) return
    const result = await api.guppyConnect()
    setToolStatus(result.success ? result.message : `Reconnect failed: ${result.message}`)
  }, [])

  const handleClearSerialLog = useCallback(() => {
    setGuppySerialLines([])
  }, [])

  const handleWifiApSaveProfile = useCallback(async (profile: { ssid: string; password: string; channel: number }) => {
    const api = window.electron
    if (!api) return
    const result = await api.guppySaveWifiApProfile(profile)
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
    const result = await api.guppyLoadWifiApProfile()
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
    const result = await api.guppyStartWifiAp(profile)
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
    const result = await api.guppySendCommand('WIFI_AP_STOP')
    setToolStatus(result.success ? 'Wi-Fi AP stop command sent' : `Wi-Fi AP stop failed: ${result.message}`)
  }, [])

  const handleWifiJammerStart = useCallback(async (payload: WifiJammerPayload) => {
    const api = window.electron
    if (!api) {
      const fallback: { success: boolean; message: string } = { success: false, message: ELECTRON_API_UNAVAILABLE }
      setToolStatus(fallback.message)
      return fallback
    }
    const result = await api.guppyStartWifiJammer(payload)
    setToolStatus(result.success ? result.message : `Wi-Fi jammer start failed: ${result.message}`)
    if (!result.success) {
      console.warn('[GUPPY] Wi-Fi jammer start failed:', result.message)
    }
    return result
  }, [setToolStatus])

  const handleWifiJammerStop = useCallback(async () => {
    const api = window.electron
    if (!api) {
      const fallback: { success: boolean; message: string } = { success: false, message: ELECTRON_API_UNAVAILABLE }
      setToolStatus(fallback.message)
      return fallback
    }
    const result = await api.guppyStopWifiJammer()
    setToolStatus(result.success ? result.message : `Wi-Fi jammer stop failed: ${result.message}`)
    if (!result.success) {
      console.warn('[GUPPY] Wi-Fi jammer stop failed:', result.message)
    }
    return result
  }, [setToolStatus])

  // ── render ────────────────────────────────────────────────────
  let screenContent

  if (screen === 'hacker-menu') {
    screenContent = (
      <HackerMenu
        onSelect={handleModuleSelect}
        onBack={() => setScreen('boot')}
        deviceStatus={guppyStatus}
        lastDeviceLine={guppyLastLine}
        onNfcRead={handleNfcRead}
        onNfcSave={handleNfcSave}
        onIrReload={handleIrReload}
        onIrSend={handleIrSend}
        irDbEntries={irDbEntries}
        toolStatus={toolStatus}
        serialLines={guppySerialLines}
        onSendRawCommand={handleRawSerialCommand}
        onClearSerialLog={handleClearSerialLog}
        onReconnect={handleReconnectHardware}
        wifiApProfile={wifiApProfile}
        onWifiApSaveProfile={handleWifiApSaveProfile}
        onWifiApLoadProfile={handleWifiApLoadProfile}
        onWifiApStart={handleWifiApStart}
        onWifiApStop={handleWifiApStop}
        wifiJammerState={wifiJammerState}
        wifiJammerLog={wifiJammerLog}
        onWifiJammerStart={handleWifiJammerStart}
        onWifiJammerStop={handleWifiJammerStop}
        onSetToolStatus={setToolStatus}
      />
    )
  } else if (screen === 'arcade-game' && selectedGame) {
    screenContent = (
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
  } else if (screen === 'arcade-menu') {
    screenContent = (
      <MenuScreen
        particles={particles}
        onBack={() => setScreen('boot')}
        onSelectGame={(id) => {
          setSelectedGame(id)
          setScreen('arcade-game')
        }}
      />
    )
  } else {
    screenContent = (
      <BootScreen
        coins={coins} scrollText={scrollText}
        explosions={explosions} particles={particles} crtFlicker={crtFlicker}
        scanlineOffset={scanlineOffset} pixelShift={pixelShift}
        coinBlink={coinBlink} glitchLine={glitchLine} logoShake={logoShake}
        bootLines={BOOT_LINES} bootLineCount={bootLineCount} progress={progress}
        onStart={() => setScreen('arcade-menu')}
        onOpenHacker={handleOpenHackerFromUi}
      />
    )
  }

  return (
    <>
      {screenContent}
      <HackTransition
        onStart={() => setHackTransitionActive(true)}
        onComplete={completeHackerMenuOpen}
      />
    </>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Renderer root element not found')
}

const root = ReactDOM.createRoot(rootElement)
root.render(<App />)
