#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>

class DiyNfcAReader {
public:
  DiyNfcAReader(uint8_t irqPin, uint8_t resetPin);

  void begin(TwoWire* wire, uint8_t sdaPin, uint8_t sclPin);
  bool isAvailable() const;
  bool readUid(String* uidOut, uint16_t timeoutMs, String* detailOut = nullptr);

private:
  void setDetail(String* detailOut, const String& value) const;
  String uidToHex(const uint8_t* uid, uint8_t uidLength) const;

  uint8_t irqPin_;
  uint8_t resetPin_;
  bool available_;
  PN532_I2C pn532I2c_;
  PN532 pn532_;
};
