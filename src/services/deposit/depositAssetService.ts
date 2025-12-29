import type { AvailableNetwork, DepositAsset, DepositSourceType } from '../../types/deposit'
import {
  DEFAULT_DEPOSIT_ASSETS,
  EVM_NETWORKS,
  FUEL_NETWORKS,
  EVM_CONTRACTS,
  FUEL_CONTRACTS,
  isNativeEth,
} from '../../constants/depositConstants'

class DepositAssetService {
  private assets: DepositAsset[] = DEFAULT_DEPOSIT_ASSETS

  // Get all depositable assets
  getDepositableAssets(): DepositAsset[] {
    return this.assets
  }

  // Get asset by symbol
  getAssetBySymbol(symbol: string): DepositAsset | undefined {
    return this.assets.find((a) => a.symbol === symbol)
  }

  // Get asset by universal ID
  getAssetByUniversalId(universalId: `0x${string}`): DepositAsset | undefined {
    return this.assets.find(
      (a) => a.universal.toLowerCase() === universalId.toLowerCase()
    )
  }

  // Get available networks for depositing an asset
  getNetworksForAsset(
    asset: DepositAsset,
    sourceType: DepositSourceType
  ): AvailableNetwork[] {
    if (sourceType === 'fuel') {
      // For Fuel deposits, only return Fuel network if asset has Fuel config
      return asset.fuel ? FUEL_NETWORKS : []
    }

    // For EVM deposits, return networks where the asset is available
    const availableNetworks: AvailableNetwork[] = []

    for (const network of EVM_NETWORKS) {
      if (asset.ethereum?.[network.id]) {
        availableNetworks.push(network)
      }
    }

    return availableNetworks
  }

  // Get all available networks for a source type
  getNetworksBySourceType(sourceType: DepositSourceType): AvailableNetwork[] {
    return sourceType === 'fuel' ? FUEL_NETWORKS : EVM_NETWORKS
  }

  // Get token address for an asset on a specific chain
  getTokenAddress(
    asset: DepositAsset,
    chainId: number,
    sourceType: DepositSourceType
  ): `0x${string}` | undefined {
    if (sourceType === 'fuel') {
      return asset.fuel?.canonical
    }
    return asset.ethereum?.[chainId]?.canonical
  }

  // Get token decimals for an asset on a specific chain
  getTokenDecimals(
    asset: DepositAsset,
    chainId: number,
    sourceType: DepositSourceType
  ): number {
    if (sourceType === 'fuel') {
      return asset.fuel?.decimals ?? asset.decimals
    }
    return asset.ethereum?.[chainId]?.decimals ?? asset.decimals
  }

  // Check if asset supports permit on a chain
  assetSupportsPermit(asset: DepositAsset, chainId: number): boolean {
    const evmConfig = asset.ethereum?.[chainId]
    if (!evmConfig) return false
    // Native ETH doesn't need permit
    if (isNativeEth(evmConfig.canonical)) return false
    return evmConfig.supportsPermit
  }

  // Check if the token is native ETH
  isNativeEthDeposit(asset: DepositAsset, chainId: number): boolean {
    const tokenAddress = asset.ethereum?.[chainId]?.canonical
    return tokenAddress ? isNativeEth(tokenAddress) : false
  }

  // Get EVM contracts for a chain
  getEvmContracts(chainId: number) {
    return EVM_CONTRACTS[chainId]
  }

  // Get Fuel contracts
  getFuelContracts() {
    return FUEL_CONTRACTS
  }

  // Get asset-network combinations sorted by balance (USD value)
  // This is used for the asset selector dropdown
  getAssetNetworkCombinations(
    sourceType: DepositSourceType,
    balances?: Map<string, bigint>
  ): Array<{ asset: DepositAsset; network: AvailableNetwork }> {
    const combinations: Array<{ asset: DepositAsset; network: AvailableNetwork }> = []

    for (const asset of this.assets) {
      const networks = this.getNetworksForAsset(asset, sourceType)
      for (const network of networks) {
        combinations.push({ asset, network })
      }
    }

    // If balances are provided, sort by balance (highest first)
    if (balances) {
      combinations.sort((a, b) => {
        const keyA = `${a.asset.symbol}-${a.network.id}`
        const keyB = `${b.asset.symbol}-${b.network.id}`
        const balanceA = balances.get(keyA) ?? 0n
        const balanceB = balances.get(keyB) ?? 0n
        if (balanceB > balanceA) return 1
        if (balanceB < balanceA) return -1
        return 0
      })
    }

    return combinations
  }

  // Update assets list (e.g., from API)
  setAssets(assets: DepositAsset[]) {
    this.assets = assets
  }

  // Add an asset
  addAsset(asset: DepositAsset) {
    const existing = this.assets.findIndex(
      (a) => a.universal.toLowerCase() === asset.universal.toLowerCase()
    )
    if (existing >= 0) {
      this.assets[existing] = asset
    } else {
      this.assets.push(asset)
    }
  }
}

export const depositAssetService = new DepositAssetService()
