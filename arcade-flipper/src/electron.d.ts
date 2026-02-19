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

export type DiyFlipperStatus = {
  connected: boolean
  connecting: boolean
  autoConnect: boolean
  portPath?: string
  error?: string
  lastSeenAt?: number
}

export interface ElectronAPI {
  setFullscreen: (fullscreen: boolean) => Promise<{success: boolean}>
  launchGame: (request: string | LaunchRequest) => Promise<{success: boolean, message: string}>
  diyFlipperGetStatus: () => Promise<DiyFlipperStatus>
  diyFlipperConnect: (preferredPath?: string) => Promise<{success: boolean, message: string}>
  diyFlipperDisconnect: () => Promise<{success: boolean, message: string}>
  diyFlipperSendCommand: (command: string) => Promise<{success: boolean, message: string}>
  diyFlipperRunModule: (moduleKey: string) => Promise<{success: boolean, message: string}>
  onDiyFlipperStatus: (callback: (status: DiyFlipperStatus) => void) => () => void
  onDiyFlipperLine: (callback: (line: string) => void) => () => void
  onGameExit: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
