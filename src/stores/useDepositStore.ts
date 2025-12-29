import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  DepositStep,
  DepositAction,
  DepositSourceType,
  DepositAsset,
  AvailableNetwork,
  DepositBalanceState,
  DepositAllowanceState,
  DepositSubmittingState,
  DepositResult,
  DepositErrors,
  PermitSignature,
} from '../types/deposit'
import { evmDepositService } from '../services/deposit/evmDepositService'
import { fuelDepositService } from '../services/deposit/fuelDepositService'
import { depositAssetService } from '../services/deposit/depositAssetService'
import { isNativeEth } from '../constants/depositConstants'

interface DepositStoreState {
  // Flow state
  step: DepositStep
  sourceType: DepositSourceType | null

  // Form state
  form: {
    amount: string
    asset: DepositAsset | null
    network: AvailableNetwork | null
  }

  // Balance state
  balance: DepositBalanceState

  // Allowance state (EVM only)
  allowance: DepositAllowanceState

  // Submission state
  submitting: DepositSubmittingState

  // Result
  result: DepositResult | null

  // Contract status
  isPaused: boolean

  // Errors
  errors: DepositErrors

  // Actions
  open: (tradingAccountId: `0x${string}`, initialAsset?: DepositAsset) => void
  close: () => void
  reset: () => void
  selectWallet: (
    sourceType: DepositSourceType,
    depositor: `0x${string}`
  ) => void
  changeWallet: () => void
  setAmount: (amount: string) => void
  setAsset: (asset: DepositAsset) => void
  setNetwork: (network: AvailableNetwork) => void
  fetchBalance: () => Promise<void>
  checkAllowance: () => Promise<void>
  submit: () => Promise<void>
  setError: (field: keyof DepositErrors, message: string) => void
  clearErrors: () => void
}

const initialState = {
  step: 'closed' as DepositStep,
  sourceType: null as DepositSourceType | null,
  form: {
    amount: '',
    asset: null as DepositAsset | null,
    network: null as AvailableNetwork | null,
  },
  balance: {
    canonical: 0n,
    universal: 0n,
    status: 'idle' as const,
  },
  allowance: {
    amount: 0n,
    needsApproval: false,
    status: 'idle' as const,
  },
  submitting: {
    depositor: null as `0x${string}` | null,
    tradingAccount: null as `0x${string}` | null,
    currentAction: 'idle' as DepositAction,
    permitSignature: null as PermitSignature | null,
  },
  result: null as DepositResult | null,
  isPaused: false,
  errors: {
    amount: '',
  },
}

