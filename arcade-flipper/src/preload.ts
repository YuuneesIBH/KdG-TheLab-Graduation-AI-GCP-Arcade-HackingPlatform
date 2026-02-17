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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  setFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  launchGame: (request: string | LaunchRequest) => ipcRenderer.invoke('launch-game', request),
  onGameExit: (callback: () => void) => {
    // Listen for game exit event from main process
    const listener = () => callback()
    ipcRenderer.on('game-exited', listener)
    return () => ipcRenderer.removeListener('game-exited', listener)
  }
})

console.log('Preload script loaded')
