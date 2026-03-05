/*
  DIY Flipper ESP32 bridge firmware
  Protocol over USB serial (115200, newline-delimited):
    HELLO -> DIYFLIPPER_READY ...
    PING  -> PONG
    WIFI_SCAN
    WIFI_AUDIT
    WIFI_AP_START <SSID> [PASSWORD] [CHANNEL]
    WIFI_AP_STOP
    WIFI_AP_STATUS
    RUN NFC_CLONE
    RUN IR_BLAST
    RUN GPIO_CTRL
    RUN WIFI_AUDIT
    RUN WIFI_AP_START
    RUN BADUSB_INJECT
    RUN SHELL

  This sketch provides a working bridge + status responses so the Electron app
  can auto-connect immediately when the board is plugged in.
*/

#include <Wire.h>
#include <WiFi.h>
#include <stdio.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <PN532_I2C.h>
#include <PN532.h>

#include "diy_ir_mini.h"
#include "diy_nfca_reader.h"
static const int PICO_RX_PIN = 16;
static const int PICO_TX_PIN = 17;
HardwareSerial PicoSerial(1);
static const int STATUS_LED_PIN = 2;
static const int IR_TX_PIN = 4;
static const int IR_RX_PIN = 34;
static const int PN532_IRQ_PIN = 27;
static const int PN532_RST_PIN = 26;
static const char* DEFAULT_IR_PAYLOAD = "NEC 0x20DF 0x10EF 38";
static const char* DEFAULT_SOFTAP_SSID = "DIYFLIPPER_LAB";
static const uint8_t DEFAULT_SOFTAP_CHANNEL = 6;

static String usbBuffer;
static String picoBuffer;
static String lastNfcUid = "";
static DiyIrMini irMini(IR_TX_PIN);
static DiyNfcAReader nfcReader(PN532_IRQ_PIN, PN532_RST_PIN);
static bool wifiApRunning = false;
static String wifiApSsid = "";
static uint8_t wifiApChannel = DEFAULT_SOFTAP_CHANNEL;
static bool wifiApSecured = false;

struct WifiScanStats {
  int total = 0;
  int open = 0;
  int wep = 0;
  int wpa = 0;
  int wpa2 = 0;
  int wpa3 = 0;
  int hidden = 0;
  int weakSignal = 0;
};

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

const char* wifiAuthModeToString(wifi_auth_mode_t mode) {
  switch (mode) {
    case WIFI_AUTH_OPEN:
      return "OPEN";
    case WIFI_AUTH_WEP:
      return "WEP";
    case WIFI_AUTH_WPA_PSK:
      return "WPA_PSK";
    case WIFI_AUTH_WPA2_PSK:
      return "WPA2_PSK";
    case WIFI_AUTH_WPA_WPA2_PSK:
      return "WPA_WPA2_PSK";
#ifdef WIFI_AUTH_WPA2_ENTERPRISE
    case WIFI_AUTH_WPA2_ENTERPRISE:
      return "WPA2_ENTERPRISE";
#endif
#ifdef WIFI_AUTH_WPA3_PSK
    case WIFI_AUTH_WPA3_PSK:
      return "WPA3_PSK";
#endif
#ifdef WIFI_AUTH_WPA2_WPA3_PSK
    case WIFI_AUTH_WPA2_WPA3_PSK:
      return "WPA2_WPA3_PSK";
#endif
#ifdef WIFI_AUTH_WAPI_PSK
    case WIFI_AUTH_WAPI_PSK:
      return "WAPI_PSK";
#endif
#ifdef WIFI_AUTH_OWE
    case WIFI_AUTH_OWE:
      return "OWE";
#endif
    default:
      return "UNKNOWN";
  }
}

String sanitizeWifiField(String value) {
  value.replace("|", "/");
  value.replace("\r", " ");
  value.replace("\n", " ");
  value.trim();
  return value;
}

bool isWpa2Mode(wifi_auth_mode_t mode) {
  return mode == WIFI_AUTH_WPA2_PSK
    || mode == WIFI_AUTH_WPA_WPA2_PSK
#ifdef WIFI_AUTH_WPA2_ENTERPRISE
    || mode == WIFI_AUTH_WPA2_ENTERPRISE
#endif
#ifdef WIFI_AUTH_WPA2_WPA3_PSK
    || mode == WIFI_AUTH_WPA2_WPA3_PSK
#endif
    ;
}

