export interface IndexData {
  name: string
  price: number
  change: number
  change_pct: number
  volume?: number
  error?: string
  source?: string
}

export interface ForexData {
  pair: string
  price: number
  change: number
  change_pct: number
  error?: string
}

export interface BondData {
  name: string
  country: string
  price: number
  change: number
  change_pct: number
  note?: string
}

export interface CryptoData {
  symbol: string
  name: string
  price: number
  change: number
  change_pct: number
  market_cap: number
  volume_24h: number
  image: string
  currency: string
}

export interface InvestorItem {
  type: 'foreign' | 'institution' | 'individual'
  label: string
  net_qty: number
  net_amt: number
  direction: 'buy' | 'sell'
}

export interface Top10Item {
  ticker: string
  name: string
  price: number
  change_pct: number
  net_qty: number
  volume: number
}

export interface NewsItem {
  title: string
  link: string
  published: string
  source: string
  category: string
  summary: string
}

export interface SearchResult {
  ticker?: string
  symbol?: string
  name: string
  market?: string
  type: 'stock' | 'crypto'
  id?: string
  thumb?: string
}

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface WatchItem {
  ticker: string
  name: string
  type: 'stock' | 'crypto'
  market?: string
  coinId?: string
}