export const useDepositStore = create<DepositStoreState>()(
  immer((set, get) => ({
    ...initialState,

    open: (tradingAccountId, initialAsset) => {
      set((state) => {
        state.step = 'selectingWallet'
        state.submitting.tradingAccount = tradingAccountId
        if (initialAsset) {
          state.form.asset = initialAsset
        }
      })
    },

    close: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },

    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },

    selectWallet: (sourceType, depositor) => {
      set((state) => {
        state.sourceType = sourceType
        state.submitting.depositor = depositor
        state.step = 'depositing'

        // Set default network based on source type
        const networks = depositAssetService.getNetworksBySourceType(sourceType)
        if (networks.length > 0) {
          state.form.network = networks[0]
        }
      })

      // Fetch balance after selecting wallet
      get().fetchBalance()
    },

    changeWallet: () => {
      set((state) => {
        state.step = 'selectingWallet'
        state.sourceType = null
        state.submitting.depositor = null
        state.balance = initialState.balance
        state.allowance = initialState.allowance
      })
    },

    setAmount: (amount) => {
      set((state) => {
        state.form.amount = amount
        state.errors.amount = ''
      })

      // Check allowance when amount changes (EVM only)
      const { sourceType } = get()
      if (sourceType === 'evm') {
        get().checkAllowance()
      }
    },

    setAsset: (asset) => {
      set((state) => {
        state.form.asset = asset
        state.balance = initialState.balance
        state.allowance = initialState.allowance
      })

      // Fetch new balance
      get().fetchBalance()
    },

    setNetwork: (network) => {
      set((state) => {
        state.form.network = network
        state.balance = initialState.balance
        state.allowance = initialState.allowance
      })

      // Fetch new balance
      get().fetchBalance()
    },

    fetchBalance: async () => {
      const { sourceType, submitting, form } = get()

      if (!submitting.depositor || !form.asset) {
        return
      }

      set((state) => {
        state.balance.status = 'loading'
      })

      try {
        if (sourceType === 'fuel') {
          // Fetch Fuel balances
          const balances = await fuelDepositService.getBalances(
            submitting.depositor,
            form.asset
          )

          set((state) => {
            state.balance.canonical = balances.canonical
            state.balance.universal = balances.universal
            state.balance.status = 'success'
          })
        } else if (sourceType === 'evm' && form.network) {
          // Fetch EVM balance
          const tokenAddress = depositAssetService.getTokenAddress(
            form.asset,
            form.network.id,
            'evm'
          )

          if (tokenAddress) {
            const balance = await evmDepositService.getBalance(
              form.network.id,
              tokenAddress,
              submitting.depositor
            )

            set((state) => {
              state.balance.canonical = balance
              state.balance.universal = 0n
              state.balance.status = 'success'
            })

            // Also check allowance
            get().checkAllowance()
          }
        }
      } catch (error) {
        console.error('Error fetching balance:', error)
        set((state) => {
          state.balance.status = 'error'
        })
      }
    },

    checkAllowance: async () => {
      const { sourceType, submitting, form } = get()

      if (
        sourceType !== 'evm' ||
        !submitting.depositor ||
        !form.asset ||
        !form.network ||
        !form.amount
      ) {
        return
      }

      const tokenAddress = depositAssetService.getTokenAddress(
        form.asset,
        form.network.id,
        'evm'
      )

      if (!tokenAddress || isNativeEth(tokenAddress)) {
        // Native ETH doesn't need approval
        set((state) => {
          state.allowance.needsApproval = false
          state.allowance.status = 'success'
        })
        return
      }

      const contracts = depositAssetService.getEvmContracts(form.network.id)
      if (!contracts) return

      set((state) => {
        state.allowance.status = 'loading'
      })

      try {
        const decimals = depositAssetService.getTokenDecimals(
          form.asset,
          form.network.id,
          'evm'
        )
        const amount = parseAmount(form.amount, decimals)

        const needsApproval = await evmDepositService.needsApproval(
          form.network.id,
          tokenAddress,
          submitting.depositor,
          contracts.messenger,
          amount
        )

        set((state) => {
          state.allowance.needsApproval = needsApproval
          state.allowance.status = 'success'
        })
      } catch (error) {
        console.error('Error checking allowance:', error)
        set((state) => {
          state.allowance.status = 'success'
          state.allowance.needsApproval = true
        })
      }
    },

    submit: async () => {
      const { sourceType, submitting, form } = get()

      // Validate
      if (!submitting.depositor || !submitting.tradingAccount || !form.asset) {
        set((state) => {
          state.errors.amount = 'Missing required fields'
        })
        return
      }

      if (!form.amount || parseFloat(form.amount) <= 0) {
        set((state) => {
          state.errors.amount = 'Please enter a valid amount'
        })
        return
      }

      set((state) => {
        state.step = 'submitting'
        state.errors.amount = ''
      })

      try {
        if (sourceType === 'evm') {
          await submitEvmDeposit(get, set)
        } else if (sourceType === 'fuel') {
          await submitFuelDeposit(get, set)
        }
      } catch (error: any) {
        console.error('Deposit error:', error)

        // Parse error message for user-friendly display
        let errorMessage = error.message || 'Deposit failed'

        // Check for common error patterns
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          errorMessage = 'RPC rate limit reached. Please wait a moment and try again.'
        } else if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
          errorMessage = 'Transaction was rejected in wallet.'
        } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
          errorMessage = 'Insufficient funds for this transaction.'
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('resource not available')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (errorMessage.length > 100) {
          // Truncate very long error messages
          errorMessage = 'Transaction failed. Please try again.'
        }

        set((state) => {
          state.step = 'error'
          state.errors.amount = errorMessage
          state.submitting.currentAction = 'idle'
        })
      }
    },

    setError: (field, message) => {
      set((state) => {
        state.errors[field] = message
      })
    },

    clearErrors: () => {
      set((state) => {
        state.errors = { amount: '' }
      })
    },
  }))
)

// Helper: Parse amount string to bigint with decimals
function parseAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + paddedFraction)
}

