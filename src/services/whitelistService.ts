import { Provider, Address, sha256, concat } from 'fuels'
import { OrderBookWhitelist } from '../types/contracts/OrderBookWhitelist'
import { FUEL_PROVIDER_URL } from '../constants/o2Constants'

class WhitelistService {
  private provider: Provider | null = null

  private async getProvider(): Promise<Provider> {
    if (!this.provider) {
      this.provider = new Provider(FUEL_PROVIDER_URL)
      await this.provider.init()
    }
    return this.provider
  }

  /**
   * Check if a trading account is whitelisted on-chain
   * @param tradingAccountId - The trading account contract ID (B256 string)
   * @param booksWhitelistId - The OrderBookWhitelist contract ID (B256 string)
   * @returns true if the trading account has a balance > 0 in the whitelist contract
   */
  async checkWhitelistStatus(
    tradingAccountId: string,
    booksWhitelistId: string
  ): Promise<boolean> {
    try {
      const provider = await this.getProvider()
      
      // Create OrderBookWhitelist contract instance
      const whitelist = new OrderBookWhitelist(booksWhitelistId, provider)
      
      // Calculate assetId: sha256(concat([whitelist.id.toB256(), tradingAccountId.toB256()]))
      // The whitelist contract uses the trading account ID as the sub_id for the asset
      // whitelist.id is the ContractId of the whitelist contract (has toB256 method)
      // For the trading account ID, we can use Address.fromString since contract IDs are 32-byte values
      const whitelistIdB256 = whitelist.id.toB256()
      const tradingAccountIdB256 = Address.fromString(tradingAccountId).toB256()
      
      const assetId = sha256(concat([whitelistIdB256, tradingAccountIdB256]))
      
      // Get balance for this asset
      const balance = await whitelist.getBalance(assetId)
      
      // If balance > 0, the account is whitelisted
      return balance.gt(0)
    } catch (error) {
      console.error('Failed to check whitelist status', error)
      // Return false on error to be safe
      return false
    }
  }
}

export const whitelistService = new WhitelistService()
