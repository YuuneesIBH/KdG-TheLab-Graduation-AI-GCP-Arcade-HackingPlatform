# Arcade Platform

> A desktop arcade launcher that starts all your games from one clean, fullscreen dashboard.

## Why this project?
This app bundles different game types (Pygame, Unity builds, standalone executables) into a single library with a consistent UI. Think: a real arcade experience, but manageable for school projects, demos, and events.

## Highlights
- 🧩 Centralize all games in one library
- 🧭 Grid UI with thumbnails and fast navigation
- 🎮 Launch multiple game types (Python, Unity, .exe)
- 🥽 Fullscreen arcade mode focus
- 🧪 Per-game metadata via JSON

## Tech Stack
<div align="center">
  <img alt="TypeScript" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="28" height="28" />
  <img alt="JavaScript" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="28" height="28" />
  <img alt="React" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="28" height="28" />
  <img alt="Electron" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/electron/electron-original.svg" width="28" height="28" />
  <img alt="Node.js" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="28" height="28" />
  <img alt="Vite" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="28" height="28" />
</div>

- **Electron** · desktop app shell
- **TypeScript** · type-safe development
- **React** · UI for the game grid
- **Vite** · fast dev server and build tool
- **Node.js** · game launching and file management

## Project Structure
```
arcade/
├── src/
│   ├── main.ts          # Electron main process: lifecycle & launching
│   ├── renderer.tsx     # React UI: game grid and navigation
│   ├── types.ts         # TypeScript interfaces (Game, metadata)
│   └── index.html       # Electron renderer entry
├── games/               # Game executables + metadata
│   └── [game-folder]/
│       ├── executable   # .exe, .py, Unity build, etc.
│       ├── metadata.json
│       └── thumbnail.png
├── docs/                # Extra documentation
├── package.json
└── tsconfig.json
```

## Features
- **Game Library**: clean grid with cover art
- **Game Launcher**: launch multiple game types through one flow
- **Metadata Management**: simple JSON for name, description, type, category
- **Arcade Mode**: fullscreen UI focused on quick input

## Quickstart
```bash
# 1) Install dependencies
npm install

# 2) Start development mode
npm run dev
```

## Commands
```bash
npm run dev          # Development with hot reload
npm run build        # Production build
npm run preview      # Preview build
```

## DIY Flipper Setup
- Quick wiring + firmware setup: `docs/DIYFLIPPER_QUICKSTART.md`
- ESP32 baseline firmware: `firmware/esp32_diyflipper/esp32_diyflipper.ino`

## Add a Game
1. Create a folder in `games/`.
2. Add your executable and `thumbnail.png`.
3. Add a `metadata.json` with the fields below.

### Metadata Example
```json
{
  "id": "game-1",
  "name": "Super Arcade Game",
  "description": "A fast-paced arcade game with a retro vibe.",
  "executable": "game.exe",
  "thumbnail": "thumbnail.png",
  "category": "action",
  "type": "unity"
}
```

## Team Context
**The Lab Project · Arcade & Hacking Platform**
- **Rayan** · hardware (arcade cabinet, buttons, computer setup)
- **Matthias** · Raspberry Pi Pico hacking tool
- **Younes** · arcade platform (launcher and interface)

## Roadmap
- [x] Base Electron + React setup
- [x] Game grid UI with thumbnails
- [x] Game launching functionality
- [ ] Fullscreen arcade mode polish
- [ ] Controller input support
- [ ] High score tracking (optional)

## License
ISC

---

### Extra Ideas (optional)
- Auto-detect new games in `games/`
- Category filters (action, puzzle, racing)
- Favorites and recently played
