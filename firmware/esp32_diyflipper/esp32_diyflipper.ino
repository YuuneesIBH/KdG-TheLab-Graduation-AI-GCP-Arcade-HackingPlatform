/*
  DIY Flipper ESP32 bridge firmware
  Protocol over USB serial (115200, newline-delimited):
    HELLO -> DIYFLIPPER_READY ...
    PING  -> PONG
    RUN NFC_CLONE
    RUN IR_BLAST
    RUN GPIO_CTRL
    RUN BADUSB_INJECT
    RUN SHELL

  This sketch provides a working bridge + status responses so the Electron app
  can auto-connect immediately when the board is plugged in.
*/

#include <Wire.h>
#include <stdio.h>

// Force Arduino library resolver to include these dependencies in the build.
// If one is truly missing, compile will fail clearly instead of silently falling back.
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <PN532_I2C.h>
#include <PN532.h>

#include "diy_ir_mini.h"
#include "diy_nfca_reader.h"

// Optional UART bridge to Pico WH.
static const int PICO_RX_PIN = 16; // ESP32 RX from Pico TX
static const int PICO_TX_PIN = 17; // ESP32 TX to Pico RX
HardwareSerial PicoSerial(1);

// Basic IO placeholders.
static const int STATUS_LED_PIN = 2; // Built-in LED on many ESP32 dev boards
static const int IR_TX_PIN = 4;
static const int IR_RX_PIN = 34;
static const int PN532_IRQ_PIN = 27;
static const int PN532_RST_PIN = 26;
static const char* DEFAULT_IR_PAYLOAD = "NEC 0x20DF 0x10EF 38";

static String usbBuffer;
static String picoBuffer;
static String lastNfcUid = "";
static DiyIrMini irMini(IR_TX_PIN);
static DiyNfcAReader nfcReader(PN532_IRQ_PIN, PN532_RST_PIN);

void printI2cScanResult() {
  uint8_t found = 0;
  Serial.println("I2C_SCAN_BEGIN");
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();
    if (error == 0) {
      char line[20];
      snprintf(line, sizeof(line), "I2C_ADDR:0x%02X", address);
      Serial.println(line);
      found++;
    }
  }
  Serial.print("I2C_SCAN_COUNT:");
  Serial.println(found);
  Serial.println("I2C_SCAN_END");
}

void printReadyBanner() {
  Serial.println("DIYFLIPPER_READY");
  Serial.println("FW:esp32-bridge-v2");
  Serial.println("CAPS:NFC_CLONE,NFC_READ,IR_BLAST,IR_SEND,GPIO_CTRL,BADUSB_INJECT,SHELL");
  Serial.print("HWLIB:IR=");
  Serial.print(irMini.isAvailable() ? "OK" : "INIT_FAIL");
  Serial.print(",NFC=");
  Serial.println(nfcReader.isAvailable() ? "OK" : "NO_HW");
}

void sendOk(const String& detail) {
  Serial.print("OK ");
  Serial.println(detail);
}

void sendErr(const String& detail) {
  Serial.print("ERR ");
  Serial.println(detail);
}

bool parseIrPayload(
  const String& payload,
  String* protocol,
  String* addressHex,
  String* commandHex,
  uint16_t* carrierKhz
) {
  if (!protocol || !addressHex || !commandHex || !carrierKhz) return false;

  char protoBuf[16] = { 0 };
  char addrBuf[20] = { 0 };
  char cmdBuf[20] = { 0 };
  unsigned int carrier = 38;

  const int count = sscanf(payload.c_str(), "%15s %19s %19s %u", protoBuf, addrBuf, cmdBuf, &carrier);
  if (count < 3) {
    return false;
  }

  *protocol = String(protoBuf);
  *addressHex = String(addrBuf);
  *commandHex = String(cmdBuf);
  *carrierKhz = (count >= 4 && carrier > 0 && carrier <= 120) ? static_cast<uint16_t>(carrier) : 38;
  return true;
}

