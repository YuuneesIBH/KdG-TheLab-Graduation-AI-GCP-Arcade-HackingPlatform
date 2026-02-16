import React, { useEffect, useState } from 'react'

const MENU_ITEMS = [
  { key: 'scan',     label: '[ RF SCANNER ]',    icon: '📡' },
  { key: 'nfc',      label: '[ NFC / RFID ]',     icon: '🔷' },
  { key: 'subghz',   label: '[ SUB-GHZ ]',        icon: '📻' },
  { key: 'badusb',   label: '[ BAD USB ]',         icon: '💀' },
  { key: 'ir',       label: '[ INFRARED ]',        icon: '🔴' },
  { key: 'bt',       label: '[ BLUETOOTH ]',       icon: '🦷' },
  { key: 'gpio',     label: '[ GPIO CONTROL ]',    icon: '⚡' },
  { key: 'terminal', label: '[ OPEN TERMINAL ]',   icon: '🖥️' },
]

export default function Menu() {
  const [selected, setSelected] = useState(0)

  // Globale keydown — werkt altijd, ook zonder focus op div
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setSelected(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length)
      }
      if (e.key === 'ArrowDown') {
        setSelected(prev => (prev + 1) % MENU_ITEMS.length)
      }
      if (e.key === 'Enter') {
        console.log('Selected:', MENU_ITEMS[selected].key)
        // TODO: navigeer naar module
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selected])

  return (
    <div className="menu-wrapper">
      <div className="scanlines" />
      <div className="terminal-container" style={{ width: '100vw', height: '100vh', borderRadius: 0, border: 'none' }}>
        <div className="terminal-header">
          <div className="header-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="header-title">FLIPPER ZERO // SELECT MODULE</span>
          <span className="header-status">◉ READY</span>
        </div>
        <div className="terminal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <pre className="menu-ascii">{`
  ███████╗██╗     ██╗██████╗ ██████╗ ███████╗██████╗
  ██╔════╝██║     ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗
  █████╗  ██║     ██║██████╔╝██████╔╝█████╗  ██████╔╝
  ██╔══╝  ██║     ██║██╔═══╝ ██╔═══╝ ██╔══╝  ██╔══██╗
  ██║     ███████╗██║██║     ██║     ███████╗██║  ██║
  ╚═╝     ╚══════╝╚═╝╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═╝`}
          </pre>
          <div className="menu-subtitle">↑ ↓ to navigate  |  ENTER to select</div>
          <div className="menu-list">
            {MENU_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className={`menu-item ${i === selected ? 'active' : ''}`}
                onClick={() => setSelected(i)}
              >
                <span className="menu-arrow">{i === selected ? '▶' : ' '}</span>
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                {i === selected && <span className="menu-cursor">_</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}