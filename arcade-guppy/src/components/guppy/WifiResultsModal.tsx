import { useEffect, useMemo, useRef, useState } from 'react'

type WifiResultsMode = 'SCAN' | 'AUDIT'

type WifiResultsModalProps = {
  isOpen: boolean
  title: string
  mode: WifiResultsMode
  results: string[]
  onClose: () => void
  isCompact?: boolean
  onSelectNetwork?: (network: WifiNetwork) => void
  selectedNetworkKey?: string
  targetNetworkKey?: string
}

export type WifiNetwork = {
  ssid: string
  rssi: number | null
  security: string
  channel: string
  bssid: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
}

function parseRssi(raw: string | undefined): number | null {
  if (!raw) return null
  const matched = raw.match(/-?\d{1,3}/)
  if (!matched) return null
  const value = Number.parseInt(matched[0], 10)
  return Number.isFinite(value) ? value : null
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

function signalLabel(rssi: number | null) {
  if (rssi === null) return 'Unknown'
  if (rssi >= -50) return 'Excellent'
  if (rssi >= -60) return 'Good'
  if (rssi >= -70) return 'Fair'
  if (rssi >= -80) return 'Weak'
  return 'Very weak'
}

function signalColor(rssi: number | null) {
  if (rssi === null) return '#6d8493'
  if (rssi >= -60) return '#33e38a'
  if (rssi >= -70) return '#d4db52'
  return '#ff8b63'
}

function riskColor(risk: WifiNetwork['risk']) {
  if (risk === 'LOW') return '#33e38a'
  if (risk === 'MEDIUM') return '#e6bd45'
  if (risk === 'HIGH') return '#ff6f6f'
  return '#6d8493'
}

export function deauthResilience(network: WifiNetwork): 'HIGH' | 'MEDIUM' | 'LOW' {
  const sec = network.security.toUpperCase()
  if (sec.includes('OPEN') || sec.includes('WEP')) return 'LOW'
  if ((network.rssi ?? -999) < -78) return 'MEDIUM'
  return 'HIGH'
}

export function resilienceColor(level: 'HIGH' | 'MEDIUM' | 'LOW') {
  if (level === 'HIGH') return '#33e38a'
  if (level === 'MEDIUM') return '#e6bd45'
  return '#ff6f6f'
}

export function buildWifiNetworkList(lines: string[]): WifiNetwork[] {
  const parsed = lines
    .map((line) => parseNetworkLine(line))
    .filter((entry): entry is WifiNetwork => Boolean(entry))

  const deduped = new Map<string, WifiNetwork>()
  for (const network of parsed) {
    const key = `${network.ssid}|${network.channel}|${network.security}|${network.bssid}`
    const existing = deduped.get(key)
    if (!existing || (network.rssi ?? -999) > (existing.rssi ?? -999)) {
      deduped.set(key, network)
    }
  }

  return Array.from(deduped.values()).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999))
}

