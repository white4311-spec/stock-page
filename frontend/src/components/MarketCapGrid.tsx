import { useMarketCapTop, useStockPrice } from '../hooks/useApi'

// ── 미국 지수별 대표 종목 (8개, 겹치지 않게 구성)
const DJI_TOP8 = [
  { rank: 1, ticker: 'MSFT',  name: 'Microsoft' },
  { rank: 2, ticker: 'UNH',   name: 'UnitedHealth' },
  { rank: 3, ticker: 'GS',    name: 'Goldman Sachs' },
  { rank: 4, ticker: 'HD',    name: 'Home Depot' },
  { rank: 5, ticker: 'CAT',   name: 'Caterpillar' },
  { rank: 6, ticker: 'AXP',   name: 'AmEx' },
  { rank: 7, ticker: 'AMGN',  name: 'Amgen' },
  { rank: 8, ticker: 'V',     name: 'Visa' },
]
const NASDAQ_TOP8 = [
  { rank: 1, ticker: 'NVDA',  name: 'NVIDIA' },
  { rank: 2, ticker: 'AAPL',  name: 'Apple' },
  { rank: 3, ticker: 'AMZN',  name: 'Amazon' },
  { rank: 4, ticker: 'META',  name: 'Meta' },
  { rank: 5, ticker: 'GOOGL', name: 'Alphabet' },
  { rank: 6, ticker: 'TSLA',  name: 'Tesla' },
  { rank: 7, ticker: 'AVGO',  name: 'Broadcom' },
  { rank: 8, ticker: 'NFLX',  name: 'Netflix' },
]

const RANK_COLORS = ['#f0b900', '#c0c0c0', '#cd7f32']

const fmtVol = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return v.toLocaleString()
}
const fmtTradingAmt = (amt?: number) => {
  if (!amt || amt <= 0) return '-'
  const 억 = Math.round(amt / 100_000_000)
  if (억 >= 10_000) return `${(억 / 10_000).toFixed(1)}조`
  return `${억.toLocaleString()}억`
}

// ── 공통 카드 ─────────────────────────────────────────────
interface CardData {
  rank: number
  ticker: string
  name: string
  price: number
  changePct: number
  change: number
  volume?: number
  tradingValue?: number
  mktcap?: string
  per?: number | null
  pbr?: number | null
  roe?: number | null
  eps?: number | null
  isLoading?: boolean
}

function MarketCard({
  data,
  isUs,
  onClick,
}: {
  data: CardData
  isUs: boolean
  onClick: () => void
}) {
  const { rank, ticker, name, price, changePct, change, isLoading } = data
  const isUp   = changePct > 0
  const isDown = changePct < 0
  const cls    = isUp ? 'up' : isDown ? 'down' : 'flat'
  const arrow  = isUp ? '▲' : isDown ? '▼' : '―'

  const rankBg  = rank <= 3 ? RANK_COLORS[rank - 1] : 'var(--border2)'
  const rankTxt = rank <= 3 ? '#000' : 'var(--text2)'
  const topColor = isUp ? 'var(--up)' : isDown ? 'var(--down)' : 'var(--border)'

  const fmtPrice = isUs
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toLocaleString('ko-KR')
  const fmtChg = isUs
    ? (change >= 0 ? '+' : '') + change.toFixed(2)
    : (change >= 0 ? '+' : '') + change.toLocaleString('ko-KR')

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderTop: `2.5px solid ${topColor}`, borderRadius: 8,
        padding: '8px 10px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 3,
        minHeight: 100, transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
    >
      {/* 순위 + 등락률 + 거래정보 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%',
          background: rankBg, color: rankTxt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800, flexShrink: 0,
        }}>{rank}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          {price > 0 && (
            <span className={cls} style={{ fontSize: 10, fontWeight: 700 }}>
              {arrow} {Math.abs(changePct).toFixed(2)}%
            </span>
          )}
          {!isUs && data.volume != null && data.volume > 0 && (
            <span style={{ fontSize: 8, color: 'var(--muted)', lineHeight: 1.3 }}>
              {fmtVol(data.volume)}주
            </span>
          )}
          {!isUs && data.tradingValue != null && data.tradingValue > 0 && (
            <span style={{ fontSize: 8, color: 'var(--muted)', lineHeight: 1.3 }}>
              {fmtTradingAmt(data.tradingValue)}
            </span>
          )}
        </div>
      </div>

      {/* 종목명 */}
      <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 9, color: 'var(--muted)' }}>
        {ticker}
        {data.mktcap && <span style={{ marginLeft: 4, color: 'var(--accent)' }}>{data.mktcap}</span>}
      </div>

      {/* 가격 */}
      <div style={{ marginTop: 'auto' }}>
        {isLoading ? (
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>···</span>
        ) : price > 0 ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.2px' }}>
              {fmtPrice}
              <span style={{ fontSize: 8, color: 'var(--muted)', marginLeft: 2 }}>
                {isUs ? 'USD' : '원'}
              </span>
            </div>
            {change !== 0 && (
              <div className={cls} style={{ fontSize: 9 }}>{fmtChg}</div>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>-</span>
        )}
      </div>

      {/* PER / PBR / ROE / EPS */}
      {!isUs && (data.per != null || data.pbr != null || data.roe != null || data.eps != null) && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '2px 6px', marginTop: 4, paddingTop: 4,
          borderTop: '1px solid var(--border)',
        }}>
          {data.per != null && <span style={{ fontSize: 8, color: 'var(--muted)' }}>PER {data.per}</span>}
          {data.pbr != null && <span style={{ fontSize: 8, color: 'var(--muted)' }}>PBR {data.pbr}</span>}
          {data.roe != null && <span style={{ fontSize: 8, color: 'var(--muted)' }}>ROE {data.roe}%</span>}
          {data.eps != null && <span style={{ fontSize: 8, color: 'var(--muted)' }}>EPS {data.eps.toLocaleString()}</span>}
        </div>
      )}
    </div>
  )
}

