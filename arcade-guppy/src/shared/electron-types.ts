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

export type IpcSuccessResponse = {
  success: boolean
}

export type IpcMessageResponse = {
  success: boolean
  message: string
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

export type WifiJammerMode = 'firmware' | 'host'

export type WifiJammerPayload = {
  iface?: string
  mode?: 'auto' | WifiJammerMode
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
  mode?: WifiJammerMode
  iface?: string
  message?: string
}

export type WindowsUsbInsertEvent = {
  drives: string[]
  source: 'devicechange' | 'poll' | 'watcher'
  detectedAt: number
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
