#include "diy_ir_mini.h"

#include <stdlib.h>

DiyIrMini::DiyIrMini(uint8_t txPin)
  : txPin_(txPin), available_(false), sender_(txPin) {}

void DiyIrMini::setDetail(String* detailOut, const String& value) const {
  if (detailOut) *detailOut = value;
}

bool DiyIrMini::parseHex32(const String& text, uint32_t* outValue) const {
  if (!outValue) return false;

  String value = text;
  value.trim();
  if (value.startsWith("0x") || value.startsWith("0X")) {
    value = value.substring(2);
  }

  if (value.length() == 0 || value.length() > 8) return false;

  char buffer[10];
  value.toCharArray(buffer, sizeof(buffer));

  char* endptr = nullptr;
  const unsigned long parsed = strtoul(buffer, &endptr, 16);
  if (endptr == buffer || *endptr != '\0') return false;

  *outValue = static_cast<uint32_t>(parsed);
  return true;
}

void DiyIrMini::begin() {
  pinMode(txPin_, OUTPUT);
  digitalWrite(txPin_, LOW);

  sender_.begin();
  available_ = true;
}

bool DiyIrMini::isAvailable() const {
  return available_;
}

bool DiyIrMini::send(
  const String& protocol,
  const String& addressHex,
  const String& commandHex,
  uint16_t carrierKhz,
  String* detailOut
) {
  String normalizedProtocol = protocol;
  normalizedProtocol.trim();
  normalizedProtocol.toUpperCase();

  uint32_t address = 0;
  uint32_t command = 0;
  if (!parseHex32(addressHex, &address) || !parseHex32(commandHex, &command)) {
    setDetail(detailOut, "IR payload must be hex: address + command");
    return false;
  }

  if (carrierKhz < 20 || carrierKhz > 60) carrierKhz = 38;

  if (normalizedProtocol != "NEC" && normalizedProtocol != "NEC32") {
    setDetail(detailOut, "Unsupported IR protocol (currently NEC only)");
    return false;
  }

  sender_.enableIROut(carrierKhz);
  const uint32_t data = ((address & 0xFFFFUL) << 16) | (command & 0xFFFFUL);
  sender_.sendNEC(data, 32);
  delay(45);
  sender_.sendNEC(data, 32);

  char msg[96];
  snprintf(
    msg,
    sizeof(msg),
    "protocol=NEC address=0x%04lX command=0x%04lX data=0x%08lX carrier=%u",
    static_cast<unsigned long>(address & 0xFFFFUL),
    static_cast<unsigned long>(command & 0xFFFFUL),
    static_cast<unsigned long>(data),
    static_cast<unsigned int>(carrierKhz)
  );
  setDetail(detailOut, String(msg));
  return true;
}
