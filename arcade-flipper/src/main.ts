import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Get preload script path
  // In development, electron-vite compiles it to out/preload/preload.js
  // In production, it's in the same location
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

  // In development: load from vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Ensure fullscreen after load (in case fullscreen: true is ignored on some systems)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.setFullScreen(true)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handler for making window fullscreen
ipcMain.handle('set-fullscreen', async (_event, fullscreen: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen)
    return { success: true }
  }
  return { success: false }
})

// IPC handler for launching games
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

    console.log('🎮 Launching game:', gamePath)
    console.log('🎮 Launch mode:', launchMode)

    const activeDisplay = mainWindow
      ? screen.getDisplayMatching(mainWindow.getBounds())
      : screen.getPrimaryDisplay()
    const displayBounds = activeDisplay.bounds
    
    // Make window fullscreen before launching game
    if (mainWindow) {
      // Use physical display bounds so the launcher matches the monitor resolution.
      mainWindow.setBounds(displayBounds)
      mainWindow.setFullScreen(true)
    }
    
    const isDev = process.env.NODE_ENV === 'development'
    const basePath = isDev
      ? path.resolve(__dirname, '../../arcade-flipper/src')
      : app.getAppPath()

    function resolveSafe(base: string, rel: string) {
      const cleaned = rel.replace(/^(\.\/)+/, '') // "./games/x" -> "games/x"
      const full = path.resolve(base, cleaned)

      const baseNorm = path.resolve(base) + path.sep
      const fullNorm = path.resolve(full)

      if (!fullNorm.startsWith(baseNorm)) {
        throw new Error(`Blocked path traversal: ${rel}`)
      }
      return fullNorm
    }

    const fullGamePath = resolveSafe(basePath, gamePath)

    console.log('📁 Base path:', basePath)
    console.log('📁 Full game path:', fullGamePath)

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
    
    // Determine how to launch based on file extension
    if (gamePath.endsWith('.py')) {
      // Launch Python script
      // Try python3 first, fallback to python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr for debugging
        cwd: path.dirname(fullGamePath), // Set working directory to game folder
        env: {
          ...process.env,
          ARCADE_EMBEDDED: launchMode === 'embedded' ? '1' : '0',
          ARCADE_WINDOW_POS: `${targetBounds.x},${targetBounds.y}`,
          ARCADE_WINDOW_SIZE: `${targetBounds.width}x${targetBounds.height}`
        }
      })
      
      // Log Python output for debugging
      pythonProcess.stdout?.on('data', (data) => {
        console.log('🐍 Python stdout:', data.toString())
      })
      
      pythonProcess.stderr?.on('data', (data) => {
        console.error('🐍 Python stderr:', data.toString())
      })
      
      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to launch Python:', error)
        // Show window again if game fails to launch
        if (mainWindow) {
          mainWindow.show()
        }
      })
      
      // Monitor when game process exits
      pythonProcess.on('exit', (code) => {
        console.log('🎮 Game process exited with code:', code)
        // Show Electron window again when game closes
        if (mainWindow) {
          mainWindow.show()
          // Notify renderer that game exited
          mainWindow.webContents.send('game-exited')
        }
      })
      
      // On macOS, use AppleScript to position and resize the Pygame window
      if (process.platform === 'darwin' && mainWindow) {
        // Try multiple times to catch the window when it appears
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
        }, 500) // Try every 500ms for 5 seconds
      }
      
      pythonProcess.unref()
      
      console.log('✅ Python game launched with:', pythonCmd)
      return {
        success: true,
        message: 'Game launched successfully'
      }
    } else if (gamePath.endsWith('.exe')) {
      // Launch Windows executable
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
      
      console.log('✅ Executable game launched')
      return {
        success: true,
        message: 'Game launched successfully'
      }
    } else {
      return {
        success: false,
        message: `Unsupported file type: ${path.extname(gamePath)}`
      }
    }
  } catch (error: any) {
    console.error('❌ Error launching game:', error)
    // Show window again on error
    if (mainWindow) {
      mainWindow.show()
    }
    return {
      success: false,
      message: `Error: ${error.message || error}`
    }
  }
})

app.whenReady().then(createWindow)

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
