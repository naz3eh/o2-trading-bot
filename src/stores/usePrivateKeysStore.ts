import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface PrivateKeysStoreState {
  // Session Address -> Encrypted Private Key
  privateKeys: Record<string, string | null>
  setPrivateKey: (sessionAddress: string, privateKey: string) => void
  getPrivateKey: (sessionAddress: string) => string | null
  clearPrivateKeys: () => void
}

const STORAGE_VERSION = 1

const createPrivateKeysStore = immer<PrivateKeysStoreState>((set, get) => {
  const setPrivateKey = (sessionAddress: string, privateKey: string) => {
    set((state) => {
      state.privateKeys[sessionAddress] = privateKey
    })
  }

  const getPrivateKey = (sessionAddress: string): string | null => {
    return get().privateKeys[sessionAddress] || null
  }

  const clearPrivateKeys = () => {
    set((state) => {
      state.privateKeys = {}
    })
  }

  return {
    privateKeys: {},
    setPrivateKey,
    getPrivateKey,
    clearPrivateKeys,
  }
})

const createPersistStore = persist(createPrivateKeysStore, {
  name: 'o2-private-keys',
  version: STORAGE_VERSION,
  migrate: (persistedState: any, version) => {
    if (version < STORAGE_VERSION) {
      return {
        privateKeys: {},
        setPrivateKey: () => {},
        getPrivateKey: () => null,
        clearPrivateKeys: () => {},
      }
    }
    return persistedState
  },
  partialize: (state) => ({
    privateKeys: state.privateKeys,
  }),
})

export const usePrivateKeysStore = create<PrivateKeysStoreState>()(createPersistStore)

export const privateKeysSelectors = {
  privateKeys: (state: PrivateKeysStoreState) => state.privateKeys,
  setPrivateKey: (state: PrivateKeysStoreState) => state.setPrivateKey,
  getPrivateKey: (state: PrivateKeysStoreState) => state.getPrivateKey,
  clearPrivateKeys: (state: PrivateKeysStoreState) => state.clearPrivateKeys,
}
