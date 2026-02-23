import React from 'react'

type MenuProps = {
  particles: Array<{x: number, y: number, vx: number, vy: number, color: string, id: number}>
  onSelectGame?: (gameId: string) => void
}

type GameCard = {
  id: string
  title: string
  genre: string
  badge: string
  tagline: string
  image: string
  accent: string
  glow: string
  executable: string
}

const games: GameCard[] = [
  {
    id: 'space-invader',
    title: 'SPACE INVADER',
    genre: 'SHOOTER',
    badge: 'CLASSIC',
    tagline: 'Defend Earth from the alien invasion!',
    image: '../assets/spaceinvaders.png',
    accent: '#00ff00',
    glow: '#00ff00',
    executable: 'games/spaceinvaders.py'
  },
  {
    id: 'flappy-bird',
    title: 'FLAPPY BIRD',
    genre: 'ARCADE',
    badge: 'RETRO',
    tagline: 'Tap to flap and dodge the pipes!',
    image: '../assets/retrobird.png',
    accent: '#ffaa00',
    glow: '#ffaa00',
    executable: 'games/RetroBird/main.py'
  },
  {
    id: 'car-racing-extreme',
    title: 'CAR RACING EXTREME',
    genre: 'RACING',
    badge: 'NEW',
    tagline: 'Feel the adrenaline in this high-speed racing game!',
    image: '../assets/extremeracing.png',
    accent: '#ff0000',
    glow: '#ff0000',
    executable: 'games/CarRacingUltraMaxExtremeLevel1000/main.py'
  },
  {
    id: 'BlockStorm',
    title: 'BLOCK STORM',
    genre: 'PUZZLE',
    badge: 'CLASSIC',
    tagline: 'Arrange falling blocks to clear lines.',
    image: '../assets/blockstorm.png',
    accent: '#ffff00',
    glow: '#ffff00',
    executable: 'games/BlockStorm/main.py'
  },
  {
    id: 'AngryWalls',
    title: 'ANGRY WALLS',
    genre: 'RPG',
    badge: 'EPIC',
    tagline: 'Explore dungeons and hunt legendary loot.',
    image: '../assets/angrywalls.png',
    accent: '#ff00ff',
    glow: '#ff00ff',
    executable: 'games/AngryWalls/main.py'
  },
  {
    id: 'PONG',
    title: 'PONG',
    genre: 'ARCADE',
    badge: 'CLASSIC',
    tagline: 'Classic pong game.',
    image: '../assets/pong.png',
    accent: '#ffff00',
    glow: '#ffff00',
    executable: 'games/pong.py'
  }
]

// Export games array so other components can access it
export { games }

function wrapIndex(index: number, length: number) {
  return (index + length) % length
}

function getRelativeOffset(index: number, activeIndex: number, length: number) {
  let delta = index - activeIndex
  if (delta > length / 2) delta -= length
  if (delta < -length / 2) delta += length
  return delta
}