bool isWpa3Mode(wifi_auth_mode_t mode) {
#ifdef WIFI_AUTH_WPA3_PSK
  if (mode == WIFI_AUTH_WPA3_PSK) return true;
#endif
#ifdef WIFI_AUTH_WPA2_WPA3_PSK
  if (mode == WIFI_AUTH_WPA2_WPA3_PSK) return true;
#endif
  return false;
}

void updateWifiStats(
  WifiScanStats* stats,
  wifi_auth_mode_t authMode,
  bool isHidden,
  int32_t rssi
) {
  if (!stats) return;
  stats->total++;
  if (authMode == WIFI_AUTH_OPEN) stats->open++;
  if (authMode == WIFI_AUTH_WEP) stats->wep++;
  if (authMode == WIFI_AUTH_WPA_PSK) stats->wpa++;
  if (isWpa2Mode(authMode)) stats->wpa2++;
  if (isWpa3Mode(authMode)) stats->wpa3++;
  if (isHidden) stats->hidden++;
  if (rssi <= -80) stats->weakSignal++;
}

bool parseWifiApStartPayload(
  const String& payload,
  String* ssid,
  String* password,
  uint8_t* channel
) {
  if (!ssid || !password || !channel) return false;
  *ssid = "";
  *password = "";
  *channel = DEFAULT_SOFTAP_CHANNEL;

  String trimmed = payload;
  trimmed.trim();
  if (trimmed.length() == 0) return false;

  char ssidBuf[33] = { 0 };
  char passBuf[65] = { 0 };
  unsigned int parsedChannel = DEFAULT_SOFTAP_CHANNEL;
  const int count = sscanf(trimmed.c_str(), "%32s %64s %u", ssidBuf, passBuf, &parsedChannel);
  if (count < 1) return false;

  *ssid = String(ssidBuf);
  if (count >= 2) {
    const String secondToken = String(passBuf);
    bool secondTokenIsNumber = true;
    for (uint16_t i = 0; i < secondToken.length(); i++) {
      if (!isDigit(static_cast<unsigned char>(secondToken[i]))) {
        secondTokenIsNumber = false;
        break;
      }
    }

    if (secondTokenIsNumber && count == 2) {
      const int secondAsChannel = secondToken.toInt();
      if (secondAsChannel >= 1 && secondAsChannel <= 13) {
        *channel = static_cast<uint8_t>(secondAsChannel);
      }
    } else {
      *password = secondToken;
    }
  }
  if (count >= 3 && parsedChannel >= 1 && parsedChannel <= 13) {
    *channel = static_cast<uint8_t>(parsedChannel);
  }
  return true;
}

bool startWifiAp(
  const String& ssidRaw,
  const String& passwordRaw,
  uint8_t channel,
  String* detail
) {
  const String ssid = sanitizeWifiField(ssidRaw);
  const String password = sanitizeWifiField(passwordRaw);

  if (ssid.length() == 0 || ssid.length() > 32) {
    if (detail) *detail = "invalid_ssid_length";
    return false;
  }
  if (channel < 1 || channel > 13) {
    if (detail) *detail = "invalid_channel";
    return false;
  }
  if (password.length() > 0 && (password.length() < 8 || password.length() > 63)) {
    if (detail) *detail = "password_must_be_8_to_63_chars_or_empty_for_open_ap";
    return false;
  }

  WiFi.mode(WIFI_AP_STA);
  if (wifiApRunning) {
    WiFi.softAPdisconnect(true);
    delay(40);
  }

  const bool ok = WiFi.softAP(
    ssid.c_str(),
    password.length() > 0 ? password.c_str() : nullptr,
    channel
  );
  if (!ok) {
    if (detail) *detail = "softap_start_failed";
    return false;
  }

  wifiApRunning = true;
  wifiApSsid = ssid;
  wifiApChannel = channel;
  wifiApSecured = (password.length() > 0);

  const IPAddress ip = WiFi.softAPIP();
  if (detail) {
    *detail = "SSID=" + wifiApSsid
      + "|CHAN=" + String(wifiApChannel)
      + "|SEC=" + String(wifiApSecured ? "WPA2" : "OPEN")
      + "|IP=" + ip.toString();
  }
  return true;
}

