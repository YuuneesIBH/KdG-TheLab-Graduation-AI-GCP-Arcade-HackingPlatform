import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-flipper/src/main.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-flipper/src/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'arcade-flipper/src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-flipper/src/index.html')
      }
    },
    plugins: [react()]
  }
})
