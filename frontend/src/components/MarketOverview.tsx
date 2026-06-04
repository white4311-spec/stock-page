import { useState } from 'react'
import { useForex, useBonds, useInvestors, useIndices, useReference, useAdr } from '../hooks/useApi'
import type { AdrData } from '../hooks/useApi'

// ── 공통 헬퍼 ───────────────────────────────────────────────────
function Row({ label, value, pct, suffix = '' }: { label: string; value: number; pct?: number; suffix?: string }) {
  const cls = (pct ?? 0) > 0 ? 'up' : (pct ?? 0) < 0 ? 'down' : 'flat'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)', fontSize: 11 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{value.toLocaleString(undefined, { maximumFractionDigits: 3 })}{suffix}</span>
        {pct !== undefined && (
          <span className={cls} style={{ fontSize: 10 }}>
            {(pct > 0 ? '+' : '')}{pct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <span>{title}</span>
        {badge && <span style={{ color: 'var(--muted)', fontSize: 9, fontWeight: 400 }}>{badge}</span>}
      </div>
      <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
  )
}

// ── ADR 행 컴포넌트 ────────────────────────────────────────────
function AdrRow({ label, d }: { label: string; d: AdrData | null }) {
  if (!d) return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)', fontSize: 11 }}>{label} ADR</span>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>-</span>
    </div>
  )

  const adr = d.adr ?? 0
  const adrColor =
    adr >= 150 ? 'var(--up)' :
    adr >= 110 ? '#ef8c34' :
    adr >= 90  ? 'var(--text2)' :
    adr >= 60  ? '#64b5f6' : 'var(--down)'

  const upPct = d.total > 0 ? d.up / d.total : 0
  const downPct = d.total > 0 ? d.down / d.total : 0

  return (
    <div style={{ padding: '5px 12px 6px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: 'var(--text2)', fontSize: 11 }}>{label} ADR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--up)' }}>▲{d.up}</span>
          <span style={{ fontSize: 9, color: 'var(--down)' }}>▼{d.down}</span>
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>―{d.flat}</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: adrColor }}>{d.adr != null ? d.adr.toFixed(1) : '-'}</span>
        </div>
      </div>
      {/* 상승/하락 바 */}
      <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
        <div style={{ flex: upPct, background: 'var(--up)', opacity: 0.7 }} />
        <div style={{ flex: downPct, background: 'var(--down)', opacity: 0.7 }} />
        <div style={{ flex: 1 - upPct - downPct, background: 'var(--border2)' }} />
      </div>
    </div>
  )
}

