# The Lab Graduation - Arcade and Hacking Platform

Desktop launcher met retro arcade UI, gebouwd met Electron + React.
De app combineert een fullscreen arcade flow met een Flipper-achtige hacker terminal flow en DIY hardware-integratie via serial.

## Overzicht

Dit project bevat:
- Een boot screen met arcade animaties en overgang naar de game menu
- Een game menu met selectie en launch flow
- Een game display-laag die lokale games start via Electron IPC
- Een hacker transition + terminal menu als tweede experience
- Auto-detect en auto-connect van DIY Flipper hardware (ESP32/serial)
- Lokale Python/Pygame games in de repository

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

- Electron (desktop shell + main process)
- React (renderer UI)
- TypeScript (main/renderer typed code)
- electron-vite (dev/build pipeline)
- Python + Pygame (lokale arcade games)
- serialport (USB serial communicatie met DIY Flipper hardware)

## Belangrijkste Features

- Fullscreen arcade launcher flow (boot -> menu -> game)
- IPC bridge tussen renderer en main process
- Launch support voor `.py`, `.jar` en `.exe`
- Embedded launch mode met viewport data
- Hacker terminal mode met keyboard en gamepad navigatie
- Auto-reconnect naar DIY Flipper hardware om de paar seconden
- Module dispatch vanuit hacker menu (`RUN NFC_CLONE`, `RUN IR_BLAST`, ...)

## Projectstructuur

```text
.
├── README.md
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── docs/
│   └── DIYFLIPPER_QUICKSTART.md
├── firmware/
│   └── esp32_diyflipper/
│       └── esp32_diyflipper.ino
├── scripts/
│   ├── run-electron-vite.js
│   └── setup-python-venv.js
└── arcade-flipper/
    └── src/
        ├── main.ts
        ├── preload.ts
        ├── renderer.tsx
        ├── components/
        │   ├── arcade/
        │   │   ├── boot.tsx
        │   │   ├── GameMenu.tsx
        │   │   └── ArcadeGame.tsx
        │   └── flipper/
        │       ├── HackTransition.tsx
        │       └── HackerMenu.tsx
        ├── assets/
        └── games/
```

## Architectuur Samenvatting

- `arcade-flipper/src/main.ts`
  Beheert Electron window/fullscreen, game launch/stop, IPC handlers, en DIY Flipper serial auto-connect.
- `arcade-flipper/src/preload.ts`
  Exposeert `window.electron` API (`launchGame`, `stopGame`, `diyFlipper*`, `onGameExit`, ...).
- `arcade-flipper/src/renderer.tsx`
  Router tussen boot, arcade menu, arcade game view en hacker menu.
- `arcade-flipper/src/components/arcade/GameMenu.tsx`
  Bevat de hardcoded game catalogus (id/title/image/executable/...).
- `arcade-flipper/src/components/flipper/HackerMenu.tsx`
  UI voor modules en hardware status (`HW::CONNECTING`, `HW::ONLINE`, `HW::OFFLINE`).

## Vereisten

- Node.js 18+
- npm 9+
- Python 3.10+
- `pygame` in je actieve Python-omgeving

Optioneel (voor hardware flow):
- DIY Flipper device via USB serial (ESP32 bridge firmware)

## Installatie

```bash
npm install
python3 -m pip install pygame
# of automatisch:
npm run setup:python
```

Optioneel met virtualenv:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pygame
```

## Development en Build

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run check
```

## Controls

- Boot screen: klik `START` of `READY TO START` wanneer loading 100% is
- Arcade menu: `ArrowUp` / `ArrowDown` selecteren, `Enter` starten
- Game display: `Escape` of `EXIT` terug naar menu
- Hacker menu: `ArrowUp` / `ArrowDown`, `Enter`, `Escape` (gamepad polling actief)

## Huidige Games (default catalogus)

- SPACE INVADER (`games/spaceinvaders.py`)
- PAC-MAN (`games/PacMan/pacman.py`)
- RETRO BIRD (`games/RetroBird/main.py`)
- PIXEL QUEST ADVENTURE (`games/SuperMarioNES/Mario.jar`)
- EXTREME RACING (`games/CarRacingUltraMaxExtremeLevel1000/main.py`)
- RETRO RACE (`games/RetroRaceGame/RetroRaceGame.jar`)
- BLOCK STORM (`games/BlockStorm/main.py`)
- ANGRY WALLS (`games/AngryWalls/main.py`)
- PONG (`games/pong.py`)

## Nieuwe Games Toevoegen

Games worden gelezen uit de `games` array in:
`arcade-flipper/src/components/arcade/GameMenu.tsx`

1. Voeg game files toe onder `arcade-flipper/src/games/<YourGame>/`
2. Voeg een thumbnail toe in `arcade-flipper/src/assets/`
3. Voeg een object toe in de `games` array in `GameMenu.tsx`
4. Gebruik een executable pad relatief vanaf `arcade-flipper/src`, bijvoorbeeld:
   - `games/RetroBird/main.py`
   - `games/pong.py`
   - `games/MyGame/game.exe`

## Launch Modes en IPC

Renderer gebruikt `window.electron.launchGame(...)`.
In `main.ts` wordt launch behavior bepaald op extensie:

- `.py`: via `python3` (`python` op Windows)
- `.jar`: via `java -jar`
- `.exe`: direct als executable process

Voor Python launches worden deze env vars meegegeven:

- `ARCADE_EMBEDDED` (`1` of `0`)
- `ARCADE_WINDOW_POS` (`x,y`)
- `ARCADE_WINDOW_SIZE` (`widthxheight`)

## DIY Flipper Hardware (Serial)

De app ondersteunt momenteel:
- Serial device auto-detect + auto-connect
- Health check commands (`HELLO`, `PING`)
- Module commands vanuit hacker menu:
  - `RUN NFC_CLONE`
  - `RUN BADUSB_INJECT`
  - `RUN IR_BLAST`
  - `RUN GPIO_CTRL`
  - `RUN SHELL`

Voor wiring + firmware setup:
- Zie `docs/DIYFLIPPER_QUICKSTART.md`
- Firmware: `firmware/esp32_diyflipper/esp32_diyflipper.ino`

## Platform Notes

- Op macOS gebruikt de app `osascript` om Python game windows te positioneren/fullscreenen.
- Als window control niet werkt op macOS, controleer Accessibility permissions voor Terminal/Electron.
- Zonder `pygame` starten de gebundelde Python games niet.

## Team Context

The Lab Graduation Project:
- Younes: arcade platform (launcher en interface)
- Rayan: hardware (arcade cabinet, knoppen, computer setup)
- Matthias: Raspberry Pi Pico hacking tool