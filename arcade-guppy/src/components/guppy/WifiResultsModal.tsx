import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildWifiNetworkList,
  deauthResilience,
  findWifiNetworkByKey,
  resilienceColor,
  type WifiNetwork,
  type WifiResultsMode,
  wifiNetworkKey,
} from './wifi-results'

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
  isCloseSelected?: boolean
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
  isCloseSelected = false,
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
    () => findWifiNetworkByKey(networks, selectedNetworkKey),
    [networks, selectedNetworkKey],
  )

  const targetNetwork = useMemo(
    () => findWifiNetworkByKey(networks, targetNetworkKey),
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
              DPAD: SELECT NETWORK/CLOSE | A: TARGET/EXIT | B: BACK
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: isCloseSelected ? 'rgba(102, 221, 255, 0.12)' : 'transparent',
              border: '1px solid #66ddff',
              color: '#66ddff',
              fontFamily: 'inherit',
              fontSize: textFont,
              letterSpacing: '1px',
              padding: '6px 16px',
              cursor: 'pointer',
              boxShadow: isCloseSelected ? '0 0 0 2px rgba(102, 221, 255, 0.65), 0 0 18px rgba(102, 221, 255, 0.24)' : 'none',
              transform: isCloseSelected ? 'translateY(-1px)' : 'none',
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
                networks.map((network, index) => {
                  const networkKey = wifiNetworkKey(network)
                  const isSelected = networkKey === selectedNetworkKey
                  const isTarget = networkKey === targetNetworkKey
                  const resilience = deauthResilience(network)

                  return (
                    <div
                      key={`${networkKey}-${index}`}
                      ref={isSelected ? selectedRowRef : null}
                      onClick={() => onSelectNetwork?.(network)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.9fr 1.1fr 1.5fr 1fr 0.8fr 1fr 0.9fr 0.8fr',
                        borderBottom: '1px solid #143647',
                        alignItems: 'center',
                        cursor: onSelectNetwork ? 'pointer' : 'default',
                        background: isSelected
                          ? 'rgba(102, 221, 255, 0.12)'
                          : isTarget
                            ? 'rgba(51, 227, 138, 0.12)'
                            : 'transparent',
                        boxShadow: isSelected ? 'inset 0 0 0 2px rgba(102, 221, 255, 0.65)' : undefined,
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
                      <div style={{ padding: '10px 12px', fontSize: textFont, color: resilienceColor(resilience) }}>
                        {resilience}
                      </div>
                      <div style={{ padding: '10px 12px', fontSize: textFont, color: riskColor(network.risk) }}>{network.risk}</div>
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: isCompact ? '11px' : '12px',
                          color: isTarget ? '#33e38a' : isSelected ? '#66ddff' : '#7ca8c0',
                          letterSpacing: '0.8px',
                        }}
                      >
                        {isTarget ? 'ACTIVE' : isSelected ? 'READY' : 'PRESS A'}
                      </div>
                    </div>
                  )
                })
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
                Highlighted: <span style={{ color: '#66ddff' }}>{isCloseSelected ? 'close window' : selectedNetwork ? `${selectedNetwork.ssid} / CH${selectedNetwork.channel}` : 'none'}</span>
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
