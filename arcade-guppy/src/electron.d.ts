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

export type GuppyStatus = {
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

export type WifiJammerPayload = {
  iface?: string
  mode?: 'auto' | 'firmware' | 'host'
  channel?: number
  accessPoints?: string
  stations?: string
  filters?: string
  packets?: number
  delay?: number
  reset?: number
  code?: number
  world?: boolean
  noBroadcast?: boolean
  verbose?: boolean
}

export type WifiJammerState = {
  running: boolean
  mode?: 'firmware' | 'host'
  iface?: string
  message?: string
}

export type AiExplainPayload = {
  gameId: string
  title: string
  genre?: string
  difficulty?: string
  lastEvent?: string
}

export type AiExplainResponse = {
  success: boolean
  message: string
  content?: string
}

type IpcSuccessResponse = { success: boolean }
type IpcMessageResponse = { success: boolean; message: string }
type IrDbResponse = IpcMessageResponse & { entries?: IrDatabaseEntry[] }

export interface ElectronAPI {
  setFullscreen: (fullscreen: boolean) => Promise<IpcSuccessResponse>
  launchGame: (request: string | LaunchRequest) => Promise<IpcMessageResponse>
  stopGame: () => Promise<IpcMessageResponse>
  killGame: () => Promise<IpcMessageResponse>
  aiExplain: (payload: AiExplainPayload) => Promise<AiExplainResponse>
  guppyGetStatus: () => Promise<GuppyStatus>
  guppyConnect: (preferredPath?: string) => Promise<{success: boolean, message: string}>
  guppyDisconnect: () => Promise<{success: boolean, message: string}>
  guppySendCommand: (command: string) => Promise<{success: boolean, message: string}>
  guppyRunModule: (moduleKey: string) => Promise<{success: boolean, message: string}>
  guppySaveNfcCapture: (payload: { uid: string; label?: string; rawLine?: string }) => Promise<{success: boolean, message: string}>
  guppyLoadIrMiniDb: () => Promise<{success: boolean, message: string, entries: IrDatabaseEntry[]}>
  guppySendIrEntry: (entry: IrDatabaseEntry) => Promise<{success: boolean, message: string}>
  guppyLoadWifiApProfile: () => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  guppySaveWifiApProfile: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  guppyStartWifiAp: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) => Promise<{success: boolean, message: string, profile: WifiApProfile | null}>
  guppyLookupMacVendors: (bssids: string[]) => Promise<{success: boolean, vendors: Record<string, string>}>
  guppyReadJammerGuide: () => Promise<{success: boolean, content?: string, message?: string}>
  guppyReadJammerMaclist: () => Promise<{success: boolean, count: number, preview: string[]}>
  guppyStartWifiJammer: (payload: WifiJammerPayload) => Promise<{success: boolean, message: string}>
  guppyStopWifiJammer: () => Promise<{success: boolean, message: string}>
  guppyGetWifiJammerStatus: () => Promise<{success: boolean, state: WifiJammerState}>
  onGuppyStatus: (callback: (status: GuppyStatus) => void) => () => void
  onGuppyLine: (callback: (line: string) => void) => () => void
  onGameExit: (callback: () => void) => () => void
  onWifiJammerState: (callback: (state: WifiJammerState) => void) => () => void
  onWifiJammerLog: (callback: (line: string) => void) => () => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
    __hackTransitionTrigger?: () => void
  }
}
