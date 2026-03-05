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

export type IrDatabaseEntry = {
  id: string
  name: string
  protocol: string
  address: string
  command: string
  carrierKhz?: number
  source?: string
}

export type WifiApProfile = {
  ssid: string
  password: string
  channel: number
  updatedAt: string
}

export interface ElectronAPI {
  setFullscreen: (fullscreen: boolean) => Promise<{success: boolean}>
  launchGame: (request: string | LaunchRequest) => Promise<{success: boolean, message: string}>
  stopGame: () => Promise<{success: boolean, message: string}>
  killGame: () => Promise<{success: boolean, message: string}>
  updateGameViewport: (viewport: LaunchViewport) => Promise<{success: boolean, message: string}>
  resizeGame: (viewport: LaunchViewport) => Promise<{success: boolean, message: string}>
  diyFlipperGetStatus: () => Promise<DiyFlipperStatus>
  diyFlipperConnect: (preferredPath?: string) => Promise<{success: boolean, message: string}>
  diyFlipperDisconnect: () => Promise<{success: boolean, message: string}>
  diyFlipperSendCommand: (command: string) => Promise<{success: boolean, message: string}>
  diyFlipperRunModule: (moduleKey: string) => Promise<{success: boolean, message: string}>
  diyFlipperSaveNfcCapture: (payload: { uid: string; label?: string; rawLine?: string }) => Promise<{success: boolean, message: string}>
  diyFlipperLoadIrMiniDb: () => Promise<{success: boolean, message: string, entries: IrDatabaseEntry[]}>
  diyFlipperSendIrEntry: (entry: IrDatabaseEntry) => Promise<{success: boolean, message: string}>
  diyFlipperLoadWifiApProfile: () => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  diyFlipperSaveWifiApProfile: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  diyFlipperStartWifiAp: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  onDiyFlipperStatus: (callback: (status: DiyFlipperStatus) => void) => () => void
  onDiyFlipperLine: (callback: (line: string) => void) => () => void
  onGameExit: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
    __hackTransitionTrigger?: () => void
  }
}
