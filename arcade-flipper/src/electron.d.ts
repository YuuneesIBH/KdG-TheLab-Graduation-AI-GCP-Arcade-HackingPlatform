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

type IpcSuccessResponse = { success: boolean }
type IpcMessageResponse = { success: boolean; message: string }
type IrDbResponse = IpcMessageResponse & { entries?: IrDatabaseEntry[] }

export interface ElectronAPI {
  setFullscreen: (fullscreen: boolean) => Promise<IpcSuccessResponse>
  launchGame: (request: string | LaunchRequest) => Promise<IpcMessageResponse>
  stopGame: () => Promise<IpcMessageResponse>
  killGame: () => Promise<IpcMessageResponse>
  diyFlipperGetStatus: () => Promise<DiyFlipperStatus>
  diyFlipperConnect: (preferredPath?: string) => Promise<IpcMessageResponse>
  diyFlipperDisconnect: () => Promise<IpcMessageResponse>
  diyFlipperSendCommand: (command: string) => Promise<IpcMessageResponse>
  diyFlipperRunModule: (moduleKey: string) => Promise<IpcMessageResponse>
  diyFlipperSaveNfcCapture: (payload: { uid: string; label?: string; rawLine?: string }) => Promise<IpcMessageResponse>
  diyFlipperLoadIrMiniDb: () => Promise<IrDbResponse>
  diyFlipperSendIrEntry: (entry: IrDatabaseEntry) => Promise<IpcMessageResponse>
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
