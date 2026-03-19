export type WifiResultsMode = 'SCAN' | 'AUDIT'

export type WifiNetwork = {
  ssid: string
  rssi: number | null
  security: string
  channel: string
  bssid: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
}

const UNKNOWN_RSSI = -999

function parseRssi(raw: string | undefined): number | null {
  if (!raw) return null
  const matched = raw.match(/-?\d{1,3}/)
  if (!matched) return null
  const value = Number.parseInt(matched[0], 10)
  return Number.isFinite(value) ? value : null
}

export function wifiNetworkKey(network: Pick<WifiNetwork, 'ssid' | 'bssid' | 'channel'>): string {
  return `${network.ssid}|${network.bssid}|${network.channel}`
}

function wifiNetworkDedupKey(network: WifiNetwork): string {
  return `${network.ssid}|${network.channel}|${network.security}|${network.bssid}`
}

export function parseNetworkLine(line: string): WifiNetwork | null {
  const trimmed = line.trim()
  if (!trimmed || /^TX\s+/i.test(trimmed)) return null

  const csvMatch = trimmed.match(/^([^,]+),\s*(-?\d{1,3})(?:,\s*([^,]+))?(?:,\s*([^,]+))?$/)
  if (csvMatch) {
    const security = (csvMatch[3] ?? 'Unknown').trim()
    return {
      ssid: csvMatch[1].trim() || '(hidden)',
      rssi: parseRssi(csvMatch[2]),
      security,
      channel: (csvMatch[4] ?? 'N/A').trim(),
      bssid: '',
      risk: securityToRisk(security, trimmed),
    }
  }

  const ssidMatch = trimmed.match(/SSID\s*[:=]\s*([^|,;]+)/i)
  const rssiMatch = trimmed.match(/RSSI\s*[:=]\s*([^|,;]+)/i)
  const securityMatch = trimmed.match(/(?:SECURITY|AUTH|ENC)\s*[:=]\s*([^|,;]+)/i)
  const channelMatch = trimmed.match(/(?:CHANNEL|CHAN)\s*[:=]\s*([^|,;]+)/i)
  const bssidMatch = trimmed.match(/BSSID\s*[:=]\s*([0-9A-Fa-f:-]{17})/i)

  if (!ssidMatch && !rssiMatch && !securityMatch && !channelMatch && !bssidMatch) {
    return null
  }

  const security = (securityMatch?.[1] ?? 'Unknown').trim()
  return {
    ssid: (ssidMatch?.[1] ?? '(hidden)').trim(),
    rssi: parseRssi(rssiMatch?.[1]),
    security,
    channel: (channelMatch?.[1] ?? 'N/A').trim(),
    bssid: (bssidMatch?.[1] ?? '').trim().toUpperCase(),
    risk: securityToRisk(security, trimmed),
  }
}

export function securityToRisk(security: string, rawLine: string): WifiNetwork['risk'] {
  const text = `${security} ${rawLine}`.toUpperCase()
  if (text.includes('WEP') || text.includes('OPEN') || text.includes('VULN') || text.includes('CRITICAL')) {
    return 'HIGH'
  }
  if (text.includes('WPA') || text.includes('WEAK') || text.includes('RISK')) {
    return 'MEDIUM'
  }
  if (text.includes('WPA3') || text.includes('SECURE')) {
    return 'LOW'
  }
  return 'UNKNOWN'
}

export function buildWifiNetworkList(lines: string[]): WifiNetwork[] {
  const parsed = lines
    .map((line) => parseNetworkLine(line))
    .filter((entry): entry is WifiNetwork => Boolean(entry))

  const deduped = new Map<string, WifiNetwork>()
  for (const network of parsed) {
    const key = wifiNetworkDedupKey(network)
    const existing = deduped.get(key)
    if (!existing || (network.rssi ?? UNKNOWN_RSSI) > (existing.rssi ?? UNKNOWN_RSSI)) {
      deduped.set(key, network)
    }
  }

  return Array.from(deduped.values()).sort((a, b) => (b.rssi ?? UNKNOWN_RSSI) - (a.rssi ?? UNKNOWN_RSSI))
}

export function findWifiNetworkByKey(networks: WifiNetwork[], key?: string): WifiNetwork | null {
  if (!key) return null
  return networks.find((network) => wifiNetworkKey(network) === key) ?? null
}

export function deauthResilience(network: WifiNetwork): 'HIGH' | 'MEDIUM' | 'LOW' {
  const sec = network.security.toUpperCase()
  if (sec.includes('OPEN') || sec.includes('WEP')) return 'LOW'
  if ((network.rssi ?? UNKNOWN_RSSI) < -78) return 'MEDIUM'
  return 'HIGH'
}

export function resilienceColor(level: 'HIGH' | 'MEDIUM' | 'LOW') {
  if (level === 'HIGH') return '#33e38a'
  if (level === 'MEDIUM') return '#e6bd45'
  return '#ff6f6f'
}
