import { useReference } from '../hooks/useApi'

function PriceRow({ label, price, pct }: { label: string; price: number; pct: number }) {
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)', fontSize: 11 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 11 }}>{price > 0 ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</span>
        <span className={cls} style={{ fontSize: 10, minWidth: 52, textAlign: 'right' }}>{sign}{pct.toFixed(2)}%</span>
      </div>
    </div>
  )
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div className="card-header" style={{ padding: '6px 8px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function ReferencePanel() {
  const { data, isLoading } = useReference()

  if (isLoading) return <div style={{ color: 'var(--muted)', padding: '12px', fontSize: 11 }}>참고자료 로딩 중...</div>
  if (!data) return null

  const vixVal = data.vix?.value ?? 0
  const vixLabel = data.vix?.label ?? '-'
  const fearColor = vixLabel.includes('극단 공포') ? '#f85149'
    : vixLabel.includes('공포') ? '#ef8c34'
    : vixLabel.includes('중립') ? '#8b949e'
    : vixLabel.includes('극단 탐욕') ? '#3fb950' : '#26a69a'

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
        📊 주식 투자 참고 지표
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

        {/* 공포탐욕지수 */}
        <MiniCard title="공포·탐욕 지수 (VIX 기반)">
          <div style={{ padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: fearColor }}>{vixVal > 0 ? vixVal.toFixed(2) : '-'}</div>
            <div style={{ fontSize: 11, color: fearColor, fontWeight: 600, marginTop: 2 }}>{vixLabel}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>VIX &lt;12: 극단탐욕 / &gt;30: 극단공포</div>
          </div>
        </MiniCard>

        {/* 원자재 */}
        <MiniCard title="원자재">
          {(data.commodities ?? []).map((c: any) => (
            <PriceRow key={c.ticker} label={c.label} price={c.price} pct={c.change_pct} />
          ))}
        </MiniCard>

        {/* 주요 ETF */}
        <MiniCard title="주요 ETF">
          {(data.etfs ?? []).filter((e: any) => e.ticker !== '^VIX').map((e: any) => (
            <PriceRow key={e.ticker} label={e.label} price={e.price} pct={e.change_pct} />
          ))}
        </MiniCard>

        {/* 섹터 동향 */}
        <MiniCard title="미국 섹터 동향">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {(data.sectors ?? []).map((s: any) => {
              const cls = s.change_pct > 0 ? 'up' : s.change_pct < 0 ? 'down' : 'flat'
              const sign = s.change_pct > 0 ? '+' : ''
              return (
                <div key={s.ticker} style={{ padding: '3px 8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>{s.label}</span>
                  <span className={cls} style={{ fontSize: 10 }}>{sign}{s.change_pct.toFixed(2)}%</span>
                </div>
              )
            })}
          </div>
        </MiniCard>

        {/* 투자 참고 가이드 */}
        <MiniCard title="투자 지표 해석">
          <div style={{ padding: '6px 8px' }}>
            {[
              ['VIX > 30', '시장 극단 공포 → 매수 기회'],
              ['VIX < 12', '과열 탐욕 → 신중한 접근'],
              ['DXY ↑', '달러 강세 → 신흥국 주의'],
              ['TLT ↑', '채권 강세 → 경기 우려'],
              ['Gold ↑', '안전자산 선호 → 위험 회피'],
              ['Oil ↑', '인플레 압력 → 금리 주의'],
            ].map(([key, val]) => (
              <div key={key} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, flexShrink: 0, minWidth: 60 }}>{key}</span>
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{val}</span>
              </div>
            ))}
          </div>
        </MiniCard>

      </div>
    </div>
  )
}