// ── 국내 탭 ──────────────────────────────────────────────────
function DomesticTab() {
  const { data: forexData }     = useForex()
  const { data: bondsData }     = useBonds()
  const { data: investorsData } = useInvestors()
  const { data: adrData }       = useAdr()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 투자자 동향 */}
      <SectionCard title="투자자 동향" badge={investorsData?.date}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>구분</th>
              <th>순매수(억원)</th>
              <th>방향</th>
            </tr>
          </thead>
          <tbody>
            {investorsData?.data.map(inv => {
              const isPos = inv.direction === 'buy'
              return (
                <tr key={inv.type}>
                  <td style={{ fontWeight: 600 }}>{inv.label}</td>
                  <td className={isPos ? 'up' : 'down'} style={{ fontWeight: 700 }}>
                    {isPos ? '+' : ''}{inv.net_amt.toLocaleString()}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 10,
                      background: isPos ? 'rgba(239,83,80,0.15)' : 'rgba(33,150,243,0.15)',
                      color: isPos ? 'var(--up)' : 'var(--down)',
                    }}>{isPos ? '순매수' : '순매도'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {investorsData?.note && (
          <div style={{ padding: '4px 12px', fontSize: 9, color: 'var(--muted)' }}>※ {investorsData.note}</div>
        )}
      </SectionCard>

      {/* 환율 */}
      <SectionCard title="환율">
        {forexData?.data.filter(d => !d.error).map(d => (
          <Row key={d.pair} label={d.pair} value={d.price} pct={d.change_pct} suffix="원" />
        ))}
      </SectionCard>

      {/* 국체 금리 */}
      <SectionCard title="국체 금리">
        {bondsData?.data.map(d => (
          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text2)', fontSize: 11 }}>{d.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{d.price > 0 ? d.price.toFixed(3) : '-'}%</span>
              {d.change_pct !== undefined && d.price > 0 && (
                <span className={d.change_pct > 0 ? 'up' : d.change_pct < 0 ? 'down' : 'flat'} style={{ fontSize: 10 }}>
                  {d.change_pct > 0 ? '+' : ''}{d.change_pct.toFixed(2)}%
                </span>
              )}
              {(d as any).note && <span style={{ fontSize: 9, color: 'var(--muted)' }}>참고</span>}
            </div>
          </div>
        ))}
      </SectionCard>

      {/* 등락비율 ADR */}
      <SectionCard title="등락비율 ADR" badge="상승/하락 종목수 비율">
        <AdrRow label="KOSPI"  d={adrData?.kospi  ?? null} />
        <AdrRow label="KOSDAQ" d={adrData?.kosdaq ?? null} />
        <div style={{ padding: '3px 12px', fontSize: 9, color: 'var(--muted)' }}>
          ADR = 상승수 ÷ 하락수 × 100 &nbsp;·&nbsp; 100 이상: 강세장
        </div>
      </SectionCard>
    </div>
  )
}

