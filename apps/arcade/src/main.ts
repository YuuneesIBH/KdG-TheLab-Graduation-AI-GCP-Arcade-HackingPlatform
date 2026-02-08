import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Get preload script path
  // In development, electron-vite compiles it to out/preload/preload.js
  // In production, it's in the same location
  const preloadPath = path.join(__dirname, '../preload/preload.js')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handler for launching games
ipcMain.handle('launch-game', async (event, gamePath: string) => {
  try {
    console.log('🎮 Launching game:', gamePath)
    
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
    
    // Determine how to launch based on file extension
    if (gamePath.endsWith('.py')) {
      // Launch Python script
      // Try python3 first, fallback to python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      
      const pythonProcess = spawn(pythonCmd, [fullGamePath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(fullGamePath) // Set working directory to game folder
      })
      
      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to launch Python:', error)
      })
      
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