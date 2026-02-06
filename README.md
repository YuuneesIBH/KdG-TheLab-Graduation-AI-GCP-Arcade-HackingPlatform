# Arcade Platform - Project Beschrijving

## Overzicht
Een desktop arcade launcher gebouwd met Electron, TypeScript en React. Dit platform fungeert als centrale hub om verschillende arcade games (Pygame, Unity, standalone executables) te beheren en te starten vanuit één interface.

## Tech Stack
- **Electron** - Desktop applicatie framework
- **TypeScript** - Type-safe development
- **React** - UI framework voor de game grid interface
- **Vite** - Build tool en dev server
- **Node.js** - Backend voor game launching en file management

## Project Structuur
```
arcade/
├── src/
│   ├── main.ts          # Electron main process - app lifecycle & game launching
│   ├── renderer.tsx     # React UI - game grid en navigatie
│   ├── types.ts         # TypeScript interfaces (Game, metadata)
│   └── index.html       # Electron renderer entry point
├── games/               # Game executables en metadata
│   └── [game-folder]/
│       ├── executable   # .exe, .py, Unity build, etc.
│       ├── metadata.json
│       └── thumbnail.png
├── package.json
├── tsconfig.json
└── .gitignore
```

## Functionaliteit
- **Game Library**: Grid view van beschikbare games met thumbnails
- **Game Launcher**: Start verschillende game types (Python, Unity, executables)
- **Metadata Management**: JSON-based game info (naam, beschrijving, type)
- **Fullscreen Arcade Mode**: Dedicated fullscreen interface voor arcade gebruik

## Development

### Setup
```bash
# Installeer dependencies
npm install

# Installeer Electron en development tools
npm install electron electron-vite vite react react-dom
npm install -D @types/react @types/react-dom @types/node typescript @vitejs/plugin-react
```

### Development Commands
```bash
npm run dev          # Start development mode met hot reload
npm run build        # Build voor productie
npm run preview      # Preview production build
```

## Team Context
**The Lab Project - Arcade & Hacking Platform**

- **Rayan**: Hardware - arcade cabinet, buttons, computer setup
- **Matthias**: Raspberry Pi Pico hacking tool
- **Younes**: Arcade platform - game launcher en interface

## Game Metadata Format
Elke game in de `games/` folder heeft een `metadata.json`:

```json
{
  "id": "game-1",
  "name": "Super Arcade Game",
  "description": "Een awesome arcade game",
  "executable": "game.exe",
  "thumbnail": "thumbnail.png",
  "category": "action",
  "type": "unity"
}
```

## Roadmap
- [ ] Basis Electron + React setup
- [ ] Game grid UI met thumbnails
- [ ] Game launching functionaliteit
- [ ] Metadata management systeem
- [ ] Fullscreen arcade mode
- [ ] Controller input support
- [ ] High score tracking (optioneel)

## License
ISC
