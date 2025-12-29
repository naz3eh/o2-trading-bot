import { base, mainnet } from 'wagmi/chains'
import type {
  AvailableNetwork,
  DepositAsset,
  EvmContractIds,
  FuelContractIds,
} from '../types/deposit'

// Fuel chain ID for mainnet
export const FUEL_MAINNET_CHAIN_ID = 9889

// EVM messenger contract addresses (mainnet only)
export const EVM_CONTRACTS: Record<number, EvmContractIds> = {
  [base.id]: {
    messenger: '0x2B1c1E133F832EFB1e168dE6102304B03C4ba653',
    outpost: '0x4D70851bC1C59a27af4a14342cb4CCC96c0ae563',
  },
  [mainnet.id]: {
    messenger: '0x2B1c1E133F832EFB1e168dE6102304B03C4ba653',
    outpost: '0x4D70851bC1C59a27af4a14342cb4CCC96c0ae563',
  },
}

// Fuel contract addresses (mainnet)
export const FUEL_CONTRACTS: FuelContractIds = {
  fastBridge:
    '0x12a1cf2d5b5b4eb7ece675b9d84f450fd49dfb969b46687627841a81c4ffb91f',
  assetRegistry:
    '0x91cfcbef2caad02996cdcb5b897222170e85a91cd2db8f23f07ea7d9ca030c19',
  gasOracle:
    '0x3d20e5a675c5fa1053fba11e176099711ba2f23112e385a7f6e2e759eca84f94',
  rateLimiter:
    '0x5d0b627f8192aee05c43ef53c1a12c054488cb6257f1dcf9e802b640b36722a7',
}

// Special addresses
export const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const
export const FUEL_BASE_ASSET_ID =
  '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07' as const

// Available EVM networks (mainnet only)
export const EVM_NETWORKS: AvailableNetwork[] = [
  {
    id: base.id,
    name: 'Base',
    type: 'evm',
    explorerUrl: 'https://basescan.org',
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
    type: 'evm',
    explorerUrl: 'https://etherscan.io',
  },
]

// Available Fuel networks (mainnet only)
export const FUEL_NETWORKS: AvailableNetwork[] = [
  {
    id: FUEL_MAINNET_CHAIN_ID,
    name: 'Fuel Ignition',
    type: 'fuel',
    explorerUrl: 'https://app.fuel.network',
  },
]

// All available networks
export const ALL_NETWORKS: AvailableNetwork[] = [...EVM_NETWORKS, ...FUEL_NETWORKS]

// Gas adjustment constants
export const GAS_FEE_REDUCTION_AMOUNT = 500n
export const GAS_PRICE_MULTIPLIER = 1.5
export const GAS_ESTIMATE_MULTIPLIER = 2n

// Permit deadline (1 hour in seconds)
export const PERMIT_DEADLINE_SECONDS = 3600n

// Default deposit assets (common ones)
// These will be populated from the markets API or can be hardcoded
export const DEFAULT_DEPOSIT_ASSETS: DepositAsset[] = [
  {
    universal:
      '0x286c479da40dc953bddc3bb4c453b608bba2e0ac483b077bd475174115395e6b',
    symbol: 'USDC',
    decimals: 6,
    minPrecision: 2,
    maxPrecision: 6,
    fuel: {
      canonical:
        '0x22dfb618b9fc621a7d53f0f599dd427fb5688f48f82de63c4e363c4b3cde65b6',
      decimals: 6,
    },
    ethereum: {
      [base.id]: {
        canonical: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        minPrecision: 2,
        maxPrecision: 6,
        supportsPermit: true,
      },
      [mainnet.id]: {
        canonical: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        minPrecision: 2,
        maxPrecision: 6,
        supportsPermit: true,
      },
    },
  },
  {
    universal:
      '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
    symbol: 'ETH',
    decimals: 9,
    minPrecision: 6,
    maxPrecision: 9,
    fuel: {
      canonical:
        '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
      decimals: 9,
    },
    ethereum: {
      [base.id]: {
        canonical: NATIVE_ETH,
        decimals: 18,
        minPrecision: 6,
        maxPrecision: 18,
        supportsPermit: false,
      },
      [mainnet.id]: {
        canonical: NATIVE_ETH,
        decimals: 18,
        minPrecision: 6,
        maxPrecision: 18,
        supportsPermit: false,
      },
    },
  },
  {
    universal:
      '0x1a7815cc9f75db5c24a5b0814bfb706bb9fe485333e98254015de8f48f84c67b',
    symbol: 'WBTC',
    decimals: 8,
    minPrecision: 5,
    maxPrecision: 8,
    fuel: {
      canonical:
        '0xb5ecb0a1e08e2abbabf624ffea089df933376855f468ade35c6375b00c33adb1',
      decimals: 8,
    },
    ethereum: {
      [mainnet.id]: {
        canonical: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        decimals: 8,
        minPrecision: 5,
        maxPrecision: 8,
        supportsPermit: false,
      },
    },
  },
]

// Helper to get EVM contracts for a chain
export const getEvmContracts = (chainId: number): EvmContractIds | undefined => {
  return EVM_CONTRACTS[chainId]
}

// Helper to check if an address is native ETH
export const isNativeEth = (address: `0x${string}`): boolean => {
  return address.toLowerCase() === NATIVE_ETH.toLowerCase()
}

// Helper to get explorer URL for a transaction
export const getExplorerTxUrl = (
  network: AvailableNetwork,
  txHash: string
): string => {
  if (network.type === 'fuel') {
    return `${network.explorerUrl}/tx/${txHash}`
  }
  return `${network.explorerUrl}/tx/${txHash}`
}
