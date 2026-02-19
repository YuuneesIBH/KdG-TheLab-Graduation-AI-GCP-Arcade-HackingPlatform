const { spawn } = require('child_process')
const path = require('path')

const mode = process.argv[2]
if (!mode) {
  console.error('Missing mode. Usage: node scripts/run-electron-vite.js <dev|build|preview>')
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const electronVitePkg = require.resolve('electron-vite/package.json')
const electronViteBin = path.join(path.dirname(electronVitePkg), 'bin', 'electron-vite.js')
const child = spawn(process.execPath, [electronViteBin, mode], {
  stdio: 'inherit',
  env
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
