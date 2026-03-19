import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import fs from 'fs'
import { SerialPort } from 'serialport'
import { ARCADE_LEAVE_MENU_ACCELERATORS } from './shared/arcade-controls'
import type {
  AiExplainPayload,
  AiExplainResponse,
  GuppyStatus,
  IrDatabaseEntry,
  LaunchRequest,
  LaunchViewport,
  WifiApProfile,
  WifiJammerPayload,
  WifiJammerState,
  WindowsUsbInsertEvent,
} from './shared/electron-types'

type PortInfo = Awaited<ReturnType<typeof SerialPort.list>>[number]
type PortInfoWithFriendlyName = PortInfo & { friendlyName?: string }

type IpcResult = {
  success: boolean
  message: string
}
type MacVendorLookupResult = {
  success: boolean
  vendors: Record<string, string>
}
type JammerGuideResult = {
  success: boolean
  content?: string
  message?: string
}
type JammerMaclistResult = {
  success: boolean
  count: number
  preview: string[]
}

type AiExplainRequest = AiExplainPayload & { language?: string }
type AiExplainResult = AiExplainResponse

const DEFAULT_IR_MINI_DATABASE: IrDatabaseEntry[] = [
  {
    id: 'tv_power_nec_20df10ef',
    name: 'TV Power (NEC sample)',
    protocol: 'NEC',
    address: '0x20DF',
    command: '0x10EF',
    carrierKhz: 38,
    source: 'Built-in fallback'
  },
  {
    id: 'tv_volup_nec_20df40bf',
    name: 'TV Vol+ (NEC sample)',
    protocol: 'NEC',
    address: '0x20DF',
    command: '0x40BF',
    carrierKhz: 38,
    source: 'Built-in fallback'
  },
  {
    id: 'tv_voldown_nec_20dfc03f',
    name: 'TV Vol- (NEC sample)',
    protocol: 'NEC',
    address: '0x20DF',
    command: '0xC03F',
    carrierKhz: 38,
    source: 'Built-in fallback'
  },
  {
    id: 'projector_power_nec_807f12ed',
    name: 'Projector Power (NEC sample)',
    protocol: 'NEC',
    address: '0x807F',
    command: '0x12ED',
    carrierKhz: 38,
    source: 'Built-in fallback'
  }
]

