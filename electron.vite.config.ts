import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-guppy/src/main.ts'),
        external: ['serialport']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-guppy/src/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'arcade-guppy/src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'arcade-guppy/src/index.html')
      }
    },
    plugins: [react()]
  }
})

