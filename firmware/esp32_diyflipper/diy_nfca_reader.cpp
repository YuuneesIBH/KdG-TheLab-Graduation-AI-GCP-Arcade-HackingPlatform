#include "diy_nfca_reader.h"

DiyNfcAReader::DiyNfcAReader(uint8_t irqPin, uint8_t resetPin)
  : irqPin_(irqPin), resetPin_(resetPin), available_(false), pn532I2c_(Wire), pn532_(pn532I2c_) {}

void DiyNfcAReader::setDetail(String* detailOut, const String& value) const {
  if (detailOut) *detailOut = value;
}

String DiyNfcAReader::uidToHex(const uint8_t* uid, uint8_t uidLength) const {
  if (!uid || uidLength == 0) return "";

  String out;
  for (uint8_t i = 0; i < uidLength; i++) {
    char part[3];
    snprintf(part, sizeof(part), "%02X", uid[i]);
    out += part;
  }
  return out;
}

void DiyNfcAReader::begin(TwoWire* wire, uint8_t sdaPin, uint8_t sclPin) {
  if (wire) {
    wire->begin(sdaPin, sclPin);
  } else {
    Wire.begin(sdaPin, sclPin);
  }
  delay(10);

  if (irqPin_ != 255) {
    pinMode(irqPin_, INPUT_PULLUP);
  }

  if (resetPin_ != 255) {
    pinMode(resetPin_, OUTPUT);
    digitalWrite(resetPin_, LOW);
    delay(20);
    digitalWrite(resetPin_, HIGH);
    delay(20);
  }

  pn532_.begin();

  const uint32_t fwVersion = pn532_.getFirmwareVersion();
  if (!fwVersion) {
    available_ = false;
    return;
  }

  pn532_.SAMConfig();
  available_ = true;
}

bool DiyNfcAReader::isAvailable() const {
  return available_;
}

bool DiyNfcAReader::readUid(String* uidOut, uint16_t timeoutMs, String* detailOut) {
  if (!uidOut) {
    setDetail(detailOut, "Missing output buffer");
    return false;
  }

  if (!available_) {
    setDetail(detailOut, "PN532 not detected on I2C");
    return false;
  }

  uint8_t uid[7] = { 0 };
  uint8_t uidLength = 0;
  const bool ok = pn532_.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, timeoutMs);

  if (!ok || uidLength == 0) {
    setDetail(detailOut, "No NFC-A tag detected");
    return false;
  }

  if (uidLength > sizeof(uid)) {
    setDetail(detailOut, "UID length unsupported");
    return false;
  }

  *uidOut = uidToHex(uid, uidLength);
  setDetail(detailOut, "NFC-A tag read");
  return true;
}
