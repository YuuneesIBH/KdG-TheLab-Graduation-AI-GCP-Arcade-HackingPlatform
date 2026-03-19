const fs = require('fs')
const path = require('path')

function fail(message) {
  console.error(`[tail-log] ${message}`)
  process.exit(1)
}

function readRecentTail(logPath, bytes = 12000) {
  try {
    const stats = fs.statSync(logPath)
    if (stats.size <= 0) return stats.size

    const start = Math.max(0, stats.size - bytes)
    const length = stats.size - start
    const handle = fs.openSync(logPath, 'r')
    const buffer = Buffer.alloc(length)
    fs.readSync(handle, buffer, 0, length, start)
    fs.closeSync(handle)

    const text = buffer.toString('utf8')
    const lines = text.split(/\r?\n/)
    if (start > 0) lines.shift()
    lines.filter(Boolean).slice(-40).forEach((line) => console.log(line))
    return stats.size
  } catch {
    return 0
  }
}

const inputPath = process.argv[2]
if (!inputPath) fail('Usage: tail-log-file.js <log-path>')

const logPath = path.resolve(inputPath)
let offset = 0
let leftover = ''
let waitingLogged = false
let polling = false

console.log(`Watching log: ${logPath}`)
console.log('Press Ctrl+C to close.')
console.log('')

offset = readRecentTail(logPath)

function flushText(text) {
  if (!text) return
  const normalized = leftover + text
  const lines = normalized.split(/\r?\n/)
  leftover = lines.pop() || ''
  lines.forEach((line) => {
    if (line.length > 0) console.log(line)
  })
}

function pollLog() {
  if (polling) return
  polling = true

  fs.stat(logPath, (statError, stats) => {
    if (statError) {
      polling = false
      if (statError.code === 'ENOENT') {
        if (!waitingLogged) {
          console.log('[waiting] log file not created yet')
          waitingLogged = true
        }
        return
      }

      console.error(`[tail-log] ${statError.message}`)
      return
    }

    waitingLogged = false

    if (stats.size < offset) {
      offset = 0
      leftover = ''
      console.log('[info] log file was truncated, restarting tail')
    }

    if (stats.size === offset) {
      polling = false
      return
    }

    const stream = fs.createReadStream(logPath, {
      encoding: 'utf8',
      start: offset,
      end: stats.size - 1,
    })

    let chunkBuffer = ''

    stream.on('data', (chunk) => {
      chunkBuffer += chunk
    })

    stream.on('error', (error) => {
      polling = false
      console.error(`[tail-log] ${error.message}`)
    })

    stream.on('end', () => {
      offset = stats.size
      flushText(chunkBuffer)
      polling = false
    })
  })
}

setInterval(pollLog, 250)
pollLog()