const OLLAMA_URL = (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/+$/, '')
const OLLAMA_FALLBACK_URL = process.env.OLLAMA_FALLBACK_URL?.replace(/\/+$/, '')
const OLLAMA_ALLOW_FALLBACK = Boolean(OLLAMA_FALLBACK_URL && OLLAMA_FALLBACK_URL !== OLLAMA_URL)
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:27b'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 45000)
const OLLAMA_KEEP_ALIVE_SEC = Number(process.env.OLLAMA_KEEP_ALIVE_SEC ?? 1800) // 30 minuten loaded houden

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function envFlagEnabled(value?: string | null) {
  if (!value) return false
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function quoteForPosixShell(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function quoteForCmd(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function resolvePongAiLogPath(fullGamePath: string, env: NodeJS.ProcessEnv) {
  const explicitPath = env.PONG_AI_LOG_PATH?.trim()
  if (explicitPath) return path.resolve(explicitPath)
  return path.resolve(path.dirname(fullGamePath), '..', '..', 'logs', 'pong-ai.jsonl')
}

function resolvePongConsoleLogPath(fullGamePath: string, env: NodeJS.ProcessEnv) {
  const explicitPath = env.PONG_CONSOLE_LOG_PATH?.trim()
  if (explicitPath) return path.resolve(explicitPath)
  return path.resolve(path.dirname(fullGamePath), '..', '..', 'logs', 'pong-console.log')
}

function shouldOpenPongAiLogWindow(fullGamePath: string, env: NodeJS.ProcessEnv) {
  return path.basename(fullGamePath).toLowerCase() === 'pong.py'
    && envFlagEnabled(env.PONG_AI_LOG_WINDOW)
}

function openPongLogWindow(appRoot: string, logPath: string, title: string) {
  const viewerScriptPath = path.join(appRoot, 'scripts', 'tail-log-file.js')
  if (!fs.existsSync(viewerScriptPath)) {
    console.warn(`[PONG AI] Log viewer script not found: ${viewerScriptPath}`)
    return
  }

  const logCommand = `${quoteForPosixShell(process.execPath)} ${quoteForPosixShell(viewerScriptPath)} ${quoteForPosixShell(logPath)}`

  try {
    if (process.platform === 'win32') {
      const windowsCommand = `set ELECTRON_RUN_AS_NODE=1 && ${quoteForCmd(process.execPath)} ${quoteForCmd(viewerScriptPath)} ${quoteForCmd(logPath)}`
      spawn('cmd.exe', ['/d', '/k', windowsCommand], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      }).unref()
      return
    }

    if (process.platform === 'darwin') {
      const script = [
        'tell application "Terminal"',
        `do script ${JSON.stringify(`printf '\\\\e]1;${title}\\\\a'; clear; export ELECTRON_RUN_AS_NODE=1; ${logCommand}`)}`,
        'activate',
        'end tell',
      ].join('\n')

      spawn('osascript', ['-e', script], {
        detached: true,
        stdio: 'ignore',
      }).unref()
      return
    }

    console.warn(`[PONG AI] Live log window is not supported on ${process.platform}. Tail this file manually: ${logPath}`)
  } catch (error) {
    console.warn('[PONG AI] Failed to open live log window:', toErrorMessage(error))
  }
}

function ensureLogFileReady(logPath: string) {
  const directory = path.dirname(logPath)
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(logPath, '')
}

function createPongConsoleLogStream(logPath: string) {
  ensureLogFileReady(logPath)
  return fs.createWriteStream(logPath, { flags: 'a' })
}

function closeLogStream(stream?: fs.WriteStream | null) {
  if (!stream) return
  try {
    stream.end()
  } catch (error) {
    console.warn('[PONG AI] Failed to close console log stream:', toErrorMessage(error))
  }
}

function buildAiMessages(payload: AiExplainRequest) {
  const genre = payload.genre ?? 'ARCADE'
  const difficulty = payload.difficulty ?? 'UNSET'
  const recent = payload.lastEvent ?? 'n/a'
  const language = payload.language ?? 'Dutch'

  return [
    {
      role: 'system',
      content: `You are an upbeat arcade explainer. Answer in ${language}. Keep it under 80 words, bullet-like sentences.`
    },
    {
      role: 'user',
      content: [
        `Game: ${payload.title} (${genre}, difficulty ${difficulty})`,
        'Task: explain briefly how to play, what to aim for, and one quick tip.',
        `Recent event: ${recent}`
      ].join('\n')
    }
  ]
}

async function checkOllamaReachable(targetUrl: string): Promise<{ ok: boolean; message?: string }> {
  const url = `${targetUrl}/api/tags`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    if (!response.ok) {
      return { ok: false, message: `Ollama HTTP ${response.status} bij /api/tags` }
    }
    return { ok: true }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false,
      message: aborted
        ? 'Timeout bij Ollama /api/tags (firewall of traag netwerk)'
        : toErrorMessage(error)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function callAiExplain(payload: AiExplainRequest): Promise<AiExplainResult> {
  const reachPrimary = await checkOllamaReachable(OLLAMA_URL)
  if (!reachPrimary.ok && OLLAMA_ALLOW_FALLBACK && OLLAMA_FALLBACK_URL) {
    const reachFallback = await checkOllamaReachable(OLLAMA_FALLBACK_URL)
    if (reachFallback.ok) {
      return callAiExplainWithUrl(payload, OLLAMA_FALLBACK_URL, 'fallback')
    }
    return {
      success: false,
      message: `Kan Ollama niet bereiken op ${OLLAMA_URL} (${reachPrimary.message ?? 'onbekend'}) en fallback ${OLLAMA_FALLBACK_URL} (${reachFallback.message ?? 'onbekend'})`
    }
  }
  if (!reachPrimary.ok) {
    return {
      success: false,
      message: OLLAMA_ALLOW_FALLBACK
        ? `Kan Ollama niet bereiken op ${OLLAMA_URL}: ${reachPrimary.message ?? 'onbekende fout'}`
        : `Kan Ollama niet bereiken op ${OLLAMA_URL}; fallback is uitgeschakeld`
    }
  }
  return callAiExplainWithUrl(payload, OLLAMA_URL, 'primary')
}

async function callAiExplainWithUrl(payload: AiExplainRequest, baseUrl: string, source: 'primary' | 'fallback'): Promise<AiExplainResult> {
  const url = `${baseUrl}/api/chat`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: buildAiMessages(payload),
        keep_alive: Number.isFinite(OLLAMA_KEEP_ALIVE_SEC) ? OLLAMA_KEEP_ALIVE_SEC : undefined,
        options: { temperature: 0.6 }
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      return { success: false, message: `AI HTTP ${response.status} via ${source}` }
    }

    const json = await response.json() as { message?: { content?: string } }
    const content = json?.message?.content?.trim()
    if (!content) {
      return { success: false, message: `Lege AI-respons via ${source}` }
    }

    return { success: true, message: `ok (${source})`, content }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return {
      success: false,
      message: aborted
        ? `AI timeout (${OLLAMA_TIMEOUT_MS}ms) bij ${baseUrl}. Update firewall/source-range of verhoog OLLAMA_TIMEOUT_MS.`
        : `${toErrorMessage(error)} via ${source}`
    }
  } finally {
    clearTimeout(timeout)
  }
}

function hasPygame(pythonCommand: string) {
  try {
    const check = spawnSync(pythonCommand, ['-c', 'import pygame'], { stdio: 'ignore' })
    return check.status === 0
  } catch {
    return false
  }
}

function resolvePythonCommand(basePath: string) {
  const explicitPython = process.env.ARCADE_PYTHON?.trim()
  if (explicitPython) return explicitPython

  const rootCandidates = [
    path.resolve(basePath, '..'),
    path.resolve(basePath, '../..')
  ]

  const interpreterCandidates = process.platform === 'win32'
    ? [
        path.join('.venv', 'Scripts', 'python.exe'),
        path.join('.venv', 'Scripts', 'python')
      ]
    : [
        path.join('.venv', 'bin', 'python3'),
        path.join('.venv', 'bin', 'python')
      ]

  for (const root of rootCandidates) {
    for (const relative of interpreterCandidates) {
      const fullPath = path.join(root, relative)
      if (!fs.existsSync(fullPath)) continue
      if (!hasPygame(fullPath)) {
        console.warn(`[LAUNCH] Ignoring python interpreter without pygame: ${fullPath}`)
        continue
      }
      return fullPath
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3'
}

function hasJava(javaCommand: string) {
  try {
    const check = spawnSync(javaCommand, ['-version'], { stdio: 'ignore' })
    return check.status === 0
  } catch {
    return false
  }
}

function resolveJavaCommand() {
  const explicitJava = process.env.ARCADE_JAVA?.trim()
  if (explicitJava) return explicitJava

  const javaHome = process.env.JAVA_HOME?.trim()
  if (javaHome) {
    const candidate = process.platform === 'win32'
      ? path.join(javaHome, 'bin', 'java.exe')
      : path.join(javaHome, 'bin', 'java')
    if (fs.existsSync(candidate)) return candidate
  }

  return 'java'
}

function applySuperMarioNesResolution(fullGamePath: string, targetBounds: LaunchViewport) {
  const gameDir = path.basename(path.dirname(fullGamePath)).toLowerCase()
  const gameFile = path.basename(fullGamePath).toLowerCase()
  if (gameDir !== 'supermariones' || gameFile !== 'mario.jar') return

  const settingsPath = path.join(path.dirname(fullGamePath), 'Setting.txt')
  const width = clamp(Math.round(targetBounds.width), 320, 4096)
  const height = clamp(Math.round(targetBounds.height), 240, 2160)
  let flags = 0x01010101

  try {
    if (fs.existsSync(settingsPath)) {
      const existing = fs.readFileSync(settingsPath)
      if (existing.length >= 4) {
        flags = existing.readInt32BE(0)
      }
    }

    const output = Buffer.alloc(12)
    output.writeInt32BE(flags, 0)
    output.writeInt32BE(width, 4)
    output.writeInt32BE(height, 8)
    fs.writeFileSync(settingsPath, output)
    console.log(`[LAUNCH] SuperMarioNES Setting.txt updated to ${width}x${height}`)
  } catch (error) {
    console.warn('[LAUNCH] Failed to update SuperMarioNES resolution:', error)
  }
}

const GUPPY_BAUD_RATE = 115200
const GUPPY_SCAN_INTERVAL_MS = 3000
const GUPPY_WIFI_AP_PROFILE_PATH = path.join(app.getPath('userData'), 'guppy', 'wifi-ap-profile.json')
const WINDOWS_USB_POLL_INTERVAL_MS = 1000
const WINDOWS_USB_SCAN_DEBOUNCE_MS = 1800
const WINDOWS_WM_DEVICECHANGE = 0x0219
const WINDOWS_DBT_DEVICEARRIVAL = 0x8000
const WINDOWS_DBT_DEVNODES_CHANGED = 0x0007
const WINDOWS_DBT_CONFIGCHANGED = 0x0018

const GUPPY_MODULE_COMMANDS: Record<string, string> = {
  badusb: 'BADUSB_INJECT',
  ir: 'IR_BLAST',
  gpio: 'GPIO_CTRL',
  wifi: 'WIFI_AUDIT',
  wifiap: 'WIFI_AP_START',
  terminal: 'SHELL'
}

let mainWindow: BrowserWindow | null = null
let activeGameProcess: ChildProcess | null = null
let isAppQuitting = false
let windowsUsbKnownDrives = new Set<string>()
let windowsUsbPollTimer: NodeJS.Timeout | null = null
let windowsUsbScanTimer: NodeJS.Timeout | null = null
let windowsUsbWatcherProcess: ChildProcess | null = null
const windowsUsbRecentlyHandledAt = new Map<string, number>()

let guppyPort: SerialPort | null = null
let guppyLineBuffer = ''
let guppyScanTimer: NodeJS.Timeout | null = null
let guppyCapabilities = new Set<string>()
let guppyStatus: GuppyStatus = {
  connected: false,
  connecting: false,
  autoConnect: true
}

let wifiJammerProcess: ChildProcess | null = null
let wifiJammerState: WifiJammerState = { running: false }

function publishGuppyStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('guppy-status', guppyStatus)
}

function setGuppyStatus(patch: Partial<GuppyStatus>) {
  guppyStatus = { ...guppyStatus, ...patch }
  publishGuppyStatus()
}

function publishWifiJammerState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('wifi-jammer-state', wifiJammerState)
}

function setWifiJammerState(patch: Partial<WifiJammerState>) {
  wifiJammerState = { ...wifiJammerState, ...patch }
  publishWifiJammerState()
}

function sendWifiJammerLog(raw: string) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    mainWindow.webContents.send('wifi-jammer-log', trimmed)
  }
}

function publishWindowsUsbInserted(event: WindowsUsbInsertEvent) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('windows-usb-inserted', event)
}

function readWindowsMessageCode(buffer: Buffer) {
  return buffer.length >= 4 ? buffer.readUInt32LE(0) : 0
}

function normalizeWindowsDrive(value: string) {
  const trimmed = value.trim().toUpperCase()
  const match = trimmed.match(/^([A-Z]):?$/)
  return match ? `${match[1]}:` : ''
}

function listWindowsMountedDrives() {
  const drives = new Set<string>()
  for (let code = 65; code <= 90; code += 1) {
    const drive = `${String.fromCharCode(code)}:`
    try {
      if (fs.existsSync(`${drive}\\`)) {
        drives.add(drive)
      }
    } catch {
      // Ignore inaccessible roots during fallback probing.
    }
  }
  return drives
}

async function handleWindowsUsbInserted(drives: string[], source: WindowsUsbInsertEvent['source']) {
  const now = Date.now()
  const normalizedDrives = drives
    .map((drive) => normalizeWindowsDrive(drive))
    .filter(Boolean)
    .filter((drive, index, list) => list.indexOf(drive) === index)
    .filter((drive) => {
      const lastHandledAt = windowsUsbRecentlyHandledAt.get(drive) ?? 0
      return now - lastHandledAt > 5000
    })

  if (!normalizedDrives.length) return

  for (const drive of normalizedDrives) {
    windowsUsbRecentlyHandledAt.set(drive, now)
  }

  if (activeGameProcess) {
    const stopResult = await stopActiveGameProcess(true)
    if (!stopResult.success) {
      console.warn('[USB] Failed to stop active game after USB insert:', stopResult.message)
    }
  }

  restoreArcadeWindow()
  publishWindowsUsbInserted({
    drives: normalizedDrives,
    source,
    detectedAt: now
  })
}

async function refreshWindowsUsbSnapshot(source: WindowsUsbInsertEvent['source'], emitOnInsert: boolean) {
  if (process.platform !== 'win32') return

  const currentDrives = listWindowsMountedDrives()
  const insertedDrives = [...currentDrives].filter((drive) => !windowsUsbKnownDrives.has(drive))

  windowsUsbKnownDrives = currentDrives

  if (emitOnInsert && insertedDrives.length > 0) {
    await handleWindowsUsbInserted(insertedDrives, source)
  }
}

