import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#000000',
    title: 'FLIPPER // HACK TERMINAL',
    fullscreen: true,        // ← fullscreen
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/hacker-terminal.html')
  } else {
    win.loadFile(join(__dirname, '../renderer/hacker-terminal.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})