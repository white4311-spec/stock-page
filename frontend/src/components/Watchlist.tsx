import { useWatchlist } from '../stores/watchlistStore'
import { useStockPrice, useCrypto } from '../hooks/useApi'
import type { SearchResult, WatchItem } from '../types'

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'XRP'])

function WatchRow({ item, onSelect, onRemove }: { item: WatchItem; onSelect: (r: SearchResult) => void; onRemove: () => void }) {
  const isCrypto = item.type === 'crypto' || CRYPTO_SYMBOLS.has(item.ticker)
  const isKR = !isCrypto && (!item.market || ['KOSPI','KOSDAQ','KR'].includes(item.market))
  const { data: cryptoAll } = useCrypto()
  const { data: priceData, isLoading } = useStockPrice(item.ticker, isKR ? 'KR' : 'US', !isCrypto)

  let price = 0, changePct = 0, change = 0
  if (isCrypto) {
    const cd = cryptoAll?.data.find(c => c.symbol.toUpperCase() === item.ticker.toUpperCase())
    price = cd?.price ?? 0; changePct = cd?.change_pct ?? 0; change = cd?.change ?? 0
  } else {
    price = priceData?.price ?? 0; changePct = priceData?.change_pct ?? 0; change = priceData?.change ?? 0
  }

  const cls = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat'
  const sign = changePct > 0 ? '+' : ''
  const arrow = changePct > 0 ? '▲' : changePct < 0 ? '▼' : '―'
  const priceStr = isCrypto ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : price.toLocaleString()

  return (
    <tr onClick={() => onSelect({ ticker: item.ticker, symbol: item.ticker, name: item.name, type: item.type, market: item.market, id: item.coinId })} style={{ cursor: 'pointer' }}>
      <td style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{item.name}</div>
        <div style={{ fontSize: 9, color: 'var(--muted)' }}>{item.ticker} · {item.type === 'crypto' ? '코인' : item.market ?? '주식'}</div>
      </td>
      <td style={{ textAlign: 'right', padding: '5px 4px' }}>
        {isLoading && !isCrypto ? <div style={{ color: 'var(--muted)', fontSize: 10 }}>···</div>
         : price > 0 ? <><div style={{ fontWeight: 700, fontSize: 12 }}>{priceStr}</div><div className={cls} style={{ fontSize: 10 }}>{arrow} {sign}{changePct.toFixed(2)}%</div></>
         : <div style={{ color: 'var(--muted)', fontSize: 10 }}>-</div>}
      </td>
      <td style={{ width: 20, padding: '5px 6px 5px 2px' }}>
        <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </td>
    </tr>
  )
}

export default function Watchlist({ onSelect }: { onSelect: (r: SearchResult) => void }) {
  const { items, remove } = useWatchlist()
  return (
    <div className="card">
      <div className="card-header">
        <span>관심종목</span>
        <span style={{ color: 'var(--muted)', fontSize: 9 }}>{items.length}개 · 60초 갱신</span>
      </div>
      {items.length === 0 && <div style={{ padding: '16px 12px', color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>검색 후 +관심 버튼으로 추가</div>}
      {items.length > 0 && (
        <table className="data-table">
          <thead><tr><th style={{ textAlign: 'left' }}>종목</th><th style={{ textAlign: 'right' }}>현재가 / 등락</th><th style={{ width: 20 }} /></tr></thead>
          <tbody>{items.map(item => <WatchRow key={item.ticker} item={item} onSelect={onSelect} onRemove={() => remove(item.ticker)} />)}</tbody>
        </table>
      )}
    </div>
  )
}