export function MenuScreen({ particles, onSelectGame }: MenuProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [crtFlicker, setCrtFlicker] = React.useState(false)
  const [scanlineOffset, setScanlineOffset] = React.useState(0)
  const [pixelShift, setPixelShift] = React.useState(0)
  const [glitchLine, setGlitchLine] = React.useState(-1)
  const [scrollText, setScrollText] = React.useState(0)
  const [coinBlink, setCoinBlink] = React.useState(false)
  const [warships, setWarships] = React.useState<Array<{id: number, x: number, y: number, speedX: number, speedY: number, rotation: number}>>([])
  const [asteroids, setAsteroids] = React.useState<Array<{id: number, x: number, y: number, speed: number, size: number}>>([])
  const [laserBeams, setLaserBeams] = React.useState<Array<{id: number, x: number, y: number}>>([])
  const [fallingStars, setFallingStars] = React.useState<Array<{id: number, x: number, y: number, speed: number, length: number}>>([])
  const [earthRotation, setEarthRotation] = React.useState(0)
  const [satellites, setSatellites] = React.useState<Array<{id: number, x: number, y: number, angle: number}>>([])
  const [ufos, setUfos] = React.useState<Array<{id: number, x: number, y: number, speedX: number, wobble: number}>>([])
  const [comets, setComets] = React.useState<Array<{id: number, x: number, y: number, speed: number}>>([])
  const [powerUps, setPowerUps] = React.useState<Array<{id: number, x: number, y: number, type: string, color: string}>>([])
  const [explosions, setExplosions] = React.useState<Array<{id: number, x: number, y: number}>>([])
  const [confetti, setConfetti] = React.useState<Array<{id: number, x: number, y: number, vx: number, vy: number, color: string, rotation: number}>>([])

  const activeGame = games[activeIndex]

  const goTo = React.useCallback((nextIndex: number) => {
    setActiveIndex(wrapIndex(nextIndex, games.length))
  }, [])

  const goPrev = React.useCallback(() => {
    setActiveIndex(prev => wrapIndex(prev - 1, games.length))
  }, [])

  const goNext = React.useCallback(() => {
    setActiveIndex(prev => wrapIndex(prev + 1, games.length))
  }, [])

  const startSelected = React.useCallback(() => {
    onSelectGame?.(games[activeIndex].id)
  }, [activeIndex, onSelectGame])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); goPrev() }
      if (event.key === 'ArrowRight') { event.preventDefault(); goNext() }
      if (event.key === 'Enter') { event.preventDefault(); startSelected() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, startSelected])

  React.useEffect(() => {
    const flickerInterval = setInterval(() => {
      if (Math.random() < 0.03) { setCrtFlicker(true); setTimeout(() => setCrtFlicker(false), 60) }
    }, 100)
    return () => clearInterval(flickerInterval)
  }, [])

  React.useEffect(() => {
    const scanlineInterval = setInterval(() => setScanlineOffset(prev => (prev + 1) % 4), 50)
    return () => clearInterval(scanlineInterval)
  }, [])

  React.useEffect(() => {
    const shiftInterval = setInterval(() => {
      if (Math.random() < 0.05) {
        setPixelShift(Math.random() < 0.5 ? 2 : -2)
        setTimeout(() => setPixelShift(0), 50)
      }
    }, 200)
    return () => clearInterval(shiftInterval)
  }, [])

  React.useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        setGlitchLine(Math.floor(Math.random() * 20))
        setTimeout(() => setGlitchLine(-1), 100)
      }
    }, 300)
    return () => clearInterval(glitchInterval)
  }, [])

  React.useEffect(() => {
    const scrollInterval = setInterval(() => setScrollText(prev => prev + 0.5), 30)
    return () => clearInterval(scrollInterval)
  }, [])

  React.useEffect(() => {
    const coinBlinkInterval = setInterval(() => setCoinBlink(prev => !prev), 250)
    return () => clearInterval(coinBlinkInterval)
  }, [])

  React.useEffect(() => {
    const spawnWarship = () => {
      const side = Math.floor(Math.random() * 3)
      let startX = 0, startY = 0, speedX = 0, speedY = 0
      if (side === 0) { startX = -400; startY = Math.random() * window.innerHeight * 0.6; speedX = Math.random() * 8 + 6; speedY = (Math.random() - 0.5) * 3 }
      else if (side === 1) { startX = window.innerWidth + 400; startY = Math.random() * window.innerHeight * 0.6; speedX = -(Math.random() * 8 + 6); speedY = (Math.random() - 0.5) * 3 }
      else { startX = Math.random() * window.innerWidth; startY = -200; speedX = (Math.random() - 0.5) * 6; speedY = Math.random() * 5 + 4 }
      setWarships(prev => [...prev, { id: Math.random(), x: startX, y: startY, speedX, speedY, rotation: Math.atan2(speedY, speedX) * (180 / Math.PI) }])
    }
    const spawnInterval = setInterval(() => { if (Math.random() < 0.4) spawnWarship() }, 8000)
    const moveInterval = setInterval(() => {
      setWarships(prev => prev.map(ship => ({ ...ship, x: ship.x + ship.speedX, y: ship.y + ship.speedY })).filter(ship => ship.x > -500 && ship.x < window.innerWidth + 500 && ship.y > -300 && ship.y < window.innerHeight + 300))
    }, 30)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const spawnStar = () => setFallingStars(prev => [...prev, { id: Math.random(), x: Math.random() * window.innerWidth, y: -10, speed: Math.random() * 6 + 8, length: Math.random() * 80 + 40 }])
    const spawnInterval = setInterval(() => { if (Math.random() < 0.5) spawnStar() }, 2000)
    const moveInterval = setInterval(() => setFallingStars(prev => prev.map(star => ({ ...star, y: star.y + star.speed, x: star.x + star.speed * 0.3 })).filter(star => star.y < window.innerHeight + 100)), 30)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const rotateInterval = setInterval(() => setEarthRotation(prev => (prev + 0.5) % 360), 100)
    return () => clearInterval(rotateInterval)
  }, [])

  React.useEffect(() => {
    setSatellites([{ id: 1, x: 0, y: 0, angle: 0 }, { id: 2, x: 0, y: 0, angle: 120 }, { id: 3, x: 0, y: 0, angle: 240 }])
    const orbitInterval = setInterval(() => setSatellites(prev => prev.map(sat => ({ ...sat, angle: (sat.angle + 1) % 360 }))), 50)
    return () => clearInterval(orbitInterval)
  }, [])

  React.useEffect(() => {
    const spawnInterval = setInterval(() => { if (Math.random() < 0.3) setUfos(prev => [...prev, { id: Math.random(), x: -150, y: Math.random() * window.innerHeight * 0.4 + 50, speedX: Math.random() * 4 + 3, wobble: 0 }]) }, 7000)
    const moveInterval = setInterval(() => setUfos(prev => prev.map(ufo => ({ ...ufo, x: ufo.x + ufo.speedX, wobble: ufo.wobble + 0.2 })).filter(ufo => ufo.x < window.innerWidth + 200)), 30)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const spawnInterval = setInterval(() => { if (Math.random() < 0.2) setComets(prev => [...prev, { id: Math.random(), x: Math.random() * window.innerWidth, y: -50, speed: Math.random() * 10 + 12 }]) }, 5000)
    const moveInterval = setInterval(() => setComets(prev => prev.map(comet => ({ ...comet, y: comet.y + comet.speed, x: comet.x + comet.speed * 0.5 })).filter(comet => comet.y < window.innerHeight + 100)), 30)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const types = [{ type: 'SPEED', color: '#ffff00' }, { type: 'POWER', color: '#ff00ff' }, { type: 'SHIELD', color: '#00ffff' }, { type: 'STAR', color: '#00ff00' }]
    const spawnInterval = setInterval(() => { if (Math.random() < 0.4) { const t = types[Math.floor(Math.random() * types.length)]; setPowerUps(prev => [...prev, { id: Math.random(), x: Math.random() * window.innerWidth, y: -30, ...t }]) } }, 4000)
    const moveInterval = setInterval(() => setPowerUps(prev => prev.map(pu => ({ ...pu, y: pu.y + 2 })).filter(pu => pu.y < window.innerHeight + 50)), 50)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const explosionInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        const newExplosion = { id: Math.random(), x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight * 0.6 }
        setExplosions(prev => [...prev, newExplosion])
        setTimeout(() => setExplosions(prev => prev.filter(exp => exp.id !== newExplosion.id)), 600)
      }
    }, 6000)
    return () => clearInterval(explosionInterval)
  }, [])

  React.useEffect(() => {
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000', '#0088ff']
    const confettiInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        const cx = Math.random() * window.innerWidth, cy = Math.random() * window.innerHeight * 0.5
        setConfetti(prev => [...prev, ...Array.from({ length: 25 }, () => ({ id: Math.random(), x: cx, y: cy, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 5, color: colors[Math.floor(Math.random() * colors.length)], rotation: Math.random() * 360 }))])
      }
    }, 8000)
    const moveInterval = setInterval(() => setConfetti(prev => prev.map(c => ({ ...c, x: c.x + c.vx, y: c.y + c.vy, vy: c.vy + 0.3, rotation: c.rotation + 5 })).filter(c => c.y < window.innerHeight + 50)), 30)
    return () => { clearInterval(confettiInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const spawnInterval = setInterval(() => setAsteroids(prev => [...prev, { id: Math.random(), x: Math.random() * window.innerWidth, y: -50, speed: Math.random() * 2 + 1, size: Math.random() * 20 + 10 }]), 3000)
    const moveInterval = setInterval(() => setAsteroids(prev => prev.map(ast => ({ ...ast, y: ast.y + ast.speed })).filter(ast => ast.y < window.innerHeight + 100)), 50)
    return () => { clearInterval(spawnInterval); clearInterval(moveInterval) }
  }, [])

  React.useEffect(() => {
    const laserInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const newLaser = { id: Math.random(), x: Math.random() * window.innerWidth, y: window.innerHeight }
        setLaserBeams(prev => [...prev, newLaser])
        setTimeout(() => setLaserBeams(prev => prev.filter(l => l.id !== newLaser.id)), 800)
      }
    }, 4000)
    return () => clearInterval(laserInterval)
  }, [])

  return (
    <div style={{
      background: '#000000',
      minHeight: '100vh',
      fontFamily: '"Courier New", monospace',
      position: 'relative',
      overflow: 'hidden',
      filter: crtFlicker ? 'brightness(0.72) contrast(1.4) saturate(1.1)' : 'brightness(1) contrast(1.15)',
      transition: 'filter 0.06s',
      transform: `translateX(${pixelShift}px)`
    }}>

      {/* CRT PHOSPHOR BASE */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 80% at 50% 40%, rgba(0,10,0,0.6) 0%, #000000 100%)', pointerEvents: 'none' }} />

      {/* STARFIELD */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(1px 1px at 12% 18%, #ff6600, transparent),
          radial-gradient(1px 1px at 55% 72%, #ffff00, transparent),
          radial-gradient(1.5px 1.5px at 48% 35%, #ffffff, transparent),
          radial-gradient(1px 1px at 78% 8%, #ff00aa, transparent),
          radial-gradient(1px 1px at 88% 55%, #00ffff, transparent),
          radial-gradient(1px 1px at 22% 85%, #ff6600, transparent),
          radial-gradient(1.5px 1.5px at 38% 62%, #ffffff, transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 150px 150px, 250px 250px, 180px 180px, 220px 220px, 280px 280px',
        backgroundPosition: '0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px',
        animation: 'starfield-drift 120s linear infinite',
        opacity: 0.5, pointerEvents: 'none'
      }} />

      {/* EARTH */}
      <div style={{
        position: 'absolute', right: '-15%', bottom: '-25%', width: '900px', height: '900px', borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #0066cc 0%, #0044aa 25%, #003388 40%, #002266 55%, #001144 70%, #000822 85%, #000000 100%)',
        border: '8px solid #0088ff',
        boxShadow: 'inset -40px -40px 80px rgba(0,0,0,0.7), inset 40px 40px 60px rgba(0,136,255,0.3), 0 0 100px rgba(0,136,255,0.5), 0 0 200px rgba(0,100,200,0.3)',
        opacity: 0.5, transform: `rotate(${earthRotation}deg)`, pointerEvents: 'none', zIndex: 100, imageRendering: 'pixelated'
      }}>
        <div style={{ position: 'absolute', top: '30%', left: '25%', width: '120px', height: '80px', background: '#00aa44', opacity: 0.7, clipPath: 'polygon(20% 0%, 80% 10%, 90% 50%, 70% 90%, 10% 80%, 0% 40%)', filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', top: '45%', left: '55%', width: '90px', height: '100px', background: '#00aa44', opacity: 0.7, clipPath: 'polygon(30% 0%, 100% 20%, 80% 70%, 40% 100%, 0% 60%)', filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', top: '15%', left: '50%', width: '60px', height: '50px', background: '#ffffff', opacity: 0.5, borderRadius: '50%', filter: 'blur(3px)' }} />
      </div>

      {/* FALLING STARS */}
      {fallingStars.map(star => (
        <div key={star.id} style={{ position: 'absolute', left: star.x, top: star.y, width: '3px', height: `${star.length}px`, background: 'linear-gradient(180deg, transparent, #ffffff 20%, #ffaa00 50%, #ff6600 80%, transparent)', boxShadow: '0 0 8px #ffaa00', transform: 'rotate(25deg)', pointerEvents: 'none', zIndex: 600, opacity: 0.9 }} />
      ))}

      {/* SATELLITES */}
      {satellites.map(sat => {
        const radius = 550
        const centerX = window.innerWidth * 0.85 + radius * Math.cos(sat.angle * Math.PI / 180)
        const centerY = window.innerHeight * 0.75 + radius * Math.sin(sat.angle * Math.PI / 180)
        return (
          <div key={sat.id} style={{ position: 'absolute', left: centerX, top: centerY, width: '40px', height: '40px', zIndex: 700, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '14px', top: '14px', width: '12px', height: '12px', background: '#888888', border: '2px solid #00ffff', boxShadow: '0 0 15px #00ffff' }} />
            <div style={{ position: 'absolute', left: '0', top: '16px', width: '10px', height: '8px', background: '#0088ff', border: '1px solid #00aaff' }} />
            <div style={{ position: 'absolute', right: '0', top: '16px', width: '10px', height: '8px', background: '#0088ff', border: '1px solid #00aaff' }} />
            <div style={{ position: 'absolute', left: '18px', top: '6px', width: '2px', height: '8px', background: '#00ffff', boxShadow: '0 0 8px #00ffff' }} />
          </div>
        )
      })}

      {/* UFOS */}
      {ufos.map(ufo => (
        <div key={ufo.id} style={{ position: 'absolute', left: ufo.x, top: ufo.y + Math.sin(ufo.wobble) * 15, width: '80px', height: '50px', zIndex: 750, pointerEvents: 'none', filter: 'drop-shadow(0 0 20px #00ff00)' }}>
          <div style={{ position: 'absolute', left: '15px', top: '0', width: '50px', height: '25px', background: 'linear-gradient(180deg, #00ff00, #008800)', borderRadius: '50% 50% 0 0', border: '3px solid #00ff00', boxShadow: '0 0 20px #00ff00' }} />
          <div style={{ position: 'absolute', left: '0', top: '20px', width: '80px', height: '15px', background: 'linear-gradient(180deg, #00cc00, #006600)', borderRadius: '50%', border: '3px solid #00ff00', boxShadow: '0 0 25px #00ff00' }} />
          <div style={{ position: 'absolute', left: '20px', top: '28px', width: '6px', height: '6px', background: '#ffff00', borderRadius: '50%', boxShadow: '0 0 10px #ffff00', animation: 'pixel-blink 0.3s infinite' }} />
          <div style={{ position: 'absolute', left: '37px', top: '28px', width: '6px', height: '6px', background: '#ffff00', borderRadius: '50%', boxShadow: '0 0 10px #ffff00', animation: 'pixel-blink 0.3s infinite 0.15s' }} />
          <div style={{ position: 'absolute', left: '54px', top: '28px', width: '6px', height: '6px', background: '#ffff00', borderRadius: '50%', boxShadow: '0 0 10px #ffff00', animation: 'pixel-blink 0.3s infinite 0.3s' }} />
        </div>
      ))}

      {/* COMETS */}
      {comets.map(comet => (
        <div key={comet.id} style={{ position: 'absolute', left: comet.x, top: comet.y, width: '20px', height: '20px', zIndex: 650, pointerEvents: 'none' }}>
          <div style={{ width: '20px', height: '20px', background: 'radial-gradient(circle, #ffffff, #ffaa00)', borderRadius: '50%', boxShadow: '0 0 30px #ffaa00, 0 0 50px #ff6600' }} />
          <div style={{ position: 'absolute', left: '-80px', top: '-40px', width: '100px', height: '100px', background: 'radial-gradient(ellipse at 80% 50%, rgba(255,170,0,0.8), rgba(255,100,0,0.4), transparent)', transform: 'rotate(25deg)' }} />
        </div>
      ))}

      {/* POWER-UPS */}
      {powerUps.map(pu => (
        <div key={pu.id} style={{ position: 'absolute', left: pu.x, top: pu.y, width: '30px', height: '30px', zIndex: 720, pointerEvents: 'none', animation: 'float-rotate 2s ease-in-out infinite' }}>
          <div style={{ width: '30px', height: '30px', background: pu.color, border: '3px solid #000000', boxShadow: `0 0 20px ${pu.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px', color: '#000000' }}>
            {pu.type === 'STAR' ? '★' : pu.type[0]}
          </div>
        </div>
      ))}

      {/* EXPLOSIONS */}
      {explosions.map(exp => (
        <div key={exp.id} style={{ position: 'absolute', left: exp.x - 50, top: exp.y - 50, width: 100, height: 100, zIndex: 850, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: '20%', backgroundImage: 'radial-gradient(circle, #ffffff 0%, #ffffff 15%, #ffff00 15%, #ffff00 30%, #ff8800 30%, #ff8800 50%, #ff0000 50%, #ff0000 65%, transparent 65%)', animation: 'pixel-explode 0.6s ease-out forwards' }} />
        </div>
      ))}

      {/* CONFETTI */}
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'absolute', left: c.x, top: c.y, width: '8px', height: '8px', background: c.color, border: '1px solid #000000', boxShadow: `0 0 8px ${c.color}`, transform: `rotate(${c.rotation}deg)`, zIndex: 900, pointerEvents: 'none' }} />
      ))}

      {/* PARTICLES */}
      {particles.map(p => (
        <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: '8px', height: '8px', background: p.color, boxShadow: `0 0 12px ${p.color}, 1px 1px 0 #000000`, pointerEvents: 'none' }} />
      ))}

      {/* WARSHIPS */}
      {warships.map(ship => (
        <div key={ship.id} style={{ position: 'absolute', left: ship.x, top: ship.y, zIndex: 800, pointerEvents: 'none', filter: 'drop-shadow(0 0 20px #00ffff)', transform: `rotate(${ship.rotation}deg)` }}>
          <div style={{ position: 'relative', width: '300px', height: '80px' }}>
            <div style={{ position: 'absolute', left: '50px', top: '30px', width: '200px', height: '30px', background: 'linear-gradient(180deg, #0088ff, #004488)', border: '3px solid #00ccff', boxShadow: '0 0 30px #00ccff' }} />
            <div style={{ position: 'absolute', left: '220px', top: '20px', width: '60px', height: '40px', background: 'linear-gradient(135deg, #00ffff, #0088ff)', border: '3px solid #00ffff', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)', boxShadow: '0 0 25px #00ffff' }} />
            <div style={{ position: 'absolute', left: '80px', top: '10px', width: '140px', height: '8px', background: '#0066cc', border: '2px solid #00aaff' }} />
            <div style={{ position: 'absolute', left: '80px', top: '62px', width: '140px', height: '8px', background: '#0066cc', border: '2px solid #00aaff' }} />
            <div style={{ position: 'absolute', left: '35px', top: '35px', width: '25px', height: '20px', background: '#ffff00', boxShadow: '0 0 40px #ffff00, 0 0 60px #ff8800', animation: 'engine-pulse 0.15s infinite' }} />
            <div style={{ position: 'absolute', left: '10px', top: '38px', width: '30px', height: '14px', background: 'linear-gradient(90deg, #ff8800, transparent)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', left: '100px', top: '38px', width: '6px', height: '6px', background: '#00ffff', boxShadow: '0 0 10px #00ffff', animation: 'pixel-blink 0.5s infinite' }} />
            <div style={{ position: 'absolute', left: '130px', top: '38px', width: '6px', height: '6px', background: '#00ffff', boxShadow: '0 0 10px #00ffff', animation: 'pixel-blink 0.5s infinite 0.25s' }} />
          </div>
        </div>
      ))}

      {/* ASTEROIDS */}
      {asteroids.map(ast => (
        <div key={ast.id} style={{ position: 'absolute', left: ast.x, top: ast.y, width: ast.size, height: ast.size, background: '#666666', border: '2px solid #888888', boxShadow: 'inset -2px -2px 4px #444444, inset 2px 2px 4px #888888', transform: `rotate(${ast.y}deg)`, pointerEvents: 'none', zIndex: 700 }} />
      ))}

      {/* LASERS */}
      {laserBeams.map(laser => (
        <div key={laser.id} style={{ position: 'absolute', left: laser.x, bottom: 0, width: '3px', height: '100vh', background: 'linear-gradient(180deg, transparent, #00ff00 20%, #00ff00 80%, transparent)', boxShadow: '0 0 20px #00ff00, 0 0 40px #00ff00', animation: 'laser-shoot 0.8s ease-out', pointerEvents: 'none', zIndex: 750 }} />
      ))}

      {/* RETRO GRID FLOOR */}
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-30%', right: '-30%', height: '65%',
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 38px, ${activeGame.accent}aa 38px, ${activeGame.accent}aa 41px), repeating-linear-gradient(90deg, transparent 0px, transparent 58px, ${activeGame.accent}88 58px, ${activeGame.accent}88 61px)`,
        transform: 'perspective(350px) rotateX(68deg)',
        backgroundPosition: `0 ${(scrollText * 2.5) % 41}px`,
        opacity: 0.55, filter: 'blur(0.3px)',
        boxShadow: `0 -40px 100px ${activeGame.accent}66, 0 -80px 150px ${activeGame.accent}44`,
        animation: 'grid-pulse 3s ease-in-out infinite', pointerEvents: 'none', transition: 'all 0.4s ease'
      }} />

      {/* HORIZON */}
      <div style={{
        position: 'absolute', top: '46%', left: '-5%', right: '-5%', height: '4px',
        background: `linear-gradient(90deg, transparent, ${activeGame.accent}66 10%, ${activeGame.accent} 30%, ${activeGame.accent}ff 50%, ${activeGame.accent} 70%, ${activeGame.accent}66 90%, transparent)`,
        boxShadow: `0 0 30px ${activeGame.accent}, 0 0 60px ${activeGame.accent}88`,
        opacity: 0.85, animation: 'horizon-glow 2.5s ease-in-out infinite', pointerEvents: 'none', transition: 'all 0.4s ease'
      }} />

      {/* PIXEL GRID OVERLAY */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, ${activeGame.accent}0a 3px, ${activeGame.accent}0a 4px), repeating-linear-gradient(90deg, transparent 0px, transparent 3px, ${activeGame.accent}0a 3px, ${activeGame.accent}0a 4px)`, pointerEvents: 'none', transition: 'all 0.4s ease' }} />

      {/* VIGNETTE */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.95) 100%)', pointerEvents: 'none', zIndex: 999 }} />

      {/* SCANLINES */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)', pointerEvents: 'none', zIndex: 1000, transform: `translateY(${scanlineOffset}px)`, opacity: 0.6 }} />

      {/* GLITCH */}
      {glitchLine >= 0 && (
        <div style={{ position: 'absolute', top: `${glitchLine * 5}%`, left: 0, right: 0, height: '3px', background: 'rgba(255,200,0,0.8)', mixBlendMode: 'screen', zIndex: 1001 }} />
      )}

      {/* TOP STATUS BAR */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'repeating-linear-gradient(0deg, #0d0000 0px, #0d0000 1px, #180000 1px, #180000 4px)',
        borderBottom: `3px solid ${activeGame.accent}`,
        padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px',
        zIndex: 1300, boxShadow: `0 0 20px ${activeGame.accent}44`, transition: 'all 0.4s ease'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {(['#ff0000', '#ffff00', '#00ff41', activeGame.accent] as string[]).map((c, i) => (
            <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: coinBlink && i % 2 === 0 ? c : '#1a0000', boxShadow: coinBlink && i % 2 === 0 ? `0 0 8px ${c}` : 'none', border: `1px solid ${c}`, transition: 'all 0.1s' }} />
          ))}
        </div>
        <div style={{ color: activeGame.accent, fontSize: '16px', letterSpacing: '6px', textShadow: `0 0 15px ${activeGame.accent}`, transition: 'all 0.4s ease' }}>
          ░░ GAME SELECT ░░
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {([activeGame.accent, '#ff00aa', '#00ffff', '#ff0000'] as string[]).map((c, i) => (
            <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: coinBlink && i % 2 !== 0 ? c : '#1a0000', boxShadow: coinBlink && i % 2 !== 0 ? `0 0 8px ${c}` : 'none', border: `1px solid ${c}`, transition: 'all 0.1s' }} />
          ))}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1250,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '56px', paddingBottom: '44px'
      }}>
        <div style={{
          position: 'relative',
          width: 'min(1700px, 96vw)',
          height: 'min(940px, calc(100vh - 110px))',
          border: `4px solid ${activeGame.accent}`,
          background: '#000000',
          boxShadow: `0 0 0 2px #000, 0 0 0 6px ${activeGame.accent}44, 0 0 50px ${activeGame.accent}33`,
          transition: 'all 0.4s ease',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* CORNER PIXELS */}
          {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', ...pos, width: '16px', height: '16px', background: activeGame.accent, zIndex: 2, transition: 'all 0.4s ease' } as React.CSSProperties} />
          ))}

          {/* INNER TITLE BAR */}
          <div style={{
            background: 'repeating-linear-gradient(0deg, #0a0000 0px, #0a0000 2px, #120000 2px, #120000 5px)',
            borderBottom: `3px solid ${activeGame.accent}`,
            padding: '10px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: `0 3px 20px ${activeGame.accent}33`, transition: 'all 0.4s ease', flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: coinBlink ? '#ffff00' : '#222200', border: '2px solid #ffff00', boxShadow: coinBlink ? '0 0 12px #ffff00' : 'none' }} />
              <div style={{ width: '12px', height: '12px', background: coinBlink ? activeGame.accent : '#111', border: `2px solid ${activeGame.accent}`, boxShadow: coinBlink ? `0 0 12px ${activeGame.accent}` : 'none' }} />
            </div>
            <div style={{ color: activeGame.accent, fontSize: '18px', fontWeight: 'bold', letterSpacing: '5px', textShadow: `0 0 20px ${activeGame.accent}`, transition: 'all 0.4s ease' }}>
              ▓▒░ {activeGame.title} ░▒▓
            </div>
            <button
              type="button" onClick={startSelected}
              style={{ background: activeGame.accent, color: '#000000', padding: '8px 18px', border: '3px solid #000', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', boxShadow: `0 0 20px ${activeGame.accent}, 3px 3px 0 #000`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.4s ease' }}
            >
              START ▶
            </button>
          </div>

          {/* CAROUSEL */}
          <div style={{ position: 'relative', flex: 1, background: '#000000', overflow: 'hidden', padding: '14px', perspective: '1800px' }}>
            <img src={activeGame.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, filter: 'saturate(0.6)', imageRendering: 'pixelated', pointerEvents: 'none', transition: 'all 0.4s ease' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 3px)', pointerEvents: 'none', opacity: 0.5, zIndex: 1 }} />

            {games.map((game, index) => {
              const rel = getRelativeOffset(index, activeIndex, games.length)
              const isCenter = rel === 0
              const isVisible = Math.abs(rel) <= 1
              const frameColor = isCenter ? game.accent : '#444444'

              let transform = 'translate(-50%, -50%) scale(0.6)'
              let opacity = 0
              let zIndex = 10
              let pointerEvents: 'auto' | 'none' = 'none'
              let filter = 'brightness(0.65)'

              if (isCenter) {
                transform = 'translate(-50%, -50%) translateX(0) scale(1) rotateY(0deg)'
                opacity = 1; zIndex = 30; pointerEvents = 'auto'; filter = 'none'
              } else if (rel === -1) {
                transform = 'translate(-50%, -50%) translateX(calc(-1 * min(500px, 30vw))) scale(0.78) rotateY(26deg) rotateZ(-1deg)'
                opacity = 0.55; zIndex = 20; pointerEvents = 'auto'; filter = 'brightness(0.5) saturate(0.4)'
              } else if (rel === 1) {
                transform = 'translate(-50%, -50%) translateX(min(500px, 30vw)) scale(0.78) rotateY(-26deg) rotateZ(1deg)'
                opacity = 0.55; zIndex = 20; pointerEvents = 'auto'; filter = 'brightness(0.5) saturate(0.4)'
              }

              return (
                <div
                  key={game.id}
                  onClick={() => { if (!isVisible) return; if (isCenter) { startSelected(); return }; goTo(index) }}
                  style={{
                    position: 'absolute', left: '50%', top: '50%',
                    width: 'min(1420px, 86vw)', height: 'min(760px, calc(100vh - 330px))',
                    border: `5px solid ${frameColor}`,
                    background: '#000000',
                    boxShadow: isCenter ? `0 0 0 2px #000, 0 0 0 4px ${frameColor}66, 0 0 50px ${frameColor}44, 8px 8px 0 rgba(0,0,0,0.8)` : '0 0 0 2px #000, 8px 8px 0 rgba(0,0,0,0.6)',
                    overflow: 'hidden', transform, opacity, zIndex,
                    transition: 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.35s ease',
                    pointerEvents, cursor: 'pointer', filter
                  }}
                >
                  <img src={game.image} alt={game.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)', pointerEvents: 'none' }} />

                  <div style={{ position: 'absolute', left: 0, top: 0, width: '14px', height: '14px', background: frameColor }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, width: '14px', height: '14px', background: frameColor }} />
                  <div style={{ position: 'absolute', left: 0, bottom: 0, width: '14px', height: '14px', background: frameColor }} />
                  <div style={{ position: 'absolute', right: 0, bottom: 0, width: '14px', height: '14px', background: frameColor }} />

                  <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ background: game.accent, color: '#000000', padding: '7px 12px', border: '3px solid #000000', fontSize: '12px', letterSpacing: '1px', boxShadow: `0 0 20px ${game.accent}, 2px 2px 0 #000`, fontWeight: 'bold', fontFamily: '"Courier New", monospace' }}>{game.badge}</div>
                    <div style={{ background: '#000000', color: game.accent, padding: '7px 12px', border: `3px solid ${game.accent}`, fontSize: '12px', letterSpacing: '2px', boxShadow: `0 0 15px ${game.accent}`, fontFamily: '"Courier New", monospace' }}>{game.genre}</div>
                  </div>

                  <div style={{ position: 'absolute', left: '32px', right: '32px', bottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 'clamp(42px, 5vw, 78px)', lineHeight: '1.03', color: '#ffffff', letterSpacing: '3px', textShadow: `0 0 20px ${game.accent}, 5px 5px 0 #000000`, fontFamily: '"Impact", "Arial Black", sans-serif' }}>
                        {game.title}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '13px', color: game.accent, letterSpacing: '1px', textShadow: `0 0 10px ${game.accent}`, fontFamily: '"Courier New", monospace' }}>
                        {game.tagline}
                      </div>
                    </div>
                    {isCenter ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); startSelected() }}
                        style={{ background: game.accent, color: '#000000', border: '4px solid #000000', padding: '16px 22px', fontSize: '14px', letterSpacing: '2px', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Courier New", monospace', boxShadow: `0 0 30px ${game.accent}, 5px 5px 0 #000000`, animation: 'ready-pulse 1s ease-in-out infinite' }}>
                        PLAY NOW
                      </button>
                    ) : (
                      <div style={{ background: '#000000', color: game.accent, border: `3px solid ${game.accent}`, padding: '11px 14px', fontSize: '11px', letterSpacing: '2px', boxShadow: `0 0 15px ${game.accent}`, fontFamily: '"Courier New", monospace' }}>SELECT</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* NAV ARROWS */}
            <button type="button" onClick={goPrev} aria-label="Previous"
              style={{ position: 'absolute', top: '50%', left: '18px', transform: 'translateY(-50%)', zIndex: 1400, width: '56px', height: '56px', border: `3px solid ${activeGame.accent}`, background: '#000', color: activeGame.accent, fontSize: '30px', cursor: 'pointer', boxShadow: `0 0 20px ${activeGame.accent}44, 3px 3px 0 #000`, fontWeight: 'bold', fontFamily: 'inherit', transition: 'all 0.2s' }}>‹</button>

            <button type="button" onClick={goNext} aria-label="Next"
              style={{ position: 'absolute', top: '50%', right: '18px', transform: 'translateY(-50%)', zIndex: 1400, width: '56px', height: '56px', border: `3px solid ${activeGame.accent}`, background: '#000', color: activeGame.accent, fontSize: '30px', cursor: 'pointer', boxShadow: `0 0 20px ${activeGame.accent}44, 3px 3px 0 #000`, fontWeight: 'bold', fontFamily: 'inherit', transition: 'all 0.2s' }}>›</button>

            {/* DOT INDICATORS */}
            <div style={{ position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', zIndex: 1400, display: 'flex', gap: '8px', alignItems: 'center', background: '#000000', border: `2px solid ${activeGame.accent}`, padding: '8px 12px', boxShadow: `0 0 20px ${activeGame.accent}33`, transition: 'all 0.4s ease' }}>
              {games.map((game, index) => (
                <button key={game.id} type="button" onClick={() => goTo(index)} aria-label={`Show ${game.title}`}
                  style={{ width: '20px', height: '20px', border: index === activeIndex ? `3px solid ${game.accent}` : '3px solid #333333', background: index === activeIndex ? game.accent : '#111111', boxShadow: index === activeIndex ? `0 0 12px ${game.accent}` : 'none', cursor: 'pointer', transition: 'all 0.2s' }} />
              ))}
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div style={{
            borderTop: `3px solid ${activeGame.accent}`,
            background: 'repeating-linear-gradient(45deg, #0a0000, #0a0000 10px, #120000 10px, #120000 20px)',
            padding: '14px 20px', textAlign: 'center',
            boxShadow: `0 -3px 20px ${activeGame.accent}33`, transition: 'all 0.4s ease', flexShrink: 0
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: activeGame.accent, letterSpacing: '4px', textShadow: `0 0 20px ${activeGame.accent}`, animation: 'ready-pulse 1.2s ease-in-out infinite', transition: 'all 0.4s ease' }}>
              ★ SELECTED: {activeGame.title} ★
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM MARQUEE */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1400, borderTop: `2px solid ${activeGame.accent}33`, background: '#050000', padding: '5px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: 'marquee-scroll 20s linear infinite', whiteSpace: 'nowrap', fontSize: '11px', color: '#ff4400', letterSpacing: '3px', textShadow: '0 0 6px #ff4400' }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ paddingRight: '80px' }}>◆ © 1992 THE ARCADERS ◆ INSERT COIN ◆ PRESS START ◆ PLAYER 1 READY ◆ STEREO ◆ FOR AMUSEMENT ONLY ◆ HIGH SCORE ◆ LICENSED NINTENDO</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pixel-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes ready-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
        @keyframes stripe-move { from { transform: translateX(0); } to { transform: translateX(40px); } }
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes starfield-drift {
          from { background-position: 0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 200px 180px, 90px 220px; }
          to { background-position: 0 200px, 40px 260px, 130px 470px, 70px 300px, 150px 250px, 200px 380px, 90px 420px; }
        }
        @keyframes grid-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.7; } }
        @keyframes horizon-glow { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes engine-pulse { 0%, 100% { opacity: 1; transform: scaleX(1); } 50% { opacity: 0.7; transform: scaleX(1.2); } }
        @keyframes pixel-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.3; } }
        @keyframes laser-shoot {
          0% { transform: scaleY(0); transform-origin: bottom; opacity: 1; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 0; }
        }
        @keyframes pixel-explode { 0% { transform: scale(0.2); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes float-rotate { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 50% { transform: translateY(-10px) rotate(180deg) scale(1.1); } }
      `}</style>
    </div>
  )
}