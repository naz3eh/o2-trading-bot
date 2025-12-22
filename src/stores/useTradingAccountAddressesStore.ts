import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface TradingAccountAddressesStoreState {
  // Owner Address -> Trading Account ID
  contracts: Record<string, string | null>
  setContract: (ownerAddress: string, tradingAccountId: string) => void
  getContract: (ownerAddress: string) => string | null
  clearContracts: () => void
}

const STORAGE_VERSION = 1

const createTradingAccountAddressesStore = immer<TradingAccountAddressesStoreState>((set, get) => {
  const setContract = (ownerAddress: string, tradingAccountId: string) => {
    set((state) => {
      const normalizedAddress = ownerAddress.toLowerCase()
      state.contracts[normalizedAddress] = tradingAccountId
    })
  }

  const getContract = (ownerAddress: string): string | null => {
    const normalizedAddress = ownerAddress.toLowerCase()
    return get().contracts[normalizedAddress] || null
  }

  const clearContracts = () => {
    set((state) => {
      state.contracts = {}
    })
  }

  return {
    contracts: {},
    setContract,
    getContract,
    clearContracts,
  }
})

const createPersistStore = persist(createTradingAccountAddressesStore, {
  name: 'o2-trading-account-addresses',
  version: STORAGE_VERSION,
  migrate: (persistedState: any, version) => {
    if (version < STORAGE_VERSION) {
      return {
        contracts: {},
        setContract: () => {},
        getContract: () => null,
        clearContracts: () => {},
      }
    }
    return persistedState
  },
  partialize: (state) => ({
    contracts: state.contracts,
  }),
})

const createSubscribedStore = subscribeWithSelector(createPersistStore)

export const useTradingAccountAddressesStore = create<TradingAccountAddressesStoreState>()(
  createSubscribedStore
)

export const tradingAccountAddressesSelectors = {
  contracts: (state: TradingAccountAddressesStoreState) => state.contracts,
  getContract: (state: TradingAccountAddressesStoreState) => state.getContract,
  setContract: (state: TradingAccountAddressesStoreState) => state.setContract,
  clearContracts: (state: TradingAccountAddressesStoreState) => state.clearContracts,
}
