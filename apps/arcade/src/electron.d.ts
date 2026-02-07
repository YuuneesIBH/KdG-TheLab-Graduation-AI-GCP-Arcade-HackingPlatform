// Type definitions for Electron IPC exposed in window object

export interface ElectronAPI {
  launchGame: (gamePath: string) => Promise<{success: boolean, message: string}>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}