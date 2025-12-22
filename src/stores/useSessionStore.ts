import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { SessionInput } from '../types/contracts/TradeAccount'

interface SessionStoreState {
  // Trading Account ID -> SessionInput
  sessions: Record<string, SessionInput | null>
  setSession: (tradingAccountId: string, session: SessionInput | null) => void
  getSession: (tradingAccountId: string) => SessionInput | null
  clearSessions: () => void
}

const STORAGE_VERSION = 1

const createSessionStore = immer<SessionStoreState>((set, get) => {
  const setSession = (tradingAccountId: string, session: SessionInput | null) => {
    set((state) => {
      state.sessions[tradingAccountId] = session
    })
  }

  const getSession = (tradingAccountId: string): SessionInput | null => {
    return get().sessions[tradingAccountId] || null
  }

  const clearSessions = () => {
    set((state) => {
      state.sessions = {}
    })
  }

  return {
    sessions: {},
    setSession,
    getSession,
    clearSessions,
  }
})

const createPersistStore = persist(createSessionStore, {
  name: 'o2-session',
  version: STORAGE_VERSION,
  migrate: (persistedState: any, version) => {
    if (version < STORAGE_VERSION) {
      return {
        sessions: {},
        setSession: () => {},
        getSession: () => null,
        clearSessions: () => {},
      }
    }
    return persistedState
  },
  partialize: (state) => ({
    sessions: state.sessions,
  }),
})

const createSubscribedStore = subscribeWithSelector(createPersistStore)

export const useSessionStore = create<SessionStoreState>()(createSubscribedStore)

export const sessionSelectors = {
  sessions: (state: SessionStoreState) => state.sessions,
  getSession: (state: SessionStoreState) => state.getSession,
  setSession: (state: SessionStoreState) => state.setSession,
  clearSessions: (state: SessionStoreState) => state.clearSessions,
}
