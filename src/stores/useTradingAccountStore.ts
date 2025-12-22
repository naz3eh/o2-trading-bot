import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TradeAccountManager } from '../services/tradeAccountManager'

interface TradingAccountStoreState {
  manager: TradeAccountManager | null
  setManager: (manager: TradeAccountManager) => void
  reset: () => void
}

const STORAGE_VERSION = 1

const createTradingAccountStore = immer<TradingAccountStoreState>((set) => {
  const setManager = (manager: TradeAccountManager) => {
    set({ manager })
  }

  const reset = () => {
    set({ manager: null })
  }

  return {
    manager: null,
    setManager,
    reset,
  }
})

const createPersistStore = persist(createTradingAccountStore, {
  name: 'o2-trading-account',
  version: STORAGE_VERSION,
  migrate: (persistedState: any, version) => {
    if (version < STORAGE_VERSION) {
      return {
        manager: null,
        setManager: () => {},
        reset: () => {},
      }
    }
    return persistedState
  },
  // Don't persist the manager object itself (it contains functions)
  partialize: () => ({}),
})

const createSubscribedStore = subscribeWithSelector(createPersistStore)

export const useTradingAccountStore = create<TradingAccountStoreState>()(createSubscribedStore)

export const tradingAccountSelectors = {
  manager: (state: TradingAccountStoreState) => state.manager,
  setManager: (state: TradingAccountStoreState) => state.setManager,
  reset: (state: TradingAccountStoreState) => state.reset,
}
