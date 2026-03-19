const fs = require('fs')
const path = require('path')

function fail(message) {
  console.error(`[pong-ai-log] ${message}`)
  process.exit(1)
}

function short(value, limit = 180) {
  if (typeof value !== 'string') return ''
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}...`
}

function formatNumber(value, digits = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '?'
}

function formatTime(tsMs) {
  const date = new Date(typeof tsMs === 'number' ? tsMs : Date.now())
  return date.toLocaleTimeString('en-GB', { hour12: false })
}

function formatRecord(record) {
  const prefix = `[${formatTime(record.ts_ms)}] ${String(record.event || 'event').padEnd(17)}`

  switch (record.event) {
    case 'session_start':
      return `${prefix} mode=${record.ai_mode ?? '?'} model=${record.model ?? '?'} endpoint=${record.endpoint ?? 'local'}`
    case 'brain_init':
      return `${prefix} remote=${record.remote_enabled ? 'yes' : 'no'} mode=${record.mode ?? '?'} timeout=${record.timeout_ms ?? '?'}ms`
    case 'request_scheduled': {
      const ball = record.snapshot?.ball ?? {}
      return `${prefix} #${record.request_id ?? '?'} urgent=${record.urgent ? 'yes' : 'no'} ball=(${formatNumber(ball.x)},${formatNumber(ball.y)}) vel=(${formatNumber(ball.vx)},${formatNumber(ball.vy)})`
    }
    case 'remote_decision':
      return `${prefix} #${record.request_id ?? '?'} ${record.latency_ms ?? '?'}ms move=${record.parsed_decision?.move ?? '?'} aim=${formatNumber(record.parsed_decision?.aim)} raw=${short(record.raw_response || '', 120)}`
    case 'decision_applied':
      return `${prefix} #${record.request_id ?? '?'} source=${record.source ?? '?'} move=${record.move ?? '?'} aim=${formatNumber(record.aim)} final=${formatNumber(record.final_target, 1)}`
    case 'control_source':
      return `${prefix} source=${record.source ?? '?'}${record.last_error ? ` error=${short(record.last_error, 140)}` : ''}`
    case 'remote_error':
      return `${prefix} #${record.request_id ?? '?'} ${record.latency_ms ?? '?'}ms error=${short(record.error || '', 180)}`
    case 'session_end':
      return `${prefix} score=${record.score?.player ?? 0}-${record.score?.opponent ?? 0}`
    case 'brain_shutdown':
      return `${prefix} mode=${record.mode ?? '?'} remote=${record.remote_enabled ? 'yes' : 'no'}`
    default:
      return `${prefix} ${short(JSON.stringify(record), 220)}`
  }
}

function processLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return

  try {
    const record = JSON.parse(trimmed)
    console.log(formatRecord(record))
  } catch {
    console.log(trimmed)
  }
}

function readRecentTail(logPath, bytes = 8192) {
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
    lines.filter(Boolean).slice(-12).forEach(processLine)
    return stats.size
  } catch {
    return 0
  }
}

const inputPath = process.argv[2]
if (!inputPath) fail('Usage: show-pong-ai-log.js <log-path>')

const logPath = path.resolve(inputPath)
let offset = 0
let leftover = ''
let waitingLogged = false
let polling = false

console.log('PONG AI TRACE')
console.log(`Watching: ${logPath}`)
console.log('Press Ctrl+C to close.')
console.log('')

offset = readRecentTail(logPath)

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

      console.error(`[pong-ai-log] ${statError.message}`)
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
      console.error(`[pong-ai-log] ${error.message}`)
    })

    stream.on('end', () => {
      offset = stats.size
      const text = leftover + chunkBuffer
      const lines = text.split(/\r?\n/)
      leftover = lines.pop() || ''
      lines.forEach(processLine)
      polling = false
    })
  })
}

setInterval(pollLog, 250)
pollLog()
