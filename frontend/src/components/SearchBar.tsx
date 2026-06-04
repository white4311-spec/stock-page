import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useSearch } from '../hooks/useApi'
import { useWatchlist } from '../stores/watchlistStore'
import type { SearchResult } from '../types'

interface Props { onSelect: (r: SearchResult) => void }

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [focused, setFocused] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useSearch(query)
  const { add, has } = useWatchlist()
  const results = data?.results ?? []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[focused]
      if (r) { onSelect(r); setQuery(''); setOpen(false); setFocused(0) }
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: 300 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(0) }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={handleKey}
        placeholder="🔍 종목명, 코인 검색..."
        style={{
          width: '100%', padding: '5px 12px', borderRadius: 4, fontSize: 12,
          background: 'var(--card)', border: '1px solid var(--border2)',
          color: 'var(--text)', outline: 'none',
        }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 4, marginTop: 2, maxHeight: 300, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => { onSelect(r); setQuery(''); setOpen(false) }}
              style={{
                padding: '7px 12px', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                background: i === focused ? 'var(--card2)' : 'transparent',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={() => setFocused(i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.thumb && <img src={r.thumb} width={14} height={14} style={{ borderRadius: 2 }} />}
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>{r.ticker || r.symbol}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  background: r.type === 'crypto' ? '#f0b90015' : '#2962ff15',
                  color: r.type === 'crypto' ? '#f0b900' : '#2962ff',
                }}>{r.type === 'crypto' ? '코인' : r.market || '주식'}</span>
                {!has(r.ticker || r.symbol || '') && (
                  <button
                    onClick={e => { e.stopPropagation(); add({ ticker: r.ticker || r.symbol || '', name: r.name, type: r.type, market: r.market, coinId: r.id }) }}
                    style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--border)', color: 'var(--text2)', cursor: 'pointer', border: 'none' }}
                  >+관심</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
