const { spawn } = require('child_process')
const path = require('path')

const validModes = new Set(['dev', 'build', 'preview'])

function fail(message) {
  console.error(`[electron-vite] ${message}`)
  process.exit(1)
}

function resolveMode(argv) {
  const mode = argv[2]
  if (!mode || !validModes.has(mode)) {
    fail('Missing or invalid mode. Usage: node scripts/run-electron-vite.js <dev|build|preview>')
  }
  return mode
}

function resolveElectronViteBin() {
  const electronVitePkg = require.resolve('electron-vite/package.json')
  return path.join(path.dirname(electronVitePkg), 'bin', 'electron-vite.js')
}

function exitFromChild(code, signal) {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
}

const mode = resolveMode(process.argv)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [resolveElectronViteBin(), mode], {
  stdio: 'inherit',
  env
})

child.on('error', (error) => {
  fail(error instanceof Error ? error.message : String(error))
})

child.on('exit', exitFromChild)
