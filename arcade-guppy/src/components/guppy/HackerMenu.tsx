import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import WifiResultsModal from './WifiResultsModal'
import { buildWifiNetworkList, type WifiNetwork, type WifiResultsMode, wifiNetworkKey } from './wifi-results'
import {
  isHackerMenuActionButtonPressed,
  isHackerMenuActionInput,
  isHackerMenuBackButtonPressed,
  isHackerMenuNextViewButtonPressed,
  isHackerMenuPrevViewButtonPressed,
} from '../../shared/arcade-controls'
import type {
  GuppyStatus,
  IrDatabaseEntry,
  WifiApProfile,
  WifiJammerPayload,
  WifiJammerState,
} from '../../shared/electron-types'

const VIEW_ITEMS = [
  { key: 'home', label: 'HOME', color: '#00ff41' },
  { key: 'nfc', label: 'NFC', color: '#00ccff' },
  { key: 'ir', label: 'IR', color: '#ff8800' },
  { key: 'wifi', label: 'WIFI', color: '#33bbff' },
] as const

type ViewKey = (typeof VIEW_ITEMS)[number]['key']
type ControlId = string
type WifiResultsSelectionMode = 'network' | 'close'
type GamepadNavDirection = 'up' | 'down' | 'left' | 'right' | null
type WifiApPreset = {
  id: string
  label: string
  description: string
  profile: {
    ssid: string
    password: string
    channel: number
  }
}
type JammerPreset = {
  id: string
  label: string
  description: string
  config: {
    packets: string
    delay: string
    reset: string
    code: string
    world: boolean
    noBroadcast: boolean
    verbose: boolean
  }
}
type TerminalShortcut = {
  id: ControlId
  label: string
  command: string
  description: string
  color: string
}

const BASE_FOCUSABLE_CONTROLS: ControlId[] = ['header-reconnect', 'header-exit', 'tab-home', 'tab-nfc', 'tab-ir', 'tab-wifi']

const TAB_CONTROL_BY_VIEW: Record<ViewKey, ControlId> = {
  home: 'tab-home',
  nfc: 'tab-nfc',
  ir: 'tab-ir',
  wifi: 'tab-wifi',
}

const BOOT_SEQUENCE = [
  '> Guppy OS v1.0.0 - ARM Cortex-M4 @ 64MHz',
  '> Checking hardware... Flash: OK RAM: OK SD: MOUNTED',
  '> Bridge online. Loading module selector...',
  '> Routing terminal and tool pages...',
  '',
]

const WIFI_AP_FALLBACK_PRESETS: WifiApPreset[] = [
  {
    id: 'preset-lab-open',
    label: 'LAB OPEN',
    description: 'Open hotspot for walk-up testing on channel 6.',
    profile: { ssid: 'LAB_OPEN', password: '', channel: 6 },
  },
  {
    id: 'preset-lab-secure',
    label: 'LAB SECURE',
    description: 'Secured captive portal preset on channel 11.',
    profile: { ssid: 'LAB_SECURE', password: 'arcade123', channel: 11 },
  },
  {
    id: 'preset-guppy-link',
    label: 'GUPPY LINK',
    description: 'Default Guppy demo AP on channel 1.',
    profile: { ssid: 'GUPPY_LINK', password: 'guppy123', channel: 1 },
  },
]

const JAMMER_PRESETS: JammerPreset[] = [
  {
    id: 'jam-balanced',
    label: 'BALANCED',
    description: 'Default deauth burst with stable pacing.',
    config: { packets: '25', delay: '1', reset: '0', code: '7', world: false, noBroadcast: false, verbose: false },
  },
  {
    id: 'jam-pressure',
    label: 'PRESSURE',
    description: 'Heavier burst rate for short, aggressive cycles.',
    config: { packets: '45', delay: '0.5', reset: '8', code: '7', world: false, noBroadcast: false, verbose: false },
  },
  {
    id: 'jam-monitor',
    label: 'MONITOR',
    description: 'Slower cadence with verbose logging for debugging.',
    config: { packets: '18', delay: '1.5', reset: '0', code: '4', world: false, noBroadcast: false, verbose: true },
  },
]

const TERMINAL_SHORTCUTS: TerminalShortcut[] = [
  { id: 'terminal-ping', label: 'PING', command: 'PING', description: 'Heartbeat to the bridge.', color: '#00ff88' },
  { id: 'terminal-caps', label: 'HELLO/CAPS', command: 'HELLO', description: 'Replay the ready banner and capabilities.', color: '#66ddff' },
  { id: 'terminal-ap-status', label: 'AP STATUS', command: 'WIFI_AP_STATUS', description: 'Check the current AP state.', color: '#ffbb55' },
]

function resolveHackingUiScale(viewport: { width: number; height: number }) {
  if (viewport.height < 900 || viewport.width < 1500) return 1.18
  if (viewport.height < 1150 || viewport.width < 1900) return 1.32
  return 1.45
}

function cycleIndex(current: number, length: number, direction: 1 | -1) {
  if (length <= 0) return 0
  const safeIndex = current >= 0 && current < length ? current : 0
  return (safeIndex + direction + length) % length
}

function formatWifiApSummary(profile: { ssid: string; password: string; channel: number }) {
  return `${profile.ssid} / CH${profile.channel} / ${profile.password ? 'SECURED' : 'OPEN'}`
}

type HackerMenuProps = {
  onSelect?: (key: string) => void
  onBack?: () => void
  deviceStatus?: GuppyStatus
  lastDeviceLine?: string
  onNfcRead?: () => void
  onNfcSave?: () => void
  onIrReload?: () => void
  onIrSend?: (entryId: string) => void
  irDbEntries?: IrDatabaseEntry[]
  toolStatus?: string
  serialLines?: string[]
  onSendRawCommand?: (command: string) => void
  onClearSerialLog?: () => void
  onReconnect?: () => void
  wifiApProfile?: WifiApProfile | null
  onWifiApSaveProfile?: (profile: { ssid: string; password: string; channel: number }) => void
  onWifiApLoadProfile?: () => void
  onWifiApStart?: (profile: { ssid: string; password: string; channel: number }) => void
  onWifiApStop?: () => void
  wifiJammerState?: WifiJammerState | null
  wifiJammerLog?: string[]
  onWifiJammerStart?: (payload: WifiJammerPayload) => Promise<{success: boolean, message: string}> | void
  onWifiJammerStop?: () => Promise<{success: boolean, message: string}> | void
  onSetToolStatus?: (message: string) => void
}

function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/?!@#$%^&*'
    const colW = 16
    const cols = Math.ceil(canvas.width / colW)
    const drops = Array.from({ length: cols }, () => Math.random() * -80)
    const speeds = Array.from({ length: cols }, () => 0.3 + Math.random() * 0.5)
    let raf = 0

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.055)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < cols; i += 1) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = Math.random() > 0.97 ? '#ffffff' : i % 11 === 0 ? '#00ffaa' : '#00ff41'
        ctx.shadowColor = '#00ff41'
        ctx.shadowBlur = 3
        ctx.font = `${colW}px "Courier New", monospace`
        ctx.fillText(char, i * colW, drops[i] * colW)
        ctx.shadowBlur = 0
        if (drops[i] * colW > canvas.height && Math.random() > 0.978) drops[i] = 0
        drops[i] += speeds[i]
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }} />
}

function tabButtonStyle(active: boolean, color: string, compact: boolean): React.CSSProperties {
  return {
    background: active ? `${color}22` : 'rgba(0,0,0,0.2)',
    border: `1px solid ${color}`,
    color: active ? '#ffffff' : color,
    fontFamily: 'inherit',
    fontSize: compact ? '14px' : '13px',
    letterSpacing: '1px',
    padding: compact ? '10px 14px' : '8px 12px',
    cursor: 'pointer',
    textShadow: active ? `0 0 8px ${color}` : 'none',
  }
}

function actionButtonStyle(color: string, compact: boolean): React.CSSProperties {
  return {
    background: `${color}20`,
    border: `1px solid ${color}`,
    color,
    fontFamily: 'inherit',
    padding: compact ? '12px 14px' : '10px 12px',
    fontSize: compact ? '14px' : '13px',
    letterSpacing: '1px',
    cursor: 'pointer',
  }
}

function focusedControlStyle(active: boolean, color: string): React.CSSProperties {
  if (!active) return {}
  return {
    boxShadow: `0 0 0 2px ${color}, 0 0 16px ${color}88`,
    transform: 'translateY(-1px)',
  }
}

