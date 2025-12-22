import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface TermsOfUseStoreState {
  // Owner Address -> Accepted (boolean)
  acceptances: Record<string, boolean>
  setAcceptance: (ownerAddress: string, accepted: boolean) => void
  getAcceptance: (ownerAddress: string) => boolean
  clearAcceptances: () => void
}

const createTermsOfUseStore = immer<TermsOfUseStoreState>((set, get) => {
  const setAcceptance = (ownerAddress: string, accepted: boolean) => {
    set((state) => {
      const normalizedAddress = ownerAddress.toLowerCase()
      state.acceptances[normalizedAddress] = accepted
    })
  }

  const getAcceptance = (ownerAddress: string): boolean => {
    const normalizedAddress = ownerAddress.toLowerCase()
    return get().acceptances[normalizedAddress] || false
  }

  const clearAcceptances = () => {
    set((state) => {
      state.acceptances = {}
    })
  }

  return {
    acceptances: {},
    setAcceptance,
    getAcceptance,
    clearAcceptances,
  }
})

const createPersistStore = persist(createTermsOfUseStore, {
  name: 'o2-terms-of-use',
  partialize: (state) => ({
    acceptances: state.acceptances,
  }),
})

export const useTermsOfUseStore = create<TermsOfUseStoreState>()(createPersistStore)

export const termsOfUseSelectors = {
  acceptances: (state: TermsOfUseStoreState) => state.acceptances,
  getAcceptance: (state: TermsOfUseStoreState) => state.getAcceptance,
  setAcceptance: (state: TermsOfUseStoreState) => state.setAcceptance,
  clearAcceptances: (state: TermsOfUseStoreState) => state.clearAcceptances,
}
