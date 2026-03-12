import type {
  AiExplainPayload,
  AiExplainResponse,
  GuppyStatus,
  IpcMessageResponse,
  IpcSuccessResponse,
  IrDatabaseEntry,
  LaunchRequest,
  NfcCapturePayload,
  WifiApProfile,
  WifiJammerPayload,
  WifiJammerState,
} from './shared/electron-types'

export type {
  AiExplainPayload,
  AiExplainResponse,
  GuppyStatus,
  IpcMessageResponse,
  IpcSuccessResponse,
  IrDatabaseEntry,
  LaunchRequest,
  LaunchViewport,
  NfcCapturePayload,
  WifiApProfile,
  WifiJammerMode,
  WifiJammerPayload,
  WifiJammerState,
} from './shared/electron-types'

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
  guppySaveNfcCapture: (payload: NfcCapturePayload) => Promise<{success: boolean, message: string}>
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
