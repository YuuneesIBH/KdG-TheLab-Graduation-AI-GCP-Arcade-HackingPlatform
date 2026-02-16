import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './hacker-terminal.css'

const BOOT_SEQUENCE = [
  '> FLIPPER ZERO TERMINAL v2.4.1',
  '> Initializing RF subsystems...',
  '> Loading BadUSB payloads... [OK]',
  '> Infrared library loaded... [OK]',
  '> Sub-GHz radio activated... [OK]',
  '> GPIO pins initialized... [OK]',
  '> NFC/RFID reader online... [OK]',
  '> Bluetooth stack ready... [OK]',
  '> === SYSTEM READY ===',
]

const COMMANDS: Record<string, string[]> = {
  help: [
    '  scan        - Scan RF frequencies',
    '  nfc         - Read/emulate NFC tags',
    '  subghz      - Sub-GHz signal capture',
    '  badusb      - Execute BadUSB payload',
    '  ir          - Infrared blaster',
    '  gpio        - GPIO control panel',
    '  bt          - Bluetooth scanner',
    '  clear       - Clear terminal',
  ],
  scan: [
    '> Scanning RF spectrum 300MHz - 928MHz...',
    '> [████████░░░░░░░░] 52%',
    '> Signal detected: 433.920 MHz [-67 dBm]',
    '> Protocol: OOK/ASK  Modulation: AM270',
    '> Device: Garage door remote (HCS301)',
    '> [████████████████] 100%',
    '> Scan complete. 1 signal captured.',
  ],
  nfc: [
    '> Activating NFC reader...',
    '> Searching for tags...',
    '> TAG DETECTED: ISO 14443-3A',
    '> UID: 04:A3:F2:1B:9C:44:80',
    '> ATQA: 0x0400  SAK: 0x08',
    '> Type: MIFARE Classic 1K',
    '> Reading sectors... [OK]',
    '> Dump saved: nfc_dump_1337.nfc',
  ],
  subghz: [
    '> Sub-GHz frequency hopping enabled',
    '> Monitoring 315 / 433 / 868 / 915 MHz',
    '> [RX] 433.92 MHz  RSSI: -71 dBm',
    '> [RX] 433.92 MHz  RSSI: -68 dBm',
    '> Signal decoded: RAW_Data',
    '> Saving raw capture... [OK]',
    '> File: subghz_raw_capture.sub',
  ],
  badusb: [
    '> Loading BadUSB payload...',
    '> Payload: reverse_shell.txt',
    '> Emulating HID keyboard device...',
    '> [WARN] Target: Windows x64',
    '> Executing payload in 3...',
    '> Executing payload in 2...',
    '> Executing payload in 1...',
    '> ██ PAYLOAD DELIVERED ██',
    '> Shell established on 192.168.1.42:4444',
  ],
  ir: [
    '> Infrared blaster activated',
    '> Scanning for IR signals...',
    '> TV remote detected: Samsung BN59-01315J',
    '> Library match found!',
    '> Commands available: power, vol+, vol-, mute',
    '> Type: ir send [command]',
  ],
  bt: [
    '> Bluetooth scanner active...',
    '> Scanning for devices...',
    '> [FOUND] Galaxy S24      DC:A6:32:44:1F:BB  -52 dBm',
    '> [FOUND] AirPods Pro     E0:2B:E9:4A:11:CC  -61 dBm',
    '> [FOUND] Tesla Model 3   C4:47:2F:08:77:AA  -74 dBm',
    '> [FOUND] iPhone 15 Pro   7C:04:D0:FF:3E:90  -55 dBm',
    '> 4 devices found.',
  ],
  gpio: [
    '> GPIO Control Panel',
    '> PIN 1 [PA7]  : OUTPUT  HIGH  ████',
    '> PIN 2 [PA6]  : INPUT   LOW   ░░░░',
    '> PIN 3 [PB3]  : OUTPUT  HIGH  ████',
    '> PIN 4 [PB2]  : INPUT   HIGH  ████',
    '> PIN 5 [PC3]  : 3.3V   [POWER]',
    '> PIN 6 [GND]  : GROUND [POWER]',
  ],
}

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cols = Math.floor(canvas.width / 14)
    const drops = Array(cols).fill(1)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF></?!@#$%^&*'

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00ff41'
      ctx.font = '12px monospace'

      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = i % 5 === 0 ? '#ffffff' : '#00ff41'
        ctx.fillText(char, i * 14, y * 14)
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }

    const interval = setInterval(draw, 50)
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { clearInterval(interval); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="matrix-canvas" />
}

function HackerTerminal() {
  const [lines, setLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [booted, setBooted] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let i = 0
    const boot = () => {
      if (i < BOOT_SEQUENCE.length) {
        setLines(prev => [...prev, BOOT_SEQUENCE[i]])
        i++
        setTimeout(boot, 180)
      } else {
        setBooted(true)
        setLines(prev => [...prev, '', '> Type "help" for available commands', ''])
      }
    }
    setTimeout(boot, 500)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 150)
    }, 4000)
    return () => clearInterval(glitchInterval)
  }, [])

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    setLines(prev => [...prev, `┌──(flipper㉿zero)-[~]`, `└─$ ${cmd}`, ''])

    if (trimmed === 'clear') {
      setTimeout(() => setLines([]), 100)
      return
    }

    const output = COMMANDS[trimmed]
    if (output) {
      let i = 0
      const printLine = () => {
        if (i < output.length) {
          setLines(prev => [...prev, output[i]])
          i++
          setTimeout(printLine, 80)
        } else {
          setLines(prev => [...prev, ''])
        }
      }
      printLine()
    } else if (trimmed) {
      setLines(prev => [...prev, `> Command not found: ${trimmed}`, '> Type "help" for commands', ''])
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input)
      setInput('')
    }
  }

  return (
    <div className={`terminal-wrapper ${glitch ? 'glitch' : ''}`}>
      <MatrixRain />
      <div className="scanlines" />
      <div className="terminal-container">
        <div className="terminal-header">
          <div className="header-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="header-title">FLIPPER ZERO // HACK TERMINAL</span>
          <span className="header-status">◉ ONLINE</span>
        </div>
        <div className="terminal-body">
          <div className="terminal-output">
            {lines.map((line, i) => (
              <div key={i} className={`line ${line.includes('[OK]') ? 'ok' : line.includes('[WARN]') ? 'warn' : line.includes('PAYLOAD') || line.includes('===') ? 'highlight' : ''}`}>
                {line}
              </div>
            ))}
            {booted && (
              <div className="input-line">
                <span className="prompt">┌──(flipper㉿zero)-[~]<br />└─$ </span>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="terminal-input"
                  spellCheck={false}
                />
                <span className="cursor">█</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('hacker-root')!).render(<HackerTerminal />)