function collectWifiResultLines(lines: string[], mode: WifiResultsMode): string[] {
  if (!lines.length) return []

  const byMode: Record<WifiResultsMode, RegExp[]> = {
    SCAN: [/WIFI_SCAN/i, /WIFI_AP/i, /SSID/i, /RSSI/i, /SECURITY/i, /AUTH/i, /CHANNEL/i, /CHAN/i, /BSSID/i, /FOUND/i, /NETWORK/i],
    AUDIT: [/WIFI_AUDIT/i, /AUDIT/i, /VULN/i, /WPA/i, /WEP/i, /OPEN/i, /WEAK/i, /RISK/i],
  }

  return lines.filter((line) => {
    const trimmed = line.trim()
    if (!trimmed) return false
    if (/^TX\s+/i.test(trimmed)) return false
    if (byMode[mode].some((pattern) => pattern.test(trimmed))) return true
    if (/^[^,\s][^,]*,\s*-?\d{1,3}(?:,\s*[^,]+){0,2}$/i.test(trimmed)) return true
    return false
  })
}

export default function HackerMenu({
  onSelect,
  onBack,
  deviceStatus,
  lastDeviceLine,
  onNfcRead,
  onNfcSave,
  onIrReload,
  onIrSend,
  irDbEntries,
  toolStatus,
  serialLines,
  onSendRawCommand,
  onClearSerialLog,
  onReconnect,
  wifiApProfile,
  onWifiApSaveProfile,
  onWifiApLoadProfile,
  onWifiApStart,
  onWifiApStop,
  wifiJammerState,
  wifiJammerLog,
  onWifiJammerStart,
  onWifiJammerStop,
  onSetToolStatus,
}: HackerMenuProps) {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [activeView, setActiveView] = useState<ViewKey>('home')
  const [selectedIrId, setSelectedIrId] = useState('')
  const [focusedControl, setFocusedControl] = useState<string>('tab-home')
  const [glitch, setGlitch] = useState(false)
  const [scanY, setScanY] = useState(0)
  const [blink, setBlink] = useState(true)
  const [booted, setBooted] = useState(false)
  const [bootLines, setBootLines] = useState<string[]>([])
  const [wifiApSsidInput, setWifiApSsidInput] = useState('')
  const [wifiApPasswordInput, setWifiApPasswordInput] = useState('')
  const [wifiApChannelInput, setWifiApChannelInput] = useState('6')
  const [wifiResultsTitle, setWifiResultsTitle] = useState('')
  const [wifiResults, setWifiResults] = useState<string[]>([])
  const [showWifiResults, setShowWifiResults] = useState(false)
  const [wifiResultsMode, setWifiResultsMode] = useState<WifiResultsMode>('SCAN')
  const [wifiResultsSelectionMode, setWifiResultsSelectionMode] = useState<WifiResultsSelectionMode>('network')
  const [selectedWifiApPresetIndex, setSelectedWifiApPresetIndex] = useState(0)
  const [selectedJammerPresetIndex, setSelectedJammerPresetIndex] = useState(0)
  const [wifiResultSelectionIndex, setWifiResultSelectionIndex] = useState(0)
  const [jamChannel, setJamChannel] = useState('')
  const [jamAccessPoints, setJamAccessPoints] = useState('')
  const [jamStations, setJamStations] = useState('')
  const [jamFilters, setJamFilters] = useState('')
  const [jamPackets, setJamPackets] = useState('25')
  const [jamDelay, setJamDelay] = useState('1')
  const [jamReset, setJamReset] = useState('0')
  const [jamCode, setJamCode] = useState('7')
  const [jamWorld, setJamWorld] = useState(false)
  const [jamNoBroadcast, setJamNoBroadcast] = useState(false)
  const [jamVerbose, setJamVerbose] = useState(false)
  const [selectedScanNetwork, setSelectedScanNetwork] = useState<WifiNetwork | null>(null)
  const wifiScanNetworks = useMemo(() => buildWifiNetworkList(wifiResults), [wifiResults])
  const selectedNetworkKey = selectedScanNetwork ? wifiNetworkKey(selectedScanNetwork) : ''

  const serialLogRef = useRef<HTMLDivElement>(null)
  const activeGamepadIndexRef = useRef<number | null>(null)
  const gamepadActionPressedRef = useRef(false)
  const gamepadActionArmedRef = useRef(false)
  const gamepadMountedAtRef = useRef(Date.now())
  const gamepadNavDirectionRef = useRef<GamepadNavDirection>(null)
  const gamepadBackPressedRef = useRef(false)
  const gamepadPrevViewPressedRef = useRef(false)
  const gamepadNextViewPressedRef = useRef(false)
  const hackingUiScale = useMemo(() => resolveHackingUiScale(viewport), [viewport])
  const scaledViewport = useMemo(
    () => ({
      width: viewport.width / hackingUiScale,
      height: viewport.height / hackingUiScale,
    }),
    [hackingUiScale, viewport],
  )
  const isDense = scaledViewport.width < 1280 || scaledViewport.height < 860
  const isCompact = scaledViewport.width < 1140 || scaledViewport.height < 780
  const isUltraCompact = scaledViewport.width < 1024 || scaledViewport.height < 700
  const irEntries = useMemo(() => irDbEntries ?? [], [irDbEntries])
  const wifiApPresets = useMemo<WifiApPreset[]>(() => {
    const presets = [...WIFI_AP_FALLBACK_PRESETS]
    if (wifiApProfile) {
      presets.unshift({
        id: 'preset-saved',
        label: 'SAVED PROFILE',
        description: 'Persisted AP profile loaded from disk.',
        profile: {
          ssid: wifiApProfile.ssid,
          password: wifiApProfile.password,
          channel: wifiApProfile.channel,
        },
      })
    }
    return presets
  }, [wifiApProfile])
  const selectedWifiApPreset = wifiApPresets[selectedWifiApPresetIndex] ?? wifiApPresets[0] ?? null
  const selectedJammerPreset = JAMMER_PRESETS[selectedJammerPresetIndex] ?? JAMMER_PRESETS[0]
  const isWifiResultsCloseSelected = showWifiResults && (wifiScanNetworks.length === 0 || wifiResultsSelectionMode === 'close')
  const highlightedWifiNetwork = isWifiResultsCloseSelected ? null : wifiScanNetworks[wifiResultSelectionIndex] ?? null
  const pageSectionGap = isUltraCompact ? '6px' : isDense ? '8px' : '10px'
  const isIrStepControl = focusedControl === 'ir-prev' || focusedControl === 'ir-next'

  useEffect(() => {
    if (!serialLogRef.current) return
    serialLogRef.current.scrollTop = serialLogRef.current.scrollHeight
  }, [serialLines])

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const firstId = irEntries[0]?.id ?? ''
    if (!firstId) {
      if (selectedIrId) setSelectedIrId('')
      return
    }
    const hasSelected = irEntries.some((entry) => entry.id === selectedIrId)
    if (!hasSelected) setSelectedIrId(firstId)
  }, [irEntries, selectedIrId])

  useEffect(() => {
    setSelectedWifiApPresetIndex((current) => Math.min(current, Math.max(wifiApPresets.length - 1, 0)))
  }, [wifiApPresets.length])

  useEffect(() => {
    if (!wifiApProfile) return
    setSelectedWifiApPresetIndex(0)
  }, [wifiApProfile])

  useEffect(() => {
    if (!selectedWifiApPreset) return
    setWifiApSsidInput(selectedWifiApPreset.profile.ssid)
    setWifiApPasswordInput(selectedWifiApPreset.profile.password)
    setWifiApChannelInput(String(selectedWifiApPreset.profile.channel))
  }, [selectedWifiApPreset])

  useEffect(() => {
    const preset = selectedJammerPreset.config
    setJamPackets(preset.packets)
    setJamDelay(preset.delay)
    setJamReset(preset.reset)
    setJamCode(preset.code)
    setJamWorld(preset.world)
    setJamNoBroadcast(preset.noBroadcast)
    setJamVerbose(preset.verbose)
    setJamStations('ff:ff:ff:ff:ff:ff')
    setJamFilters('')
  }, [selectedJammerPreset])

  useEffect(() => {
    if (!selectedScanNetwork) return
    setJamAccessPoints(selectedScanNetwork.bssid || selectedScanNetwork.ssid || '')
    setJamChannel(selectedScanNetwork.channel || '')
  }, [selectedScanNetwork])

  useEffect(() => {
    if (!showWifiResults) return
    const lines = serialLines ?? []
    setWifiResults(collectWifiResultLines(lines, wifiResultsMode))
  }, [serialLines, showWifiResults, wifiResultsMode])

  useEffect(() => {
    if (!showWifiResults) return
    if (wifiScanNetworks.length === 0) {
      if (wifiResultSelectionIndex !== 0) setWifiResultSelectionIndex(0)
      return
    }
    if (wifiResultsSelectionMode === 'close') return
    setWifiResultSelectionIndex((current) => {
      if (current >= 0 && current < wifiScanNetworks.length) return current
      const targetIndex = selectedScanNetwork
        ? wifiScanNetworks.findIndex((network) => wifiNetworkKey(network) === selectedNetworkKey)
        : -1
      return targetIndex >= 0 ? targetIndex : 0
    })
  }, [
    showWifiResults,
    selectedScanNetwork,
    selectedNetworkKey,
    wifiNetworkKey,
    wifiResultSelectionIndex,
    wifiResultsSelectionMode,
    wifiScanNetworks,
  ])

  const openView = useCallback((view: ViewKey) => {
    setActiveView(view)
    setFocusedControl(TAB_CONTROL_BY_VIEW[view])
  }, [])

  const stepIrEntry = useCallback((direction: 1 | -1) => {
    if (irEntries.length === 0) return
    setSelectedIrId((current) => {
      const currentIndex = irEntries.findIndex((entry) => entry.id === current)
      const safeIndex = currentIndex >= 0 ? currentIndex : 0
      const nextIndex = (safeIndex + direction + irEntries.length) % irEntries.length
      return irEntries[nextIndex].id
    })
  }, [irEntries])

  const cycleWifiApPreset = useCallback((direction: 1 | -1) => {
    if (wifiApPresets.length === 0) return
    setSelectedWifiApPresetIndex((current) => cycleIndex(current, wifiApPresets.length, direction))
  }, [wifiApPresets.length])

  const cycleJammerPreset = useCallback((direction: 1 | -1) => {
    setSelectedJammerPresetIndex((current) => cycleIndex(current, JAMMER_PRESETS.length, direction))
  }, [])

  const getWifiApPayload = useCallback(() => {
    const channelRaw = Number.parseInt(wifiApChannelInput, 10)
    const channel = Number.isFinite(channelRaw) ? Math.min(Math.max(channelRaw, 1), 13) : 6
    return {
      ssid: wifiApSsidInput.trim(),
      password: wifiApPasswordInput.trim(),
      channel,
    }
  }, [wifiApChannelInput, wifiApPasswordInput, wifiApSsidInput])

  const runTerminalShortcut = useCallback((command: string, label: string) => {
    onSendRawCommand?.(command)
    onSetToolStatus?.(`Shortcut sent: ${label}`)
  }, [onSendRawCommand, onSetToolStatus])

  const closeWifiResults = useCallback(() => {
    setShowWifiResults(false)
    setWifiResultsSelectionMode('network')
    setFocusedControl('wifi-results')
  }, [])

  const openWifiResults = useCallback(() => {
    setWifiResultsTitle((current) => current || 'Wi-Fi Networks')
    setWifiResultsSelectionMode('network')
    setShowWifiResults(true)
    setFocusedControl('wifi-results')
  }, [])

  const handleWifiScan = useCallback(() => {
    setWifiResults([])
    setWifiResultsTitle('Wi-Fi Networks')
    setWifiResultsMode('SCAN')
    setWifiResultsSelectionMode('network')
    setWifiResultSelectionIndex(0)
    setShowWifiResults(true)
    onSendRawCommand?.('WIFI_SCAN')
  }, [onSendRawCommand])

  const handleWifiResultsSelect = useCallback((network: WifiNetwork) => {
    setSelectedScanNetwork(network)
    setJamAccessPoints(network.bssid || network.ssid || '')
    setJamChannel(network.channel)
    setWifiResultsTitle(`Targeting ${network.ssid}`)
    setShowWifiResults(false)
    setFocusedControl('jam-start')
    onSetToolStatus?.(`Selected Wi-Fi target: ${network.ssid} (${network.bssid || 'no BSSID'})`)
  }, [onSetToolStatus])

  const moveWifiResultSelection = useCallback((direction: 1 | -1) => {
    if (!showWifiResults) return
    if (wifiScanNetworks.length === 0) {
      setWifiResultsSelectionMode('close')
      return
    }
    if (wifiResultsSelectionMode === 'close') {
      setWifiResultsSelectionMode('network')
      setWifiResultSelectionIndex(direction === -1 ? wifiScanNetworks.length - 1 : 0)
      return
    }
    const safeIndex =
      wifiResultSelectionIndex >= 0 && wifiResultSelectionIndex < wifiScanNetworks.length
        ? wifiResultSelectionIndex
        : 0
    const isAtBoundary =
      (direction === -1 && safeIndex === 0) ||
      (direction === 1 && safeIndex === wifiScanNetworks.length - 1)
    if (isAtBoundary) {
      setWifiResultsSelectionMode('close')
      setWifiResultSelectionIndex(safeIndex)
      return
    }
    setWifiResultSelectionIndex(safeIndex + direction)
  }, [showWifiResults, wifiResultSelectionIndex, wifiResultsSelectionMode, wifiScanNetworks.length])

  const confirmWifiResultSelection = useCallback(() => {
    if (isWifiResultsCloseSelected) {
      closeWifiResults()
      return
    }
    if (!highlightedWifiNetwork) return
    handleWifiResultsSelect(highlightedWifiNetwork)
  }, [closeWifiResults, handleWifiResultsSelect, highlightedWifiNetwork, isWifiResultsCloseSelected])

  const handleStartJammer = useCallback(() => {
    if (!jamAccessPoints.trim()) {
      onSetToolStatus?.('Select a Wi-Fi target from the scan window first')
      return
    }

    const payload: WifiJammerPayload = { mode: 'auto' }
    const channelValue = Number.parseInt(jamChannel, 10)
    if (Number.isFinite(channelValue) && channelValue > 0) {
      payload.channel = Math.round(channelValue)
    }
    const parseMaybe = (value: string) => {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    const packetsValue = parseMaybe(jamPackets)
    if (typeof packetsValue === 'number' && packetsValue > 0) {
      payload.packets = Math.max(1, Math.round(packetsValue))
    }
    const delayValue = parseMaybe(jamDelay)
    if (typeof delayValue === 'number') {
      payload.delay = delayValue
    }
    const resetValue = parseMaybe(jamReset)
    if (typeof resetValue === 'number' && resetValue >= 0) {
      payload.reset = Math.round(resetValue)
    }
    const codeValue = Number.parseInt(jamCode, 10)
    if (Number.isFinite(codeValue)) {
      payload.code = Math.min(Math.max(codeValue, 1), 66)
    }
    if (jamAccessPoints.trim()) payload.accessPoints = jamAccessPoints.trim()
    if (jamStations.trim()) payload.stations = jamStations.trim()
    if (jamFilters.trim()) payload.filters = jamFilters.trim()
    if (jamWorld) payload.world = true
    if (jamNoBroadcast) payload.noBroadcast = true
    if (jamVerbose) payload.verbose = true
    void onWifiJammerStart?.(payload)
  }, [
    jamAccessPoints,
    jamChannel,
    jamCode,
    jamDelay,
    jamFilters,
    jamNoBroadcast,
    jamPackets,
    jamReset,
    jamStations,
    jamVerbose,
    jamWorld,
    onWifiJammerStart,
    onSetToolStatus,
  ])

  const handleStopJammer = useCallback(() => {
    void onWifiJammerStop?.()
  }, [onWifiJammerStop])

  const activateFocusedControl = useCallback(() => {
    if (!focusedControl) return
    switch (focusedControl) {
      case 'header-reconnect':
        onReconnect?.()
        return
      case 'header-exit':
        onBack?.()
        return
      case 'tab-home':
        openView('home')
        return
      case 'tab-nfc':
      case 'home-open-nfc':
        openView('nfc')
        return
      case 'tab-ir':
      case 'home-open-ir':
        openView('ir')
        return
      case 'tab-wifi':
      case 'home-open-wifi':
        openView('wifi')
        return
      case 'wifi-scan':
        handleWifiScan()
        return
      case 'wifi-results':
        openWifiResults()
        return
      case 'wifiap-prev':
        cycleWifiApPreset(-1)
        return
      case 'wifiap-next':
        cycleWifiApPreset(1)
        return
      case 'wifiap-start': {
        const payload = getWifiApPayload()
        if (!payload.ssid) return
        onWifiApStart?.(payload)
        return
      }
      case 'wifiap-stop':
        onWifiApStop?.()
        return
      case 'wifiap-save': {
        const payload = getWifiApPayload()
        if (!payload.ssid) return
        onWifiApSaveProfile?.(payload)
        return
      }
      case 'wifiap-load':
        onWifiApLoadProfile?.()
        return
      case 'jam-prev':
        cycleJammerPreset(-1)
        return
      case 'jam-next':
        cycleJammerPreset(1)
        return
      case 'jam-start':
        handleStartJammer()
        return
      case 'jam-stop':
        handleStopJammer()
        return
      case 'nfc-run':
        onSelect?.('nfc')
        return
      case 'nfc-read':
        onNfcRead?.()
        return
      case 'nfc-save':
        onNfcSave?.()
        return
      case 'ir-run':
        onSelect?.('ir')
        return
      case 'ir-reload':
        onIrReload?.()
        return
      case 'ir-prev':
        stepIrEntry(-1)
        return
      case 'ir-next':
        stepIrEntry(1)
        return
      case 'ir-send':
        if (!selectedIrId) return
        onIrSend?.(selectedIrId)
        return
      case 'terminal-ping':
        runTerminalShortcut('PING', 'PING')
        return
      case 'terminal-caps':
        runTerminalShortcut('HELLO', 'HELLO/CAPS')
        return
      case 'terminal-ap-status':
        runTerminalShortcut('WIFI_AP_STATUS', 'AP STATUS')
        return
      case 'terminal-clear':
        onClearSerialLog?.()
        return
      default:
        return
    }
  }, [
    focusedControl,
    onBack,
    onClearSerialLog,
    onIrReload,
    onIrSend,
    onNfcRead,
    onNfcSave,
    onReconnect,
    onSelect,
    onWifiApLoadProfile,
    onWifiApSaveProfile,
    onWifiApStart,
    onWifiApStop,
    cycleJammerPreset,
    cycleWifiApPreset,
    handleWifiScan,
    handleStartJammer,
    handleStopJammer,
    openView,
    getWifiApPayload,
    openWifiResults,
    runTerminalShortcut,
    selectedIrId,
    stepIrEntry,
  ])

  const focusableControls = useMemo<ControlId[]>(() => {
    const controls = [...BASE_FOCUSABLE_CONTROLS]
    if (activeView === 'home') {
      controls.push('home-open-nfc', 'home-open-ir', 'home-open-wifi')
    } else if (activeView === 'nfc') {
      controls.push('nfc-run', 'nfc-read', 'nfc-save')
    } else if (activeView === 'ir') {
      controls.push('ir-run', 'ir-reload', 'ir-prev', 'ir-next', 'ir-send')
    } else {
      controls.push('wifi-scan', 'wifi-results', 'wifiap-prev', 'wifiap-next', 'wifiap-start', 'wifiap-stop', 'wifiap-save', 'wifiap-load')
      controls.push('jam-prev', 'jam-next', 'jam-start', 'jam-stop')
    }
    controls.push('terminal-ping', 'terminal-caps', 'terminal-ap-status', 'terminal-clear')
    return controls
  }, [activeView])

  useEffect(() => {
    if (focusableControls.length === 0) return
    if (!focusableControls.includes(focusedControl)) {
      setFocusedControl(focusableControls[0])
    }
  }, [focusableControls, focusedControl])

  const moveFocus = useCallback((direction: 1 | -1) => {
    if (focusableControls.length === 0) return
    setFocusedControl((current) => {
      const currentIndex = focusableControls.indexOf(current)
      const safeIndex = currentIndex >= 0 ? currentIndex : 0
      const nextIndex = (safeIndex + direction + focusableControls.length) % focusableControls.length
      return focusableControls[nextIndex]
    })
  }, [focusableControls])

  useEffect(() => {
    activeGamepadIndexRef.current = null
    gamepadActionPressedRef.current = false
    gamepadActionArmedRef.current = false
    gamepadMountedAtRef.current = Date.now()
    gamepadNavDirectionRef.current = null
    gamepadBackPressedRef.current = false
    gamepadPrevViewPressedRef.current = false
    gamepadNextViewPressedRef.current = false
  }, [])

  useEffect(() => {
    let index = 0
    let cancelled = false
    let timeoutId: number | null = null

    const next = () => {
      if (cancelled) return
      if (index >= BOOT_SEQUENCE.length) {
        setBooted(true)
        return
      }
      setBootLines((prev) => [...prev, BOOT_SEQUENCE[index]])
      index += 1
      timeoutId = window.setTimeout(next, 110)
    }

    timeoutId = window.setTimeout(next, 300)
    return () => {
      cancelled = true
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setScanY((y) => (y + 1) % 6), 80)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setBlink((v) => !v), 500)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    let glitchTimeoutId: number | null = null
    const iv = setInterval(() => {
      setGlitch(true)
      if (glitchTimeoutId !== null) {
        clearTimeout(glitchTimeoutId)
      }
      glitchTimeoutId = window.setTimeout(() => setGlitch(false), 80)
    }, 5000 + Math.random() * 4000)
    return () => {
      clearInterval(iv)
      if (glitchTimeoutId !== null) {
        clearTimeout(glitchTimeoutId)
      }
    }
  }, [])

  const cycleView = useCallback((direction: 1 | -1) => {
    setActiveView((prev) => {
      const index = VIEW_ITEMS.findIndex((view) => view.key === prev)
      const next = (index + direction + VIEW_ITEMS.length) % VIEW_ITEMS.length
      const nextView = VIEW_ITEMS[next].key
      setFocusedControl(TAB_CONTROL_BY_VIEW[nextView])
      return nextView
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        const isTextControl = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        if (isTextControl || target.isContentEditable) return
      }

      const key = e.key.toLowerCase()

      if (showWifiResults) {
        if (key === 'escape') {
          e.preventDefault()
          closeWifiResults()
          return
        }

        if (key === 'arrowup' || key === 'w' || key === 'arrowleft' || key === 'a') {
          e.preventDefault()
          moveWifiResultSelection(-1)
          return
        }

        if (key === 'arrowdown' || key === 's' || key === 'arrowright' || key === 'd') {
          e.preventDefault()
          moveWifiResultSelection(1)
          return
        }

        if (isHackerMenuActionInput(e)) {
          if (e.repeat) return
          e.preventDefault()
          confirmWifiResultSelection()
        }
        return
      }

      if (key === 'escape') {
        onBack?.()
        return
      }

      if (key === 'arrowup' || key === 'w') {
        e.preventDefault()
        moveFocus(-1)
        return
      }

      if (key === 'arrowdown' || key === 's') {
        e.preventDefault()
        moveFocus(1)
        return
      }

      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault()
        if (isIrStepControl) {
          stepIrEntry(-1)
          return
        }
        moveFocus(-1)
        return
      }

      if (key === 'arrowright' || key === 'd') {
        e.preventDefault()
        if (isIrStepControl) {
          stepIrEntry(1)
          return
        }
        moveFocus(1)
        return
      }

      if (key === '1') openView('home')
      if (key === '2') openView('nfc')
      if (key === '3') openView('ir')
      if (key === '4') openView('wifi')

      if (isHackerMenuActionInput(e)) {
        if (e.repeat) return
        e.preventDefault()
        activateFocusedControl()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activateFocusedControl,
    closeWifiResults,
    confirmWifiResultSelection,
    isIrStepControl,
    moveFocus,
    moveWifiResultSelection,
    onBack,
    openView,
    showWifiResults,
    stepIrEntry,
  ])

  useEffect(() => {
    let raf = 0

    const poll = () => {
      const pads = Array.from(navigator.getGamepads?.() ?? [])
        .filter((g): g is Gamepad => Boolean(g && g.connected))
        .sort((a, b) => a.index - b.index)

      if (activeGamepadIndexRef.current === null || !pads.some((pad) => pad.index === activeGamepadIndexRef.current)) {
        activeGamepadIndexRef.current = pads[0]?.index ?? null
      }

      for (const pad of pads) {
        const axisMoved = Math.abs(pad.axes[1] ?? 0) > 0.35 || Math.abs(pad.axes[0] ?? 0) > 0.35
        const buttonPressed = pad.buttons?.some((button) => button?.pressed)
        if (axisMoved || buttonPressed) {
          activeGamepadIndexRef.current = pad.index
          break
        }
      }

      const gamepad = pads.find((pad) => pad.index === activeGamepadIndexRef.current)
      if (gamepad) {
        const now = Date.now()
        const pressed = (idx: number) => Boolean(gamepad.buttons[idx]?.pressed)
        const axisX = gamepad.axes[0] ?? 0
        const axisY = gamepad.axes[1] ?? 0
        const actionPressed = isHackerMenuActionButtonPressed(gamepad)
        const backPressed = isHackerMenuBackButtonPressed(gamepad)
        const prevViewPressed = isHackerMenuPrevViewButtonPressed(gamepad)
        const nextViewPressed = isHackerMenuNextViewButtonPressed(gamepad)
        const navDirection: GamepadNavDirection = axisY < -0.55 || pressed(12)
          ? 'up'
          : axisY > 0.55 || pressed(13)
            ? 'down'
            : axisX < -0.55 || pressed(14)
              ? 'left'
              : axisX > 0.55 || pressed(15)
                ? 'right'
                : null

        if (!gamepadActionArmedRef.current && !actionPressed && now - gamepadMountedAtRef.current > 220) {
          gamepadActionArmedRef.current = true
        }

        if (showWifiResults) {
          if (backPressed && !gamepadBackPressedRef.current) {
            closeWifiResults()
          } else if (navDirection !== null && navDirection !== gamepadNavDirectionRef.current) {
            if (navDirection === 'up' || navDirection === 'left') {
              moveWifiResultSelection(-1)
            } else if (navDirection === 'down' || navDirection === 'right') {
              moveWifiResultSelection(1)
            }
          } else if (gamepadActionArmedRef.current && actionPressed && !gamepadActionPressedRef.current) {
            confirmWifiResultSelection()
          }
        } else if (backPressed && !gamepadBackPressedRef.current) {
          onBack?.()
        } else if (prevViewPressed && !gamepadPrevViewPressedRef.current) {
          cycleView(-1)
        } else if (nextViewPressed && !gamepadNextViewPressedRef.current) {
          cycleView(1)
        } else if (navDirection !== null && navDirection !== gamepadNavDirectionRef.current) {
          if (navDirection === 'up') {
            moveFocus(-1)
          } else if (navDirection === 'down') {
            moveFocus(1)
          } else if (navDirection === 'left') {
            if (isIrStepControl) {
              stepIrEntry(-1)
            } else {
              moveFocus(-1)
            }
          } else if (navDirection === 'right') {
            if (isIrStepControl) {
              stepIrEntry(1)
            } else {
              moveFocus(1)
            }
          }
        } else if (gamepadActionArmedRef.current && actionPressed && !gamepadActionPressedRef.current) {
          activateFocusedControl()
        }

        gamepadActionPressedRef.current = actionPressed
        gamepadBackPressedRef.current = backPressed
        gamepadPrevViewPressedRef.current = prevViewPressed
        gamepadNextViewPressedRef.current = nextViewPressed
        gamepadNavDirectionRef.current = navDirection
      }
      raf = requestAnimationFrame(poll)
    }

    poll()
    return () => cancelAnimationFrame(raf)
  }, [
    activateFocusedControl,
    closeWifiResults,
    confirmWifiResultSelection,
    cycleView,
    isIrStepControl,
    moveFocus,
    moveWifiResultSelection,
    onBack,
    showWifiResults,
    stepIrEntry,
  ])
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

  const nfcHealth = 'REWRITE_PENDING'
  const nfcLastLine = 'NFC backend removed. UI placeholder remains.'

  const irLastLine = useMemo(() => {
    const lines = serialLines ?? []
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (/IR_|IR=|IR_SENT/i.test(lines[i])) return lines[i]
    }
    return 'No IR lines yet.'
  }, [serialLines])

  const wifiLastLine = useMemo(() => {
    const lines = serialLines ?? []
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (/WIFI_/i.test(lines[i])) return lines[i]
    }
    return 'No Wi-Fi lines yet.'
  }, [serialLines])

  const jamStatusRunning = wifiJammerState?.running ?? false
  const jamStatusColor = jamStatusRunning ? '#33ff88' : '#ff6f6f'
  const jamStatusMessage = wifiJammerState?.message ?? (jamStatusRunning ? 'Jammer active' : 'Idle')
  const jamModeLabel = (wifiJammerState?.mode ?? 'firmware').toUpperCase()
  const jamLogPreview = useMemo(
    () => (wifiJammerLog ?? []).slice(-(isUltraCompact ? 3 : isDense ? 4 : 6)),
    [isDense, isUltraCompact, wifiJammerLog],
  )

  const selectedIrEntry = useMemo(() => irEntries.find((entry) => entry.id === selectedIrId), [irEntries, selectedIrId])
  const serialLogPreview = useMemo(
    () => (serialLines ?? []).slice(-(isUltraCompact ? 8 : isDense ? 10 : 14)),
    [isDense, isUltraCompact, serialLines],
  )
  const bootLinesToRender = isUltraCompact ? bootLines.slice(-1) : isCompact ? bootLines.slice(-2) : bootLines

  const promptCommand = activeView === 'home'
    ? 'guppy status --overview'
    : activeView === 'nfc'
      ? 'guppy nfc --monitor'
      : activeView === 'ir'
        ? 'guppy ir --send'
        : 'guppy wifi --audit'

  const promptColor = activeView === 'home'
    ? '#00ff41'
    : activeView === 'nfc'
      ? '#00ccff'
      : activeView === 'ir'
        ? '#ff8800'
        : '#33bbff'
  const scaledViewportWidth = `${100 / hackingUiScale}vw`
  const scaledViewportHeight = `${100 / hackingUiScale}vh`

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#000',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        width: scaledViewportWidth,
        height: scaledViewportHeight,
        position: 'relative',
        transform: `scale(${hackingUiScale})`,
        transformOrigin: 'top left',
        fontFamily: '"Courier New", Courier, monospace',
        filter: glitch ? 'hue-rotate(80deg) brightness(1.3)' : 'none',
        transition: 'filter 0.04s',
      }}>
      <div style={{
          width: '100%', height: '100%',
          position: 'relative', overflow: 'hidden',
        }}>
          <MatrixBg />

          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
            backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.42) 0px,rgba(0,0,0,0.42) 2px,transparent 2px,transparent 4px)',
            transform: `translateY(${scanY}px)`, opacity: 0.7,
          }} />

          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
            background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.97) 100%)',
          }} />

          {glitch && <div style={{
            position: 'absolute', left: 0, right: 0, height: '2px', zIndex: 7,
            top: `${25 + Math.random() * 50}%`,
            background: 'rgba(0,255,136,0.55)', mixBlendMode: 'screen',
          }} />}

          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            borderBottom: '1px solid #00ff41',
            background: 'rgba(0,6,0,0.97)',
            padding: isCompact ? '8px 10px' : '6px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 0 16px rgba(0,255,65,0.15)',
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#ff5f57', '#ffbd2e', '#28ca41'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
              ))}
            </div>
            <span style={{ color: '#00ff41', fontSize: isCompact ? '12px' : '11px', letterSpacing: isCompact ? '2px' : '4px', textShadow: '0 0 10px #00ff41', fontWeight: 'bold' }}>
              GUPPY - CONTROL CONSOLE
            </span>
            <div style={{ display: 'flex', gap: isCompact ? '8px' : '12px', alignItems: 'center', flexWrap: isCompact ? 'wrap' : 'nowrap', justifyContent: 'flex-end' }}>
              <span style={{ color: hardwareColor, fontSize: isCompact ? '11px' : '10px', letterSpacing: '2px', textShadow: `0 0 6px ${hardwareColor}` }}>
                {hardwareLabel}
              </span>
              <span style={{ color: '#00ff88', fontSize: isCompact ? '11px' : '10px', letterSpacing: '2px', textShadow: '0 0 6px #00ff88' }}>ROOT</span>
              <button onClick={() => onReconnect?.()} style={{
                background: 'transparent', border: '1px solid #00ccff',
                color: '#00ccff', fontFamily: 'inherit', fontSize: isCompact ? '11px' : '10px',
                letterSpacing: '2px', padding: '2px 8px', cursor: 'pointer',
                ...focusedControlStyle(focusedControl === 'header-reconnect', '#00ccff'),
              }}>RECONNECT</button>
              <button onClick={() => onBack?.()} style={{
                background: 'transparent', border: '1px solid #ff4444',
                color: '#ff4444', fontFamily: 'inherit', fontSize: isCompact ? '11px' : '10px',
                letterSpacing: '2px', padding: '2px 8px', cursor: 'pointer',
                ...focusedControlStyle(focusedControl === 'header-exit', '#ff4444'),
              }}>EXIT</button>
            </div>
          </div>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid',
        gridTemplateRows: booted ? 'auto minmax(0,1fr) auto' : 'auto',
        justifyItems: 'center',
        alignItems: 'start',
        gap: isUltraCompact ? '4px' : isDense ? '6px' : '8px',
        paddingTop: isUltraCompact ? '48px' : isDense ? '50px' : '48px',
        paddingBottom: isUltraCompact ? '30px' : isDense ? '32px' : '36px',
        overflow: 'hidden',
        zIndex: 15,
      }}>
        <div style={{
          width: 'min(1360px, 99vw)',
          height: '100%',
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: booted ? 'auto minmax(0,1fr) auto' : 'auto',
          gap: isDense ? '4px' : '6px',
        }}>
          <div style={{ marginBottom: isUltraCompact ? '2px' : isDense ? '4px' : '8px' }}>
            {bootLinesToRender.map((line, i) => (
              <div key={i} style={{ fontSize: isCompact ? '13px' : '12px', lineHeight: isCompact ? '1.55' : '1.9', color: '#3a5a3a', letterSpacing: '0.5px' }}>
                {line || '\u00A0'}
              </div>
            ))}
          </div>

          {booted && (
            <div style={{
              border: '1px solid #00ff41',
              background: 'rgba(0,4,0,0.95)',
              boxShadow: '0 0 28px rgba(0,255,65,0.1), inset 0 0 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              minHeight: 0,
              height: '100%',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0,1fr) auto',
            }}>
              <div style={{
                background: '#00ff41', color: '#000',
                padding: isCompact ? '7px 10px' : '6px 14px', fontSize: isCompact ? '12px' : '11px',
                letterSpacing: isCompact ? '1px' : '2px', fontWeight: 'bold',
                display: 'flex', justifyContent: 'space-between',
                gap: '8px', flexWrap: isCompact ? 'wrap' : 'nowrap',
              }}>
                <span>root@guppy:~ - control-center [{activeView.toUpperCase()}]</span>
                <span>DPAD/L-STICK NAV | A/START SELECT | B/BACK CLOSE/BACK | LB/RB VIEW</span>
              </div>

              <div className="console-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 430px)',
                minHeight: 0,
                height: '100%',
              }}>
                <div className="left-pane" style={{
                  borderRight: '1px solid #081408',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}>
                  <div style={{
                    padding: isCompact ? '8px 10px 6px' : '10px 16px 8px',
                    borderBottom: '1px solid #081408',
                    display: 'flex',
                    gap: isCompact ? '6px' : '8px',
                    flexWrap: 'wrap',
                  }}>
                    {VIEW_ITEMS.map((view, index) => (
                      <button
                        key={view.key}
                        onClick={() => openView(view.key)}
                        style={{
                          ...tabButtonStyle(activeView === view.key, view.color, isCompact),
                          ...focusedControlStyle(focusedControl === `tab-${view.key}`, view.color),
                        }}
                      >
                        {index + 1}. {view.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: isUltraCompact ? '8px' : isCompact ? '10px' : '12px 16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {activeView === 'home' && (
                      <div style={{ display: 'grid', gap: pageSectionGap, alignContent: 'start' }}>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#00ff41', letterSpacing: '1.2px', textShadow: '0 0 8px #00ff41' }}>
                          CONTROL OVERVIEW
                        </div>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#4f744f', letterSpacing: '0.2px', lineHeight: '1.45' }}>
                          Start here. Gebruik dedicated pages voor NFC, IR en Wi-Fi.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                          <button
                            onClick={() => openView('nfc')}
                            style={{
                              ...actionButtonStyle('#00ccff', isCompact),
                              ...focusedControlStyle(focusedControl === 'home-open-nfc', '#00ccff'),
                            }}
                          >
                            OPEN NFC PAGE
                          </button>
                          <button
                            onClick={() => openView('ir')}
                            style={{
                              ...actionButtonStyle('#ff8800', isCompact),
                              ...focusedControlStyle(focusedControl === 'home-open-ir', '#ff8800'),
                            }}
                          >
                            OPEN IR PAGE
                          </button>
                          <button
                            onClick={() => openView('wifi')}
                            style={{
                              ...actionButtonStyle('#33bbff', isCompact),
                              ...focusedControlStyle(focusedControl === 'home-open-wifi', '#33bbff'),
                            }}
                          >
                            OPEN WIFI PAGE
                          </button>
                        </div>

                        <div style={{ border: '1px solid #1a3a1a', background: 'rgba(0, 30, 0, 0.2)', padding: '12px', display: 'grid', gap: '8px' }}>
                          <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#a5d3a5' }}>HW::{hardwareLabel}</div>
                          <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#a5d3a5' }}>NFC_HW::{nfcHealth}</div>
                          <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#a5d3a5' }}>IR_DB::{irEntries.length} entries</div>
                          <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#5a855a', wordBreak: 'break-word' }}>LAST_RX::{lastDeviceLine || 'none'}</div>
                        </div>
                      </div>
                    )}

                    {activeView === 'nfc' && (
                      <div style={{ display: 'grid', gap: pageSectionGap, alignContent: 'start' }}>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#00ccff', letterSpacing: '1.2px', textShadow: '0 0 8px #00ccff' }}>
                          NFC PAGE
                        </div>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#4b6f8a', letterSpacing: '0.2px', lineHeight: '1.45' }}>
                          Placeholder screen kept in place while the NFC implementation is rewritten.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isUltraCompact ? '1fr' : 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: pageSectionGap }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                            <button
                              onClick={() => onSelect?.('nfc')}
                              style={{
                                ...actionButtonStyle('#00ccff', isCompact),
                                ...focusedControlStyle(focusedControl === 'nfc-run', '#00ccff'),
                              }}
                            >
                              RUN NFC_CLONE
                            </button>
                            <button
                              onClick={() => onNfcRead?.()}
                              style={{
                                ...actionButtonStyle('#00ccff', isCompact),
                                ...focusedControlStyle(focusedControl === 'nfc-read', '#00ccff'),
                              }}
                            >
                              NFC READ UID
                            </button>
                            <button
                              onClick={() => onNfcSave?.()}
                              style={{
                                ...actionButtonStyle('#00ff88', isCompact),
                                color: '#00ff88',
                                cursor: 'pointer',
                                ...focusedControlStyle(focusedControl === 'nfc-save', '#00ff88'),
                              }}
                            >
                              SAVE NFC FILE
                            </button>
                          </div>
                          <div style={{ border: '1px solid #0f3045', background: 'rgba(0,35,55,0.22)', padding: isDense ? '8px' : '10px', display: 'grid', gap: '6px' }}>
                            <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#8fdfff' }}>NFC_HW::{nfcHealth}</div>
                            <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#8fdfff' }}>UID::pending rewrite</div>
                            <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#4c7f95', wordBreak: 'break-word' }}>LAST::{nfcLastLine}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'wifi' && (
                      <div style={{ display: 'grid', gap: pageSectionGap, alignContent: 'start', minHeight: 0 }}>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#33bbff', letterSpacing: '1.2px', textShadow: '0 0 8px #33bbff' }}>
                          WIFI PAGE
                        </div>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#5e94b2', letterSpacing: '0.2px', lineHeight: '1.45' }}>
                          Arcade-first Wi-Fi flow: scan, highlight a network, lock target, run the action.
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isUltraCompact ? '1fr' : 'minmax(0, 0.98fr) minmax(0, 1.02fr)',
                          gap: pageSectionGap,
                          minHeight: 0,
                          alignItems: 'start',
                        }}>
                          <div style={{ display: 'grid', gap: pageSectionGap, minHeight: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                              <button
                                onClick={() => handleWifiScan()}
                                style={{
                                  ...actionButtonStyle('#66ddff', isCompact),
                                  ...focusedControlStyle(focusedControl === 'wifi-scan', '#66ddff'),
                                }}
                              >
                                WIFI SCAN
                              </button>
                              <button
                                onClick={() => openWifiResults()}
                                style={{
                                  ...actionButtonStyle('#33bbff', isCompact),
                                  ...focusedControlStyle(focusedControl === 'wifi-results', '#33bbff'),
                                }}
                              >
                                OPEN RESULTS WINDOW
                              </button>
                            </div>

                            <div style={{ border: '1px solid #123346', background: 'rgba(5, 25, 40, 0.2)', padding: isDense ? '8px' : '10px', display: 'grid', gap: isDense ? '6px' : '8px' }}>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#8ed2f8', letterSpacing: '0.8px' }}>
                                TARGET::{selectedScanNetwork
                                  ? `${selectedScanNetwork.ssid} ${selectedScanNetwork.bssid ? `(${selectedScanNetwork.bssid})` : ''} / CH${selectedScanNetwork.channel || 'auto'}`
                                  : 'none selected'}
                              </div>
                              {!isDense && (
                                <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#6fa7c4', lineHeight: '1.45' }}>
                                  Gebruik `WIFI SCAN`, blader met de joystick door de netwerken of naar `CLOSE`, en druk op A om een target te locken of terug te gaan.
                                </div>
                              )}
                            </div>

                            <div style={{ border: '1px solid #123346', background: 'rgba(5, 25, 40, 0.2)', padding: isDense ? '8px' : '10px', display: 'grid', gap: isDense ? '6px' : '8px' }}>
                              <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#93d7ff', letterSpacing: '1px' }}>
                                WIFI AP PRESET
                              </div>
                              {!isDense && (
                                <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#5e94b2', lineHeight: '1.4' }}>
                                  Geen vrije invoer meer: kies een preset of laad het opgeslagen profiel.
                                </div>
                              )}
                              <div style={{ border: '1px solid #1f5570', background: '#071f2d', padding: isDense ? '8px' : '10px', display: 'grid', gap: '4px' }}>
                                <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#c0ebff', letterSpacing: '1px' }}>
                                  ACTIVE::{selectedWifiApPreset?.label ?? 'NO PRESET'}
                                </div>
                                {!isDense && (
                                  <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#82b8d4', lineHeight: '1.45' }}>
                                    {selectedWifiApPreset?.description ?? 'No AP preset available.'}
                                  </div>
                                )}
                                <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#6cc6ff', wordBreak: 'break-word' }}>
                                  PROFILE::{selectedWifiApPreset ? formatWifiApSummary(selectedWifiApPreset.profile) : 'none'}
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                                <button
                                  onClick={() => cycleWifiApPreset(-1)}
                                  style={{
                                    ...actionButtonStyle('#66ddff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-prev', '#66ddff'),
                                  }}
                                >
                                  PREV PRESET
                                </button>
                                <button
                                  onClick={() => cycleWifiApPreset(1)}
                                  style={{
                                    ...actionButtonStyle('#66ddff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-next', '#66ddff'),
                                  }}
                                >
                                  NEXT PRESET
                                </button>
                                <button
                                  onClick={() => {
                                    const payload = getWifiApPayload()
                                    if (!payload.ssid) return
                                    onWifiApStart?.(payload)
                                  }}
                                  style={{
                                    ...actionButtonStyle('#33bbff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-start', '#33bbff'),
                                  }}
                                >
                                  START AP
                                </button>
                                <button
                                  onClick={() => onWifiApStop?.()}
                                  style={{
                                    ...actionButtonStyle('#33bbff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-stop', '#33bbff'),
                                  }}
                                >
                                  STOP AP
                                </button>
                                <button
                                  onClick={() => {
                                    const payload = getWifiApPayload()
                                    if (!payload.ssid) return
                                    onWifiApSaveProfile?.(payload)
                                  }}
                                  style={{
                                    ...actionButtonStyle('#66ddff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-save', '#66ddff'),
                                  }}
                                >
                                  SAVE AS DEFAULT
                                </button>
                                <button
                                  onClick={() => onWifiApLoadProfile?.()}
                                  style={{
                                    ...actionButtonStyle('#66ddff', isCompact),
                                    ...focusedControlStyle(focusedControl === 'wifiap-load', '#66ddff'),
                                  }}
                                >
                                  LOAD PROFILE
                                </button>
                              </div>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#4f87a7', wordBreak: 'break-word' }}>
                                SAVED::{wifiApProfile
                                  ? formatWifiApSummary(wifiApProfile)
                                  : 'none'}
                              </div>
                              {!isUltraCompact && (
                                <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#4f87a7', wordBreak: 'break-word' }}>
                                  LAST::{wifiLastLine}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ border: '1px solid #0b2c3f', background: 'rgba(6, 21, 31, 0.45)', padding: isDense ? '8px' : '12px', display: 'grid', gap: isDense ? '8px' : '10px', minHeight: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: isCompact ? '12px' : '13px', color: '#66ddff', letterSpacing: '1px' }}>WI-FI DEAUTH</div>
                              <span style={{ fontSize: isCompact ? '11px' : '12px', color: jamStatusColor, letterSpacing: '0.8px' }}>
                                {jamStatusRunning ? 'RUNNING' : 'STOPPED'}
                              </span>
                              <span style={{ fontSize: isCompact ? '11px' : '12px', color: '#8ad8ff', letterSpacing: '0.8px' }}>
                                MODE {jamModeLabel}
                              </span>
                              <span style={{ fontSize: isCompact ? '11px' : '12px', color: '#aad7ff', wordBreak: 'break-word' }}>
                                {jamStatusMessage}
                              </span>
                            </div>
                            {!isDense && (
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#7bb5cd', lineHeight: '1.4' }}>
                                Firmware-first flow: selecteer een scanresultaat en start daarna een preset zonder losse velden of checkboxes.
                              </div>
                            )}
                            <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#a0dff7', letterSpacing: '0.5px', border: '1px solid #154050', padding: isDense ? '6px 8px' : '8px' }}>
                              TARGET::{selectedScanNetwork
                                ? `${selectedScanNetwork.ssid} ${selectedScanNetwork.bssid ? `(${selectedScanNetwork.bssid})` : ''}`
                                : 'none'} / CH{jamChannel || 'auto'}
                            </div>
                            <div style={{ border: '1px solid #154050', background: '#071923', padding: isDense ? '8px' : '10px', display: 'grid', gap: '4px' }}>
                              <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#d0eeff', letterSpacing: '1px' }}>
                                ACTIVE::{selectedJammerPreset.label}
                              </div>
                              {!isDense && (
                                <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#87b9cf', lineHeight: '1.45' }}>
                                  {selectedJammerPreset.description}
                                </div>
                              )}
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#9edcff', lineHeight: '1.45', wordBreak: 'break-word' }}>
                                PACKETS::{jamPackets} | DELAY::{jamDelay}s | RESET::{jamReset} | CODE::{jamCode}
                              </div>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#6db8de', lineHeight: '1.45', wordBreak: 'break-word' }}>
                                FLAGS::{jamVerbose ? 'VERBOSE ' : ''}{jamWorld ? 'WORLD ' : ''}{jamNoBroadcast ? 'NO_BROADCAST ' : ''}{jamStations ? `STATION ${jamStations}` : 'BROADCAST DEFAULT'}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                              <button
                                onClick={() => cycleJammerPreset(-1)}
                                style={{
                                  ...actionButtonStyle('#66ddff', isCompact),
                                  ...focusedControlStyle(focusedControl === 'jam-prev', '#66ddff'),
                                }}
                              >
                                PREV PROFILE
                              </button>
                              <button
                                onClick={() => cycleJammerPreset(1)}
                                style={{
                                  ...actionButtonStyle('#66ddff', isCompact),
                                  ...focusedControlStyle(focusedControl === 'jam-next', '#66ddff'),
                                }}
                              >
                                NEXT PROFILE
                              </button>
                              <button
                                onClick={handleStartJammer}
                                style={{
                                  ...actionButtonStyle('#33ff88', isCompact),
                                  ...focusedControlStyle(focusedControl === 'jam-start', '#33ff88'),
                                }}
                              >
                                START DEAUTH
                              </button>
                              <button
                                onClick={handleStopJammer}
                                style={{
                                  ...actionButtonStyle('#ff6f6f', isCompact),
                                  ...focusedControlStyle(focusedControl === 'jam-stop', '#ff6f6f'),
                                }}
                              >
                                STOP DEAUTH
                              </button>
                            </div>
                            <div style={{ border: '1px solid #1b3a46', padding: isDense ? '8px' : '10px', display: 'grid', gap: '4px' }}>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#93d7ff' }}>DEAUTH LOG ({jamLogPreview.length})</div>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#7bc6ff', lineHeight: '1.4' }}>
                                {jamLogPreview.length === 0
                                  ? 'No log lines yet.'
                                  : jamLogPreview.map((line, index) => (
                                      <div key={`${line}-${index}`} style={{ wordBreak: 'break-word' }}>
                                        {line}
                                      </div>
                                    ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'ir' && (
                      <div style={{ display: 'grid', gap: pageSectionGap, alignContent: 'start' }}>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#ff8800', letterSpacing: '1.2px', textShadow: '0 0 8px #ff8800' }}>
                          IR PAGE
                        </div>
                        <div style={{ fontSize: isCompact ? '13px' : '12px', color: '#8a6230', letterSpacing: '0.2px', lineHeight: '1.45' }}>
                          Dedicated controls for IR database management and signal sending.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isUltraCompact ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)', gap: pageSectionGap }}>
                          <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                              <button
                                onClick={() => onSelect?.('ir')}
                                style={{
                                  ...actionButtonStyle('#ff8800', isCompact),
                                  ...focusedControlStyle(focusedControl === 'ir-run', '#ff8800'),
                                }}
                              >
                                RUN IR_BLAST
                              </button>
                              <button
                                onClick={() => onIrReload?.()}
                                style={{
                                  ...actionButtonStyle('#ff8800', isCompact),
                                  ...focusedControlStyle(focusedControl === 'ir-reload', '#ff8800'),
                                }}
                              >
                                RELOAD IR DB
                              </button>
                            </div>
                            <div style={{ border: '1px solid #5c3208', background: 'rgba(40, 18, 2, 0.45)', padding: isDense ? '8px' : '10px', display: 'grid', gap: '4px' }}>
                              <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#ffd4a2' }}>
                                ENTRY::{selectedIrEntry ? `${selectedIrEntry.name} [${selectedIrEntry.protocol}]` : 'none'}
                              </div>
                              <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#c39a67' }}>
                                POSITION::{irEntries.length === 0 ? '0/0' : `${Math.max(irEntries.findIndex((entry) => entry.id === selectedIrId), 0) + 1}/${irEntries.length}`}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => stepIrEntry(-1)}
                                style={{
                                  ...actionButtonStyle('#ff8800', isCompact),
                                  ...focusedControlStyle(focusedControl === 'ir-prev', '#ff8800'),
                                }}
                              >
                                PREV
                              </button>
                              <button
                                onClick={() => stepIrEntry(1)}
                                style={{
                                  ...actionButtonStyle('#ff8800', isCompact),
                                  ...focusedControlStyle(focusedControl === 'ir-next', '#ff8800'),
                                }}
                              >
                                NEXT
                              </button>
                              <button
                                onClick={() => selectedIrId && onIrSend?.(selectedIrId)}
                                disabled={!selectedIrId}
                                style={{
                                  ...actionButtonStyle('#ff8800', isCompact),
                                  color: selectedIrId ? '#ffd9a8' : '#8a6a44',
                                  cursor: selectedIrId ? 'pointer' : 'not-allowed',
                                  opacity: selectedIrId ? 1 : 0.7,
                                  ...focusedControlStyle(focusedControl === 'ir-send', '#ff8800'),
                                }}
                              >
                                SEND IR
                              </button>
                            </div>
                          </div>
                          <div style={{ border: '1px solid #3a2107', background: 'rgba(50,25,5,0.26)', padding: isDense ? '8px' : '10px', display: 'grid', gap: '6px', alignContent: 'start' }}>
                            <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#ffd4a2' }}>IR_DB::{irEntries.length} entries</div>
                            <div style={{ fontSize: isCompact ? '12px' : '11px', color: '#ffd4a2' }}>
                              SELECTED::{selectedIrEntry ? `${selectedIrEntry.name} (${selectedIrEntry.protocol})` : 'none'}
                            </div>
                            <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#b38a58', wordBreak: 'break-word' }}>LAST::{irLastLine}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{
                    padding: isUltraCompact ? '7px 8px' : isCompact ? '8px 10px' : '10px 12px',
                    borderBottom: '1px solid #081408',
                    color: '#7fbf7f',
                    fontSize: isCompact ? '13px' : '12px',
                    letterSpacing: '1px',
                  }}>
                    SERIAL TERMINAL (STATIC)
                  </div>
                  <div style={{
                    padding: isUltraCompact ? '7px 8px' : isCompact ? '8px 10px' : '10px 12px',
                    borderBottom: '1px solid #081408',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    {TERMINAL_SHORTCUTS.map((shortcut) => (
                      <button
                        key={shortcut.id}
                        onClick={() => runTerminalShortcut(shortcut.command, shortcut.label)}
                        style={{
                          ...actionButtonStyle(shortcut.color, isCompact),
                          ...focusedControlStyle(focusedControl === shortcut.id, shortcut.color),
                        }}
                      >
                        {shortcut.label}
                      </button>
                    ))}
                    <button
                      onClick={() => onClearSerialLog?.()}
                      style={{
                        ...actionButtonStyle('#ff4444', isCompact),
                        ...focusedControlStyle(focusedControl === 'terminal-clear', '#ff4444'),
                      }}
                    >
                      CLEAR
                    </button>
                  </div>

                  {!isDense && (
                    <div style={{ padding: isCompact ? '8px 10px' : '8px 12px', borderBottom: '1px solid #081408', display: 'grid', gap: '4px' }}>
                      {TERMINAL_SHORTCUTS.map((shortcut) => (
                        <div key={`${shortcut.id}-desc`} style={{ fontSize: isCompact ? '11px' : '10px', color: '#4d7f4d' }}>
                          {shortcut.label}::{shortcut.description}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    ref={serialLogRef}
                    style={{
                      flex: 1,
                      minHeight: isUltraCompact ? '120px' : isDense ? '150px' : isCompact ? '190px' : '280px',
                      maxHeight: isUltraCompact ? '160px' : isDense ? '190px' : isCompact ? '240px' : '360px',
                      overflow: 'hidden',
                      background: '#010701',
                      borderBottom: '1px solid #103010',
                      padding: isDense ? '8px' : '10px',
                    }}
                  >
                    {serialLogPreview.length === 0 ? (
                      <div style={{ color: '#2b4a2b', fontSize: isCompact ? '12px' : '11px' }}>No serial lines yet.</div>
                    ) : (
                      serialLogPreview.map((line, index) => (
                        <div key={`${index}-${line.slice(0, 24)}`} style={{ color: '#69a869', fontSize: isCompact ? '12px' : '11px', lineHeight: '1.45' }}>
                          {line}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: isUltraCompact ? '7px 8px' : isCompact ? '8px 10px' : '10px 12px', display: 'grid', gap: '6px' }}>
                    <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#4d7f4d', letterSpacing: '0.5px' }}>
                      TOOL::{toolStatus || 'Ready'}
                    </div>
                    {deviceStatus?.error && (
                      <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#ff7777', letterSpacing: '0.5px', wordBreak: 'break-word' }}>
                        HW_ERR::{deviceStatus.error}
                      </div>
                    )}
                    <div style={{ fontSize: isCompact ? '11px' : '10px', color: '#4d7f4d', letterSpacing: '0.5px', wordBreak: 'break-word' }}>
                      LAST_RX::{lastDeviceLine || 'none'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                borderTop: '1px solid #081408',
                padding: isCompact ? '8px 10px' : '10px 16px',
                display: 'flex', alignItems: 'center', gap: '6px',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: '#00cc44', fontSize: isCompact ? '13px' : '12px' }}>root@guppy</span>
                <span style={{ color: '#555', fontSize: isCompact ? '13px' : '12px' }}>:</span>
                <span style={{ color: '#4466cc', fontSize: isCompact ? '13px' : '12px' }}>~</span>
                <span style={{ color: '#888', fontSize: isCompact ? '13px' : '12px' }}>$</span>
                <span style={{
                  color: promptColor,
                  fontSize: isCompact ? '13px' : '14px', letterSpacing: isCompact ? '1px' : '2px',
                  fontWeight: 'bold',
                  textShadow: `0 0 12px ${promptColor}`,
                }}>{promptCommand}</span>
                <span style={{
                  fontSize: isCompact ? '13px' : '14px', color: promptColor,
                  opacity: blink ? 1 : 0,
                  textShadow: `0 0 8px ${promptColor}`,
                }}>|</span>
              </div>
            </div>
          )}

          {booted && !isUltraCompact && (
            <div style={{ marginTop: '6px', display: 'flex', gap: isCompact ? '10px' : '18px', color: '#1a2a1a', fontSize: isCompact ? '11px' : '10px', letterSpacing: isCompact ? '1px' : '2px', flexWrap: 'wrap' }}>
              <span>DPAD / L-STICK: focus</span>
              <span>A / START: activate</span>
              <span>B / BACK: close modal or back</span>
              <span>LB/RB: switch page</span>
              <span>FOCUS::{focusedControl}</span>
              <span style={{ marginLeft: 'auto' }}>{activeView.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            borderTop: '1px solid #0a140a',
            background: 'rgba(0,0,0,0.85)',
            padding: isCompact ? '6px 10px' : '4px 20px',
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: isCompact ? '6px' : '0px',
          }}>
            {['SYS::ACTIVE', `VIEW::${activeView.toUpperCase()}`, `NFC::${nfcHealth}`, `IR_DB::${irEntries.length}`, hardwareLabel].map((s) => (
              <span key={s} style={{ color: '#0d1a0d', fontSize: isCompact ? '10px' : '9px', letterSpacing: isCompact ? '1px' : '2px' }}>{s}</span>
            ))}
          </div>

          <WifiResultsModal
            isOpen={showWifiResults}
            title={wifiResultsTitle}
            mode={wifiResultsMode}
            results={wifiResults}
            onClose={closeWifiResults}
            isCompact={isCompact}
            onSelectNetwork={handleWifiResultsSelect}
            selectedNetworkKey={highlightedWifiNetwork ? wifiNetworkKey(highlightedWifiNetwork) : ''}
            targetNetworkKey={selectedNetworkKey}
            isCloseSelected={isWifiResultsCloseSelected}
          />


          <style>{`
            @keyframes scanrow {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }

            @media (max-width: 1480px) {
              .console-grid {
                grid-template-columns: 1fr !important;
              }
              .left-pane {
                border-right: none !important;
                border-bottom: 1px solid #081408;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}
