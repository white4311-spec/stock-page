import { useInvestorHistory } from '../hooks/useApi'

interface Props { ticker: string; name: string }

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.abs(value) / max * 100, 100) : 0
  const isPos = value >= 0
  return (
    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: isPos ? 'var(--up)' : 'var(--down)', borderRadius: 3 }} />
    </div>
  )
}

function AmtCell({ value, max }: { value: number; max: number }) {
  const sign = value >= 0 ? '+' : ''
  return (
    <td>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className={value >= 0 ? 'up' : 'down'} style={{ fontWeight: 600, fontSize: 11 }}>
          {sign}{value.toLocaleString()}백만
        </span>
        <Bar value={value} max={max} />
      </div>
    </td>
  )
}

export default function InvestorHistory({ ticker, name }: Props) {
  const { data, isLoading } = useInvestorHistory(ticker, ticker.length > 0)

  if (isLoading) return (
    <div className="card" style={{ padding: 12, color: 'var(--muted)', fontSize: 11 }}>
      투자자 동향 로딩 중...
    </div>
  )

  const rows = data?.data ?? []
  if (rows.length === 0) return null

  const total = rows.reduce(
    (acc, r) => ({
      foreign:     acc.foreign     + r.foreign_net_amt,
      institution: acc.institution + r.institution_net_amt,
      individual:  acc.individual  + r.individual_net_amt,
    }),
    { foreign: 0, institution: 0, individual: 0 },
  )

  const maxAmt = Math.max(
    ...rows.flatMap(r => [
      Math.abs(r.foreign_net_amt),
      Math.abs(r.institution_net_amt),
      Math.abs(r.individual_net_amt),
    ]),
    Math.abs(total.foreign),
    Math.abs(total.institution),
    Math.abs(total.individual),
  )

  const fmtDate = (d: string) =>
    d.length === 8 ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6)}` : d

  const fmtSign = (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}억`

  return (
    <div className="card">
      <div className="card-header">
        <span>📈 {name} — 최근 {rows.length}일 투자자 매매동향</span>
        <span style={{ color: 'var(--muted)', fontSize: 9, fontWeight: 400 }}>단위: 억원</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 540 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: 80 }}>날짜</th>
              <th style={{ minWidth: 140 }}>외국인</th>
              <th style={{ minWidth: 140 }}>기관</th>
              <th style={{ minWidth: 140 }}>개인</th>
            </tr>
          </thead>
          <tbody>
            {/* 10일 합계 행 (최상단, 강조) */}
            <tr style={{ background: 'var(--card2)' }}>
              <td style={{ textAlign: 'left', fontWeight: 700, fontSize: 11 }}>
                {rows.length}일 합계
              </td>
              {[total.foreign, total.institution, total.individual].map((v, i) => (
                <td key={i}>
                  <span
                    className={v >= 0 ? 'up' : 'down'}
                    style={{ fontWeight: 800, fontSize: 12 }}
                  >
                    {fmtSign(v)}
                  </span>
                </td>
              ))}
            </tr>

            {/* 일별 행 */}
            {rows.map(r => (
              <tr key={r.date}>
                <td style={{ textAlign: 'left', color: 'var(--text2)' }}>{fmtDate(r.date)}</td>
                <AmtCell value={r.foreign_net_amt}     max={maxAmt} />
                <AmtCell value={r.institution_net_amt} max={maxAmt} />
                <AmtCell value={r.individual_net_amt}  max={maxAmt} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
