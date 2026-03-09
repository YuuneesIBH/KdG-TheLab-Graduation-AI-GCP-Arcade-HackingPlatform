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

type GuppyStatus = {
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

type WifiApProfile = {
  ssid: string
  password: string
  channel: number
  updatedAt: string
}

type WifiJammerPayload = {
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

type WifiJammerState = {
  running: boolean
  mode?: 'firmware' | 'host'
  iface?: string
  message?: string
}

type AiExplainPayload = {
  gameId: string
  title: string
  genre?: string
  difficulty?: string
  lastEvent?: string
}

type AiExplainResponse = {
  success: boolean
  message: string
  content?: string
}
contextBridge.exposeInMainWorld('electron', {
  setFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  launchGame: (request: string | LaunchRequest) => ipcRenderer.invoke('launch-game', request),
  stopGame: () => ipcRenderer.invoke('stop-game'),
  killGame: () => ipcRenderer.invoke('kill-game'),
  aiExplain: (payload: AiExplainPayload): Promise<AiExplainResponse> => ipcRenderer.invoke('ai-explain', payload),
  guppyGetStatus: () => ipcRenderer.invoke('guppy-get-status'),
  guppyConnect: (preferredPath?: string) => ipcRenderer.invoke('guppy-connect', preferredPath),
  guppyDisconnect: () => ipcRenderer.invoke('guppy-disconnect'),
  guppySendCommand: (command: string) => ipcRenderer.invoke('guppy-send-command', command),
  guppyRunModule: (moduleKey: string) => ipcRenderer.invoke('guppy-run-module', moduleKey),
  guppySaveNfcCapture: (payload: { uid: string; label?: string; rawLine?: string }) =>
    ipcRenderer.invoke('guppy-save-nfc-capture', payload),
  guppyLoadIrMiniDb: () => ipcRenderer.invoke('guppy-load-ir-mini-db'),
  guppySendIrEntry: (entry: IrDatabaseEntry) => ipcRenderer.invoke('guppy-send-ir-entry', entry),
  guppyLoadWifiApProfile: () => ipcRenderer.invoke('guppy-load-wifi-ap-profile'),
  guppySaveWifiApProfile: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) =>
    ipcRenderer.invoke('guppy-save-wifi-ap-profile', profile),
  guppyStartWifiAp: (profile: Partial<Pick<WifiApProfile, 'ssid' | 'password' | 'channel'>>) =>
    ipcRenderer.invoke('guppy-start-wifi-ap', profile),
  guppyLookupMacVendors: (bssids: string[]) => ipcRenderer.invoke('guppy-lookup-mac-vendors', bssids),
  guppyReadJammerGuide: () => ipcRenderer.invoke('guppy-read-wifijammer-guide'),
  guppyReadJammerMaclist: () => ipcRenderer.invoke('guppy-read-wifijammer-maclist'),
  guppyStartWifiJammer: (payload: WifiJammerPayload) => ipcRenderer.invoke('guppy-start-wifi-jammer', payload),
  guppyStopWifiJammer: () => ipcRenderer.invoke('guppy-stop-wifi-jammer'),
  guppyGetWifiJammerStatus: () => ipcRenderer.invoke('guppy-get-wifi-jammer-status'),
  onGuppyStatus: (callback: (status: GuppyStatus) => void) => {
    const listener = (_event: unknown, status: GuppyStatus) => callback(status)
    ipcRenderer.on('guppy-status', listener)
    return () => ipcRenderer.removeListener('guppy-status', listener)
  },
  onGuppyLine: (callback: (line: string) => void) => {
    const listener = (_event: unknown, line: string) => callback(line)
    ipcRenderer.on('guppy-line', listener)
    return () => ipcRenderer.removeListener('guppy-line', listener)
  },
  onWifiJammerState: (callback: (state: WifiJammerState) => void) => {
    const listener = (_event: unknown, state: WifiJammerState) => callback(state)
    ipcRenderer.on('wifi-jammer-state', listener)
    return () => ipcRenderer.removeListener('wifi-jammer-state', listener)
  },
  onWifiJammerLog: (callback: (line: string) => void) => {
    const listener = (_event: unknown, line: string) => callback(line)
    ipcRenderer.on('wifi-jammer-log', listener)
    return () => ipcRenderer.removeListener('wifi-jammer-log', listener)
  },
  onGameExit: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('game-exited', listener)
    return () => ipcRenderer.removeListener('game-exited', listener)
  }
})

console.log('Preload script loaded')
