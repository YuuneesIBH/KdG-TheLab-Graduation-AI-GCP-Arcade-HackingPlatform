import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  launchGame: (gamePath: string) => ipcRenderer.invoke('launch-game', gamePath)
})

console.log('Preload script loaded')