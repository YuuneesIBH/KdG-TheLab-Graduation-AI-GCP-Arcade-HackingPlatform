
#include <Arduino.h>
#include <PN532_HSU.h>
#include <PN532.h>

static const uint8_t PN532_HSU_RX_PIN = 16;
static const uint8_t PN532_HSU_TX_PIN = 17;
static const unsigned long AUTO_PROBE_INTERVAL_MS = 5000;

HardwareSerial PN532Serial(2);
PN532_HSU pn532Hsu(PN532Serial);
PN532 nfc(pn532Hsu);

String usbLine;
bool pn532Online = false;
unsigned long lastProbeAt = 0;

void printHelp() {
  Serial.println("Commands:");
  Serial.println("  PROBE   - Query PN532 firmware over HSU");
  Serial.println("  READ    - Read NFC-A UID (timeout 1s)");
  Serial.println("  HELP    - Show commands");
}

void probePn532() {
  Serial.println("PN532_PROBE_BEGIN");
  const uint32_t version = nfc.getFirmwareVersion();
  if (!version) {
    pn532Online = false;
    Serial.println("PN532_PROBE_FAIL:no_firmware_response");
    Serial.println("PN532_PROBE_END");
    return;
  }

  const uint8_t chip = (version >> 24) & 0xFF;
  const uint8_t ver = (version >> 16) & 0xFF;
  const uint8_t rev = (version >> 8) & 0xFF;
  const uint8_t support = version & 0xFF;

  char line[96];
  snprintf(
    line,
    sizeof(line),
    "PN532_PROBE_OK:chip=0x%02X fw=%u.%u support=0x%02X",
    chip,
    ver,
    rev,
    support
  );
  Serial.println(line);

  nfc.SAMConfig();
  pn532Online = true;
  Serial.println("PN532_PROBE_END");
}

void readUid() {
  if (!pn532Online) {
    probePn532();
    if (!pn532Online) return;
  }

  uint8_t uid[7] = { 0 };
  uint8_t uidLength = 0;
  const bool ok = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);
  if (!ok || uidLength == 0) {
    Serial.println("NFC_READ_NONE");
    return;
  }

  Serial.print("NFC_UID:");
  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) Serial.print('0');
    Serial.print(uid[i], HEX);
  }
  Serial.println();
}

void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  if (cmd.length() == 0) return;

  if (cmd == "PROBE") {
    probePn532();
    return;
  }
  if (cmd == "READ") {
    readUid();
    return;
  }
  if (cmd == "HELP") {
    printHelp();
    return;
  }

  Serial.print("ERR unknown command: ");
  Serial.println(cmd);
}

void setup() {
  Serial.begin(115200);
  delay(200);

  PN532Serial.begin(115200, SERIAL_8N1, PN532_HSU_RX_PIN, PN532_HSU_TX_PIN);
  nfc.begin();

  Serial.println("PN532_HSU_PROBE_READY");
  Serial.println("Wiring: RX2=GPIO16<-TXD, TX2=GPIO17->RXD, 5V, GND");
  printHelp();

  probePn532();
  lastProbeAt = millis();
}

void loop() {
  while (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == '\n') {
      handleCommand(usbLine);
      usbLine = "";
    } else if (c != '\r') {
      usbLine += c;
    }
  }

  if (!pn532Online && (millis() - lastProbeAt) >= AUTO_PROBE_INTERVAL_MS) {
    probePn532();
    lastProbeAt = millis();
  }
}
