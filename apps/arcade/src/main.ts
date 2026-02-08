import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

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
ipcMain.handle('set-fullscreen', async (event, fullscreen: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen)
    return { success: true }
  }
  return { success: false }
})

// IPC handler for hiding/showing window
ipcMain.handle('hide-window', async () => {
  if (mainWindow) {
    mainWindow.hide()
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('show-window', async () => {
  if (mainWindow) {
    mainWindow.show()
    return { success: true }
  }
  return { success: false }
})

// IPC handler for launching games
ipcMain.handle('launch-game', async (event, gamePath: string) => {
  try {
    console.log('🎮 Launching game:', gamePath)
    
    // Make window fullscreen before launching game
    if (mainWindow) {
      // Get screen size for fullscreen
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize
      
      // Set window to fullscreen size
      mainWindow.setFullScreen(true)
      mainWindow.setBounds({ x: 0, y: 0, width, height })
      
      // Keep window visible but let game window appear on top
    }
    
    // Resolve the game path relative to the app directory
    // In development, __dirname points to out/main, so we go up to the project root
    // In production, app.getAppPath() gives us the app directory
    const isDev = process.env.NODE_ENV === 'development'
    const basePath = isDev 
      ? path.join(__dirname, '../../')  // From out/main to project root
      : app.getAppPath()
    
    const fullGamePath = path.resolve(basePath, gamePath)
    
    console.log('📁 Base path:', basePath)
    console.log('📁 Full game path:', fullGamePath)
    
    // Check if file exists
    const fs = require('fs')
    if (!fs.existsSync(fullGamePath)) {
      return {
        success: false,
        message: `Game file not found: ${gamePath}`
      }
    }
    
    // Get window bounds to position game window
    const bounds = mainWindow?.getBounds()
    
    // Determine how to launch based on file extension
    if (gamePath.endsWith('.py')) {
      // Launch Python script
      // Try python3 first, fallback to python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      
      // Get fullscreen bounds
      const display = mainWindow?.getBounds()
      const screenBounds = mainWindow?.getBounds() || { x: 0, y: 0, width: 1920, height: 1080 }
      
      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr for debugging
        cwd: path.dirname(fullGamePath), // Set working directory to game folder
        env: { ...process.env }
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
          mainWindow.setFullScreen(false)
        }
      })
      
      // Monitor when game process exits
      pythonProcess.on('exit', (code) => {
        console.log('🎮 Game process exited with code:', code)
        // Show Electron window again when game closes
        if (mainWindow) {
          mainWindow.show()
          mainWindow.setFullScreen(false)
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
          
          const script = `
            tell application "System Events"
              try
                set pythonProcesses to every process whose name contains "Python"
                repeat with proc in pythonProcesses
                  try
                    set procWindows to windows of proc
                    repeat with win in procWindows
                      try
                        set position of win to {0, 0}
                        set size of win to {${screenBounds.width}, ${screenBounds.height}}
                        -- Make it fullscreen-like
                        set value of attribute "AXFullScreen" of win to true
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
          mainWindow.setFullScreen(false)
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
      mainWindow.setFullScreen(false)
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