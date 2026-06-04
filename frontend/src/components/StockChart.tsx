import { useEffect, useRef, useState } from 'react'
import {
  createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers,
  type IChartApi, type ISeriesApi, type SeriesType,
} from 'lightweight-charts'
import { useStockChart, useCryptoChart, type DivergenceSignal } from '../hooks/useApi'
import { toOhlc, toVolume, sma, bollingerBands, rsi, macd, toTime } from '../utils/indicators'
import type { SearchResult } from '../types'

const PERIODS = ['1m', '3m', '6m', '1y', '5y', '10y'] as const
type Period = typeof PERIODS[number]

const MA_COLORS = { 5: '#f0b900', 20: '#58a6ff', 60: '#3fb950', 120: '#f85149' }

interface Props { item: SearchResult; divergence?: DivergenceSignal | null }

const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple',
}

const DAYS_MAP: Record<Period, number> = { '1m': 30, '3m': 90, '6m': 180, '1y': 365, '5y': 1825, '10y': 3650 }

const LOOKBACK_PERIOD: Record<Period, Period> = {
  '1m': '6m', '3m': '6m', '6m': '1y',
  '1y': '1y', '5y': '5y', '10y': '10y',
}

function useChartData(item: SearchResult, period: Period) {
  const coinId    = item.coinId || CRYPTO_ID_MAP[item.symbol || ''] || ''
  const isKR      = item.type === 'stock' && (!item.market || item.market === 'KOSPI' || item.market === 'KOSDAQ' || item.market === 'KR')
  const ticker    = item.ticker || item.symbol || ''
  const fetchPeriod = LOOKBACK_PERIOD[period]

  const stockData  = useStockChart(ticker, fetchPeriod, isKR ? 'KR' : 'US', item.type === 'stock')
  const cryptoData = useCryptoChart(coinId, DAYS_MAP[period], item.type === 'crypto')

  if (item.type === 'crypto') return { data: cryptoData.data?.data ?? [], loading: cryptoData.isLoading }
  return { data: stockData.data?.data ?? [], loading: stockData.isLoading }
}

