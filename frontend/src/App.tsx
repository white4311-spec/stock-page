import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TickerBar from './components/TickerBar'
import SearchBar from './components/SearchBar'
import MarketOverview from './components/MarketOverview'
import MarketCapGrid from './components/MarketCapGrid'
import DivergencePanel from './components/DivergencePanel'
import Watchlist from './components/Watchlist'
import type { DivergenceSignal } from './hooks/useApi'
import StockChart from './components/StockChart'
import InvestorHistory from './components/InvestorHistory'
import ReferencePanel from './components/ReferencePanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import ChatPanel from './components/ChatPanel'
import type { SearchResult } from './types'

const queryClient = new QueryClient()

// ── 시장 개장 상태 ─────────────────────────────────────────
type MarketState = '장전' | '장중' | '장후' | '휴장'

function getMarketState(tz: string, open: number, close: number): MarketState {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const day   = local.getDay()               // 0=일, 6=토
  if (day === 0 || day === 6) return '휴장'
  const hhmm  = local.getHours() * 100 + local.getMinutes()
  if (hhmm < open)  return '장전'
  if (hhmm < close) return '장중'
  return '장후'
}

function MarketBadge({ label, state }: { label: string; state: MarketState }) {
  const isOpen  = state === '장중'
  const color   = isOpen ? '#26a69a' : state === '장전' ? '#f0b900' : 'var(--muted)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
      <span
        className={isOpen ? 'market-dot-open' : undefined}
        style={{
          width: 6, height: 6, borderRadius: '50%', background: color,
          display: 'inline-block', flexShrink: 0,
          boxShadow: isOpen ? `0 0 5px ${color}` : 'none',
        }}
      />
      <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{state}</span>
    </span>
  )
}

function useMarketStatus() {
  const [status, setStatus] = useState({ krx: '장전' as MarketState, us: '장전' as MarketState })
  useEffect(() => {
    const update = () => setStatus({
      krx: getMarketState('Asia/Seoul',      900,  1530),
      us:  getMarketState('America/New_York', 930, 1600),
    })
    update()
    const t = setInterval(update, 30_000)
    return () => clearInterval(t)
  }, [])
  return status
}

// ── NYSE 개장/종료 카운트다운 ──────────────────────────────
function useNyseCountdown() {
  const [text, setText] = useState('')
  useEffect(() => {
    const calc = () => {
      const now  = new Date()
      const et   = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const day  = et.getDay()
      const h = et.getHours(), m = et.getMinutes(), s = et.getSeconds()
      const nowMins = h * 60 + m

      // 다음 개장까지 남은 초 계산
      const openMins  = 9 * 60 + 30   // 09:30
      const closeMins = 16 * 60        // 16:00

      if (day === 0 || day === 6) {
        // 주말 → 다음 월요일 09:30
        const daysUntilMon = day === 0 ? 1 : 2
        const diffSec = daysUntilMon * 86400 - (h * 3600 + m * 60 + s) + openMins * 60
        const hh = Math.floor(diffSec / 3600), mm = Math.floor((diffSec % 3600) / 60)
        setText(`개장까지 ${hh}h ${mm}m`)
        return
      }

      if (nowMins < openMins) {
        // 장전
        const diffSec = (openMins - nowMins) * 60 - s
        const hh = Math.floor(diffSec / 3600), mm = Math.floor((diffSec % 3600) / 60), ss = diffSec % 60
        setText(`개장까지 ${hh > 0 ? hh + 'h ' : ''}${mm}m ${ss}s`)
      } else if (nowMins < closeMins) {
        // 장중
        const diffSec = (closeMins - nowMins) * 60 - s
        const hh = Math.floor(diffSec / 3600), mm = Math.floor((diffSec % 3600) / 60)
        setText(`종료까지 ${hh}h ${mm}m`)
      } else {
        // 장후 → 다음날 09:30
        const diffSec = (1440 - nowMins + openMins) * 60 - s
        const hh = Math.floor(diffSec / 3600), mm = Math.floor((diffSec % 3600) / 60)
        const nextDay = day === 5 ? '월' : ['일','월','화','수','목','금','토'][day + 1] ?? ''
        setText(`개장까지 ${nextDay} ${hh}h ${mm}m`)
      }
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [])
  return text
}

// ── 실시간 날짜·시간 ────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function Clock() {
  const now = useClock()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const dayStr = days[now.getDay()]
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>
        {dateStr}
      </span>
      <span style={{
        fontSize: 10, padding: '0px 5px', borderRadius: 3,
        background: 'var(--card2)', color: 'var(--muted)',
        border: '1px solid var(--border)',
      }}>{dayStr}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: 'var(--text)', letterSpacing: '0.5px',
      }}>{timeStr}</span>
    </div>
  )
}