function scheduleWindowsUsbScan(source: WindowsUsbInsertEvent['source']) {
  if (process.platform !== 'win32') return
  if (windowsUsbScanTimer) {
    clearTimeout(windowsUsbScanTimer)
  }
  windowsUsbScanTimer = setTimeout(() => {
    windowsUsbScanTimer = null
    void refreshWindowsUsbSnapshot(source, true)
  }, WINDOWS_USB_SCAN_DEBOUNCE_MS)
}

function startWindowsUsbMonitoring() {
  if (process.platform !== 'win32') return

  void refreshWindowsUsbSnapshot('poll', false)

  if (windowsUsbPollTimer) return
  windowsUsbPollTimer = setInterval(() => {
    void refreshWindowsUsbSnapshot('poll', true)
  }, WINDOWS_USB_POLL_INTERVAL_MS)
}

function startWindowsUsbWatcher() {
  if (process.platform !== 'win32') return
  if (windowsUsbWatcherProcess && windowsUsbWatcherProcess.exitCode === null) return

  const script = [
    '$ErrorActionPreference = "Stop"',
    '$watcher = New-Object System.Management.ManagementEventWatcher "SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2"',
    'while ($true) {',
    '  $event = $watcher.WaitForNextEvent()',
    '  $drive = ""',
    '  if ($event -and $event.Properties["DriveName"] -and $event.Properties["DriveName"].Value) {',
    '    $drive = [string]$event.Properties["DriveName"].Value',
    '  }',
    '  [Console]::Out.WriteLine("USB_INSERTED|" + $drive)',
    '}'
  ].join(' ')

  const watcher = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  windowsUsbWatcherProcess = watcher

  let stdoutBuffer = ''
  watcher.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf8')

    let newlineIndex = stdoutBuffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r/g, '').trim()
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)
      newlineIndex = stdoutBuffer.indexOf('\n')

      if (!line.startsWith('USB_INSERTED|')) continue

      const drive = normalizeWindowsDrive(line.slice('USB_INSERTED|'.length))
      if (drive) {
        windowsUsbKnownDrives.add(drive)
        void handleWindowsUsbInserted([drive], 'watcher')
      } else {
        scheduleWindowsUsbScan('watcher')
      }
    }
  })

  watcher.stderr?.on('data', (chunk: Buffer) => {
    const message = chunk.toString('utf8').trim()
    if (!message) return
    console.warn('[USB] Windows watcher stderr:', message)
  })

  watcher.once('error', (error) => {
    console.warn('[USB] Windows watcher failed to start:', toErrorMessage(error))
    if (windowsUsbWatcherProcess === watcher) {
      windowsUsbWatcherProcess = null
    }
  })

  watcher.once('exit', (code, signal) => {
    if (windowsUsbWatcherProcess === watcher) {
      windowsUsbWatcherProcess = null
    }
    if (isAppQuitting) return
    console.warn('[USB] Windows watcher exited:', { code, signal })
    setTimeout(() => startWindowsUsbWatcher(), 2000)
  })
}

function stopWindowsUsbMonitoring() {
  if (windowsUsbScanTimer) {
    clearTimeout(windowsUsbScanTimer)
    windowsUsbScanTimer = null
  }
  if (windowsUsbPollTimer) {
    clearInterval(windowsUsbPollTimer)
    windowsUsbPollTimer = null
  }
  if (windowsUsbWatcherProcess && windowsUsbWatcherProcess.exitCode === null) {
    windowsUsbWatcherProcess.kill()
  }
  windowsUsbWatcherProcess = null
}

function clearGuppyCapabilities() {
  guppyCapabilities = new Set<string>()
}

function parseGuppyCapabilities(line: string) {
  const match = line.match(/^CAPS\s*:\s*(.+)$/i)
  if (!match?.[1]) return null
  const caps = match[1]
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
  return caps.length > 0 ? new Set(caps) : new Set<string>()
}

function updateGuppyCapabilitiesFromLine(line: string) {
  const parsed = parseGuppyCapabilities(line)
  if (!parsed) return
  guppyCapabilities = parsed
}

function hasGuppyCapability(capability: string) {
  return guppyCapabilities.has(capability.toUpperCase())
}

type FirmwareJammerCommands = {
  startCommand: string
  stopCommand: string
}

function resolveFirmwareJammerCommands(): FirmwareJammerCommands | null {
  const caps = Array.from(guppyCapabilities)

  const explicitStarts = caps.filter(
    (cap) => /(WIFI_).*(DEAUTH|JAM)/.test(cap) && cap.endsWith('_START')
  )
  for (const startCommand of explicitStarts) {
    const stopCommand = startCommand.replace(/_START$/, '_STOP')
    if (hasGuppyCapability(stopCommand)) {
      return { startCommand, stopCommand }
    }
  }

  const directPairs: Array<[string, string]> = [
    ['WIFI_DEAUTH_START', 'WIFI_DEAUTH_STOP'],
    ['WIFI_JAMMER_START', 'WIFI_JAMMER_STOP'],
    ['WIFI_JAM_START', 'WIFI_JAM_STOP'],
    ['WIFI_DEAUTH', 'WIFI_DEAUTH_STOP'],
    ['WIFI_JAMMER', 'WIFI_JAMMER_STOP'],
    ['WIFI_JAM', 'WIFI_JAM_STOP'],
  ]
  for (const [startCommand, stopCommand] of directPairs) {
    if (hasGuppyCapability(startCommand) || hasGuppyCapability(stopCommand)) {
      return { startCommand, stopCommand }
    }
  }

  return null
}

function sanitizeFirmwareToken(value: string) {
  return value.trim().replace(/\s+/g, '_')
}

function buildFirmwareJammerStartCommand(command: string, payload: WifiJammerPayload) {
  const args: string[] = []
  const extras: string[] = []

  const ap = sanitizeFirmwareToken(payload.accessPoints ?? '')
  if (ap) args.push(ap)

  if (typeof payload.channel === 'number' && Number.isFinite(payload.channel) && payload.channel > 0) {
    args.push(String(Math.round(payload.channel)))
  }

  const station = sanitizeFirmwareToken(payload.stations ?? '')
  if (station) args.push(station)

  if (typeof payload.packets === 'number' && Number.isFinite(payload.packets) && payload.packets > 0) {
    args.push(String(Math.max(1, Math.round(payload.packets))))
  }

  if (typeof payload.delay === 'number' && Number.isFinite(payload.delay) && payload.delay >= 0) {
    args.push(String(payload.delay))
  }

  if (typeof payload.code === 'number' && Number.isFinite(payload.code)) {
    args.push(String(Math.min(Math.max(Math.round(payload.code), 1), 66)))
  }

  if (typeof payload.reset === 'number' && Number.isFinite(payload.reset) && payload.reset >= 0) {
    extras.push(`RESET=${Math.round(payload.reset)}`)
  }

  const filters = sanitizeFirmwareToken(payload.filters ?? '')
  if (filters) extras.push(`FILTERS=${filters}`)
  if (payload.world) extras.push('WORLD=1')
  if (payload.noBroadcast) extras.push('NO_BROADCAST=1')
  if (payload.verbose) extras.push('VERBOSE=1')

  const tokenString = [...args, ...extras].join(' ')
  return tokenString ? `${command} ${tokenString}` : command
}

type MonitorInterfaceResolution =
  | { success: true; iface: string }
  | { success: false; message: string }

