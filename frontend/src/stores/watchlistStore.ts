import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchItem } from '../types'

interface WatchlistStore {
  items: WatchItem[]
  add: (item: WatchItem) => void
  remove: (ticker: string) => void
  has: (ticker: string) => boolean
}

export const useWatchlist = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => set((s) => ({ items: s.items.find(i => i.ticker === item.ticker) ? s.items : [...s.items, item] })),
      remove: (ticker) => set((s) => ({ items: s.items.filter(i => i.ticker !== ticker) })),
      has: (ticker) => get().items.some(i => i.ticker === ticker),
    }),
    { name: 'watchlist' }
  )
)