bool runWifiApStartFromPayload(const String& payload, const String& commandLabel) {
  String ssid;
  String password;
  uint8_t channel = DEFAULT_SOFTAP_CHANNEL;

  if (!parseWifiApStartPayload(payload, &ssid, &password, &channel)) {
    Serial.println("WIFI_AP_ERR:Expected WIFI_AP_START <SSID> [PASSWORD] [CHANNEL]");
    sendErr(commandLabel);
    return false;
  }

  String detail;
  const bool ok = startWifiAp(ssid, password, channel, &detail);
  if (!ok) {
    Serial.print("WIFI_AP_ERR:");
    Serial.println(detail);
    sendErr(commandLabel);
    return false;
  }

  Serial.print("WIFI_AP_INFO:");
  Serial.println(detail);
  sendOk(commandLabel);
  return true;
}

bool runWifiApStartDefault(const String& commandLabel) {
  String detail;
  const bool ok = startWifiAp(String(DEFAULT_SOFTAP_SSID), "", DEFAULT_SOFTAP_CHANNEL, &detail);
  if (!ok) {
    Serial.print("WIFI_AP_ERR:");
    Serial.println(detail);
    sendErr(commandLabel);
    return false;
  }

  Serial.print("WIFI_AP_INFO:");
  Serial.println(detail);
  sendOk(commandLabel);
  return true;
}

bool runWifiApStop(const String& commandLabel) {
  const bool wasRunning = wifiApRunning;
  const bool ok = WiFi.softAPdisconnect(true);

  wifiApRunning = false;
  wifiApSsid = "";
  wifiApChannel = DEFAULT_SOFTAP_CHANNEL;
  wifiApSecured = false;
  WiFi.mode(WIFI_STA);

  if (!ok && wasRunning) {
    Serial.println("WIFI_AP_ERR:softap_stop_failed");
    sendErr(commandLabel);
    return false;
  }

  Serial.println(wasRunning ? "WIFI_AP_INFO:stopped" : "WIFI_AP_INFO:already_stopped");
  sendOk(commandLabel);
  return true;
}

void runWifiApStatus(const String& commandLabel) {
  Serial.println("WIFI_AP_STATUS_BEGIN");
  Serial.print("WIFI_AP_RUNNING:");
  Serial.println(wifiApRunning ? "1" : "0");
  if (wifiApRunning) {
    Serial.print("WIFI_AP_SSID:");
    Serial.println(wifiApSsid);
    Serial.print("WIFI_AP_CHAN:");
    Serial.println(wifiApChannel);
    Serial.print("WIFI_AP_SEC:");
    Serial.println(wifiApSecured ? "WPA2" : "OPEN");
    Serial.print("WIFI_AP_IP:");
    Serial.println(WiFi.softAPIP());
    Serial.print("WIFI_AP_CLIENTS:");
    Serial.println(WiFi.softAPgetStationNum());
  }
  Serial.println("WIFI_AP_STATUS_END");
  sendOk(commandLabel);
}

bool runWifiScan(const String& commandLabel, bool includeAps) {
  WiFi.mode(wifiApRunning ? WIFI_AP_STA : WIFI_STA);
  if (!wifiApRunning) {
    WiFi.disconnect(false, true);
  }
  delay(60);

  Serial.println("WIFI_SCAN_BEGIN");
  const int16_t count = WiFi.scanNetworks(false, true);
  if (count < 0) {
    Serial.println("WIFI_INFO:scan_failed");
    Serial.println("WIFI_SCAN_END");
    sendErr(commandLabel);
    return false;
  }

  WifiScanStats stats;
  for (int i = 0; i < count; i++) {
    const String ssidRaw = WiFi.SSID(i);
    const String ssid = ssidRaw.length() > 0 ? sanitizeWifiField(ssidRaw) : String("<hidden>");
    const int32_t rssi = WiFi.RSSI(i);
    const int32_t channel = WiFi.channel(i);
    const wifi_auth_mode_t authMode = WiFi.encryptionType(i);
    const String bssid = sanitizeWifiField(WiFi.BSSIDstr(i));
    const bool hidden = (ssidRaw.length() == 0);

    updateWifiStats(&stats, authMode, hidden, rssi);
    if (includeAps) {
      Serial.print("WIFI_AP:");
      Serial.print(i + 1);
      Serial.print("|SSID=");
      Serial.print(ssid);
      Serial.print("|RSSI=");
      Serial.print(rssi);
      Serial.print("|CHAN=");
      Serial.print(channel);
      Serial.print("|AUTH=");
      Serial.print(wifiAuthModeToString(authMode));
      Serial.print("|BSSID=");
      Serial.println(bssid);
    }
  }

  Serial.print("WIFI_SCAN_COUNT:");
  Serial.println(stats.total);
  Serial.print("WIFI_OPEN_COUNT:");
  Serial.println(stats.open);
  Serial.print("WIFI_WEP_COUNT:");
  Serial.println(stats.wep);
  Serial.print("WIFI_HIDDEN_COUNT:");
  Serial.println(stats.hidden);
  Serial.print("WIFI_WEAK_SIGNAL_COUNT:");
  Serial.println(stats.weakSignal);
  Serial.println("WIFI_SCAN_END");

  WiFi.scanDelete();
  sendOk(commandLabel);
  return true;
}