function detectMonitorInterfacesLinux() {
  const probe = spawnSync('iwconfig', [], { encoding: 'utf8' })
  if (probe.error) return { interfaces: [] as string[], error: toErrorMessage(probe.error) }
  const combined = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`
  if (!combined.trim()) {
    return { interfaces: [] as string[], error: 'iwconfig produced no output' }
  }

  const interfaces: string[] = []
  const blocks = combined.split(/\r?\n\r?\n+/)
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || /no wireless extensions/i.test(trimmed)) continue
    if (!/Mode:Monitor/i.test(trimmed)) continue
    const firstLine = trimmed.split(/\r?\n/, 1)[0]
    const match = firstLine.match(/^([^\s]+)/)
    if (match?.[1]) {
      interfaces.push(match[1].trim())
    }
  }
  return { interfaces, error: '' }
}

function resolveMonitorInterface(explicitIface?: string): MonitorInterfaceResolution {
  const provided = (explicitIface ?? '').trim()
  if (provided) return { success: true, iface: provided }

  if (process.platform !== 'linux') {
    return {
      success: false,
      message: 'Host jammer mode requires Linux monitor interfaces (iwconfig). For plug-and-play, use firmware deauth commands (WIFI_DEAUTH_START/STOP in CAPS).'
    }
  }

  const detected = detectMonitorInterfacesLinux()
  if (detected.interfaces.length > 0) {
    return { success: true, iface: detected.interfaces[0] }
  }

  return {
    success: false,
    message: detected.error
      ? `No monitor interface detected (${detected.error}).`
      : 'No monitor interface detected.'
  }
}

function publishGameExited() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('game-exited')
}

function restoreArcadeWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const activeDisplay = screen.getDisplayMatching(mainWindow.getBounds())
  const displayBounds = activeDisplay.bounds

  mainWindow.setBounds(displayBounds)
  mainWindow.show()
  mainWindow.focus()
  mainWindow.setFullScreen(true)
}

function unregisterLeaveGameShortcuts() {
  for (const accelerator of ARCADE_LEAVE_MENU_ACCELERATORS) {
    globalShortcut.unregister(accelerator)
  }
}

function registerLeaveGameShortcuts() {
  if (!app.isReady() || !activeGameProcess) return

  for (const accelerator of ARCADE_LEAVE_MENU_ACCELERATORS) {
    if (globalShortcut.isRegistered(accelerator)) continue

    const registered = globalShortcut.register(accelerator, () => {
      if (!activeGameProcess) return
      console.log(`[LEAVE] Global leave shortcut triggered: ${accelerator}`)
      void stopActiveGameProcess(true)
    })

    if (!registered) {
      console.warn(`[LEAVE] Failed to register shortcut: ${accelerator}`)
    }
  }
}

function waitForProcessExit(gameProcess: ChildProcess, timeoutMs: number) {
  if (gameProcess.exitCode !== null) {
    return Promise.resolve(true)
  }

  return new Promise<boolean>((resolve) => {
    const onExit = () => {
      cleanup()
      resolve(true)
    }
    const onTimeout = () => {
      cleanup()
      resolve(false)
    }
    const cleanup = () => {
      clearTimeout(timeout)
      gameProcess.removeListener('exit', onExit)
    }

    const timeout = setTimeout(onTimeout, timeoutMs)
    gameProcess.once('exit', onExit)
  })
}

function signalActiveGameProcess(gameProcess: ChildProcess, signal: NodeJS.Signals) {
  const pid = gameProcess.pid
  if (!pid) {
    throw new Error('Active game process has no PID')
  }

  try {
    process.kill(-pid, signal)
  } catch {
    process.kill(pid, signal)
  }
}

function scheduleMacWindowPlacement(
  processNameQuery: string,
  targetBounds: LaunchViewport,
  launchMode: 'external' | 'embedded'
) {
  if (process.platform !== 'darwin' || !mainWindow || mainWindow.isDestroyed()) return

  let attempts = 0
  const maxAttempts = 10

  const positionWindow = setInterval(() => {
    attempts++

    const fullscreenScript = launchMode === 'embedded'
      ? 'set value of attribute "AXFullScreen" of win to false'
      : 'set value of attribute "AXFullScreen" of win to true'

    const script = `
      tell application "System Events"
        try
          set gameProcesses to every process whose name contains "${processNameQuery}"
          repeat with proc in gameProcesses
            try
              set procWindows to windows of proc
              repeat with win in procWindows
                try
                  set position of win to {${targetBounds.x}, ${targetBounds.y}}
                  set size of win to {${targetBounds.width}, ${targetBounds.height}}
                  ${fullscreenScript}
                end try
              end repeat
            end try
          end repeat
        end try
      end tell
    `

    spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore'
    }).unref()

    if (attempts >= maxAttempts) {
      clearInterval(positionWindow)
    }
  }, 500)
}

function trackActiveGameProcess(gameProcess: ChildProcess, label: string) {
  activeGameProcess = gameProcess
  registerLeaveGameShortcuts()

  gameProcess.once('exit', (code, signal) => {
    console.log(`[LAUNCH] ${label} game exited`, { code, signal })
    if (activeGameProcess === gameProcess) {
      activeGameProcess = null
      unregisterLeaveGameShortcuts()
      restoreArcadeWindow()
      publishGameExited()
    }
  })

  gameProcess.once('error', (error) => {
    console.error(`[LAUNCH] ${label} game process error:`, error)
    if (activeGameProcess === gameProcess) {
      activeGameProcess = null
      unregisterLeaveGameShortcuts()
      restoreArcadeWindow()
    }
  })
}

async function stopActiveGameProcess(force = false): Promise<IpcResult> {
  const gameProcess = activeGameProcess
  if (!gameProcess || gameProcess.exitCode !== null || gameProcess.killed) {
    activeGameProcess = null
    unregisterLeaveGameShortcuts()
    return { success: true, message: 'No active game process' }
  }

  try {
    if (process.platform === 'win32') {
      const pid = gameProcess.pid
      if (!pid) {
        return { success: false, message: 'Active game process has no PID' }
      }

      const args = ['/pid', String(pid), '/t']
      if (force) args.push('/f')

      const result = await new Promise<IpcResult>((resolve) => {
        const killer = spawn('taskkill', args, { stdio: 'ignore' })
        killer.once('error', (error) => {
          resolve({ success: false, message: `Failed to stop game: ${toErrorMessage(error)}` })
        })
        killer.once('exit', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'Game stopped' })
            return
          }
          resolve({ success: false, message: `Failed to stop game (taskkill exit ${code ?? 'unknown'})` })
        })
      })

      if (result.success && activeGameProcess === gameProcess) {
        activeGameProcess = null
        unregisterLeaveGameShortcuts()
        restoreArcadeWindow()
        publishGameExited()
      }
      return result
    }

    if (force) {
      signalActiveGameProcess(gameProcess, 'SIGKILL')
      const exited = await waitForProcessExit(gameProcess, 1200)
      if (!exited) {
        return { success: false, message: 'Game did not exit after force kill' }
      }

      if (activeGameProcess === gameProcess) {
        activeGameProcess = null
        unregisterLeaveGameShortcuts()
        restoreArcadeWindow()
        publishGameExited()
      }
      return { success: true, message: 'Game killed' }
    }

    signalActiveGameProcess(gameProcess, 'SIGTERM')
    const exitedGracefully = await waitForProcessExit(gameProcess, 1500)

    if (!exitedGracefully) {
      signalActiveGameProcess(gameProcess, 'SIGKILL')
      const exitedAfterKill = await waitForProcessExit(gameProcess, 1200)
      if (!exitedAfterKill) {
        return { success: false, message: 'Game did not exit after SIGTERM/SIGKILL' }
      }
    }

    if (activeGameProcess === gameProcess) {
      activeGameProcess = null
      unregisterLeaveGameShortcuts()
      restoreArcadeWindow()
      publishGameExited()
    }

    return {
      success: true,
      message: exitedGracefully ? 'Game stopped' : 'Game forced closed'
    }
  } catch (error: unknown) {
    return { success: false, message: `Failed to stop game: ${toErrorMessage(error)}` }
  }
}

function portInfoText(port: PortInfo) {
  const maybeFriendlyName = (port as PortInfoWithFriendlyName).friendlyName ?? ''
  return `${port.path} ${port.manufacturer ?? ''} ${port.pnpId ?? ''} ${maybeFriendlyName} ${port.vendorId ?? ''} ${port.productId ?? ''}`.toLowerCase()
}

function scoreSerialPort(port: PortInfo) {
  const text = portInfoText(port)
  let score = 0

  if (text.includes('pico') || text.includes('rp2040') || text.includes('raspberry')) score += 120
  if (text.includes('esp32') || text.includes('espressif')) score += 110
  if (text.includes('usb serial') || text.includes('uart')) score += 60
  if (text.includes('ch340') || text.includes('cp210') || text.includes('silicon labs')) score += 60
  if (text.includes('ttyacm') || text.includes('ttyusb') || text.includes('com')) score += 40

  return score
}

async function listSerialPortsSafe() {
  try {
    return await SerialPort.list()
  } catch (error: unknown) {
    console.error('[GUPPY] Failed to list serial ports:', error)
    return []
  }
}

function attachGuppyPortListeners(port: SerialPort) {
  port.on('data', (chunk: Buffer) => {
    guppyLineBuffer += chunk.toString('utf8')

    let newlineIndex = guppyLineBuffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = guppyLineBuffer.slice(0, newlineIndex).replace(/\r/g, '').trim()
      guppyLineBuffer = guppyLineBuffer.slice(newlineIndex + 1)
      newlineIndex = guppyLineBuffer.indexOf('\n')

      if (!line) continue
      updateGuppyCapabilitiesFromLine(line)
      setGuppyStatus({ lastSeenAt: Date.now(), error: undefined })
      if (/(WIFI_).*(DEAUTH|JAM)|DEAUTH_/i.test(line)) {
        sendWifiJammerLog(line)
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('guppy-line', line)
      }
    }
  })

  port.on('error', (error) => {
    console.error('[GUPPY] Serial error:', error)
    if (guppyPort === port) {
      guppyPort = null
      guppyLineBuffer = ''
      clearGuppyCapabilities()
      if (wifiJammerState.running && wifiJammerState.mode === 'firmware') {
        setWifiJammerState({
          running: false,
          mode: 'firmware',
          message: 'Firmware deauth stopped (serial error)'
        })
      }
      setGuppyStatus({
        connected: false,
        connecting: false,
        portPath: undefined,
        error: `Serial error: ${toErrorMessage(error)}`
      })
    }
  })

  port.on('close', () => {
    if (guppyPort === port) {
      console.warn('[GUPPY] Device disconnected')
      guppyPort = null
      guppyLineBuffer = ''
      clearGuppyCapabilities()
      if (wifiJammerState.running && wifiJammerState.mode === 'firmware') {
        setWifiJammerState({
          running: false,
          mode: 'firmware',
          message: 'Firmware deauth stopped (device disconnected)'
        })
      }
      setGuppyStatus({
        connected: false,
        connecting: false,
        portPath: undefined,
        error: 'Device disconnected'
      })
    }
  })
}

function hasGuppyHandshakeMarker(buffer: string) {
  return (
    buffer.includes('GUPPY_READY')
    || buffer.includes('PONG')
    || buffer.includes('FW:esp32-bridge')
    || buffer.includes('CAPS:')
    || buffer.includes('HWLIB:')
  )
}

async function probeGuppyHandshake(port: SerialPort, timeoutMs = 4200) {
  return new Promise<boolean>((resolve) => {
    let buffer = ''
    let settled = false

    const pokeHandshake = () => {
      if (!port.isOpen) {
        finish(false)
        return
      }
      port.write('HELLO\n')
      port.write('PING\n')
    }

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(pokeTimer)
      port.off('data', onData)
      resolve(ok)
    }

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      if (hasGuppyHandshakeMarker(buffer)) {
        finish(true)
      }
    }

    const pokeTimer = setInterval(() => {
      pokeHandshake()
    }, 350)
    const timer = setTimeout(() => finish(false), timeoutMs)
    port.on('data', onData)
    pokeHandshake()
  })
}

async function openGuppyPort(portPath: string) {
  const port = new SerialPort({
    path: portPath,
    baudRate: GUPPY_BAUD_RATE,
    autoOpen: false
  })

  await new Promise<void>((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  guppyPort = port
  guppyLineBuffer = ''
  clearGuppyCapabilities()
  attachGuppyPortListeners(port)
  await new Promise((resolve) => setTimeout(resolve, 320))

  const handshakeOk = await probeGuppyHandshake(port)
  if (!handshakeOk) {
    await new Promise<void>((resolve) => {
      if (!port.isOpen) {
        resolve()
        return
      }
      port.close(() => resolve())
    })
    guppyPort = null
    guppyLineBuffer = ''
    clearGuppyCapabilities()
    throw new Error('No GUPPY handshake (HELLO/PING timeout)')
  }

  setGuppyStatus({
    connected: true,
    connecting: false,
    portPath,
    error: undefined,
    lastSeenAt: Date.now()
  })
}

async function connectGuppy(preferredPath?: string) {
  if (guppyPort?.isOpen) {
    return { success: true, message: `Already connected on ${guppyStatus.portPath ?? 'serial'}` }
  }

  if (guppyStatus.connecting) {
    return { success: false, message: 'Connection already in progress' }
  }

  setGuppyStatus({ connecting: true, error: undefined })

  const ports = await listSerialPortsSafe()
  if (!ports.length) {
    setGuppyStatus({ connecting: false, connected: false, error: 'No serial ports found' })
    return { success: false, message: 'No serial ports found' }
  }

  let candidates: PortInfo[] = []

  if (preferredPath) {
    candidates = ports.filter((port) => port.path === preferredPath)
    if (!candidates.length) {
      setGuppyStatus({
        connecting: false,
        connected: false,
        error: `Requested port not found: ${preferredPath}`
      })
      return { success: false, message: `Requested port not found: ${preferredPath}` }
    }
  } else {
    candidates = [...ports].sort((a, b) => scoreSerialPort(b) - scoreSerialPort(a))
  }

  const errors: string[] = []
  for (const candidate of candidates) {
    try {
      await openGuppyPort(candidate.path)
      console.log(`[GUPPY] Connected on ${candidate.path}`)
      return { success: true, message: `Connected on ${candidate.path}` }
    } catch (error: unknown) {
      const message = `${candidate.path}: ${toErrorMessage(error)}`
      errors.push(message)
      console.warn(`[GUPPY] Failed to open ${message}`)
    }
  }

  const errorMessage = errors.length
    ? `Could not connect. Tried: ${errors.join(' | ')}`
    : 'Could not connect to any serial device'

  setGuppyStatus({ connecting: false, connected: false, error: errorMessage })
  return { success: false, message: errorMessage }
}

async function disconnectGuppy() {
  setGuppyStatus({ autoConnect: false })

  if (!guppyPort) {
    setGuppyStatus({
      connected: false,
      connecting: false,
      portPath: undefined,
      error: undefined
    })
    return { success: true, message: 'Already disconnected' }
  }

  const port = guppyPort
  guppyPort = null
  guppyLineBuffer = ''
  clearGuppyCapabilities()

  await new Promise<void>((resolve) => {
    if (!port.isOpen) {
      resolve()
      return
    }
    port.close(() => resolve())
  })

  setGuppyStatus({
    connected: false,
    connecting: false,
    portPath: undefined,
    error: undefined
  })
  return { success: true, message: 'Disconnected' }
}

async function writeGuppyCommand(command: string) {
  const trimmedCommand = command.trim()
  if (!trimmedCommand) {
    return { success: false, message: 'Command cannot be empty' }
  }

  if (!guppyPort?.isOpen) {
    const reconnect = await connectGuppy()
    if (!reconnect.success || !guppyPort?.isOpen) {
      return { success: false, message: reconnect.message || 'Device not connected' }
    }
  }

  return new Promise<{ success: boolean; message: string }>((resolve) => {
    guppyPort!.write(`${trimmedCommand}\n`, (error) => {
      if (error) {
        setGuppyStatus({ error: `Write failed: ${toErrorMessage(error)}` })
        resolve({ success: false, message: `Write failed: ${toErrorMessage(error)}` })
        return
      }
      setGuppyStatus({ lastSeenAt: Date.now(), error: undefined })
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('guppy-line', `TX ${trimmedCommand}`)
      }
      resolve({ success: true, message: `Command sent: ${trimmedCommand}` })
    })
  })
}

function startGuppyAutoConnect() {
  if (guppyScanTimer) return

  const tick = async () => {
    if (!guppyStatus.autoConnect) return
    if (guppyPort?.isOpen) return
    if (guppyStatus.connecting) return
    await connectGuppy()
  }

  void tick()
  guppyScanTimer = setInterval(() => {
    void tick()
  }, GUPPY_SCAN_INTERVAL_MS)
}

function stopGuppyAutoConnect() {
  if (guppyScanTimer) {
    clearInterval(guppyScanTimer)
    guppyScanTimer = null
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/preload.js')

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.setFullScreen(true)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (process.platform === 'win32') {
      mainWindow?.webContents.setZoomFactor(0.85)
    }
    publishGuppyStatus()
    publishWifiJammerState()
  })

  if (process.platform === 'win32') {
    mainWindow.hookWindowMessage(WINDOWS_WM_DEVICECHANGE, (wParam) => {
      const messageCode = readWindowsMessageCode(wParam)
      if (
        messageCode !== WINDOWS_DBT_DEVICEARRIVAL
        && messageCode !== WINDOWS_DBT_DEVNODES_CHANGED
        && messageCode !== WINDOWS_DBT_CONFIGCHANGED
      ) return
      scheduleWindowsUsbScan('devicechange')
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function sanitizeWifiApToken(value: string) {
  return (value ?? '').trim().replace(/\s+/g, '_')
}

function normalizeWifiApProfileInput(
  payload: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>
): { ok: true; profile: WifiApProfile } | { ok: false; message: string } {
  const ssid = sanitizeWifiApToken(payload.ssid ?? '')
  const password = sanitizeWifiApToken(payload.password ?? '')
  const channelRaw = Number.isFinite(Number(payload.channel)) ? Number(payload.channel) : 6
  const channel = Math.min(Math.max(Math.round(channelRaw), 1), 13)

  if (!ssid) {
    return { ok: false, message: 'SSID is required' }
  }
  if (ssid.length > 32) {
    return { ok: false, message: 'SSID must be 1-32 characters' }
  }
  if (/\s/.test(ssid)) {
    return { ok: false, message: 'SSID cannot contain spaces' }
  }
  if (password.length > 0 && (password.length < 8 || password.length > 63)) {
    return { ok: false, message: 'Password must be 8-63 chars, or empty for open AP' }
  }
  if (/\s/.test(password)) {
    return { ok: false, message: 'Password cannot contain spaces' }
  }

  return {
    ok: true,
    profile: {
      ssid,
      password,
      channel,
      updatedAt: new Date().toISOString()
    }
  }
}

function loadWifiApProfile(): WifiApProfile | null {
  try {
    if (!fs.existsSync(GUPPY_WIFI_AP_PROFILE_PATH)) return null
    const raw = fs.readFileSync(GUPPY_WIFI_AP_PROFILE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WifiApProfile>
    const normalized = normalizeWifiApProfileInput(parsed)
    if (!normalized.ok) {
      return null
    }
    return normalized.profile
  } catch {
    return null
  }
}

function saveWifiApProfile(profile: WifiApProfile) {
  const profileDir = path.dirname(GUPPY_WIFI_AP_PROFILE_PATH)
  fs.mkdirSync(profileDir, { recursive: true })
  fs.writeFileSync(GUPPY_WIFI_AP_PROFILE_PATH, JSON.stringify(profile, null, 2))
}

function resolveIrMiniDatabasePath() {
  const candidates = [
    path.resolve(__dirname, '../../docs/ir-mini-database.json'),
    path.resolve(__dirname, '../../../docs/ir-mini-database.json'),
    path.resolve(app.getAppPath(), 'docs/ir-mini-database.json'),
    path.resolve(process.cwd(), 'docs/ir-mini-database.json')
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

let macVendorIndexCache: Map<string, string> | null = null

function resolveMacVendorListPath() {
  const candidates = [
    path.resolve(__dirname, '../../arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(__dirname, '../../../arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(process.cwd(), 'arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(app.getAppPath(), 'arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

function resolvePacketsenderPath() {
  const candidates = [
    path.resolve(__dirname, '../../arcade-guppy/wifijammer-2.0/packetsender.py'),
    path.resolve(__dirname, '../../../arcade-guppy/wifijammer-2.0/packetsender.py'),
    path.resolve(process.cwd(), 'arcade-guppy/wifijammer-2.0/packetsender.py'),
    path.resolve(app.getAppPath(), 'arcade-guppy/wifijammer-2.0/packetsender.py'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

async function terminateWifiJammerProcess(requestedMessage?: string) {
  if (wifiJammerState.running && wifiJammerState.mode === 'firmware') {
    const firmwareCommands = resolveFirmwareJammerCommands()
    const stopCommand = firmwareCommands?.stopCommand ?? 'WIFI_DEAUTH_STOP'
    const stopResult = await writeGuppyCommand(stopCommand)
    if (!stopResult.success) {
      return {
        success: false,
        message: `Firmware jammer stop failed: ${stopResult.message}`
      }
    }
    const message = requestedMessage ?? 'Firmware deauth stop command sent'
    sendWifiJammerLog(`FIRMWARE_STOP: ${stopCommand}`)
    setWifiJammerState({ running: false, mode: 'firmware', iface: undefined, message })
    return { success: true, message }
  }

  if (!wifiJammerProcess) {
    const message = requestedMessage ?? 'Wi-Fi jammer is not running'
    setWifiJammerState({ running: false, mode: wifiJammerState.mode, message })
    return { success: true, message }
  }

  try {
    wifiJammerProcess.kill()
    const message = requestedMessage ?? 'Stopping Wi-Fi jammer'
    setWifiJammerState({ running: false, mode: 'host', message })
    return { success: true, message }
  } catch (error: unknown) {
    const message = toErrorMessage(error)
    sendWifiJammerLog(`JAMMER_ERR:${message}`)
    return { success: false, message }
  }
}

function normalizeMacPrefix(value: string) {
  const hexOnly = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  if (hexOnly.length < 6) return ''
  return `${hexOnly.slice(0, 2)}:${hexOnly.slice(2, 4)}:${hexOnly.slice(4, 6)}`
}

function getMacVendorIndex() {
  if (macVendorIndexCache) return macVendorIndexCache
  const listPath = resolveMacVendorListPath()
  const index = new Map<string, string>()
  if (!listPath) {
    macVendorIndexCache = index
    return index
  }

  try {
    const raw = fs.readFileSync(listPath, 'utf8')
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      if (!line.includes('~')) continue
      const [left, right] = line.split('~', 2)
      const prefix = normalizeMacPrefix(left)
      const vendor = (right ?? '').replace(/&amp;/g, '&').trim()
      if (!prefix || !vendor) continue
      if (!index.has(prefix)) index.set(prefix, vendor)
    }
  } catch (error: unknown) {
    console.warn('[GUPPY] Failed to load MAC vendor list:', toErrorMessage(error))
  }

  macVendorIndexCache = index
  return index
}

ipcMain.handle('set-fullscreen', async (_event, fullscreen: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('ai-explain', async (_event, payload: AiExplainRequest): Promise<AiExplainResult> => {
  if (!payload?.gameId || !payload?.title) {
    return { success: false, message: 'Ontbrekende game info voor AI' }
  }
  return callAiExplain(payload)
})

ipcMain.handle('guppy-get-status', async () => {
  return guppyStatus
})

ipcMain.handle('guppy-connect', async (_event, preferredPath?: string) => {
  setGuppyStatus({ autoConnect: true })
  return connectGuppy(preferredPath)
})

ipcMain.handle('guppy-disconnect', async () => {
  return disconnectGuppy()
})

ipcMain.handle('guppy-send-command', async (_event, command: string) => {
  if (typeof command !== 'string' || !command.trim()) {
    return { success: false, message: 'Invalid command' }
  }
  return writeGuppyCommand(command)
})

ipcMain.handle('guppy-load-wifi-ap-profile', async () => {
  const profile = loadWifiApProfile()
  if (!profile) {
    return { success: true, message: 'No saved Wi-Fi AP profile', profile: null }
  }
  return { success: true, message: 'Wi-Fi AP profile loaded', profile }
})

ipcMain.handle(
  'guppy-save-wifi-ap-profile',
  async (_event, payload: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => {
    const normalized = normalizeWifiApProfileInput(payload)
    if (!normalized.ok) {
      return { success: false, message: normalized.message, profile: null }
    }

    try {
      saveWifiApProfile(normalized.profile)
      return {
        success: true,
        message: 'Wi-Fi AP profile saved',
        profile: normalized.profile
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: `Failed to save Wi-Fi AP profile: ${toErrorMessage(error)}`,
        profile: null
      }
    }
  }
)

ipcMain.handle(
  'guppy-start-wifi-ap',
  async (_event, payload: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => {
    const normalized = normalizeWifiApProfileInput(payload)
    if (!normalized.ok) {
      return { success: false, message: normalized.message, profile: null }
    }

    const profile = normalized.profile
    const command = profile.password
      ? `WIFI_AP_START ${profile.ssid} ${profile.password} ${profile.channel}`
      : `WIFI_AP_START ${profile.ssid} ${profile.channel}`

    const result = await writeGuppyCommand(command)
    if (!result.success) {
      return { success: false, message: result.message, profile: null }
    }

    try {
      saveWifiApProfile(profile)
      return { success: true, message: result.message, profile }
    } catch (error: unknown) {
      return {
        success: false,
        message: `AP started but profile save failed: ${toErrorMessage(error)}`,
        profile
      }
    }
  }
)

ipcMain.handle('guppy-get-wifi-jammer-status', async () => {
  return { success: true, state: wifiJammerState }
})

ipcMain.handle('guppy-start-wifi-jammer', async (_event, payload: WifiJammerPayload) => {
  if (wifiJammerProcess || (wifiJammerState.running && wifiJammerState.mode === 'firmware')) {
    return { success: false, message: 'Wi-Fi jammer is already running' }
  }

  const requestedMode = payload?.mode ?? 'auto'
  const firmwareCommands = resolveFirmwareJammerCommands()
  const useFirmwareMode = requestedMode === 'firmware' || (requestedMode === 'auto' && Boolean(firmwareCommands))

  if (useFirmwareMode) {
    const connectResult = guppyPort?.isOpen ? { success: true, message: 'Connected' } : await connectGuppy()
    if (!connectResult.success || !guppyPort?.isOpen) {
      return {
        success: false,
        message: `Firmware jammer mode requires a connected ESP32 bridge: ${connectResult.message}`
      }
    }

    const startCommandName = firmwareCommands?.startCommand ?? 'WIFI_DEAUTH_START'
    const command = buildFirmwareJammerStartCommand(startCommandName, payload ?? {})
    const writeResult = await writeGuppyCommand(command)
    if (!writeResult.success) {
      return { success: false, message: `Failed to send firmware command: ${writeResult.message}` }
    }

    sendWifiJammerLog(`FIRMWARE_START: ${command}`)
    setWifiJammerState({
      running: true,
      mode: 'firmware',
      iface: undefined,
      message: `Firmware deauth command sent (${startCommandName})`
    })
    return { success: true, message: 'Firmware deauth command sent' }
  }

  const ifaceResolution = resolveMonitorInterface(payload?.iface)
  if (!ifaceResolution.success) {
    const firmwareHint = firmwareCommands
      ? ''
      : ' Firmware fallback unavailable: firmware did not advertise WIFI_DEAUTH/WIFI_JAM capabilities in CAPS.'
    return { success: false, message: `${ifaceResolution.message}${firmwareHint}`.trim() }
  }

  const iface = ifaceResolution.iface
  const scriptPath = resolvePacketsenderPath()
  if (!scriptPath) {
    return { success: false, message: 'packetsender.py not found' }
  }

  const pythonBase = process.env.NODE_ENV === 'production'
    ? app.getAppPath()
    : path.resolve(__dirname, '../../')
  const pythonCmd = resolvePythonCommand(pythonBase)

  const args: string[] = [scriptPath, '-i', iface]
  if (typeof payload.channel === 'number' && Number.isFinite(payload.channel)) {
    args.push('-c', String(Math.round(payload.channel)))
  }
  const pushTextArg = (flag: string, value?: string) => {
    if (value) args.push(flag, value)
  }
  const pushNumberArg = (flag: string, value?: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      args.push(flag, String(value))
    }
  }
  pushTextArg('-a', payload.accessPoints?.trim())
  pushTextArg('-s', payload.stations?.trim())
  pushTextArg('-f', payload.filters?.trim())
  pushNumberArg('-p', payload.packets)
  pushNumberArg('-d', payload.delay)
  pushNumberArg('-r', payload.reset)
  pushNumberArg('--code', payload.code)
  if (payload.world) args.push('--world')
  if (payload.noBroadcast) args.push('--no-broadcast')
  if (payload.verbose) args.push('--verbose')

  try {
    wifiJammerProcess = spawn(
      pythonCmd,
      args,
      {
        cwd: path.dirname(scriptPath),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  } catch (error: unknown) {
    const message = `Failed to launch Wi-Fi jammer: ${toErrorMessage(error)}`
    sendWifiJammerLog(message)
    return { success: false, message }
  }

  wifiJammerProcess.stdout?.on('data', (chunk: Buffer) => sendWifiJammerLog(chunk.toString()))
  wifiJammerProcess.stderr?.on('data', (chunk: Buffer) => sendWifiJammerLog(chunk.toString()))
  wifiJammerProcess.once('error', (error: Error) => {
    sendWifiJammerLog(`JAMMER_ERR:${toErrorMessage(error)}`)
    wifiJammerProcess = null
    setWifiJammerState({ running: false, mode: 'host', message: `Jammer error: ${toErrorMessage(error)}` })
  })
  wifiJammerProcess.once('exit', (code, signal) => {
    const message = `Wi-Fi jammer stopped (exit ${code ?? 'unknown'}${signal ? `, signal ${signal}` : ''})`
    wifiJammerProcess = null
    sendWifiJammerLog(message)
    setWifiJammerState({ running: false, mode: 'host', message })
  })

  setWifiJammerState({ running: true, mode: 'host', iface, message: `Host Wi-Fi jammer running on ${iface}` })
  sendWifiJammerLog(`JAMMER_START: ${pythonCmd} ${args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ')}`)
  return { success: true, message: 'Wi-Fi jammer started' }
})

