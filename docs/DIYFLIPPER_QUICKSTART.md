# DIY Flipper Quickstart (Pico WH + ESP32 + PN532 + IR)

This project now includes:
- Electron auto-detect + auto-connect to a DIY Flipper serial device.
- Module command dispatch from the Flipper menu to hardware.
- A baseline ESP32 bridge sketch: `firmware/esp32_diyflipper/esp32_diyflipper.ino`.

## 1) Wire It

Common ground is required across all boards/modules.

- `Pico GP0 (TX)` -> `ESP32 GPIO16 (RX2)`
- `Pico GP1 (RX)` -> `ESP32 GPIO17 (TX2)`
- `ESP32 3V3` -> `PN532 VCC`, `IR module VCC`
- `ESP32 GND` -> `PN532 GND`, `IR module GND`, `Pico GND`
- `ESP32 GPIO21 (SDA)` -> `PN532 SDA`
- `ESP32 GPIO22 (SCL)` -> `PN532 SCL`
- `ESP32 GPIO4` -> `IR TX IN`
- `ESP32 GPIO34` -> `IR RX OUT`
- Optional: `ESP32 GPIO27` -> `PN532 IRQ`, `ESP32 GPIO26` -> `PN532 RST`

## 2) Flash ESP32

Flash:
- `firmware/esp32_diyflipper/esp32_diyflipper.ino`

Requirements:
- Arduino IDE + ESP32 board support
- Upload speed default; serial monitor `115200`

On boot, the board prints:
- `DIYFLIPPER_READY`
- firmware/version line
- capabilities line

## 3) Start App

From repo root:

```bash
npm install
npm run dev
```

Open Flipper menu in-app. The header/footer should show:
- `HW::CONNECTING` briefly
- then `HW::ONLINE COMx` (Windows) when connected

No manual connect button is required; app auto-reconnects every few seconds.

## 4) Module Commands Sent By App

When you execute modules in the Flipper menu, app sends:
- `RUN NFC_CLONE`
- `RUN BADUSB_INJECT`
- `RUN IR_BLAST`
- `RUN GPIO_CTRL`
- `RUN SHELL`

Health checks:
- app sends `HELLO`
- app sends `PING`

## Notes

- The ESP32 sketch includes placeholder handlers for NFC/IR/BadUSB/Shell.
- Replace placeholders with your real PN532 and IR logic.
- Keep all logic levels at `3.3V`.