// ── KR 시장별 카드 (시가총액 기준) ────────────────────────
function KrMarketSection({
  marketCode,
  label,
  flag,
  onSelect,
}: {
  marketCode: 'J' | 'Q'
  label: string
  flag: string
  onSelect: (ticker: string, name: string) => void
}) {
  const { data, isLoading } = useMarketCapTop(marketCode)
  const stocks = data?.data ?? []

  const fmtMarcap = (v?: number) => {
    if (!v) return ''
    const 조 = Math.floor(v / 1_000_000_000_000)
    return 조 > 0 ? `${조}조` : `${Math.floor(v / 100_000_000)}억`
  }

  return (
    <div>
      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {flag} {label}
        </span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>시가총액 TOP 8</span>
      </div>

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>로딩 중...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 10px' }}>
          {stocks.slice(0, 8).map((s, i) => (
            <MarketCard
              key={s.ticker}
              isUs={false}
              data={{
                rank: i + 1,
                ticker: s.ticker,
                name: s.name,
                price: s.price,
                changePct: s.change_pct,
                change: 0,
                volume: s.volume,
                tradingValue: s.price * (s.volume ?? 0),
                mktcap: fmtMarcap((s as any).marcap),
                per: (s as any).per ?? null,
                pbr: (s as any).pbr ?? null,
                roe: (s as any).roe ?? null,
                eps: (s as any).eps ?? null,
              }}
              onClick={() => onSelect(s.ticker, s.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── US 시장별 카드 (개별 price API) ──────────────────────
function UsStockCard({
  rank, ticker, name,
  onSelect,
}: {
  rank: number; ticker: string; name: string
  onSelect: (ticker: string, name: string, market: string) => void
}) {
  const { data: priceData, isLoading } = useStockPrice(ticker, 'US')
  const pd = priceData as any

  const state        = pd?.market_state ?? 'REGULAR'
  const isPreMarket  = state === 'PRE'
  const isPostMarket = state === 'POST' || state === 'POSTPOST'

  const displayPrice  = isPreMarket  ? (pd?.pre_price   ?? pd?.price      ?? 0)
                      : isPostMarket ? (pd?.post_price  ?? pd?.price      ?? 0)
                      : (pd?.price ?? 0)
  const displayPct    = isPreMarket  ? (pd?.pre_pct     ?? pd?.change_pct ?? 0)
                      : isPostMarket ? (pd?.post_pct    ?? pd?.change_pct ?? 0)
                      : (pd?.change_pct ?? 0)
  const displayChange = isPreMarket  ? (pd?.pre_change  ?? pd?.change     ?? 0)
                      : isPostMarket ? (pd?.post_change ?? pd?.change     ?? 0)
                      : (pd?.change ?? 0)

  return (
    <div style={{ position: 'relative' }}>
      {(isPreMarket || isPostMarket) && (
        <div style={{
          position: 'absolute', top: 4, left: 22, zIndex: 1,
          fontSize: 7, padding: '1px 4px', borderRadius: 3,
          background: isPreMarket ? 'rgba(240,185,0,0.2)' : 'rgba(100,181,246,0.2)',
          color: isPreMarket ? '#f0b900' : '#64b5f6',
          fontWeight: 700, pointerEvents: 'none',
        }}>
          {isPreMarket ? '프리장' : '시간외'}
        </div>
      )}
      <MarketCard
        isUs={true}
        data={{ rank, ticker, name, price: displayPrice, changePct: displayPct, change: displayChange, isLoading }}
        onClick={() => onSelect(ticker, name, 'US')}
      />
    </div>
  )
}

function UsMarketSection({
  label, flag, stocks,
  onSelect,
}: {
  label: string; flag: string
  stocks: { rank: number; ticker: string; name: string }[]
  onSelect: (ticker: string, name: string, market: string) => void
}) {
  return (
    <div>
      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {flag} {label}
        </span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>시총 TOP 8</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 10px' }}>
        {stocks.map(s => (
          <UsStockCard key={s.ticker} {...s} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface Props {
  market: 'domestic' | 'us'
  onSelect: (ticker: string, name: string, market: string) => void
}

export default function MarketCapGrid({ market, onSelect }: Props) {
  const krSelect = (ticker: string, name: string) => onSelect(ticker, name, 'KR')

  if (market === 'us') {
    return (
      <div className="card">
        <div className="card-header">
          <span>🏆 미국 지수별 TOP 8</span>
          <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>클릭 → 차트</span>
        </div>
        <UsMarketSection label="Dow Jones" flag="📈" stocks={DJI_TOP8} onSelect={onSelect} />
        <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
        <UsMarketSection label="NASDAQ 100" flag="💻" stocks={NASDAQ_TOP8} onSelect={onSelect} />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <span>🏆 국내 시장별 TOP 8</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>거래량 기준 · 클릭 → 차트</span>
      </div>
      <KrMarketSection marketCode="J" label="KOSPI" flag="🔴" onSelect={krSelect} />
      <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
      <KrMarketSection marketCode="Q" label="KOSDAQ" flag="🔵" onSelect={krSelect} />
    </div>
  )
}