ipcMain.handle('guppy-stop-wifi-jammer', async () => {
  return terminateWifiJammerProcess('Stop requested from UI')
})

ipcMain.handle('guppy-run-module', async (_event, moduleKey: string) => {
  const command = GUPPY_MODULE_COMMANDS[moduleKey]
  if (!command) {
    return { success: false, message: `Unknown module key: ${moduleKey}` }
  }
  return writeGuppyCommand(`RUN ${command}`)
})

ipcMain.handle('guppy-load-ir-mini-db', async () => {
  try {
    const dbPath = resolveIrMiniDatabasePath()
    if (!dbPath) {
      return {
        success: true,
        message: 'IR mini database file not found, using built-in fallback',
        entries: DEFAULT_IR_MINI_DATABASE
      }
    }

    const raw = fs.readFileSync(dbPath, 'utf8')
    const normalized = raw.replace(/^\uFEFF/, '')
    const parsed = JSON.parse(normalized) as { entries?: IrDatabaseEntry[] }
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : []

    if (!entries.length) {
      return {
        success: true,
        message: `IR DB at ${dbPath} is empty, using built-in fallback`,
        entries: DEFAULT_IR_MINI_DATABASE
      }
    }

    return {
      success: true,
      message: `Loaded ${entries.length} IR entries from ${dbPath}`,
      entries
    }
  } catch (error: unknown) {
    return {
      success: true,
      message: `Failed to load IR DB (${toErrorMessage(error)}), using built-in fallback`,
      entries: DEFAULT_IR_MINI_DATABASE
    }
  }
})

