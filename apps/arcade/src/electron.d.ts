// Type definitions for Electron IPC exposed in window object
export type LaunchViewport = {
  x: number
  y: number
  width: number
  height: number
}

export type LaunchRequest = {
  gamePath: string
  mode?: 'external' | 'embedded'
  viewport?: LaunchViewport
}

export interface ElectronAPI {
  setFullscreen: (fullscreen: boolean) => Promise<{success: boolean}>
  launchGame: (request: string | LaunchRequest) => Promise<{success: boolean, message: string}>
  onGameExit: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}