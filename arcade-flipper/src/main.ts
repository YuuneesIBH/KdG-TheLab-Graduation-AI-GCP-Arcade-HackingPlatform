import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
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

type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const DIY_FLIPPER_BAUD_RATE = 115200
const DIY_FLIPPER_SCAN_INTERVAL_MS = 3000

const DIY_MODULE_COMMANDS: Record<string, string> = {
  nfc: 'NFC_CLONE',
  badusb: 'BADUSB_INJECT',
  ir: 'IR_BLAST',
  gpio: 'GPIO_CTRL',
  terminal: 'SHELL'
}

let mainWindow: BrowserWindow | null = null

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

function portInfoText(port: PortInfo) {
  const maybeFriendlyName = (port as unknown as { friendlyName?: string }).friendlyName ?? ''
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
  } catch (error: any) {
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
        error: `Serial error: ${error.message || error}`
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
  setDiyFlipperStatus({
    connected: true,
    connecting: false,
    portPath,
    error: undefined,
    lastSeenAt: Date.now()
  })

  port.write('HELLO\n')
  port.write('PING\n')
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
    } catch (error: any) {
      const message = `${candidate.path}: ${error.message || error}`
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
  diyFlipperStatus.autoConnect = false

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
  if (!diyFlipperPort?.isOpen) {
    const reconnect = await connectDiyFlipper()
    if (!reconnect.success || !diyFlipperPort?.isOpen) {
      return { success: false, message: reconnect.message || 'Device not connected' }
    }
  }

  return new Promise<{ success: boolean; message: string }>((resolve) => {
    diyFlipperPort!.write(`${command.trim()}\n`, (error) => {
      if (error) {
        setDiyFlipperStatus({ error: `Write failed: ${error.message || error}` })
        resolve({ success: false, message: `Write failed: ${error.message || error}` })
        return
      }
      setDiyFlipperStatus({ lastSeenAt: Date.now(), error: undefined })
      resolve({ success: true, message: `Command sent: ${command}` })
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
    publishDiyFlipperStatus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
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
  diyFlipperStatus.autoConnect = true
  return connectDiyFlipper(preferredPath)
})

ipcMain.handle('diyflipper-disconnect', async () => {
  return disconnectDiyFlipper()
})

ipcMain.handle('diyflipper-send-command', async (_event, command: string) => {
  if (!command || typeof command !== 'string') {
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

    const hostBounds = mainWindow?.getBounds() || displayBounds
    const defaultBounds = {
      x: displayBounds.x,
      y: displayBounds.y,
      width: displayBounds.width,
      height: displayBounds.height
    }

    const viewport = request.viewport
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

    if (gamePath.endsWith('.py')) {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        detached: true,
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
        if (mainWindow) mainWindow.show()
      })

      pythonProcess.on('exit', (code) => {
        console.log('[LAUNCH] Python game exited with code:', code)
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('game-exited')
        }
      })

      if (process.platform === 'darwin' && mainWindow) {
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
                set pythonProcesses to every process whose name contains "Python"
                repeat with proc in pythonProcesses
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

      pythonProcess.unref()

      return {
        success: true,
        message: 'Game launched successfully'
      }
    }

    if (gamePath.endsWith('.exe')) {
      const exeProcess = spawn(fullGamePath, [], {
        detached: true,
        stdio: 'ignore'
      })

      exeProcess.on('exit', () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('game-exited')
        }
      })

      exeProcess.unref()

      return {
        success: true,
        message: 'Game launched successfully'
      }
    }

    return {
      success: false,
      message: `Unsupported file type: ${path.extname(gamePath)}`
    }
  } catch (error: any) {
    console.error('[LAUNCH] Error launching game:', error)
    if (mainWindow) {
      mainWindow.show()
    }
    return {
      success: false,
      message: `Error: ${error.message || error}`
    }
  }
})

app.whenReady().then(() => {
  createWindow()
  startDiyFlipperAutoConnect()
})

app.on('before-quit', async () => {
  stopDiyFlipperAutoConnect()
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
