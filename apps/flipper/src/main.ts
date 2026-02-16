import { app, BrowserWindow } from 'electron'
import { join } from 'path'

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 700,
    backgroundColor: '#000000',
    title: 'FLIPPER // HACK TERMINAL',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}/hacker-terminal.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/hacker-terminal.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})