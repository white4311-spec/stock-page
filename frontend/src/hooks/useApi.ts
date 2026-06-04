import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { IndexData, ForexData, BondData, CryptoData, InvestorItem, Top10Item, NewsItem, SearchResult } from '../types'

const api = axios.create({ baseURL: '/api' })

const q = <T>(key: string[], url: string, refetchInterval = 30000) =>
  useQuery<T>({ queryKey: key, queryFn: () => api.get(url).then(r => r.data), refetchInterval, staleTime: 10000 })

export const useIndices   = () => q<{ data: IndexData[]    }>(['indices'],   '/indices',  30000)
export const useForex     = () => q<{ data: ForexData[]    }>(['forex'],     '/forex',    30000)
export const useBonds     = () => q<{ data: BondData[]     }>(['bonds'],     '/bonds',    60000)
export const useCrypto    = () => q<{ data: CryptoData[]   }>(['crypto'],    '/crypto',   30000)
export const useInvestors = () => q<{ data: InvestorItem[]; date?: string; note?: string }>(['investors'], '/investors', 60000)
export const useNews      = (category = 'all') => q<{ data: NewsItem[] }>(['news', category], `/news?category=${category}`, 300000)
export const useReference = () => q<any>(['reference'], '/reference', 60000)

export const useTop10 = (investor_type: string, direction: string) =>
  useQuery<{ data: (Top10Item & { net_amt: number })[]; investor_label: string }>({
    queryKey: ['top10', investor_type, direction],
    queryFn: () => api.get(`/top10?investor_type=${investor_type}&direction=${direction}`).then(r => r.data),
    refetchInterval: 60000, staleTime: 30000,
  })

export const useSearch = (q: string, type = 'all') =>
  useQuery<{ results: SearchResult[] }>({
    queryKey: ['search', q, type],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}&type=${type}`).then(r => r.data),
    enabled: q.length >= 1, staleTime: 60000,
  })

export const useStockChart = (ticker: string, period: string, market: string, enabled = true) =>
  useQuery<{ data: import('../types').Candle[] }>({
    queryKey: ['chart', ticker, period, market],
    queryFn: () => api.get(`/stocks/${ticker}/chart?period=${period}&market=${market}`).then(r => r.data),
    enabled: enabled && ticker.length > 0, staleTime: 60000,
  })

export const useCryptoChart = (coinId: string, days: number, enabled = true) =>
  useQuery<{ data: import('../types').Candle[] }>({
    queryKey: ['cryptoChart', coinId, days],
    queryFn: () => api.get(`/crypto/chart/${coinId}?days=${days}`).then(r => r.data),
    enabled: enabled && coinId.length > 0, staleTime: 60000,
  })

export const useStockPrice = (ticker: string, market: string, enabled = true) =>
  useQuery<{ ticker: string; price: number; change: number; change_pct: number }>({
    queryKey: ['price', ticker, market],
    queryFn: () => api.get(`/stocks/${ticker}/price?market=${market}`).then(r => r.data),
    enabled: enabled && ticker.length > 0, refetchInterval: 60000, staleTime: 30000,
  })

export const useMarketCapTop = (market: 'J' | 'Q') =>
  useQuery<{ data: (Top10Item & { net_qty: number; net_amt: number; marcap?: number })[]; label: string; market: string }>({
    queryKey: ['mktcapTop', market],
    queryFn: () => api.get(`/top10/mktcap?market=${market}`).then(r => r.data),
    refetchInterval: 3_600_000, staleTime: 1_800_000,
  })

export const useMarketVolumeTop = (market: 'J' | 'Q') =>
  useQuery<{ data: (Top10Item & { net_qty: number; net_amt: number; volume: number })[]; label: string; market: string }>({
    queryKey: ['volumeTop', market],
    queryFn: () => api.get(`/top10/volume?market=${market}`).then(r => r.data),
    refetchInterval: 300000, staleTime: 60000,
  })

type DivergenceResult = {
  status: 'analyzing' | 'done'
  updated_at: string | null
  total?: number
  bullish: DivergenceSignal[]
  bearish: DivergenceSignal[]
}

export const useDivergence = () =>
  useQuery<DivergenceResult>({
    queryKey: ['divergence'],
    queryFn: () => api.get('/divergence').then(r => r.data),
    refetchInterval: (data) => data?.status === 'analyzing' ? 15000 : 300000,
    staleTime: 60000,
  })

export const useDivergenceUs = () =>
  useQuery<DivergenceResult>({
    queryKey: ['divergenceUs'],
    queryFn: () => api.get('/divergence/us').then(r => r.data),
    refetchInterval: (data) => data?.status === 'analyzing' ? 20000 : 300000,
    staleTime: 60000,
  })

export interface DivergenceSignal {
  ticker: string; name: string; market: string
  type: 'bullish' | 'bearish'; score: number
  date1: string; date2: string
  price1: number; price2: number
  rsi1: number; rsi2: number
  current_price: number; change_pct: number
}

export interface AdrData {
  up: number; down: number; flat: number; total: number; adr: number | null
}
export const useAdr = () =>
  useQuery<{ kospi: AdrData | null; kosdaq: AdrData | null }>({
    queryKey: ['adr'],
    queryFn: () => api.get('/adr').then(r => r.data),
    refetchInterval: 300000, staleTime: 120000,
  })

export const useInvestorHistory = (ticker: string, enabled = true) =>
  useQuery<{ ticker: string; data: Array<{
    date: string
    foreign_net_amt: number; institution_net_amt: number; individual_net_amt: number
    foreign_net: number; institution_net: number; individual_net: number
  }> }>({
    queryKey: ['investorHistory', ticker],
    queryFn: () => api.get(`/stocks/${ticker}/investor-history`).then(r => r.data),
    enabled: enabled && ticker.length > 0, staleTime: 120000,
  })