// ── 테마 토글 ──────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('mb-theme') as 'dark' | 'light') || 'dark'
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : ''
    localStorage.setItem('mb-theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

// ── 헤더 ──────────────────────────────────────────────────
function NavHeader({ onSelect }: { onSelect: (r: SearchResult) => void }) {
  const { krx, us } = useMarketStatus()
  const { theme, toggle } = useTheme()
  const nyseCountdown = useNyseCountdown()

  return (
    <header style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '0 16px', height: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      gap: 12,
    }}>
      {/* 좌: 로고 + 날짜시간 + 시장 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div
          onClick={() => window.location.reload()}
          title="새로고침"
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <div style={{
            width: 28, height: 28, background: 'var(--accent)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff',
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >M</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            MarketBoard
          </span>
        </div>

        {/* 날짜·시간 */}
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <Clock />
        </div>

        {/* 시장 상태 배지 */}
        <div style={{ display: 'flex', gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 16, alignItems: 'center' }}>
          <MarketBadge label="KRX" state={krx} />
          <MarketBadge label="NYSE" state={us} />
          {nyseCountdown && (
            <span style={{
              fontSize: 10, fontVariantNumeric: 'tabular-nums',
              color: us === '장중' ? '#26a69a' : 'var(--muted)',
              borderLeft: '1px solid var(--border)', paddingLeft: 12,
            }}>
              🇺🇸 {nyseCountdown}
            </span>
          )}
        </div>
      </div>

      {/* 우: 검색 + 테마 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SearchBar onSelect={onSelect} />
        <button
          onClick={toggle}
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          style={{
            width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}

// ── 대시보드 ───────────────────────────────────────────────
function Dashboard() {
  const [selected,           setSelected]           = useState<SearchResult | null>(null)
  const [selectedDivergence, setSelectedDivergence] = useState<DivergenceSignal | null>(null)
  const [marketTab,          setMarketTab]          = useState<'domestic' | 'us'>('domestic')

  const handleSelect = (r: SearchResult) => {
    setSelected(r)
    setSelectedDivergence(null)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <NavHeader onSelect={handleSelect} />
      <TickerBar onSelect={handleSelect} />

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '240px 1fr 260px',
        gap: 8, padding: '8px 12px 0 12px',
        maxWidth: 1800, margin: '0 auto', width: '100%',
        alignItems: 'start',
      }}>
        {/* 좌측 */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MarketOverview marketTab={marketTab} onTabChange={setMarketTab} />
        </aside>

        {/* 중앙 */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {selected && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { setSelected(null); setSelectedDivergence(null) }} style={{
                  fontSize: 11, color: 'var(--muted)', background: 'var(--card)',
                  border: '1px solid var(--border)', borderRadius: 4,
                  padding: '2px 8px', cursor: 'pointer',
                }}>✕ 닫기</button>
              </div>
              <ErrorBoundary>
                <StockChart item={selected} divergence={selectedDivergence} />
              </ErrorBoundary>
              {selected.type === 'stock' && (selected.market !== 'US') && (
                <ErrorBoundary>
                  <InvestorHistory
                    ticker={selected.ticker || selected.symbol || ''}
                    name={selected.name}
                  />
                </ErrorBoundary>
              )}
            </>
          )}
          {/* 시총 TOP 그리드 */}
          <MarketCapGrid
            market={marketTab}
            onSelect={(ticker, name, market) => handleSelect({ ticker, name, type: 'stock', market })}
          />
        </main>

        {/* 우측 */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Watchlist onSelect={handleSelect} />
          <DivergencePanel onSelect={(r, signal) => { setSelected(r); setSelectedDivergence(signal) }} />
        </aside>
      </div>

      {/* 참고자료 — 국내 탭에서만 표시 (미국탭은 MarketOverview에 중복 표시됨) */}
      {marketTab === 'domestic' && (
        <div style={{
          maxWidth: 1800, margin: '8px auto 0 auto', width: '100%',
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
        }}>
          <ReferencePanel />
        </div>
      )}

      <ChatPanel />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}
