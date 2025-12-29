// Network configuration for deposits
export interface AvailableNetwork {
  id: number
  name: string
  type: 'evm' | 'fuel'
  explorerUrl: string
  image?: string
}

// Asset configuration for deposits
export interface DepositAsset {
  universal: `0x${string}` // Universal asset ID on Fuel
  symbol: string
  decimals: number
  minPrecision: number
  maxPrecision: number

  // Fuel-specific data
  fuel?: {
    canonical: `0x${string}`
    decimals: number
  }

  // EVM-specific data per chain (keyed by chain ID)
  ethereum?: Partial<
    Record<
      number,
      {
        canonical: `0x${string}`
        decimals: number
        minPrecision: number
        maxPrecision: number
        supportsPermit: boolean
      }
    >
  >
}

// EIP-2612 permit signature structure
export interface PermitSignature {
  r: `0x${string}`
  s: `0x${string}`
  v: number
  deadline: bigint
}

// Deposit step in the flow
export type DepositStep =
  | 'closed'
  | 'selectingWallet'
  | 'depositing'
  | 'submitting'
  | 'success'
  | 'error'

// Current action during submission
export type DepositAction =
  | 'idle'
  | 'checkingPause'
  | 'switchingNetwork'
  | 'checkingAllowance'
  | 'approvingToken'
  | 'signingPermit'
  | 'estimatingGas'
  | 'submittingDeposit'

// Balance status
export type BalanceStatus = 'idle' | 'loading' | 'success' | 'error'

// Allowance status
export type AllowanceStatus = 'idle' | 'loading' | 'success'

// Deposit source type
export type DepositSourceType = 'evm' | 'fuel'

// Form state for deposit
export interface DepositFormState {
  amount: string
  asset: DepositAsset | null
  network: AvailableNetwork | null
}

// Balance state
export interface DepositBalanceState {
  canonical: bigint
  universal: bigint
  status: BalanceStatus
}

// Allowance state (EVM only)
export interface DepositAllowanceState {
  amount: bigint
  needsApproval: boolean
  status: AllowanceStatus
}

// Submission state
export interface DepositSubmittingState {
  depositor: `0x${string}` | null
  tradingAccount: `0x${string}` | null
  currentAction: DepositAction
  permitSignature: PermitSignature | null
}

// Deposit result
export interface DepositResult {
  txId: `0x${string}`
  sourceType: DepositSourceType
}

// Deposit errors
export interface DepositErrors {
  amount: string
}

// EVM contract IDs
export interface EvmContractIds {
  messenger: `0x${string}`
  outpost: `0x${string}`
}

// Fuel contract IDs
export interface FuelContractIds {
  fastBridge: `0x${string}`
  assetRegistry: `0x${string}`
  gasOracle: `0x${string}`
  rateLimiter: `0x${string}`
}

// Deposit status tracking
export type DepositStatusStep = 'pending' | 'processing' | 'completed' | 'failed'

// Deposit status data
export interface DepositStatusData {
  amount: bigint
  symbol: string
  decimals: number
  sourceNetwork: string
  sourceAddress: string
}

// Parameters for EVM deposit
export interface EvmDepositParams {
  chainId: number
  messengerAddress: `0x${string}`
  recipient: `0x${string}`
  tokenAddress: `0x${string}`
  amount: bigint
  isNativeEth: boolean
  permitSignature?: PermitSignature
}

// Parameters for Fuel deposit
export interface FuelDepositParams {
  depositor: `0x${string}`
  recipient: `0x${string}`
  asset: DepositAsset
  amount: bigint
  canonicalBalance: bigint
  universalBalance: bigint
}

// Check allowance parameters
export interface CheckAllowanceParams {
  chainId: number
  tokenAddress: `0x${string}`
  ownerAddress: `0x${string}`
  spenderAddress: `0x${string}`
}

// Approve token parameters
export interface ApproveTokenParams {
  chainId: number
  tokenAddress: `0x${string}`
  spenderAddress: `0x${string}`
  amount: bigint
}

// Sign permit parameters
export interface SignPermitParams {
  chainId: number
  tokenAddress: `0x${string}`
  ownerAddress: `0x${string}`
  spenderAddress: `0x${string}`
  amount: bigint
  deadline: bigint
}
