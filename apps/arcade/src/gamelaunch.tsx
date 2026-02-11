import React from 'react'
import { games } from './menu'

type GameLaunchProps = {
  gameId: string
  onBack: () => void
  onOpenDisplay: (gameId: string) => void
}

function formatTitle(gameId: string) {
  return gameId.replace(/-/g, ' ').toUpperCase()
}

export function GameLaunch({ gameId, onBack, onOpenDisplay }: GameLaunchProps) {
  const [isOpening, setIsOpening] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')

  const game = games.find((entry) => entry.id === gameId)
  const title = game ? game.title : formatTitle(gameId)

  const openDisplay = React.useCallback(() => {
    if (!game) {
      setErrorMessage('Game not found.')
      return
    }

    setIsOpening(true)
    setErrorMessage('')
    setTimeout(() => onOpenDisplay(game.id), 120)
  }, [game, onOpenDisplay])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack()
      }
      if (event.key === 'Enter' && !isOpening) {
        event.preventDefault()
        openDisplay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpening, onBack, openDisplay])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #052544 0%, #03111f 55%, #000000 100%)',
        display: 'grid',
        placeItems: 'center',
        color: '#e6f8ff',
        fontFamily: '"Courier New", "Press Start 2P", monospace',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: 'min(840px, 96vw)',
          border: '3px solid #00b7ff',
          background: 'rgba(0, 8, 16, 0.88)',
          boxShadow: '0 0 35px rgba(0,183,255,0.28)',
          padding: '28px',
          display: 'grid',
          gap: '18px'
        }}
      >
        <div style={{ fontSize: '13px', color: '#87dfff', letterSpacing: '2px' }}>
          PREPARE GAME DISPLAY
        </div>
        <div
          style={{
            fontSize: '34px',
            lineHeight: 1.1,
            letterSpacing: '3px',
            textShadow: '0 0 18px rgba(0,187,255,0.72)'
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: '12px', color: '#9fd8f3', letterSpacing: '1px' }}>
          {game ? game.executable : 'Executable not configured'}
        </div>

        {errorMessage && (
          <div
            style={{
              border: '2px solid #ff5a5a',
              background: 'rgba(60, 0, 0, 0.45)',
              color: '#ffd0d0',
              padding: '10px 12px',
              fontSize: '12px'
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onBack}
            disabled={isOpening}
            style={{
              background: '#1b1b1b',
              color: '#ffffff',
              border: '1px solid #7a7a7a',
              padding: '11px 16px',
              cursor: isOpening ? 'default' : 'pointer',
              fontSize: '12px',
              letterSpacing: '1px',
              opacity: isOpening ? 0.65 : 1
            }}
          >
            BACK
          </button>
          <button
            type="button"
            onClick={openDisplay}
            disabled={isOpening}
            style={{
              background: isOpening ? '#086b4f' : '#00b56d',
              color: '#00161e',
              border: '1px solid #00ff99',
              padding: '11px 16px',
              cursor: isOpening ? 'default' : 'pointer',
              fontSize: '12px',
              letterSpacing: '1px',
              fontWeight: 'bold'
            }}
          >
            {isOpening ? 'OPENING DISPLAY...' : 'OPEN FULLSCREEN DISPLAY'}
          </button>
        </div>

        <div style={{ fontSize: '11px', color: '#8bb8cc' }}>
          Enter = launch, Esc = back
        </div>
      </div>
    </div>
  )
}
