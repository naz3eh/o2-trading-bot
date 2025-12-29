import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  DepositSourceType,
  DepositStatusStep,
  DepositStatusData,
} from '../types/deposit'

interface DepositStatusStoreState {
  // Dialog state
  isOpen: boolean

  // Transaction info
  txId: `0x${string}` | null
  sourceType: DepositSourceType | null
  chainId: number | null

  // Status
  status: DepositStatusStep

  // Deposit data for display
  depositData: DepositStatusData | null

  // Actions
  open: (params: OpenDepositStatusParams) => void
  close: () => void
  updateStatus: (status: DepositStatusStep) => void
  reset: () => void
}

interface OpenDepositStatusParams {
  txId: `0x${string}`
  sourceType: DepositSourceType
  chainId: number
  depositData: DepositStatusData
}

const initialState = {
  isOpen: false,
  txId: null as `0x${string}` | null,
  sourceType: null as DepositSourceType | null,
  chainId: null as number | null,
  status: 'pending' as DepositStatusStep,
  depositData: null as DepositStatusData | null,
}

export const useDepositStatusStore = create<DepositStatusStoreState>()(
  immer((set) => ({
    ...initialState,

    open: (params) => {
      set((state) => {
        state.isOpen = true
        state.txId = params.txId
        state.sourceType = params.sourceType
        state.chainId = params.chainId
        state.depositData = params.depositData
        state.status = 'pending'
      })
    },

    close: () => {
      set((state) => {
        state.isOpen = false
      })
    },

    updateStatus: (status) => {
      set((state) => {
        state.status = status
      })
    },

    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },
  }))
)

// Selectors
export const depositStatusSelectors = {
  isOpen: (state: DepositStatusStoreState) => state.isOpen,
  isPending: (state: DepositStatusStoreState) => state.status === 'pending',
  isProcessing: (state: DepositStatusStoreState) => state.status === 'processing',
  isCompleted: (state: DepositStatusStoreState) => state.status === 'completed',
  isFailed: (state: DepositStatusStoreState) => state.status === 'failed',
}

// Helper: Get explorer URL for transaction
export function getDepositStatusExplorerUrl(
  state: DepositStatusStoreState
): string | null {
  if (!state.txId || !state.sourceType) return null

  if (state.sourceType === 'fuel') {
    return `https://app.fuel.network/tx/${state.txId}`
  }

  // EVM explorers by chain ID
  const evmExplorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
  }

  const explorer = state.chainId ? evmExplorers[state.chainId] : null
  if (!explorer) return null

  return `${explorer}/tx/${state.txId}`
}

// Helper: Get status message
export function getDepositStatusMessage(status: DepositStatusStep): string {
  switch (status) {
    case 'pending':
      return 'Transaction submitted, waiting for confirmation...'
    case 'processing':
      return 'Transaction confirmed, processing deposit...'
    case 'completed':
      return 'Deposit completed successfully!'
    case 'failed':
      return 'Deposit failed. Please try again.'
    default:
      return ''
  }
}
