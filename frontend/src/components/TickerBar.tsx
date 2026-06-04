import { useIndices, useCrypto, useForex } from '../hooks/useApi'
import type { SearchResult } from '../types'

const CRYPTO_INFO: Record<string, { coinId: string; name: string }> = {
  BTC: { coinId: 'bitcoin',  name: 'Bitcoin' },
  ETH: { coinId: 'ethereum', name: 'Ethereum' },
  XRP: { coinId: 'ripple',   name: 'XRP' },
}

interface ChipItem {
  label: string
  price: number
  pct: number
  unit?: string
  clickable?: SearchResult
}

function Chip({ item, onSelect }: { item: ChipItem; onSelect?: (r: SearchResult) => void }) {
  const cls  = item.pct > 0 ? 'up' : item.pct < 0 ? 'down' : 'flat'
  const sign = item.pct > 0 ? '▲' : item.pct < 0 ? '▼' : '―'
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', borderRight: '1px solid var(--border2)', cursor: item.clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
      onClick={() => item.clickable && onSelect?.(item.clickable)}
    >
      <span style={{ color: 'var(--text2)', fontSize: 10, fontWeight: 600 }}>{item.label}</span>
      <span style={{ fontWeight: 700, fontSize: 12 }}>{item.price > 0 ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}{item.unit ?? ''}</span>
      <span className={cls} style={{ fontSize: 10 }}>{sign} {Math.abs(item.pct).toFixed(2)}%</span>
    </span>
  )
}

export default function TickerBar({ onSelect }: { onSelect?: (r: SearchResult) => void }) {
  const { data: idxData }    = useIndices()
  const { data: cryptoData } = useCrypto()
  const { data: forexData }  = useForex()

  const indices = idxData?.data.filter(d => !d.error) ?? []
  const cryptos = cryptoData?.data ?? []
  const forex   = forexData?.data.filter(d => !d.error).slice(0, 2) ?? []

  const items: ChipItem[] = [
    ...indices.map(d => ({ label: d.name, price: d.price, pct: d.change_pct })),
    ...cryptos.map(d => { const info = CRYPTO_INFO[d.symbol]; return { label: d.symbol, price: d.price, pct: d.change_pct, clickable: info ? { ticker: d.symbol, symbol: d.symbol, name: info.name, type: 'crypto' as const, id: info.coinId } : undefined } }),
    ...forex.map(d => ({ label: d.pair, price: d.price, pct: d.change_pct })),
  ]

  if (items.length === 0) return null
  const track = [...items, ...items]

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 32, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: 'linear-gradient(to right, var(--surface), transparent)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: 'linear-gradient(to left, var(--surface), transparent)' }} />
      <div className="ticker-track" style={{ height: '100%', alignItems: 'center' }}>
        {track.map((item, i) => <Chip key={i} item={item} onSelect={onSelect} />)}
      </div>
    </div>
  )
}