bool runWifiAudit(const String& commandLabel) {
  WiFi.mode(wifiApRunning ? WIFI_AP_STA : WIFI_STA);
  if (!wifiApRunning) {
    WiFi.disconnect(false, true);
  }
  delay(60);

  const int16_t count = WiFi.scanNetworks(false, true);
  if (count < 0) {
    Serial.println("WIFI_AUDIT_BEGIN");
    Serial.println("WIFI_AUDIT_ERR:scan_failed");
    Serial.println("WIFI_AUDIT_END");
    sendErr(commandLabel);
    return false;
  }

  WifiScanStats stats;
  for (int i = 0; i < count; i++) {
    const String ssidRaw = WiFi.SSID(i);
    const int32_t rssi = WiFi.RSSI(i);
    const wifi_auth_mode_t authMode = WiFi.encryptionType(i);
    const bool hidden = (ssidRaw.length() == 0);
    updateWifiStats(&stats, authMode, hidden, rssi);
  }

  const bool highRisk = stats.open > 0 || stats.wep > 0;
  const bool mediumRisk = !highRisk && (stats.weakSignal > 0 || stats.hidden > 0);

  Serial.println("WIFI_AUDIT_BEGIN");
  Serial.print("WIFI_AUDIT_TOTAL:");
  Serial.println(stats.total);
  Serial.print("WIFI_AUDIT_OPEN:");
  Serial.println(stats.open);
  Serial.print("WIFI_AUDIT_WEP:");
  Serial.println(stats.wep);
  Serial.print("WIFI_AUDIT_WPA:");
  Serial.println(stats.wpa);
  Serial.print("WIFI_AUDIT_WPA2:");
  Serial.println(stats.wpa2);
  Serial.print("WIFI_AUDIT_WPA3:");
  Serial.println(stats.wpa3);
  Serial.print("WIFI_AUDIT_HIDDEN:");
  Serial.println(stats.hidden);
  Serial.print("WIFI_AUDIT_WEAK_SIGNAL:");
  Serial.println(stats.weakSignal);
  Serial.print("WIFI_AUDIT_RISK:");
  Serial.println(highRisk ? "HIGH" : (mediumRisk ? "MEDIUM" : "LOW"));
  Serial.println("WIFI_AUDIT_END");

  WiFi.scanDelete();
  sendOk(commandLabel);
  return true;
}

void printReadyBanner() {
  Serial.println("DIYFLIPPER_READY");
  Serial.println("FW:esp32-bridge-v2");
  Serial.println("CAPS:NFC_CLONE,NFC_READ,IR_BLAST,IR_SEND,GPIO_CTRL,WIFI_SCAN,WIFI_AUDIT,WIFI_AP_START,WIFI_AP_STOP,WIFI_AP_STATUS,BADUSB_INJECT,SHELL");
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
    sendOk("RUN BADUSB_INJECT");
    return;
  }

  if (moduleName == "SHELL") {
    sendOk("RUN SHELL");
    return;
  }

  if (moduleName == "WIFI_AUDIT") {
    runWifiAudit("RUN WIFI_AUDIT");
    return;
  }

  if (moduleName == "WIFI_AP_START") {
    runWifiApStartDefault("RUN WIFI_AP_START");
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

  if (cmd == "WIFI_SCAN") {
    runWifiScan("WIFI_SCAN", true);
    return;
  }

  if (cmd == "WIFI_AUDIT") {
    runWifiAudit("WIFI_AUDIT");
    return;
  }

  if (cmd == "WIFI_AP_START") {
    runWifiApStartDefault("WIFI_AP_START");
    return;
  }

  if (cmd.startsWith("WIFI_AP_START ")) {
    String payload = cmd.substring(14);
    payload.trim();
    runWifiApStartFromPayload(payload, "WIFI_AP_START");
    return;
  }

  if (cmd == "WIFI_AP_STOP") {
    runWifiApStop("WIFI_AP_STOP");
    return;
  }

  if (cmd == "WIFI_AP_STATUS") {
    runWifiApStatus("WIFI_AP_STATUS");
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
