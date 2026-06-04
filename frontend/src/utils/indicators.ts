import type { Candle } from '../types'

export interface OhlcPoint { time: number; open: number; high: number; low: number; close: number }
export interface LinePoint  { time: number; value: number }
export interface HistPoint  { time: number; value: number; color?: string }

export function toTime(dateStr: string): number {
  if (dateStr.length > 8) return Math.floor(Number(dateStr) / 1000)
  const y = +dateStr.slice(0, 4), m = +dateStr.slice(4, 6) - 1, d = +dateStr.slice(6, 8)
  return Math.floor(new Date(y, m, d).getTime() / 1000)
}

function sortedUnique(candles: Candle[]): Candle[] {
  const seen = new Set<number>()
  return candles
    .filter(c => c.close > 0)
    .sort((a, b) => toTime(a.date) - toTime(b.date))
    .filter(c => { const t = toTime(c.date); if (seen.has(t)) return false; seen.add(t); return true })
}

export function toOhlc(candles: Candle[]): OhlcPoint[] {
  return sortedUnique(candles).map(c => ({ time: toTime(c.date), open: c.open, high: c.high, low: c.low, close: c.close }))
}

export function toVolume(candles: Candle[]): HistPoint[] {
  const sorted = sortedUnique(candles)
  return sorted.map((c, i) => ({ time: toTime(c.date), value: c.volume, color: i > 0 && c.close >= sorted[i-1].close ? 'rgba(248,81,73,0.5)' : 'rgba(88,166,255,0.5)' }))
}

export function sma(candles: Candle[], period: number): LinePoint[] {
  const sorted = sortedUnique(candles)
  const result: LinePoint[] = []
  for (let i = period - 1; i < sorted.length; i++) {
    const avg = sorted.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period
    result.push({ time: toTime(sorted[i].date), value: +avg.toFixed(2) })
  }
  return result
}

export function bollingerBands(candles: Candle[], period = 20, mult = 2) {
  const sorted = sortedUnique(candles)
  const upper: LinePoint[] = [], middle: LinePoint[] = [], lower: LinePoint[] = []
  for (let i = period - 1; i < sorted.length; i++) {
    const slice = sorted.slice(i - period + 1, i + 1).map(c => c.close)
    const avg = slice.reduce((s, v) => s + v, 0) / period
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - avg) ** 2, 0) / period)
    const t = toTime(sorted[i].date)
    upper.push({ time: t, value: +(avg + mult * std).toFixed(2) })
    middle.push({ time: t, value: +avg.toFixed(2) })
    lower.push({ time: t, value: +(avg - mult * std).toFixed(2) })
  }
  return { upper, middle, lower }
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period
  result.push(...new Array(period - 1).fill(NaN), prev)
  for (let i = period; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); result.push(prev) }
  return result
}

export function rsi(candles: Candle[], period = 14): LinePoint[] {
  const sorted = sortedUnique(candles)
  const closes = sorted.map(c => c.close)
  const times  = sorted.map(c => toTime(c.date))
  const result: LinePoint[] = []
  if (closes.length < period + 1) return result
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i-1]; d > 0 ? (gains += d) : (losses -= d) }
  let avgGain = gains / period, avgLoss = losses / period
  result.push({ time: times[period], value: +(100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(2) })
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
    result.push({ time: times[i], value: +(100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(2) })
  }
  return result
}

export function macd(candles: Candle[], fast = 12, slow = 26, signal = 9) {
  const sorted = sortedUnique(candles)
  const closes = sorted.map(c => c.close)
  const times  = sorted.map(c => toTime(c.date))
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = emaFast.map((v, i) => v - emaSlow[i])
  const validStart = slow - 1
  const signalLine = ema(macdLine.slice(validStart).filter(v => !isNaN(v)), signal)
  const macdPoints: LinePoint[] = [], signalPoints: LinePoint[] = [], histPoints: HistPoint[] = []
  let sigIdx = 0
  for (let i = validStart; i < closes.length; i++) {
    const t = times[i], m = macdLine[i]
    if (isNaN(m)) continue
    macdPoints.push({ time: t, value: +m.toFixed(4) })
    const sVal = signalLine[sigIdx]
    if (!isNaN(sVal)) {
      signalPoints.push({ time: t, value: +sVal.toFixed(4) })
      const h = m - sVal
      histPoints.push({ time: t, value: +h.toFixed(4), color: h >= 0 ? 'rgba(248,81,73,0.7)' : 'rgba(88,166,255,0.7)' })
    }
    sigIdx++
  }
  return { macdPoints, signalPoints, histPoints }
}
