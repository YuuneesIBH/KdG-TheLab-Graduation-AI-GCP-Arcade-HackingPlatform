import { contextBridge, ipcRenderer } from 'electron'

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

type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
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
contextBridge.exposeInMainWorld('electron', {
  setFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  launchGame: (request: string | LaunchRequest) => ipcRenderer.invoke('launch-game', request),
  stopGame: () => ipcRenderer.invoke('stop-game'),
  killGame: () => ipcRenderer.invoke('kill-game'),
  diyFlipperGetStatus: () => ipcRenderer.invoke('diyflipper-get-status'),
  diyFlipperConnect: (preferredPath?: string) => ipcRenderer.invoke('diyflipper-connect', preferredPath),
  diyFlipperDisconnect: () => ipcRenderer.invoke('diyflipper-disconnect'),
  diyFlipperSendCommand: (command: string) => ipcRenderer.invoke('diyflipper-send-command', command),
  diyFlipperRunModule: (moduleKey: string) => ipcRenderer.invoke('diyflipper-run-module', moduleKey),
  diyFlipperSaveNfcCapture: (payload: { uid: string; label?: string; rawLine?: string }) =>
    ipcRenderer.invoke('diyflipper-save-nfc-capture', payload),
  diyFlipperLoadIrMiniDb: () => ipcRenderer.invoke('diyflipper-load-ir-mini-db'),
  diyFlipperSendIrEntry: (entry: IrDatabaseEntry) => ipcRenderer.invoke('diyflipper-send-ir-entry', entry),
  onDiyFlipperStatus: (callback: (status: DiyFlipperStatus) => void) => {
    const listener = (_event: unknown, status: DiyFlipperStatus) => callback(status)
    ipcRenderer.on('diyflipper-status', listener)
    return () => ipcRenderer.removeListener('diyflipper-status', listener)
  },
  onDiyFlipperLine: (callback: (line: string) => void) => {
    const listener = (_event: unknown, line: string) => callback(line)
    ipcRenderer.on('diyflipper-line', listener)
    return () => ipcRenderer.removeListener('diyflipper-line', listener)
  },
  onGameExit: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('game-exited', listener)
    return () => ipcRenderer.removeListener('game-exited', listener)
  }
})

console.log('Preload script loaded')
