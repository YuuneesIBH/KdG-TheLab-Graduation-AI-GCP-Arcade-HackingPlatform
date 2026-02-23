# DIY Flipper Quickstart (ESP32 + PN532 + IR)

This project now includes:
- Electron auto-detect + auto-connect to a DIY Flipper serial device.
- Module command dispatch from the Flipper menu to hardware.
- A baseline ESP32 bridge sketch: `firmware/esp32_diyflipper/esp32_diyflipper.ino`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR PC                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Electron Arcade App                         │   │
│  │  ┌──────────────┐        ┌──────────────────────────┐   │   │
│  │  │ Arcade Games │◄──────►│  Flipper Hacker Menu     │   │   │
│  │  │  (Pygame)    │        │  (HackerMenu.tsx)        │   │   │
│  │  └──────────────┘        └───────────┬──────────────┘   │   │
│  │                           Serial (USB) via main.ts       │   │
│  └──────────────────────────────────────┼──────────────────┘   │
└─────────────────────────────────────────┼───────────────────────┘
                                          │ USB Cable
                                          ▼
                              ┌───────────────────────┐
                              │   ESP32-WROOM-32E     │
                              │   DIY Flipper HW      │
                              │  ┌─────┐  ┌────────┐  │
                              │  │ IR  │  │ PN532  │  │
                              │  └─────┘  └────────┘  │
                              └───────────────────────┘
```

## Components

| Component | Purpose | Required |
|-----------|---------|----------|
| ESP32-WROOM-32E | Main controller, USB serial to PC | ✅ Yes |
| PN532 NFC Module | NFC/RFID read/write/emulate | ✅ Yes |
| IR TX Module | Infrared transmitter | ✅ Yes |
| IR RX Module | Infrared receiver | ✅ Yes |
| Raspberry Pi Pico | BadUSB HID injection | ❌ Optional (for later) |

## 1) Wire It (ESP32-Only Setup)

### Quick Reference

```
ESP32               Component
─────               ─────────
3V3  ──────────┬──► PN532 VCC
               ├──► IR TX VCC  
               └──► IR RX VCC

GND  ──────────┬──► PN532 GND
               ├──► IR TX GND
               └──► IR RX GND

GPIO21 (SDA) ────► PN532 SDA
GPIO22 (SCL) ────► PN532 SCL
GPIO4  ──────────► IR TX Signal
GPIO34 ◄───────── IR RX Signal

USB ─────────────► PC (arcade app)
```

### Detailed Wiring Table

| ESP32 Pin | Connect To | Notes |
|-----------|------------|-------|
| `3V3` | PN532 VCC, IR TX VCC, IR RX VCC | Use breadboard power rail to split |
| `GND` | PN532 GND, IR TX GND, IR RX GND | Common ground required |
| `GPIO21` | PN532 SDA | I²C data |
| `GPIO22` | PN532 SCL | I²C clock |
| `GPIO27` | PN532 IRQ | Optional |
| `GPIO26` | PN532 RST | Optional |
| `GPIO4` | IR TX Signal IN | Transmitter |
| `GPIO34` | IR RX Signal OUT | Receiver (input-only pin) |

### PN532 Setup

Set the DIP switches on your PN532 module to I²C mode:

| Switch 1 | Switch 2 | Mode |
|----------|----------|------|
| **ON** | **OFF** | I²C ✓ |

### Power Note

The ESP32 dev board typically has 1-2 3V3 pins. Use a **breadboard power rail**:
1. Connect ESP32 `3V3` to the `+` rail
2. Connect ESP32 `GND` to the `-` rail  
3. Connect all module VCC pins to `+` rail
4. Connect all module GND pins to `-` rail

### Current Draw

| Module | Typical Current |
|--------|-----------------|
| PN532 | ~100-150mA |
| IR TX | ~20-50mA |
| IR RX | ~5-10mA |
| **Total** | ~175-210mA |

The ESP32's 3V3 regulator can handle this (~500mA max).

## 2) Future: Add Pico for BadUSB

When you get a Pico (or want to use BadUSB), the Pico acts as a USB HID keyboard:

```
   Your PC                          Target PC
      │                                 │
      │ USB                             │ USB (HID keyboard)
      ▼                                 ▼
  ┌───────┐    UART (3 wires)     ┌─────────┐
  │ ESP32 │◄─────────────────────►│  Pico   │
  └───────┘                       └─────────┘
```

### Pico UART Wiring (for later)

| ESP32 Pin | Pico Pin |
|-----------|----------|
| `GPIO16` (RX2) | `GP0` (TX) |
| `GPIO17` (TX2) | `GP1` (RX) |
| `GND` | `GND` |

The ESP32 firmware already supports forwarding commands to Pico on these pins.

## 3) Flash ESP32

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
