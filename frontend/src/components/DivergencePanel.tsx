import { useState } from 'react'
import { useDivergence, useDivergenceUs, type DivergenceSignal } from '../hooks/useApi'
import type { SearchResult } from '../types'

interface Props {
  onSelect: (r: SearchResult, signal: DivergenceSignal) => void
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#f85149' : score >= 50 ? '#f0b900' : '#8b949e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border2)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 700, minWidth: 24 }}>{score}</span>
    </div>
  )
}

function fmtDate(d: string) {
  if (d.length !== 8) return d
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`
}

function SignalRow({ sig, onSelect }: { sig: DivergenceSignal; onSelect: (r: SearchResult, signal: DivergenceSignal) => void }) {
  const isBull  = sig.type === 'bullish'
  const priceDir = isBull ? '↓' : '↑'
  const rsiDir   = isBull ? '↑' : '↓'
  const chgCls   = sig.change_pct > 0 ? 'up' : sig.change_pct < 0 ? 'down' : 'flat'

  return (
    <div
      onClick={() => onSelect({
        ticker: sig.ticker,
        symbol: sig.ticker,
        name:   sig.name,
        type:   'stock',
        market: sig.market ?? 'KR',
      }, sig)}
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* 1행: 종목명 + 현재가 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{sig.name}</span>
          <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 5 }}>
            {sig.ticker} · {sig.market}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{sig.current_price.toLocaleString()}</div>
          <div className={chgCls} style={{ fontSize: 10 }}>
            {sig.change_pct > 0 ? '+' : ''}{sig.change_pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 2행: 다이버전스 세부 정보 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
          background: isBull ? 'rgba(38,166,154,0.15)' : 'rgba(248,81,73,0.15)',
          color: isBull ? '#26a69a' : '#f85149',
        }}>
          {isBull ? '📈 상승 다이버전스' : '📉 하락 다이버전스'}
        </span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>
          가격 {priceDir} ({fmtDate(sig.date1)}→{fmtDate(sig.date2)}) &nbsp;|&nbsp;
          RSI {rsiDir} ({sig.rsi1}→{sig.rsi2})
        </span>
      </div>

      {/* 3행: 신호 강도 바 */}
      <ScoreBar score={sig.score} />
    </div>
  )
}

function SignalList({
  data, isLoading, tab, market, onSelect,
}: {
  data: any; isLoading: boolean; tab: 'bullish' | 'bearish'
  market: 'KR' | 'US'
  onSelect: Props['onSelect']
}) {
  const isAnalyzing = isLoading || data?.status === 'analyzing'
  const signals = tab === 'bullish' ? (data?.bullish ?? []) : (data?.bearish ?? [])
  const mktLabel = market === 'KR' ? 'KOSPI·KOSDAQ' : 'S&P500'

  if (isAnalyzing) return (
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
        🔍 {mktLabel} RSI 다이버전스 분석 중...
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
        {market === 'KR' ? '약 2-3분' : '약 3-5분'} 소요 · 완료 후 자동 업데이트
      </div>
    </div>
  )

  if (signals.length === 0) return (
    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
      현재 {tab === 'bullish' ? '상승' : '하락'} 다이버전스 신호 없음
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', maxHeight: 360 }}>
      {signals.map((sig: DivergenceSignal) => (
        <SignalRow key={sig.ticker} sig={sig} onSelect={onSelect} />
      ))}
    </div>
  )
}

export default function DivergencePanel({ onSelect }: Props) {
  const [market, setMarket] = useState<'KR' | 'US'>('KR')
  const [tab,    setTab]    = useState<'bullish' | 'bearish'>('bullish')

  const krResult = useDivergence()
  const usResult = useDivergenceUs()
  const { data, isLoading } = market === 'KR' ? krResult : usResult

  return (
    <div className="card">
      {/* 헤더 */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            RSI 다이버전스
          </span>
          {data?.updated_at && (
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
              {data.updated_at} ({data.total ?? 0}종목)
            </span>
          )}
        </div>

        {/* KR / US 마켓 선택 */}
        <div style={{ display: 'flex', gap: 4, padding: '6px 12px 0' }}>
          {(['KR', 'US'] as const).map(m => (
            <button key={m} onClick={() => setMarket(m)} style={{
              padding: '2px 10px', fontSize: 10, fontWeight: market === m ? 700 : 500,
              cursor: 'pointer', border: '1px solid',
              borderColor: market === m ? 'var(--accent)' : 'var(--border)',
              borderRadius: 12,
              background: market === m ? 'var(--accent)' : 'transparent',
              color: market === m ? '#fff' : 'var(--muted)',
              transition: 'all 0.12s',
            }}>{m === 'KR' ? '🇰🇷 KR' : '🇺🇸 US'}</button>
          ))}
        </div>

        {/* 상승/하락 탭 */}
        <div style={{ display: 'flex', paddingTop: 4 }}>
          {[
            { key: 'bullish' as const, label: '📈 상승', count: data?.bullish?.length ?? 0 },
            { key: 'bearish' as const, label: '📉 하락', count: data?.bearish?.length ?? 0 },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '6px 16px', fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              cursor: 'pointer', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${tab === t.key
                ? (t.key === 'bullish' ? '#26a69a' : '#f85149') : 'transparent'}`,
              color: tab === t.key
                ? (t.key === 'bullish' ? '#26a69a' : '#f85149') : 'var(--muted)',
              transition: 'all 0.15s',
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  marginLeft: 5, fontSize: 9, padding: '0 5px', borderRadius: 10,
                  background: tab === t.key
                    ? (t.key === 'bullish' ? 'rgba(38,166,154,0.2)' : 'rgba(248,81,73,0.2)')
                    : 'var(--border)',
                  color: tab === t.key
                    ? (t.key === 'bullish' ? '#26a69a' : '#f85149') : 'var(--muted)',
                  fontWeight: 700,
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <SignalList data={data} isLoading={isLoading} tab={tab} market={market} onSelect={onSelect} />

      <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', fontSize: 9, color: 'var(--muted)' }}>
        ※ RSI(14) 기반 · 강도 점수 높을수록 신뢰도↑ · 투자 참고용
      </div>
    </div>
  )
}