export default function WifiResultsModal({
  isOpen,
  title,
  mode,
  results,
  onClose,
  isCompact = false,
  onSelectNetwork,
  selectedNetworkKey,
  targetNetworkKey,
}: WifiResultsModalProps) {
  const [vendorByBssid, setVendorByBssid] = useState<Record<string, string>>({})
  const selectedRowRef = useRef<HTMLDivElement | null>(null)

  const networks = useMemo(() => buildWifiNetworkList(results), [results])

  useEffect(() => {
    const api = window.electron
    if (!api) return
    const bssids = Array.from(new Set(networks.map((network) => network.bssid).filter(Boolean)))
    if (bssids.length === 0) {
      setVendorByBssid({})
      return
    }
    void api.guppyLookupMacVendors(bssids).then((result) => {
      if (!result?.success) return
      setVendorByBssid(result.vendors ?? {})
    })
  }, [networks])

  const summary = useMemo(() => {
    const total = networks.length
    const openOrWeak = networks.filter((network) => {
      const sec = network.security.toUpperCase()
      return sec.includes('OPEN') || sec.includes('WEP')
    }).length
    const highRisk = networks.filter((network) => network.risk === 'HIGH').length
    const strongest = networks[0]
    const unknownVendors = networks.filter((network) => {
      if (!network.bssid) return true
      const vendor = vendorByBssid[network.bssid] ?? 'Unknown vendor'
      return vendor === 'Unknown vendor'
    }).length
    return {
      total,
      openOrWeak,
      highRisk,
      strongest: strongest ? `${strongest.ssid} (${strongest.rssi ?? 'N/A'} dBm)` : 'n/a',
      unknownVendors,
    }
  }, [networks, vendorByBssid])

  const selectedNetwork = useMemo(
    () => networks.find((network) => `${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey) ?? null,
    [networks, selectedNetworkKey],
  )

  const targetNetwork = useMemo(
    () => networks.find((network) => `${network.ssid}|${network.bssid}|${network.channel}` === targetNetworkKey) ?? null,
    [networks, targetNetworkKey],
  )

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, selectedNetworkKey])

  if (!isOpen) return null

  const headerFont = isCompact ? '19px' : '22px'
  const textFont = isCompact ? '12px' : '13px'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isCompact ? '12px' : '18px',
      }}
      onClick={onClose}
    >
      <section
        style={{
          width: 'min(1440px, 98vw)',
          height: 'min(900px, 94vh)',
          background: '#04111b',
          border: '1px solid #1f6d8f',
          boxShadow: '0 0 30px rgba(51, 187, 255, 0.3)',
          color: '#b6e4ff',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          overflow: 'hidden',
          fontFamily: '"Courier New", monospace',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          style={{
            padding: isCompact ? '12px 14px' : '16px 18px',
            borderBottom: '1px solid #1f6d8f',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: headerFont, color: '#66ddff', letterSpacing: '1px' }}>{title || 'Wi-Fi Results'}</div>
            <div
              style={{
                border: '1px solid #2f8db5',
                padding: '2px 10px',
                fontSize: textFont,
                color: '#9edcff',
                letterSpacing: '1px',
              }}
            >
              MODE {mode}
            </div>
            <div style={{ fontSize: textFont, color: '#8ccff0', letterSpacing: '0.8px' }}>
              DPAD: SELECT NETWORK | A: TARGET | B: BACK
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #66ddff',
              color: '#66ddff',
              fontFamily: 'inherit',
              fontSize: textFont,
              letterSpacing: '1px',
              padding: '6px 16px',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(0, 1fr) 360px',
            minHeight: 0,
          }}
        >
          <div style={{ padding: isCompact ? '12px' : '14px', minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
            <div style={{ fontSize: textFont, color: '#8ccff0', marginBottom: '8px' }}>Parsed network list</div>
            <div style={{ border: '1px solid #1d4f67', background: '#051722', overflow: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.9fr 1.1fr 1.5fr 1fr 0.8fr 1fr 0.9fr 0.8fr',
                  borderBottom: '1px solid #1d4f67',
                  background: '#082538',
                  position: 'sticky',
                  top: 0,
                }}
              >
                {['SSID', 'Signal', 'Vendor', 'Security', 'Channel', 'Resilience', 'Risk', 'Status'].map((header) => (
                  <div key={header} style={{ padding: '10px 12px', fontSize: textFont, color: '#9edcff' }}>{header}</div>
                ))}
              </div>
              {networks.length === 0 ? (
                <div style={{ padding: '16px', color: '#6d8493', fontSize: textFont }}>Waiting for scan lines...</div>
              ) : (
                networks.map((network, index) => (
                  <div
                    key={`${network.ssid}-${network.channel}-${index}`}
                    ref={`${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey ? selectedRowRef : null}
                    onClick={() => onSelectNetwork?.(network)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.9fr 1.1fr 1.5fr 1fr 0.8fr 1fr 0.9fr 0.8fr',
                      borderBottom: '1px solid #143647',
                      alignItems: 'center',
                      cursor: onSelectNetwork ? 'pointer' : 'default',
                      background:
                        `${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey
                          ? 'rgba(102, 221, 255, 0.12)'
                          : `${network.ssid}|${network.bssid}|${network.channel}` === targetNetworkKey
                            ? 'rgba(51, 227, 138, 0.12)'
                            : 'transparent',
                      boxShadow:
                        `${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey
                          ? 'inset 0 0 0 2px rgba(102, 221, 255, 0.65)'
                          : undefined,
                    }}
                  >
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: '#b6e4ff', wordBreak: 'break-word' }}>
                      {network.ssid}
                      {network.bssid ? <div style={{ color: '#6f97ae', fontSize: '10px', marginTop: '4px' }}>{network.bssid}</div> : null}
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: signalColor(network.rssi) }}>
                      {signalLabel(network.rssi)} ({network.rssi ?? 'N/A'} dBm)
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: '#9edcff', wordBreak: 'break-word', maxWidth: '90px' }}>
                      {network.bssid ? (vendorByBssid[network.bssid] ?? 'Unknown vendor') : 'Unknown vendor'}
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: '#9edcff' }}>{network.security || 'Unknown'}</div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: '#9edcff' }}>{network.channel || 'N/A'}</div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: resilienceColor(deauthResilience(network)) }}>
                      {deauthResilience(network)}
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: textFont, color: riskColor(network.risk) }}>{network.risk}</div>
                    <div
                      style={{
                        padding: '10px 12px',
                        fontSize: isCompact ? '11px' : '12px',
                        color:
                          `${network.ssid}|${network.bssid}|${network.channel}` === targetNetworkKey
                            ? '#33e38a'
                            : `${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey
                              ? '#66ddff'
                              : '#7ca8c0',
                        letterSpacing: '0.8px',
                      }}
                    >
                      {`${network.ssid}|${network.bssid}|${network.channel}` === targetNetworkKey
                        ? 'ACTIVE'
                        : `${network.ssid}|${network.bssid}|${network.channel}` === selectedNetworkKey
                          ? 'READY'
                          : 'PRESS A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside
            style={{
              borderLeft: isCompact ? 'none' : '1px solid #1d4f67',
              borderTop: isCompact ? '1px solid #1d4f67' : 'none',
              padding: isCompact ? '12px' : '14px',
              display: 'grid',
              gap: '12px',
              minHeight: 0,
              gridTemplateRows: 'auto minmax(0, 1fr)',
            }}
          >
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont }}>
                Networks: <span style={{ color: '#66ddff' }}>{summary.total}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont }}>
                Open or WEP: <span style={{ color: '#ff8b63' }}>{summary.openOrWeak}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont }}>
                High risk: <span style={{ color: '#ff6f6f' }}>{summary.highRisk}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont, wordBreak: 'break-word' }}>
                Strongest: <span style={{ color: '#33e38a' }}>{summary.strongest}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont }}>
                Unknown vendors: <span style={{ color: '#e6bd45' }}>{summary.unknownVendors}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont, wordBreak: 'break-word' }}>
                Highlighted: <span style={{ color: '#66ddff' }}>{selectedNetwork ? `${selectedNetwork.ssid} / CH${selectedNetwork.channel}` : 'none'}</span>
              </div>
              <div style={{ border: '1px solid #1d4f67', background: '#082538', padding: '12px', fontSize: textFont, wordBreak: 'break-word' }}>
                Current target: <span style={{ color: '#33e38a' }}>{targetNetwork ? `${targetNetwork.ssid} / CH${targetNetwork.channel}` : 'none'}</span>
              </div>
            </div>

            <div style={{ border: '1px solid #1d4f67', background: '#051722', minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
              <div style={{ borderBottom: '1px solid #143647', padding: '10px', fontSize: textFont, color: '#8ccff0' }}>
                Raw device lines ({results.length})
              </div>
              <div style={{ overflow: 'auto', padding: '10px', fontSize: textFont, lineHeight: 1.6, color: '#7cb6d2' }}>
                {results.length === 0
                  ? 'No lines yet.'
                  : results.map((line, index) => (
                      <div key={`${index}-${line.slice(0, 20)}`} style={{ wordBreak: 'break-word', marginBottom: '5px' }}>
                        {line}
                      </div>
                    ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