// ── 미국 탭 ──────────────────────────────────────────────────
function VixGauge({ value, label }: { value: number; label: string }) {
  const MAX_VIX = 50
  const pct = Math.min(value / MAX_VIX * 100, 100)
  const fearColor =
    value >= 30 ? '#f85149' :
    value >= 20 ? '#ef8c34' :
    value >= 15 ? '#8b949e' :
    value >= 12 ? '#3fb950' : '#26a69a'

  return (
    <div style={{ padding: '10px 12px' }}>
      {/* 수치 + 라벨 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: fearColor }}>{value > 0 ? value.toFixed(2) : '-'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: fearColor }}>{label}</span>
      </div>
      {/* 게이지 바 */}
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(to right, #26a69a, #3fb950, #f0b900, #ef8c34, #f85149)', overflow: 'visible' }}>
        {/* 현재 위치 마커 */}
        <div style={{
          position: 'absolute', top: -3, left: `${pct}%`,
          transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: fearColor, border: '2px solid var(--card)',
          boxShadow: `0 0 6px ${fearColor}`,
        }} />
      </div>
      {/* 범례 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--muted)' }}>
        <span>극단탐욕(≤12)</span>
        <span>중립(15-20)</span>
        <span>극단공포(≥30)</span>
      </div>
    </div>
  )
}

function SectorGrid({ sectors }: { sectors: Array<{ label: string; change_pct: number }> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {sectors.map(s => {
        const pct = s.change_pct
        const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
        const bg  = pct > 0
          ? `rgba(239,83,80,${Math.min(Math.abs(pct) / 3, 1) * 0.18})`
          : `rgba(33,150,243,${Math.min(Math.abs(pct) / 3, 1) * 0.18})`
        return (
          <div key={s.label} style={{
            padding: '5px 8px', borderBottom: '1px solid var(--border)',
            background: bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{s.label}</span>
            <span className={cls} style={{ fontSize: 10, fontWeight: 700 }}>
              {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function UsTab() {
  const { data: idxData } = useIndices()
  const { data: refData } = useReference()

  const usIndices = (idxData?.data ?? []).filter(d =>
    ['S&P500', 'NASDAQ', 'DJI'].includes(d.name) && !d.error
  )
  const vixVal   = refData?.vix?.value ?? 0
  const vixLabel = refData?.vix?.label ?? '-'
  const sectors  = (refData?.sectors ?? []) as Array<{ label: string; ticker: string; change_pct: number }>
  const etfs     = (refData?.etfs ?? []).filter((e: any) => e.ticker !== '^VIX') as Array<{ label: string; ticker: string; price: number; change_pct: number }>
  const commodities = (refData?.commodities ?? []) as Array<{ label: string; ticker: string; price: number; change_pct: number }>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* 미국 주요 지수 */}
      <div className="card">
        <div className="card-header">
          <span>미국 주요 지수</span>
          <span style={{ color: 'var(--muted)', fontSize: 9 }}>NYSE · NASDAQ</span>
        </div>
        {usIndices.map(idx => {
          const cls = idx.change_pct > 0 ? 'up' : idx.change_pct < 0 ? 'down' : 'flat'
          const sign = idx.change_pct > 0 ? '▲' : idx.change_pct < 0 ? '▼' : '―'
          return (
            <div key={idx.name} style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{idx.name}</div>
                <div className={cls} style={{ fontSize: 10 }}>
                  {sign} {Math.abs(idx.change_pct).toFixed(2)}%
                  <span style={{ color: 'var(--muted)', marginLeft: 4 }}>
                    ({idx.change > 0 ? '+' : ''}{idx.change.toFixed(2)})
                  </span>
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14 }}>
                {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )
        })}
        {usIndices.length === 0 && (
          <div style={{ padding: '12px', color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>로딩 중...</div>
        )}
      </div>

      {/* VIX 공포탐욕 게이지 */}
      <div className="card">
        <div className="card-header">
          <span>VIX 공포탐욕 지수</span>
          <span style={{ color: 'var(--muted)', fontSize: 9 }}>CBOE Volatility</span>
        </div>
        <VixGauge value={vixVal} label={vixLabel} />
      </div>

      {/* 섹터 히트맵 */}
      <div className="card">
        <div className="card-header">
          <span>미국 섹터 동향</span>
          <span style={{ color: 'var(--muted)', fontSize: 9 }}>S&P 11개 섹터</span>
        </div>
        {sectors.length > 0
          ? <SectorGrid sectors={sectors} />
          : <div style={{ padding: '12px', color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>로딩 중...</div>
        }
      </div>

      {/* 주요 ETF */}
      <SectionCard title="주요 ETF">
        {etfs.map(e => <Row key={e.ticker} label={e.label || e.ticker} value={e.price} pct={e.change_pct} />)}
        {etfs.length === 0 && <div style={{ padding: '12px', color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>로딩 중...</div>}
      </SectionCard>

      {/* 원자재 */}
      <SectionCard title="원자재">
        {commodities.map(c => <Row key={c.ticker} label={c.label} value={c.price} pct={c.change_pct} />)}
        {commodities.length === 0 && <div style={{ padding: '12px', color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>로딩 중...</div>}
      </SectionCard>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
interface MarketOverviewProps {
  marketTab: 'domestic' | 'us'
  onTabChange: (tab: 'domestic' | 'us') => void
}

export default function MarketOverview({ marketTab, onTabChange }: MarketOverviewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 탭 헤더 */}
      <div style={{
        display: 'flex', borderRadius: '6px 6px 0 0', overflow: 'hidden',
        border: '1px solid var(--border)', borderBottom: 'none',
        background: 'var(--surface)',
      }}>
        {[
          { key: 'domestic' as const, label: '🇰🇷 국내' },
          { key: 'us'       as const, label: '🇺🇸 미국' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            style={{
              flex: 1, padding: '8px 0', fontSize: 11, fontWeight: marketTab === t.key ? 700 : 500,
              cursor: 'pointer', border: 'none', borderBottom: '2px solid',
              borderColor: marketTab === t.key ? 'var(--accent)' : 'transparent',
              background: marketTab === t.key ? 'var(--card)' : 'transparent',
              color: marketTab === t.key ? 'var(--text)' : 'var(--muted)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ paddingTop: 8 }}>
        {marketTab === 'domestic' ? <DomesticTab /> : <UsTab />}
      </div>
    </div>
  )
}
