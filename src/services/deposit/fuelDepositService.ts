import { Provider, Contract, Address, Account, bn } from 'fuels'
import { fuel } from '../walletService'
import { assetRegistryAbi } from '../../abi/assetRegistryAbi'
import { FUEL_CONTRACTS, FUEL_MAINNET_CHAIN_ID } from '../../constants/depositConstants'
import { FUEL_PROVIDER_URL } from '../../constants/o2Constants'
import type { DepositAsset, FuelDepositParams } from '../../types/deposit'

class FuelDepositService {
  private provider: Provider | null = null

  // Get or create provider
  private async getProvider(): Promise<Provider> {
    if (!this.provider) {
      this.provider = new Provider(FUEL_PROVIDER_URL)
      await this.provider.init()
    }
    return this.provider
  }

  // Get the user's Fuel wallet as an Account
  private async getAccount(depositor: `0x${string}`): Promise<Account> {
    const provider = await this.getProvider()
    const address = Address.fromB256(depositor)
    const account = await fuel.getWallet(address, provider)
    return account as Account
  }

  // Get canonical and universal balances for an asset
  async getBalances(
    depositor: `0x${string}`,
    asset: DepositAsset
  ): Promise<{ canonical: bigint; universal: bigint }> {
    const provider = await this.getProvider()

    let canonical = 0n
    let universal = 0n

    try {
      // Get balances using the provider
      const address = Address.fromB256(depositor)

      // Get canonical balance if asset has canonical ID
      if (asset.fuel?.canonical) {
        const canonicalBalance = await provider.getBalance(
          address,
          asset.fuel.canonical
        )
        canonical = BigInt(canonicalBalance.toString())
      }

      // Get universal balance
      const universalBalance = await provider.getBalance(address, asset.universal)
      universal = BigInt(universalBalance.toString())
    } catch (error) {
      console.error('Error fetching Fuel balances:', error)
    }

    return { canonical, universal }
  }

  // Create the asset registry contract instance
  private async getAssetRegistryContract(account: Account): Promise<Contract> {
    return new Contract(
      FUEL_CONTRACTS.assetRegistry,
      assetRegistryAbi as any,
      account
    )
  }

  // Submit a Fuel deposit
  // This handles both universal transfers and canonical wrapping
  async submitDeposit(
    params: FuelDepositParams
  ): Promise<{ txId: `0x${string}`; maxFee: bigint }> {
    const {
      depositor,
      recipient,
      asset,
      amount,
      canonicalBalance,
      universalBalance,
    } = params

    const account = await this.getAccount(depositor)

    // Calculate how much to take from each balance
    let universalAmount = 0n
    let canonicalAmount = 0n

    if (universalBalance >= amount) {
      // All from universal balance
      universalAmount = amount
    } else if (canonicalBalance + universalBalance >= amount) {
      // Use all universal, rest from canonical
      universalAmount = universalBalance
      canonicalAmount = amount - universalBalance
    } else {
      throw new Error('Insufficient balance for deposit')
    }

    let txId: `0x${string}` | undefined
    let maxFee = 0n

    // If we need to transfer universal tokens directly
    if (universalAmount > 0n && canonicalAmount === 0n) {
      // Simple transfer of universal assets to recipient
      const recipientAddress = Address.fromB256(recipient)

      const tx = await account.transferToContract(
        recipientAddress,
        bn(universalAmount.toString()),
        asset.universal
      )

      const result = await tx.waitForResult()
      txId = result.id as `0x${string}`
      maxFee = BigInt(result.fee?.toString() || '0')
    } else if (canonicalAmount > 0n) {
      // Need to wrap canonical assets via AssetRegistry
      const assetRegistry = await this.getAssetRegistryContract(account)

      // If we have both universal and canonical, we need to do both operations
      if (universalAmount > 0n) {
        // First transfer universal assets
        const recipientAddress = Address.fromB256(recipient)

        const transferTx = await account.transferToContract(
          recipientAddress,
          bn(universalAmount.toString()),
          asset.universal
        )
        await transferTx.waitForResult()
      }

      // Then wrap canonical assets
      // Identity type for Fuel - ContractId for trading accounts
      const recipientIdentity = {
        ContractId: { bits: recipient },
      }

      const wrapCall = assetRegistry.functions
        .wrap_canonical_asset(recipientIdentity)
        .callParams({
          forward: {
            amount: bn(canonicalAmount.toString()),
            assetId: asset.fuel!.canonical,
          },
        })

      const tx = await wrapCall.call()
      const result = await tx.waitForResult()
      txId = result.transactionId as `0x${string}`
      maxFee = BigInt(result.gasUsed?.toString() || '0')
    }

    if (!txId) {
      throw new Error('No transaction was submitted')
    }

    return { txId, maxFee }
  }

  // Get the Fuel chain ID
  getChainId(): number {
    return FUEL_MAINNET_CHAIN_ID
  }

  // Get explorer URL for a transaction
  getExplorerUrl(txId: string): string {
    return `https://app.fuel.network/tx/${txId}`
  }

  // Validate that the connected wallet is on Fuel
  async validateFuelConnection(): Promise<boolean> {
    try {
      const account = await fuel.currentAccount()
      return !!account
    } catch {
      return false
    }
  }

  // Get the current Fuel account
  async getCurrentAccount(): Promise<`0x${string}` | null> {
    try {
      const account = await fuel.currentAccount()
      if (!account) return null

      // Handle different account formats
      if (typeof account === 'string') {
        return account as `0x${string}`
      }

      const address = (account as any).address
      if (address?.toB256) {
        return address.toB256() as `0x${string}`
      }

      return String(address) as `0x${string}`
    } catch {
      return null
    }
  }
}

export const fuelDepositService = new FuelDepositService()
