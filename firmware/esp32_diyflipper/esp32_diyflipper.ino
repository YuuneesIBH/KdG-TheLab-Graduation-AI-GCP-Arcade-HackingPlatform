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

static String usbBuffer;
static String picoBuffer;

void printReadyBanner() {
  Serial.println("DIYFLIPPER_READY");
  Serial.println("FW:esp32-bridge-v1");
  Serial.println("CAPS:NFC_CLONE,IR_BLAST,GPIO_CTRL,BADUSB_INJECT,SHELL");
}

void sendOk(const String& detail) {
  Serial.print("OK ");
  Serial.println(detail);
}

void sendErr(const String& detail) {
  Serial.print("ERR ");
  Serial.println(detail);
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
    // Placeholder pulse on IR TX line; replace with real IR carrier code.
    digitalWrite(IR_TX_PIN, HIGH);
    delay(10);
    digitalWrite(IR_TX_PIN, LOW);
    sendOk("RUN IR_BLAST");
    return;
  }

  if (moduleName == "NFC_CLONE") {
    // Placeholder: wire PN532 and replace with real PN532 operations.
    sendOk("RUN NFC_CLONE");
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
  pinMode(IR_TX_PIN, OUTPUT);
  pinMode(IR_RX_PIN, INPUT);
  pinMode(PN532_IRQ_PIN, INPUT_PULLUP);
  pinMode(PN532_RST_PIN, OUTPUT);
  digitalWrite(PN532_RST_PIN, HIGH);

  Wire.begin(21, 22); // ESP32 I2C default SDA/SCL

  Serial.begin(115200);
  PicoSerial.begin(115200, SERIAL_8N1, PICO_RX_PIN, PICO_TX_PIN);

  delay(400);
  printReadyBanner();
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