bool runNfcRead(const String& commandLabel) {
  String uid;
  String detail;
  const bool ok = nfcReader.readUid(&uid, 1200, &detail);

  if (!ok) {
    if (detail.length() > 0) {
      Serial.print("NFC_INFO:");
      Serial.println(detail);
    }
    sendErr(commandLabel);
    return false;
  }

  lastNfcUid = uid;
  Serial.print("NFC_UID:");
  Serial.println(lastNfcUid);
  if (detail.length() > 0) {
    Serial.print("NFC_INFO:");
    Serial.println(detail);
  }
  sendOk(commandLabel);
  return true;
}

bool runIrSend(const String& payload, const String& commandLabel) {
  String protocol;
  String addressHex;
  String commandHex;
  uint16_t carrierKhz = 38;

  if (!parseIrPayload(payload, &protocol, &addressHex, &commandHex, &carrierKhz)) {
    Serial.println("IR_ERR:Expected payload format <PROTO> <ADDR_HEX> <CMD_HEX> [CARRIER_KHZ]");
    sendErr(commandLabel);
    return false;
  }

  String detail;
  const bool ok = irMini.send(protocol, addressHex, commandHex, carrierKhz, &detail);
  if (!ok) {
    if (detail.length() > 0) {
      Serial.print("IR_ERR:");
      Serial.println(detail);
    }
    sendErr(commandLabel);
    return false;
  }

  Serial.print("IR_SENT:");
  Serial.println(detail);
  sendOk(commandLabel);
  return true;
}

void runModule(const String& moduleName) {
  // Forward command to Pico side if connected.
  PicoSerial.print("RUN ");
  PicoSerial.println(moduleName);

  if (moduleName == "GPIO_CTRL") {
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    sendOk("RUN GPIO_CTRL");
    return;
  }

  if (moduleName == "IR_BLAST") {
    runIrSend(String(DEFAULT_IR_PAYLOAD), "RUN IR_BLAST");
    return;
  }

  if (moduleName == "NFC_CLONE") {
    runNfcRead("RUN NFC_CLONE");
    return;
  }

  if (moduleName == "BADUSB_INJECT") {
    // Placeholder only. Keep local legal/ethical constraints in mind.
    sendOk("RUN BADUSB_INJECT");
    return;
  }

  if (moduleName == "SHELL") {
    sendOk("RUN SHELL");
    return;
  }

  sendErr("UNKNOWN_MODULE");
}

void handleNfcRead() {
  runNfcRead("NFC_READ");
}

void handleIrSend(const String& payload) {
  runIrSend(payload, "IR_SEND");
}

void handleUsbCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd == "HELLO") {
    printReadyBanner();
    return;
  }

  if (cmd == "PING") {
    Serial.println("PONG");
    return;
  }

  if (cmd == "NFC_READ") {
    handleNfcRead();
    return;
  }

  if (cmd == "I2C_SCAN") {
    printI2cScanResult();
    sendOk("I2C_SCAN");
    return;
  }

  if (cmd.startsWith("IR_SEND ")) {
    String payload = cmd.substring(8);
    payload.trim();
    handleIrSend(payload);
    return;
  }

  if (cmd.startsWith("RUN ")) {
    String moduleName = cmd.substring(4);
    moduleName.trim();
    runModule(moduleName);
    return;
  }

  sendErr("UNKNOWN_COMMAND");
}

void setup() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  pinMode(IR_RX_PIN, INPUT);

  irMini.begin();
  nfcReader.begin(&Wire, 21, 22);

  Serial.begin(115200);
  PicoSerial.begin(115200, SERIAL_8N1, PICO_RX_PIN, PICO_TX_PIN);

  delay(400);
  printReadyBanner();
  if (!nfcReader.isAvailable()) {
    Serial.println("NFC_INFO:PN532 not detected on I2C");
    printI2cScanResult();
  }
}

void loop() {
  while (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == '\n') {
      handleUsbCommand(usbBuffer);
      usbBuffer = "";
    } else if (c != '\r') {
      usbBuffer += c;
    }
  }

  while (PicoSerial.available()) {
    char c = static_cast<char>(PicoSerial.read());
    if (c == '\n') {
      picoBuffer.trim();
      if (picoBuffer.length() > 0) {
        Serial.print("PICO ");
        Serial.println(picoBuffer);
      }
      picoBuffer = "";
    } else if (c != '\r') {
      picoBuffer += c;
    }
  }
}
