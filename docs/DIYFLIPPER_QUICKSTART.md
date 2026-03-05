# DIY Flipper Quickstart (ESP32 + PN532 + IR)

This project includes:
- Electron auto-detect + auto-connect to a DIY Flipper serial device.
- Module command dispatch from the Flipper menu to hardware.
- A baseline ESP32 bridge sketch: `firmware/esp32_diyflipper/esp32_diyflipper.ino`.

## Architecture

```
PC (Electron app) --USB serial--> ESP32 dev board --jumpers--> PN532 + IR TX + IR RX
```

## Components

| Component | Purpose | Required |
|---|---|---|
| ESP32-WROOM-32E dev board | Main controller, USB serial to PC | Yes |
| PN532 NFC module | NFC/RFID read/write/emulate | Yes |
| IR TX module | Infrared transmitter | Yes |
| IR RX module | Infrared receiver | Yes |
| Raspberry Pi Pico | BadUSB HID injection | Optional (later) |

## 1) Breadboard Overview (ESP32-Only)

Use a standard 830-point breadboard. This layout assumes the ESP32 USB port points upward.

### Placement (Top View)

```
Top of breadboard (USB cable side)

+---------------------------------------------------------------+
| + rail  ================================================ (+)  |
| - rail  ================================================ (-)  |
|                                                               |
| [ESP32] straddling center gap, left half of board            |
|                                                               |
|                         [IR TX module]                        |
|                         [IR RX module]                        |
|                                                               |
| Right side: leave space for jumper bundle to PN532 module     |
| (PN532 can stay off-board; wire by pin labels below)          |
|                                                               |
| + rail  ================================================ (+)  |
| - rail  ================================================ (-)  |
+---------------------------------------------------------------+
Bottom of breadboard
```

### Power Rails First

1. ESP32 `3V3` -> breadboard `+` rail.
2. ESP32 `GND` -> breadboard `-` rail.
3. PN532 `VCC`, IR TX `VCC`, IR RX `VCC` -> `+` rail.
4. PN532 `GND`, IR TX `GND`, IR RX `GND` -> `-` rail.

### Signal Wiring Map

| ESP32 Pin | Connect To | Notes |
|---|---|---|
| `GPIO21` | PN532 `SDA` | I2C data |
| `GPIO22` | PN532 `SCL` | I2C clock |
| `GPIO27` | PN532 `IRQ` | Optional |
| `GPIO26` | PN532 `RST` | Optional |
| `GPIO4` | IR TX `IN` / `SIG` | Transmitter signal |
| `GPIO34` | IR RX `OUT` / `SIG` | Receiver signal (input-only pin) |

### Quick Build Sequence

1. Place ESP32 on the breadboard and connect USB only after wiring is done.
2. Create common power rails (`3V3` and `GND`).
3. Connect PN532 power pins, then SDA/SCL.
4. Connect IR TX and IR RX power pins, then signal pins.
5. Re-check that every module shares the same ground.
6. Plug USB into PC and flash/test.

### PN532 Mode

Set PN532 DIP switches to I2C mode:

| Switch 1 | Switch 2 | Mode |
|---|---|---|
| ON | OFF | I2C |

### Current Draw

| Module | Typical Current |
|---|---|
| PN532 | 100-150 mA |
| IR TX | 20-50 mA |
| IR RX | 5-10 mA |
| Total | 175-210 mA |

This is typically within ESP32 dev-board 3.3V regulator limits, but if your board gets unstable, use a separate regulated 3.3V supply with common ground.

## 2) Future: Add Pico for BadUSB

When you add a Pico, it acts as a USB HID keyboard and talks to ESP32 over UART.

### Pico UART Wiring (later)

| ESP32 Pin | Pico Pin |
|---|---|
| `GPIO16` (RX2) | `GP0` (TX) |
| `GPIO17` (TX2) | `GP1` (RX) |
| `GND` | `GND` |

The ESP32 firmware already forwards commands to Pico on these pins.

## 3) Flash ESP32

Flash:
- `firmware/esp32_diyflipper/esp32_diyflipper.ino`
- Optional hardware isolation test: `firmware/esp32_diyflipper/pn532_hsu_probe/pn532_hsu_probe.ino`

Requirements:
- Arduino IDE + ESP32 board support
- Arduino library: `IRremoteESP8266` (for IR transmit)
- Arduino library: `PN532` (Seeed/Elechouse style, folder `PN532-Arduino`)
- Serial monitor: `115200`

PN532-Arduino interface flags:
- Main sketch uses `firmware/esp32_diyflipper/build_opt.h` with `-DNFC_INTERFACE_I2C`.
- HSU probe uses `firmware/esp32_diyflipper/pn532_hsu_probe/build_opt.h` with `-DNFC_INTERFACE_HSU`.

On boot, the board prints:
- `DIYFLIPPER_READY`
- firmware/version line
- capabilities line

## 4) Start App

From repo root:

```bash
npm install
npm run dev
```

Open the Flipper menu in-app. Header/footer should show:
- `HW::CONNECTING` briefly
- then `HW::ONLINE COMx` on Windows when connected

No manual connect button is required; app auto-reconnects every few seconds.

## 5) Module Commands Sent By App

When you execute modules in the Flipper menu, app sends:
- `RUN NFC_CLONE`
- `RUN BADUSB_INJECT`
- `RUN IR_BLAST`
- `RUN GPIO_CTRL`
- `RUN WIFI_AUDIT`
- `RUN WIFI_AP_START`
- `RUN SHELL`

Health checks:
- app sends `HELLO`
- app sends `PING`
- You can manually send `I2C_SCAN` in Serial Monitor to debug PN532 wiring/address
- You can manually send `WIFI_SCAN` for AP list (SSID/channel/RSSI/auth)
- You can manually send `WIFI_AUDIT` for a quick security summary
- You can manually send `WIFI_AP_START <SSID> [PASSWORD] [CHANNEL]` to start a local AP
- You can manually send `WIFI_AP_STATUS` and `WIFI_AP_STOP` to inspect/stop the AP
- The app stores last used Wi-Fi AP profile locally (`userData/diyflipper/wifi-ap-profile.json`) and reloads it on reconnect

## Notes

- The ESP32 sketch includes placeholder handlers for NFC/IR/BadUSB/Shell.
- Replace placeholders with your real PN532 and IR logic.
- Keep all logic levels at `3.3V`.
