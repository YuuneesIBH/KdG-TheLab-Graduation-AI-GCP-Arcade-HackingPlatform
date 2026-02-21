# The Lab Graduation - Arcade and Hacking Platform

Desktop launcher with a retro arcade UI, built with Electron + React.
The app combines a fullscreen arcade flow with a separate hacker terminal flow.

## Overview

This project includes:
- A boot screen with arcade animations and transition into the game menu
- A game menu with card selection and launch flow
- A display screen that can launch games in embedded or external mode through Electron IPC
- A hacker transition + terminal menu as a second experience
- Local Python/Pygame games in the repository

## Tech Stack

<div align="center">
  <img alt="TypeScript" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="28" height="28" />
  <img alt="JavaScript" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="28" height="28" />
  <img alt="React" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="28" height="28" />
  <img alt="Electron" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/electron/electron-original.svg" width="28" height="28" />
  <img alt="Node.js" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="28" height="28" />
  <img alt="Vite" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="28" height="28" />
  <img alt="Python" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="28" height="28" />
</div>

- Electron for desktop shell and process management
- React for UI screens and state transitions
- TypeScript for typed renderer/main code
- electron-vite for dev/build pipeline
- Python (Pygame) for bundled arcade games

## Main Features

- Fullscreen arcade launcher flow (boot -> menu -> launch -> game display)
- IPC bridge between renderer and main process for safe game launching
- Support for `.py` and `.exe` launch types
- Embedded launch mode with viewport info for game windows
- Hacker terminal mode with keyboard and gamepad navigation
- Preconfigured local games in `arcade-flipper/src/games`

## Project Structure

```text
.
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── arcade-flipper/
    └── src/
        ├── main.ts
        ├── preload.ts
        ├── renderer.tsx
        ├── index.html
        ├── electron.d.ts
        ├── components/
        │   ├── arcade/
        │   │   ├── boot.tsx
        │   │   ├── menu.tsx
        │   │   ├── gamelaunch.tsx
        │   │   └── gamedisplay.tsx
        │   └── flipper/
        │       ├── HackTransition.tsx
        │       └── HackerMenu.tsx
        ├── assets/
        └── games/
```

## Architecture Summary

- `arcade-flipper/src/main.ts`
  Manages the Electron window, fullscreen behavior, IPC handlers, and game launch (`spawn`).
- `arcade-flipper/src/preload.ts`
  Exposes the `window.electron` API (`setFullscreen`, `launchGame`, `onGameExit`).
- `arcade-flipper/src/renderer.tsx`
  Top-level screen routing between boot, arcade menu, launch, display, and hacker menu.
- `arcade-flipper/src/components/arcade/menu.tsx`
  Contains the game catalog (hardcoded array with `id`, `title`, `image`, `executable`).

## Requirements

- Node.js 18+
- npm 9+
- Python 3.10+
- `pygame` installed in your active Python environment

## Installation

```bash
npm install
python3 -m pip install pygame
```

Optional with virtualenv:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pygame
```

## Development and Build

```bash
npm run dev
npm run build
npm run preview
```

## Controls

- Boot screen: click `START` or the `READY TO START` button once loading reaches 100%
- Arcade menu: `ArrowLeft` and `ArrowRight` to select, `Enter` to launch
- Game launch screen: `Enter` to confirm, `Escape` to go back
- Game display: `Escape` or `EXIT` to return to the menu
- Hacker menu: `ArrowUp` and `ArrowDown`, `Enter`, `Escape` (gamepad is also polled)

## Adding Games

In the current implementation, games are read from the `games` array in:
`arcade-flipper/src/components/arcade/menu.tsx`.

1. Add your game files to `arcade-flipper/src/games/<YourGame>/`
2. Add a thumbnail to `arcade-flipper/src/assets/`
3. Add an object to the `games` array in `menu.tsx`
4. Use an executable path relative to `arcade-flipper/src`, for example:
   - `games/RetroBird/main.py`
   - `games/pong.py`
   - `games/MyGame/game.exe`

Example:

```ts
{
  id: 'my-game',
  title: 'MY GAME',
  genre: 'ARCADE',
  badge: 'NEW',
  tagline: 'Short description of your game.',
  image: '../assets/mygame.png',
  accent: '#00ffcc',
  glow: '#00ffcc',
  executable: 'games/MyGame/main.py'
}
```

## Launch Modes and IPC

The renderer uses `window.electron.launchGame(...)`.
In `main.ts`, launch behavior is selected by file extension:

- `.py`: through `python3` (or `python` on Windows)
- `.exe`: launched directly as an executable process

For Python launches, these environment variables are passed:

- `ARCADE_EMBEDDED` (`1` or `0`)
- `ARCADE_WINDOW_POS` (`x,y`)
- `ARCADE_WINDOW_SIZE` (`widthxheight`)

## Platform Notes

- On macOS, the app uses `osascript` in the main process to position Python windows or set them fullscreen.
- If window control does not work on macOS, check Accessibility permissions for Terminal/Electron.
- Without `pygame`, the bundled Python games will not start.

## Team Context

The Lab Graduation Project:
- Younes: arcade platform (launcher and interface)
- Rayan: hardware (arcade cabinet, buttons, computer setup)
- Matthias: Raspberry Pi Pico hacking tool

## License

ISC
