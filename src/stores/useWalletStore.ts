import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { ConnectedWallet, WalletType } from '../types/wallet'

interface WalletStoreState {
  connectedWallet: ConnectedWallet | null
  setConnectedWallet: (wallet: ConnectedWallet) => void
  clearWallet: () => void
  isConnected: () => boolean
}

const STORAGE_VERSION = 1

const createWalletStore = immer<WalletStoreState>((set, get) => {
  const setConnectedWallet = (wallet: ConnectedWallet) => {
    set((state) => {
      state.connectedWallet = wallet
    })
  }

  const clearWallet = () => {
    set((state) => {
      state.connectedWallet = null
    })
  }

  const isConnected = () => {
    return !!get().connectedWallet
  }

  return {
    connectedWallet: null,
    setConnectedWallet,
    clearWallet,
    isConnected,
  }
})

const createPersistStore = persist(createWalletStore, {
  name: 'o2-wallet',
  version: STORAGE_VERSION,
  partialize: (state) => ({
    // Only persist serializable wallet data, exclude connector (has circular refs)
    connectedWallet: state.connectedWallet
      ? {
          type: state.connectedWallet.type,
          address: state.connectedWallet.address,
          isFuel: state.connectedWallet.isFuel,
          // Don't persist connector - it contains circular references
        }
      : null,
  }),
  migrate: (persistedState: any, version) => {
    if (version < STORAGE_VERSION) {
      return {
        connectedWallet: null,
        setConnectedWallet: () => {},
        clearWallet: () => {},
        isConnected: () => false,
      }
    }
    return persistedState
  },
})

const createSubscribedStore = subscribeWithSelector(createPersistStore)

export const useWalletStore = create<WalletStoreState>()(createSubscribedStore)

export const walletSelectors = {
  connectedWallet: (state: WalletStoreState) => state.connectedWallet,
  isConnected: (state: WalletStoreState) => state.isConnected(),
}
