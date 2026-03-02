#pragma once

#include <Arduino.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>

class DiyIrMini {
public:
  explicit DiyIrMini(uint8_t txPin);

  void begin();
  bool isAvailable() const;
  bool send(
    const String& protocol,
    const String& addressHex,
    const String& commandHex,
    uint16_t carrierKhz,
    String* detailOut = nullptr
  );

private:
  bool parseHex32(const String& text, uint32_t* outValue) const;
  void setDetail(String* detailOut, const String& value) const;

  uint8_t txPin_;
  bool available_;
  IRsend sender_;
};
