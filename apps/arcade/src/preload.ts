import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  launchGame: (gamePath: string) => ipcRenderer.invoke('launch-game', gamePath),
  onGameExit: (callback: () => void) => {
    // Listen for game exit event from main process
    ipcRenderer.on('game-exited', callback)
    return () => ipcRenderer.removeAllListeners('game-exited')
  }
})

console.log('Preload script loaded')