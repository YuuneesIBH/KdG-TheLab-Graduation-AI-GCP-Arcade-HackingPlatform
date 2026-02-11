import React from 'react'
import { games } from './menu'

type GameDisplayProps = {
  gameId: string
  onExit: () => void
}

function formatTitle(gameId: string) {
  return gameId.replace(/-/g, ' ').toUpperCase()
}

export function GameDisplay({ gameId, onExit }: GameDisplayProps) {
  const [isLaunching, setIsLaunching] = React.useState(true)
  const [isRunning, setIsRunning] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const viewportRef = React.useRef<HTMLDivElement | null>(null)

  const game = games.find((g) => g.id === gameId)
  const title = game ? game.title : formatTitle(gameId)

  const waitForLayoutCommit = React.useCallback(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      }),
    []
  )

  const getViewport = React.useCallback(() => {
    if (!viewportRef.current) {
      return undefined
    }

    const rect = viewportRef.current.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }, [])

  const launchEmbeddedGame = React.useCallback(async () => {
    if (!game) {
      setErrorMessage('Game not found')
      setIsLaunching(false)
      return
    }

    if (!window.electron?.launchGame) {
      setErrorMessage('Electron API not available')
      setIsLaunching(false)
      return
    }

    setIsLaunching(true)
    setErrorMessage('')
    await waitForLayoutCommit()

    try {
      const viewport = getViewport()
      const result = await window.electron.launchGame({
        gamePath: game.executable,
        mode: viewport ? 'embedded' : 'external',
        viewport
      })

      if (result.success) {
        setIsRunning(true)
        setIsLaunching(false)
        return
      }

      setErrorMessage(result.message)
      setIsRunning(false)
      setIsLaunching(false)
    } catch (error) {
      setErrorMessage(`Error: ${error}`)
      setIsRunning(false)
      setIsLaunching(false)
    }
  }, [game, getViewport, waitForLayoutCommit])

  React.useEffect(() => {
    window.electron?.setFullscreen?.(true)
    launchEmbeddedGame()
  }, [launchEmbeddedGame])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  React.useEffect(() => {
    const cleanup = window.electron?.onGameExit?.(() => {
      setIsRunning(false)
      setIsLaunching(false)
      onExit()
    })

    return () => cleanup?.()
  }, [onExit])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Courier New", "Press Start 2P", monospace'
      }}
    >
      <div
        ref={viewportRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000000'
        }}
      />

      {!errorMessage && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 16,
              pointerEvents: 'none',
              color: '#8fdfff',
              fontSize: '11px',
              letterSpacing: '1px',
              textShadow: '0 0 8px rgba(0,170,255,0.65)'
            }}
          >
            {isLaunching
              ? `LAUNCHING ${title}...`
              : isRunning
                ? 'FULLSCREEN ACTIVE • PRESS ESC TO EXIT'
                : 'DISPLAY READY'}
          </div>
          <button
            type="button"
            onClick={onExit}
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              background: 'rgba(180, 0, 0, 0.72)',
              color: '#ffffff',
              border: '1px solid rgba(255,130,130,0.9)',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              letterSpacing: '1px'
            }}
          >
            EXIT
          </button>
        </>
      )}

      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0, 0, 0, 0.72)',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: 'min(700px, 92vw)',
              border: '2px solid #ff4d4d',
              background: '#120000',
              padding: '20px',
              display: 'grid',
              gap: '14px',
              color: '#ffd0d0'
            }}
          >
            <div style={{ color: '#ff7a7a', fontSize: '16px', letterSpacing: '2px' }}>
              LAUNCH FAILED
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.4 }}>{errorMessage}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={launchEmbeddedGame}
                style={{
                  background: '#00a65a',
                  color: '#ffffff',
                  border: '1px solid #00ff99',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  letterSpacing: '1px'
                }}
              >
                RETRY
              </button>
              <button
                type="button"
                onClick={onExit}
                style={{
                  background: '#1d1d1d',
                  color: '#ffffff',
                  border: '1px solid #6e6e6e',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  letterSpacing: '1px'
                }}
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
