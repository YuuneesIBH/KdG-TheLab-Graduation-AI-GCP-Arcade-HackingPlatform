import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import fs from 'fs'
import { SerialPort } from 'serialport'

type LaunchViewport = {
  x: number
  y: number
  width: number
  height: number
}

type LaunchRequest = {
  gamePath: string
  mode?: 'external' | 'embedded'
  viewport?: LaunchViewport
}

type PortInfo = Awaited<ReturnType<typeof SerialPort.list>>[number]
type PortInfoWithFriendlyName = PortInfo & { friendlyName?: string }

type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

type IpcResult = {
  success: boolean
  message: string
}

type NfcCapturePayload = {
  uid: string
  label?: string
  rawLine?: string
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
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

const DIY_FLIPPER_BAUD_RATE = 115200
const DIY_FLIPPER_SCAN_INTERVAL_MS = 3000
const DIY_NFC_CAPTURE_DIR = path.join(app.getPath('userData'), 'diyflipper', 'nfc-captures')

const DIY_MODULE_COMMANDS: Record<string, string> = {
  nfc: 'NFC_CLONE',
  badusb: 'BADUSB_INJECT',
  ir: 'IR_BLAST',
  gpio: 'GPIO_CTRL',
  terminal: 'SHELL'
}

let mainWindow: BrowserWindow | null = null
let activeGameProcess: ChildProcess | null = null

let diyFlipperPort: SerialPort | null = null
let diyFlipperLineBuffer = ''
let diyFlipperScanTimer: NodeJS.Timeout | null = null
let diyFlipperStatus: DiyFlipperStatus = {
  connected: false,
  connecting: false,
  autoConnect: true
}

function publishDiyFlipperStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('diyflipper-status', diyFlipperStatus)
}

function setDiyFlipperStatus(patch: Partial<DiyFlipperStatus>) {
  diyFlipperStatus = { ...diyFlipperStatus, ...patch }
  publishDiyFlipperStatus()
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

  gameProcess.once('exit', (code, signal) => {
    console.log(`[LAUNCH] ${label} game exited`, { code, signal })
    if (activeGameProcess === gameProcess) {
      activeGameProcess = null
      restoreArcadeWindow()
      publishGameExited()
    }
  })

  gameProcess.once('error', (error) => {
    console.error(`[LAUNCH] ${label} game process error:`, error)
    if (activeGameProcess === gameProcess) {
      activeGameProcess = null
      restoreArcadeWindow()
    }
  })
}

async function stopActiveGameProcess(force = false): Promise<IpcResult> {
  const gameProcess = activeGameProcess
  if (!gameProcess || gameProcess.exitCode !== null || gameProcess.killed) {
    activeGameProcess = null
    return { success: true, message: 'No active game process' }
  }

  const pid = gameProcess.pid
  activeGameProcess = null

  if (!pid) {
    return { success: false, message: 'Active game process has no PID' }
  }

  try {
    if (process.platform === 'win32') {
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

      if (result.success) {
        restoreArcadeWindow()
        publishGameExited()
      }
      return result
    }

    const signal: NodeJS.Signals = force ? 'SIGKILL' : 'SIGTERM'
    try {
      process.kill(-pid, signal)
    } catch {
      process.kill(pid, signal)
    }

    restoreArcadeWindow()
    publishGameExited()
    return { success: true, message: 'Game stop signal sent' }
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
    console.error('[DIYFLIPPER] Failed to list serial ports:', error)
    return []
  }
}

function attachDiyFlipperPortListeners(port: SerialPort) {
  port.on('data', (chunk: Buffer) => {
    diyFlipperLineBuffer += chunk.toString('utf8')

    let newlineIndex = diyFlipperLineBuffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = diyFlipperLineBuffer.slice(0, newlineIndex).replace(/\r/g, '').trim()
      diyFlipperLineBuffer = diyFlipperLineBuffer.slice(newlineIndex + 1)
      newlineIndex = diyFlipperLineBuffer.indexOf('\n')

      if (!line) continue
      setDiyFlipperStatus({ lastSeenAt: Date.now(), error: undefined })
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('diyflipper-line', line)
      }
    }
  })

  port.on('error', (error) => {
    console.error('[DIYFLIPPER] Serial error:', error)
    if (diyFlipperPort === port) {
      diyFlipperPort = null
      diyFlipperLineBuffer = ''
      setDiyFlipperStatus({
        connected: false,
        connecting: false,
        portPath: undefined,
        error: `Serial error: ${toErrorMessage(error)}`
      })
    }
  })

  port.on('close', () => {
    if (diyFlipperPort === port) {
      console.warn('[DIYFLIPPER] Device disconnected')
      diyFlipperPort = null
      diyFlipperLineBuffer = ''
      setDiyFlipperStatus({
        connected: false,
        connecting: false,
        portPath: undefined,
        error: 'Device disconnected'
      })
    }
  })
}

function hasDiyFlipperHandshakeMarker(buffer: string) {
  return (
    buffer.includes('DIYFLIPPER_READY')
    || buffer.includes('PONG')
    || buffer.includes('FW:esp32-bridge')
    || buffer.includes('CAPS:')
    || buffer.includes('HWLIB:')
  )
}