// Helper: Submit EVM deposit
async function submitEvmDeposit(
  get: () => DepositStoreState,
  set: (fn: (state: DepositStoreState) => void) => void
) {
  const { submitting, form } = get()

  if (!form.network || !form.asset) {
    throw new Error('Missing network or asset')
  }

  const contracts = depositAssetService.getEvmContracts(form.network.id)
  if (!contracts) {
    throw new Error('Contracts not found for this network')
  }

  const tokenAddress = depositAssetService.getTokenAddress(
    form.asset,
    form.network.id,
    'evm'
  )
  if (!tokenAddress) {
    throw new Error('Token not available on this network')
  }

  const decimals = depositAssetService.getTokenDecimals(
    form.asset,
    form.network.id,
    'evm'
  )
  const amount = parseAmount(form.amount, decimals)

  // Step 1: Check if paused
  set((state) => {
    state.submitting.currentAction = 'checkingPause'
  })

  const isPaused = await evmDepositService.checkContractPaused(
    form.network.id,
    contracts.messenger
  )

  if (isPaused) {
    throw new Error('Deposits are temporarily paused')
  }

  // Step 2: Switch network if needed
  set((state) => {
    state.submitting.currentAction = 'switchingNetwork'
  })

  await evmDepositService.switchNetwork(form.network.id)

  const isNative = isNativeEth(tokenAddress)

  if (!isNative) {
    // Step 3: Check and handle allowance
    set((state) => {
      state.submitting.currentAction = 'checkingAllowance'
    })

    const needsApproval = await evmDepositService.needsApproval(
      form.network.id,
      tokenAddress,
      submitting.depositor!,
      contracts.messenger,
      amount
    )

    if (needsApproval) {
      // Try permit first if supported
      const supportsPermit = depositAssetService.assetSupportsPermit(
        form.asset,
        form.network.id
      )

      if (supportsPermit) {
        set((state) => {
          state.submitting.currentAction = 'signingPermit'
        })

        try {
          const permitSignature = await evmDepositService.signPermitSignature(
            form.network.id,
            tokenAddress,
            submitting.depositor!,
            contracts.messenger,
            amount
          )

          set((state) => {
            state.submitting.permitSignature = permitSignature
          })
        } catch (permitError) {
          console.warn('Permit failed, falling back to approval:', permitError)
          // Fall back to regular approval
          set((state) => {
            state.submitting.currentAction = 'approvingToken'
          })

          await evmDepositService.approveToken({
            chainId: form.network.id,
            tokenAddress,
            spenderAddress: contracts.messenger,
            amount,
          })
        }
      } else {
        // Regular approval
        set((state) => {
          state.submitting.currentAction = 'approvingToken'
        })

        await evmDepositService.approveToken({
          chainId: form.network.id,
          tokenAddress,
          spenderAddress: contracts.messenger,
          amount,
        })
      }
    }
  }

  // Step 4: Submit deposit
  set((state) => {
    state.submitting.currentAction = 'submittingDeposit'
  })

  let txHash: `0x${string}`
  const { submitting: currentSubmitting } = get()

  if (isNative) {
    txHash = await evmDepositService.depositEth({
      chainId: form.network.id,
      messengerAddress: contracts.messenger,
      recipient: submitting.tradingAccount!,
      tokenAddress,
      amount,
      isNativeEth: true,
    })
  } else if (currentSubmitting.permitSignature) {
    txHash = await evmDepositService.depositWithPermit({
      chainId: form.network.id,
      messengerAddress: contracts.messenger,
      recipient: submitting.tradingAccount!,
      tokenAddress,
      amount,
      isNativeEth: false,
      permitSignature: currentSubmitting.permitSignature,
    })
  } else {
    txHash = await evmDepositService.depositToken({
      chainId: form.network.id,
      messengerAddress: contracts.messenger,
      recipient: submitting.tradingAccount!,
      tokenAddress,
      amount,
      isNativeEth: false,
    })
  }

  // Success!
  set((state) => {
    state.step = 'success'
    state.result = {
      txId: txHash,
      sourceType: 'evm',
    }
    state.submitting.currentAction = 'idle'
  })
}

// Helper: Submit Fuel deposit
async function submitFuelDeposit(
  get: () => DepositStoreState,
  set: (fn: (state: DepositStoreState) => void) => void
) {
  const { submitting, form, balance } = get()

  if (!form.asset) {
    throw new Error('Missing asset')
  }

  const decimals = form.asset.fuel?.decimals ?? form.asset.decimals
  const amount = parseAmount(form.amount, decimals)

  // Validate balance
  const totalBalance = balance.canonical + balance.universal
  if (amount > totalBalance) {
    throw new Error('Insufficient balance')
  }

  set((state) => {
    state.submitting.currentAction = 'submittingDeposit'
  })

  const result = await fuelDepositService.submitDeposit({
    depositor: submitting.depositor!,
    recipient: submitting.tradingAccount!,
    asset: form.asset,
    amount,
    canonicalBalance: balance.canonical,
    universalBalance: balance.universal,
  })

  // Success!
  set((state) => {
    state.step = 'success'
    state.result = {
      txId: result.txId,
      sourceType: 'fuel',
    }
    state.submitting.currentAction = 'idle'
  })
}

// Selectors
export const depositSelectors = {
  isOpen: (state: DepositStoreState) => state.step !== 'closed',
  isSubmitting: (state: DepositStoreState) => state.step === 'submitting',
  isSuccess: (state: DepositStoreState) => state.step === 'success',
  isError: (state: DepositStoreState) => state.step === 'error',
  canSubmit: (state: DepositStoreState) => {
    return (
      state.step === 'depositing' &&
      state.form.amount &&
      parseFloat(state.form.amount) > 0 &&
      state.form.asset &&
      state.balance.status === 'success' &&
      !state.errors.amount
    )
  },
  totalBalance: (state: DepositStoreState) => {
    return state.balance.canonical + state.balance.universal
  },
}