ipcMain.handle('guppy-send-ir-entry', async (_event, entry: IrDatabaseEntry) => {
  if (!entry || typeof entry !== 'object') {
    return { success: false, message: 'Invalid IR entry payload' }
  }
  const protocol = (entry.protocol ?? '').trim()
  const address = (entry.address ?? '').trim()
  const command = (entry.command ?? '').trim()
  const parsedCarrierKhz = Number(entry.carrierKhz)
  const carrierKhz = Number.isFinite(parsedCarrierKhz) ? Math.round(parsedCarrierKhz) : 38
  if (!protocol || !address || !command) {
    return { success: false, message: 'IR entry is missing protocol/address/command' }
  }
  return writeGuppyCommand(`IR_SEND ${protocol} ${address} ${command} ${carrierKhz}`)
})

ipcMain.handle('guppy-lookup-mac-vendors', async (_event, bssids: string[]): Promise<MacVendorLookupResult> => {
  const index = getMacVendorIndex()
  const vendors: Record<string, string> = {}
  const safeInput = Array.isArray(bssids) ? bssids.slice(0, 400) : []
  for (const mac of safeInput) {
    if (typeof mac !== 'string') continue
    const key = mac.trim()
    if (!key) continue
    const prefix = normalizeMacPrefix(key)
    vendors[key] = prefix ? (index.get(prefix) ?? 'Unknown vendor') : 'Unknown vendor'
  }
  return { success: true, vendors }
})