async function probeDiyFlipperHandshake(port: SerialPort, timeoutMs = 4200) {
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
      if (hasDiyFlipperHandshakeMarker(buffer)) {
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

async function openDiyFlipperPort(portPath: string) {
  const port = new SerialPort({
    path: portPath,
    baudRate: DIY_FLIPPER_BAUD_RATE,
    autoOpen: false
  })

  await new Promise<void>((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  diyFlipperPort = port
  diyFlipperLineBuffer = ''
  attachDiyFlipperPortListeners(port)

  // ESP32 USB serial often resets on open; give it a brief boot window.
  await new Promise((resolve) => setTimeout(resolve, 320))

  const handshakeOk = await probeDiyFlipperHandshake(port)
  if (!handshakeOk) {
    await new Promise<void>((resolve) => {
      if (!port.isOpen) {
        resolve()
        return
      }
      port.close(() => resolve())
    })
    diyFlipperPort = null
    diyFlipperLineBuffer = ''
    throw new Error('No DIYFLIPPER handshake (HELLO/PING timeout)')
  }

  setDiyFlipperStatus({
    connected: true,
    connecting: false,
    portPath,
    error: undefined,
    lastSeenAt: Date.now()
  })
}

async function connectDiyFlipper(preferredPath?: string) {
  if (diyFlipperPort?.isOpen) {
    return { success: true, message: `Already connected on ${diyFlipperStatus.portPath ?? 'serial'}` }
  }

  if (diyFlipperStatus.connecting) {
    return { success: false, message: 'Connection already in progress' }
  }

  setDiyFlipperStatus({ connecting: true, error: undefined })

  const ports = await listSerialPortsSafe()
  if (!ports.length) {
    setDiyFlipperStatus({ connecting: false, connected: false, error: 'No serial ports found' })
    return { success: false, message: 'No serial ports found' }
  }

  let candidates: PortInfo[] = []

  if (preferredPath) {
    candidates = ports.filter((port) => port.path === preferredPath)
    if (!candidates.length) {
      setDiyFlipperStatus({
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
      await openDiyFlipperPort(candidate.path)
      console.log(`[DIYFLIPPER] Connected on ${candidate.path}`)
      return { success: true, message: `Connected on ${candidate.path}` }
    } catch (error: unknown) {
      const message = `${candidate.path}: ${toErrorMessage(error)}`
      errors.push(message)
      console.warn(`[DIYFLIPPER] Failed to open ${message}`)
    }
  }

  const errorMessage = errors.length
    ? `Could not connect. Tried: ${errors.join(' | ')}`
    : 'Could not connect to any serial device'

  setDiyFlipperStatus({ connecting: false, connected: false, error: errorMessage })
  return { success: false, message: errorMessage }
}

async function disconnectDiyFlipper() {
  setDiyFlipperStatus({ autoConnect: false })

  if (!diyFlipperPort) {
    setDiyFlipperStatus({
      connected: false,
      connecting: false,
      portPath: undefined,
      error: undefined
    })
    return { success: true, message: 'Already disconnected' }
  }

  const port = diyFlipperPort
  diyFlipperPort = null
  diyFlipperLineBuffer = ''

  await new Promise<void>((resolve) => {
    if (!port.isOpen) {
      resolve()
      return
    }
    port.close(() => resolve())
  })

  setDiyFlipperStatus({
    connected: false,
    connecting: false,
    portPath: undefined,
    error: undefined
  })
  return { success: true, message: 'Disconnected' }
}

async function writeDiyFlipperCommand(command: string) {
  const trimmedCommand = command.trim()
  if (!trimmedCommand) {
    return { success: false, message: 'Command cannot be empty' }
  }

  if (!diyFlipperPort?.isOpen) {
    const reconnect = await connectDiyFlipper()
    if (!reconnect.success || !diyFlipperPort?.isOpen) {
      return { success: false, message: reconnect.message || 'Device not connected' }
    }
  }

  return new Promise<{ success: boolean; message: string }>((resolve) => {
    diyFlipperPort!.write(`${trimmedCommand}\n`, (error) => {
      if (error) {
        setDiyFlipperStatus({ error: `Write failed: ${toErrorMessage(error)}` })
        resolve({ success: false, message: `Write failed: ${toErrorMessage(error)}` })
        return
      }
      setDiyFlipperStatus({ lastSeenAt: Date.now(), error: undefined })
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('diyflipper-line', `TX ${trimmedCommand}`)
      }
      resolve({ success: true, message: `Command sent: ${trimmedCommand}` })
    })
  })
}

function startDiyFlipperAutoConnect() {
  if (diyFlipperScanTimer) return

  const tick = async () => {
    if (!diyFlipperStatus.autoConnect) return
    if (diyFlipperPort?.isOpen) return
    if (diyFlipperStatus.connecting) return
    await connectDiyFlipper()
  }

  void tick()
  diyFlipperScanTimer = setInterval(() => {
    void tick()
  }, DIY_FLIPPER_SCAN_INTERVAL_MS)
}

function stopDiyFlipperAutoConnect() {
  if (diyFlipperScanTimer) {
    clearInterval(diyFlipperScanTimer)
    diyFlipperScanTimer = null
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
    // On Windows is de OS-schaal vaak > 100%, waardoor alles te ingezoomd oogt.
    // We compenseren dit door de Electron zoomfactor iets te verlagen.
    if (process.platform === 'win32') {
      mainWindow?.webContents.setZoomFactor(0.85)
    }
    publishDiyFlipperStatus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function sanitizeFilePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'capture'
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

ipcMain.handle('set-fullscreen', async (_event, fullscreen: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('diyflipper-get-status', async () => {
  return diyFlipperStatus
})

ipcMain.handle('diyflipper-connect', async (_event, preferredPath?: string) => {
  setDiyFlipperStatus({ autoConnect: true })
  return connectDiyFlipper(preferredPath)
})

ipcMain.handle('diyflipper-disconnect', async () => {
  return disconnectDiyFlipper()
})

ipcMain.handle('diyflipper-send-command', async (_event, command: string) => {
  if (typeof command !== 'string' || !command.trim()) {
    return { success: false, message: 'Invalid command' }
  }
  return writeDiyFlipperCommand(command)
})

ipcMain.handle('diyflipper-run-module', async (_event, moduleKey: string) => {
  const command = DIY_MODULE_COMMANDS[moduleKey]
  if (!command) {
    return { success: false, message: `Unknown module key: ${moduleKey}` }
  }
  return writeDiyFlipperCommand(`RUN ${command}`)
})

ipcMain.handle('diyflipper-save-nfc-capture', async (_event, payload: NfcCapturePayload) => {
  try {
    const uid = (payload?.uid ?? '').trim()
    if (!uid) {
      return { success: false, message: 'Missing NFC UID' }
    }

    const now = new Date()
    const iso = now.toISOString()
    const stamp = iso.replace(/[:.]/g, '-')
    const safeLabel = sanitizeFilePart((payload?.label ?? uid).trim())
    const filename = `${stamp}_${safeLabel}.json`
    const filePath = path.join(DIY_NFC_CAPTURE_DIR, filename)

    fs.mkdirSync(DIY_NFC_CAPTURE_DIR, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({
      uid,
      label: payload?.label ?? uid,
      capturedAt: iso,
      source: 'diyflipper',
      rawLine: payload?.rawLine ?? ''
    }, null, 2))

    return { success: true, message: filePath }
  } catch (error: unknown) {
    return { success: false, message: `Failed to save NFC capture: ${toErrorMessage(error)}` }
  }
})

ipcMain.handle('diyflipper-load-ir-mini-db', async () => {
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

ipcMain.handle('diyflipper-send-ir-entry', async (_event, entry: IrDatabaseEntry) => {
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
  return writeDiyFlipperCommand(`IR_SEND ${protocol} ${address} ${command} ${carrierKhz}`)
})

ipcMain.handle('stop-game', async () => {
  return stopActiveGameProcess(false)
})

ipcMain.handle('kill-game', async () => {
  return stopActiveGameProcess(true)
})

ipcMain.handle('update-game-viewport', async (_event, _viewport: LaunchViewport) => {
  return { success: true, message: 'Viewport updated' }
})

ipcMain.handle('resize-game', async (_event, _viewport: LaunchViewport) => {
  return { success: true, message: 'Resize updated' }
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
    const basePath = isDev
      ? path.resolve(__dirname, '../../arcade-flipper/src')
      : app.getAppPath()

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

    const gameExtension = path.extname(gamePath).toLowerCase()

    if (gameExtension === '.py') {
      const pythonCmd = resolvePythonCommand(basePath)
      console.log('[LAUNCH] Python:', pythonCmd)

      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(fullGamePath),
        env: {
          ...process.env,
          ARCADE_EMBEDDED: launchMode === 'embedded' ? '1' : '0',
          ARCADE_WINDOW_POS: `${targetBounds.x},${targetBounds.y}`,
          ARCADE_WINDOW_SIZE: `${targetBounds.width}x${targetBounds.height}`
        }
      })

      pythonProcess.stdout?.on('data', (data) => {
        console.log('[PYTHON STDOUT]', data.toString())
      })

      pythonProcess.stderr?.on('data', (data) => {
        console.error('[PYTHON STDERR]', data.toString())
      })

      pythonProcess.on('error', (error) => {
        console.error('[LAUNCH] Python start failed:', error)
        restoreArcadeWindow()
      })

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
        env: {
          ...process.env,
          ARCADE_EMBEDDED: launchMode === 'embedded' ? '1' : '0',
          ARCADE_WINDOW_POS: `${targetBounds.x},${targetBounds.y}`,
          ARCADE_WINDOW_SIZE: `${targetBounds.width}x${targetBounds.height}`
        }
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
        stdio: 'ignore'
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
  startDiyFlipperAutoConnect()
})

app.on('before-quit', async () => {
  stopDiyFlipperAutoConnect()
  await stopActiveGameProcess(true)
  if (diyFlipperPort?.isOpen) {
    await disconnectDiyFlipper()
  }
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