export default function StockChart({ item, divergence }: Props) {
  const [period, setPeriod]   = useState<Period>('3m')
  const [indicators, setIndicators] = useState({ ma5: true, ma20: true, ma60: false, ma120: false, bb: false, vol: true, rsi: true, macd: false })
  const { data: candles, loading } = useChartData(item, period)

  useEffect(() => {
    if (divergence) setIndicators(s => ({ ...s, rsi: true }))
  }, [divergence])

  const mainRef  = useRef<HTMLDivElement>(null)
  const rsiRef   = useRef<HTMLDivElement>(null)
  const macdRef  = useRef<HTMLDivElement>(null)

  const chartRefs = useRef<{ main?: IChartApi; rsi?: IChartApi; macd?: IChartApi }>({})
  const seriesRefs = useRef<Partial<Record<string, ISeriesApi<SeriesType>>>>({})

  const toggle = (key: keyof typeof indicators) =>
    setIndicators(s => ({ ...s, [key]: !s[key] }))

  useEffect(() => {
    if (!mainRef.current || candles.length === 0) return

    Object.values(chartRefs.current).forEach(c => c?.remove())
    chartRefs.current = {}
    seriesRefs.current = {}

    const baseOpts = {
      autoSize: true,
      layout: { background: { color: '#1c2128' }, textColor: '#8b949e' },
      grid: { vertLines: { color: '#30363d' }, horzLines: { color: '#30363d' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#30363d' },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    }

    const main = createChart(mainRef.current, { ...baseOpts, height: 400 })
    chartRefs.current.main = main

    const ohlc = toOhlc(candles)
    const volData = toVolume(candles)

    const isUsStock = item.market === 'US'
    const candleSeries = main.addSeries(CandlestickSeries, {
      upColor: '#f85149', downColor: '#58a6ff',
      borderUpColor: '#f85149', borderDownColor: '#58a6ff',
      wickUpColor: '#f85149', wickDownColor: '#58a6ff',
      priceFormat: {
        type: 'custom',
        formatter: (p: number) =>
          isUsStock
            ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : Math.round(p).toLocaleString('ko-KR'),
        minMove: isUsStock ? 0.01 : 1,
      },
    })
    candleSeries.setData(ohlc as any)

    if (indicators.vol) {
      const volSeries = main.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      })
      volSeries.setData(volData as any)
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
        visible: false,
      })
    }

    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.28 } })

    const maMap = { ma5: 5, ma20: 20, ma60: 60, ma120: 120 } as const
    for (const [key, p] of Object.entries(maMap) as [keyof typeof MA_COLORS, number][]) {
      if (indicators[key as keyof typeof indicators]) {
        const s = main.addSeries(LineSeries, { color: MA_COLORS[p as keyof typeof MA_COLORS], lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        s.setData(sma(candles, p) as any)
        seriesRefs.current[key] = s
      }
    }

    if (indicators.bb) {
      const { upper, middle, lower } = bollingerBands(candles)
      const opts = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false }
      main.addSeries(LineSeries, { ...opts, color: '#d29922' }).setData(upper as any)
      main.addSeries(LineSeries, { ...opts, color: '#8b949e', lineStyle: 2 }).setData(middle as any)
      main.addSeries(LineSeries, { ...opts, color: '#d29922' }).setData(lower as any)
    }

    if (indicators.rsi && rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, { ...baseOpts, height: 100 })
      chartRefs.current.rsi = rsiChart
      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#f0b900', lineWidth: 1, priceLineVisible: false })
      rsiSeries.setData(rsi(candles) as any)
      seriesRefs.current['rsiLine'] = rsiSeries
      rsiChart.addSeries(LineSeries, { color: '#f8514960', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
        .setData(ohlc.map(p => ({ time: p.time, value: 70 })) as any)
      rsiChart.addSeries(LineSeries, { color: '#58a6ff60', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
        .setData(ohlc.map(p => ({ time: p.time, value: 30 })) as any)
    }

    if (indicators.macd && macdRef.current) {
      const macdChart = createChart(macdRef.current, { ...baseOpts, height: 100 })
      chartRefs.current.macd = macdChart
      const { macdPoints, signalPoints, histPoints } = macd(candles)
      macdChart.addSeries(HistogramSeries, { color: '#3fb950', priceLineVisible: false }).setData(histPoints as any)
      macdChart.addSeries(LineSeries, { color: '#f85149', lineWidth: 1, priceLineVisible: false }).setData(macdPoints as any)
      macdChart.addSeries(LineSeries, { color: '#58a6ff', lineWidth: 1, priceLineVisible: false }).setData(signalPoints as any)
    }

    if (divergence) {
      const isBull   = divergence.type === 'bullish'
      const divColor = isBull ? '#26a69a' : '#f85149'
      const t1 = toTime(divergence.date1)
      const t2 = toTime(divergence.date2)

      const priceTrend = main.addSeries(LineSeries, {
        color: divColor, lineWidth: 2, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      priceTrend.setData([
        { time: t1, value: divergence.price1 },
        { time: t2, value: divergence.price2 },
      ] as any)

      createSeriesMarkers(candleSeries, [
        {
          time: t1 as any,
          position: isBull ? 'belowBar' : 'aboveBar',
          color: divColor,
          shape: 'circle',
          text: `D1`,
          size: 1,
        },
        {
          time: t2 as any,
          position: isBull ? 'belowBar' : 'aboveBar',
          color: divColor,
          shape: isBull ? 'arrowUp' : 'arrowDown',
          text: isBull ? '↑반등?' : '↓하락?',
          size: 1,
        },
      ])

      const rsiLineSeries = seriesRefs.current['rsiLine'] as ISeriesApi<'Line'> | undefined
      if (chartRefs.current.rsi && rsiLineSeries) {
        const rsiTrend = chartRefs.current.rsi.addSeries(LineSeries, {
          color: divColor, lineWidth: 2, lineStyle: 0,
          priceLineVisible: false, lastValueVisible: false,
        })
        rsiTrend.setData([
          { time: t1, value: divergence.rsi1 },
          { time: t2, value: divergence.rsi2 },
        ] as any)

        createSeriesMarkers(rsiLineSeries, [
          { time: t1 as any, position: 'inBar', color: divColor, shape: 'circle', text: `${divergence.rsi1}`, size: 0.8 },
          { time: t2 as any, position: 'inBar', color: divColor, shape: 'circle', text: `${divergence.rsi2}`, size: 0.8 },
        ])
      }
    }

    const allCharts = Object.values(chartRefs.current).filter(Boolean) as IChartApi[]
    allCharts.forEach(c => {
      c.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (!range) return
        allCharts.forEach(other => { if (other !== c) other.timeScale().setVisibleLogicalRange(range) })
      })
    })

    if (LOOKBACK_PERIOD[period] !== period && ohlc.length > 0) {
      const lastTs = ohlc[ohlc.length - 1].time as number
      const fromTs = lastTs - DAYS_MAP[period] * 86400
      main.timeScale().setVisibleRange({ from: fromTs as any, to: (lastTs + 86400) as any })
    } else {
      main.timeScale().fitContent()
    }

    return () => { Object.values(chartRefs.current).forEach(c => c?.remove()); chartRefs.current = {} }
  }, [candles, indicators, period, divergence])

  const btnStyle = (active: boolean, color = 'var(--blue)') => ({
    padding: '2px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
    background: active ? color : 'var(--surface)',
    color: active ? '#fff' : 'var(--muted)',
    border: '1px solid var(--border)',
  })

  const lastCandle  = candles[candles.length - 1]
  const prevCandle  = candles[candles.length - 2]
  const closePrice  = lastCandle?.close ?? 0
  const prevClose   = prevCandle?.close ?? closePrice
  const priceChange = closePrice - prevClose
  const pricePct    = prevClose > 0 ? (priceChange / prevClose) * 100 : 0
  const priceClass  = pricePct > 0 ? 'up' : pricePct < 0 ? 'down' : 'flat'
  const priceArrow  = pricePct > 0 ? '▲' : pricePct < 0 ? '▼' : '―'
  const isCrypto    = item.type === 'crypto'
  const fmtPrice    = (v: number) => isCrypto
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : v.toLocaleString()

  const show52w = candles.length >= 200
  const w52High = show52w ? Math.max(...candles.map(c => c.high)) : 0
  const w52Low  = show52w ? Math.min(...candles.map(c => c.low))  : 0

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 6 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</span>
            <span style={{ color: 'var(--muted)', fontSize: 11,
              background: 'var(--card2)', padding: '1px 6px', borderRadius: 3,
              border: '1px solid var(--border)' }}>{item.ticker || item.symbol}</span>
            {item.market && (
              <span style={{ fontSize: 10, color: 'var(--accent)' }}>{item.market}</span>
            )}
          </div>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={btnStyle(period === p)}>{p.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {closePrice > 0 && (
          <div className="flex items-end gap-3 flex-wrap" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 22 }}>{fmtPrice(closePrice)}</span>
            <span className={priceClass} style={{ fontSize: 14, fontWeight: 600, paddingBottom: 2 }}>
              {priceArrow} {fmtPrice(Math.abs(priceChange))}
              <span style={{ marginLeft: 6 }}>({pricePct > 0 ? '+' : ''}{pricePct.toFixed(2)}%)</span>
            </span>
            <span style={{ fontSize: 9, color: 'var(--muted)', paddingBottom: 3 }}>전일 종가 기준</span>
          </div>
        )}

        {lastCandle && (
          <div className="flex gap-4 flex-wrap" style={{ fontSize: 11, color: 'var(--text2)' }}>
            {[
              ['시가', fmtPrice(lastCandle.open)],
              ['고가', fmtPrice(lastCandle.high)],
              ['저가', fmtPrice(lastCandle.low)],
              ['거래량', lastCandle.volume.toLocaleString()],
              ...(show52w ? [['52주↑', fmtPrice(w52High)], ['52주↓', fmtPrice(w52Low)]] : []),
            ].map(([label, val]) => (
              <span key={label}>
                <span style={{ color: 'var(--muted)', marginRight: 3 }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{val}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        <button onClick={() => toggle('ma5')}   style={btnStyle(indicators.ma5,  MA_COLORS[5])}>MA5</button>
        <button onClick={() => toggle('ma20')}  style={btnStyle(indicators.ma20, MA_COLORS[20])}>MA20</button>
        <button onClick={() => toggle('ma60')}  style={btnStyle(indicators.ma60, MA_COLORS[60])}>MA60</button>
        <button onClick={() => toggle('ma120')} style={btnStyle(indicators.ma120, MA_COLORS[120])}>MA120</button>
        <button onClick={() => toggle('bb')}    style={btnStyle(indicators.bb, '#d29922')}>볼린저</button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', alignSelf: 'center' }} />
        <button onClick={() => toggle('vol')}   style={btnStyle(indicators.vol)}>거래량</button>
        <button onClick={() => toggle('rsi')}   style={btnStyle(indicators.rsi, '#f0b900')}>RSI</button>
        <button onClick={() => toggle('macd')}  style={btnStyle(indicators.macd, '#3fb950')}>MACD</button>
      </div>

      {loading && (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          차트 데이터 로딩 중...
        </div>
      )}

      {!loading && candles.length === 0 && (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          데이터 없음
        </div>
      )}

      {!loading && candles.length > 0 && (
        <>
          <div style={{ position: 'relative' }}>
            <div ref={mainRef} />
            {divergence && (
              <div style={{
                position: 'absolute', top: 8, left: 8, zIndex: 10,
                background: divergence.type === 'bullish' ? 'rgba(38,166,154,0.88)' : 'rgba(248,81,73,0.88)',
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '4px 10px', borderRadius: 4, pointerEvents: 'none',
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span>{divergence.type === 'bullish' ? '📈 상승 다이버전스' : '📉 하락 다이버전스'}</span>
                <span style={{ opacity: 0.8, fontWeight: 400 }}>
                  강도 {divergence.score} · {divergence.date1.slice(4,6)}/{divergence.date1.slice(6,8)}→{divergence.date2.slice(4,6)}/{divergence.date2.slice(6,8)}
                </span>
              </div>
            )}
          </div>
          {indicators.rsi  && <div ref={rsiRef}  style={{ marginTop: 1 }} />}
          {indicators.macd && <div ref={macdRef} style={{ marginTop: 1 }} />}

          <div className="flex gap-3 mt-2 flex-wrap" style={{ fontSize: 10, color: 'var(--muted)' }}>
            {indicators.ma5   && <span style={{ color: MA_COLORS[5]   }}>■ MA5</span>}
            {indicators.ma20  && <span style={{ color: MA_COLORS[20]  }}>■ MA20</span>}
            {indicators.ma60  && <span style={{ color: MA_COLORS[60]  }}>■ MA60</span>}
            {indicators.ma120 && <span style={{ color: MA_COLORS[120] }}>■ MA120</span>}
            {indicators.bb    && <span style={{ color: '#d29922'       }}>■ Bollinger(20,2)</span>}
            {indicators.vol   && <span style={{ color: '#4a5568'       }}>■ 거래량(오버레이)</span>}
            {indicators.rsi   && <span style={{ color: '#f0b900'       }}>■ RSI(14) · 70/30선</span>}
            {indicators.macd  && <span style={{ color: '#3fb950'       }}>■ MACD(12,26,9)</span>}
          </div>
        </>
      )}
    </div>
  )
}