function resolveJammerReadmePath() {
  const candidates = [
    path.resolve(__dirname, '../../arcade-guppy/wifijammer-2.0/README.md'),
    path.resolve(__dirname, '../../../arcade-guppy/wifijammer-2.0/README.md'),
    path.resolve(process.cwd(), 'arcade-guppy/wifijammer-2.0/README.md'),
    path.resolve(app.getAppPath(), 'arcade-guppy/wifijammer-2.0/README.md'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

function resolveJammerMaclistPath() {
  const candidates = [
    path.resolve(__dirname, '../../arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(__dirname, '../../../arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(process.cwd(), 'arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
    path.resolve(app.getAppPath(), 'arcade-guppy/wifijammer-2.0/maclist/macs.txt'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

ipcMain.handle('guppy-read-wifijammer-guide', async (): Promise<JammerGuideResult> => {
  const readmePath = resolveJammerReadmePath()
  if (!readmePath) {
    return { success: false, message: 'Wifijammer guide not found' }
  }
  try {
    const content = fs.readFileSync(readmePath, 'utf8')
    return { success: true, content }
  } catch (error: unknown) {
    return { success: false, message: toErrorMessage(error) }
  }
})

ipcMain.handle('guppy-read-wifijammer-maclist', async (): Promise<JammerMaclistResult> => {
  const maclistPath = resolveJammerMaclistPath()
  if (!maclistPath) {
    return { success: false, count: 0, preview: [] }
  }
  try {
    const lines = fs.readFileSync(maclistPath, 'utf8').split(/\r?\n/).filter(Boolean)
    return { success: true, count: lines.length, preview: lines.slice(0, 12) }
  } catch {
    return { success: false, count: 0, preview: [] }
  }
})

ipcMain.handle('stop-game', async () => {
  return stopActiveGameProcess(false)
})

ipcMain.handle('kill-game', async () => {
  return stopActiveGameProcess(true)
})

ipcMain.handle('launch-game', async (_event, payload: string | LaunchRequest) => {
  try {
    const request: LaunchRequest = typeof payload === 'string'
      ? { gamePath: payload, mode: 'external' }
      : { ...payload, mode: payload.mode ?? 'external' }

    const { gamePath } = request
    const launchMode = request.mode ?? 'external'

    if (!gamePath) {
      return {
        success: false,
        message: 'Missing game path'
      }
    }

    console.log('[LAUNCH] Game:', gamePath)
    console.log('[LAUNCH] Mode:', launchMode)

    const activeDisplay = mainWindow
      ? screen.getDisplayMatching(mainWindow.getBounds())
      : screen.getPrimaryDisplay()
    const displayBounds = activeDisplay.bounds

    if (mainWindow) {
      mainWindow.setBounds(displayBounds)
      mainWindow.setFullScreen(true)
    }

    const isDev = process.env.NODE_ENV === 'development'
    const devRoot = path.resolve(__dirname, '../../')
    const devArcadeDir = fs
      .readdirSync(devRoot, { withFileTypes: true })
      .find((entry) => {
        if (!entry.isDirectory()) return false
        if (!entry.name.startsWith('arcade-')) return false
        return fs.existsSync(path.join(devRoot, entry.name, 'src', 'index.html'))
      })

    const appRoot = isDev ? devRoot : app.getAppPath()
    const basePath = isDev
      ? devArcadeDir
        ? path.join(devRoot, devArcadeDir.name, 'src')
        : path.join(devRoot, 'src')
      : appRoot

    function resolveSafe(base: string, rel: string) {
      const cleaned = rel.replace(/^(\.\/)+/, '')
      const full = path.resolve(base, cleaned)

      const baseNorm = path.resolve(base) + path.sep
      const fullNorm = path.resolve(full)

      if (!fullNorm.startsWith(baseNorm)) {
        throw new Error(`Blocked path traversal: ${rel}`)
      }
      return fullNorm
    }

    const fullGamePath = resolveSafe(basePath, gamePath)

    if (!fs.existsSync(fullGamePath)) {
      return { success: false, message: `Game file not found: ${gamePath}` }
    }

    const stopResult = await stopActiveGameProcess(true)
    if (!stopResult.success) {
      console.warn('[LAUNCH] Could not fully stop previous game:', stopResult.message)
    }

    const hostBounds = mainWindow?.getBounds() || displayBounds
    const defaultBounds = {
      x: displayBounds.x,
      y: displayBounds.y,
      width: displayBounds.width,
      height: displayBounds.height
    }

    const zoomFactor = mainWindow?.webContents.getZoomFactor?.() ?? 1
    const viewportScale = process.platform === 'win32' ? zoomFactor : 1
    const viewport = request.viewport
      ? {
          x: request.viewport.x * viewportScale,
          y: request.viewport.y * viewportScale,
          width: request.viewport.width * viewportScale,
          height: request.viewport.height * viewportScale
        }
      : undefined

    const targetBounds = launchMode === 'embedded' && viewport
      ? (() => {
          const minWidth = Math.min(320, displayBounds.width)
          const minHeight = Math.min(240, displayBounds.height)
          const width = clamp(Math.round(viewport.width), minWidth, displayBounds.width)
          const height = clamp(Math.round(viewport.height), minHeight, displayBounds.height)
          const maxX = displayBounds.x + displayBounds.width - width
          const maxY = displayBounds.y + displayBounds.height - height

          return {
            x: clamp(Math.round(hostBounds.x + viewport.x), displayBounds.x, maxX),
            y: clamp(Math.round(hostBounds.y + viewport.y), displayBounds.y, maxY),
            width,
            height
          }
        })()
      : defaultBounds

    const launchEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ARCADE_EMBEDDED: launchMode === 'embedded' ? '1' : '0',
      ARCADE_WINDOW_POS: `${targetBounds.x},${targetBounds.y}`,
      ARCADE_WINDOW_SIZE: `${targetBounds.width}x${targetBounds.height}`,
    }

    const gameExtension = path.extname(gamePath).toLowerCase()

    if (gameExtension === '.py') {
      const pythonCmd = resolvePythonCommand(basePath)
      console.log('[LAUNCH] Python:', pythonCmd)
      const openConsoleWindow = shouldOpenPongAiLogWindow(fullGamePath, launchEnv)
      const pongConsoleLogPath = resolvePongConsoleLogPath(fullGamePath, launchEnv)
      const pongConsoleLogStream = path.basename(fullGamePath).toLowerCase() === 'pong.py'
        ? createPongConsoleLogStream(pongConsoleLogPath)
        : null

      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(fullGamePath),
        env: launchEnv,
      })

      pythonProcess.stdout?.on('data', (data) => {
        const text = data.toString()
        console.log('[PYTHON STDOUT]', text)
        pongConsoleLogStream?.write(text)
      })

      pythonProcess.stderr?.on('data', (data) => {
        const text = data.toString()
        console.error('[PYTHON STDERR]', text)
        pongConsoleLogStream?.write(text)
      })

      pythonProcess.on('error', (error) => {
        console.error('[LAUNCH] Python start failed:', error)
        closeLogStream(pongConsoleLogStream)
        restoreArcadeWindow()
      })

      pythonProcess.once('exit', () => {
        closeLogStream(pongConsoleLogStream)
      })

      if (openConsoleWindow) {
        openPongLogWindow(appRoot, pongConsoleLogPath, 'PONG Console')
      }

      scheduleMacWindowPlacement('python', targetBounds, launchMode)

      trackActiveGameProcess(pythonProcess, 'python')

      return {
        success: true,
        message: 'Game launched successfully'
      }
    }

    if (gameExtension === '.jar') {
      const javaCmd = resolveJavaCommand()
      console.log('[LAUNCH] Java:', javaCmd)

      if (!hasJava(javaCmd)) {
        return {
          success: false,
          message: 'Java runtime not found. Install Java or set ARCADE_JAVA.'
        }
      }

      applySuperMarioNesResolution(fullGamePath, targetBounds)

      const javaProcess = spawn(javaCmd, ['-jar', fullGamePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(fullGamePath),
        env: launchEnv,
      })

      javaProcess.stdout?.on('data', (data) => {
        console.log('[JAVA STDOUT]', data.toString())
      })

      javaProcess.stderr?.on('data', (data) => {
        console.error('[JAVA STDERR]', data.toString())
      })

      javaProcess.on('error', (error) => {
        console.error('[LAUNCH] Java start failed:', error)
        restoreArcadeWindow()
      })

      scheduleMacWindowPlacement('java', targetBounds, launchMode)

      trackActiveGameProcess(javaProcess, 'java')

      return {
        success: true,
        message: 'Game launched successfully'
      }
    }

    if (gameExtension === '.exe') {
      const exeProcess = spawn(fullGamePath, [], {
        stdio: 'ignore',
        cwd: path.dirname(fullGamePath),
        env: launchEnv,
      })

      exeProcess.on('error', (error) => {
        console.error('[LAUNCH] EXE start failed:', error)
        restoreArcadeWindow()
      })

      trackActiveGameProcess(exeProcess, 'exe')

      return {
        success: true,
        message: 'Game launched successfully'
      }
    }

    return {
      success: false,
      message: `Unsupported file type: ${gameExtension}`
    }
  } catch (error: unknown) {
    console.error('[LAUNCH] Error launching game:', error)
    restoreArcadeWindow()
    return {
      success: false,
      message: `Error: ${toErrorMessage(error)}`
    }
  }
})

app.whenReady().then(() => {
  createWindow()
  startWindowsUsbMonitoring()
  startWindowsUsbWatcher()
  startGuppyAutoConnect()
})

app.on('will-quit', () => {
  unregisterLeaveGameShortcuts()
})

app.on('before-quit', async () => {
  isAppQuitting = true
  stopWindowsUsbMonitoring()
  stopGuppyAutoConnect()
  await stopActiveGameProcess(true)
  if (guppyPort?.isOpen) {
    await disconnectGuppy()
  }
  await terminateWifiJammerProcess('Application exiting')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
